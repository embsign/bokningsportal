package com.example.brfbokatvttidkiosk

import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
import android.net.Uri
import android.nfc.NfcAdapter
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.border
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.lifecycleScope
import com.example.brfbokatvttidkiosk.ui.theme.BRFBokaTvättidKioskTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.FileInputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.random.Random

class MainActivity : ComponentActivity() {
    private val defaultFrontendBaseUrl = "https://bokningsportal.app"
    private val defaultApiBaseUrl = "https://bokningsportal.app"
    private var frontendBaseUrl = defaultFrontendBaseUrl
    private var apiBaseUrl = defaultApiBaseUrl
    private var loginEndpoint = "$apiBaseUrl/api/rfid-login"
    private val pairingAnnounceEndpoint get() = "$apiBaseUrl/api/kiosk/pairing/announce"
    private val pairingClaimEndpoint get() = "$apiBaseUrl/api/kiosk/pairing/claim"
    private val screenStatusEndpoint get() = "$apiBaseUrl/api/kiosk/screen/status"
    private val screenRfidLoginEndpoint get() = "$apiBaseUrl/api/kiosk/rfid-login"

    private var nfcAdapter: NfcAdapter? = null
    private var webViewRef: WebView? = null

    private lateinit var kioskConfigStore: KioskConfigStore
    private var kioskConfig: KioskConfig? = null
    private var uiState by mutableStateOf<UiState>(UiState.Pairing)
    private var pairingCodeDisplay by mutableStateOf("")
    private var pairingCodeExpiresAtMs by mutableStateOf<Long?>(null)
    private var pairingStatusMessage by mutableStateOf("Initierar koppling...")
    private var pairingErrorMessage by mutableStateOf<String?>(null)
    private var isPairingBusy by mutableStateOf(false)
    private var rfidErrorMessage by mutableStateOf<String?>(null)
    private var rfidInfoMessage by mutableStateOf<String?>(null)
    private var pairingJob: Job? = null
    private var emReaderJob: Job? = null
    private var toneGenerator: ToneGenerator? = null
    private val hidBuffer = StringBuilder()
    private var lastHidKeyTimestamp = 0L
    private var lastEmUid: String? = null
    private var lastEmUidAtMs: Long = 0L
    private var lastNfcUid: String? = null
    private var lastNfcReadAtMs: Long = 0L

    private val hidKeyTimeoutMs = 300L
    private val hidMaxLength = 64
    private val emSerialDevice = "/dev/ttyS3"
    private val emDuplicateWindowMs = 2_000L
    private val nfcVsEmWindowMs = 1_500L
    private val kioskInactivityTimeoutMs = 3 * 60_000L
    private val verifyIntervalMs = 90_000L
    private val pairingPollIntervalMs = 3_000L
    private val pairingAnnounceIntervalMs = 25_000L
    private val pairingCodeValidityMs = 30 * 60_000L
    private val pairingCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    private val verifyHandler = Handler(Looper.getMainLooper())
    private val verifyRunnable = object : Runnable {
        override fun run() {
            lifecycleScope.launch {
                verifyCurrentBinding()
            }
            verifyHandler.postDelayed(this, verifyIntervalMs)
        }
    }
    private val kioskInactivityRunnable = Runnable {
        if (uiState is UiState.Showing) {
            resetToIdle()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        kioskConfigStore = KioskConfigStore(applicationContext)

        lifecycleScope.launch {
            val config = withContext(Dispatchers.IO) { kioskConfigStore.load() }
            applyKioskConfig(config)
            uiState = if (config != null && config.screenToken.isNotBlank()) {
                UiState.Idle
            } else {
                UiState.Pairing
            }
            if (uiState == UiState.Pairing) {
                startPairingLoop()
            }
        }

        setContent {
            BRFBokaTvättidKioskTheme {
                when (val state = uiState) {
                    UiState.Pairing -> PairingScreen(
                        codeValue = pairingCodeDisplay,
                        expiresAtMs = pairingCodeExpiresAtMs,
                        isBusy = isPairingBusy,
                        statusMessage = pairingStatusMessage,
                        errorMessage = pairingErrorMessage,
                    )
                    UiState.Idle -> IdleScreen(
                        tenantName = kioskConfig?.tenantName,
                        rfidErrorMessage = rfidErrorMessage,
                        rfidInfoMessage = rfidInfoMessage,
                    )
                    UiState.Loading -> LoadingScreen()
                    is UiState.Showing -> WebScreen(
                        url = state.url,
                        onWebViewCreated = { webViewRef = it },
                        onPageFinished = { loadedUrl ->
                            if (shouldReturnToIdle(loadedUrl, state.bookingPath)) {
                                resetToIdle()
                            }
                        }
                    )
                }
            }
        }
        startEmReaderLoop()
    }

    override fun onResume() {
        super.onResume()
        nfcAdapter?.enableReaderMode(
            this,
            { tag ->
                if (tag == null) return@enableReaderMode
                val uid = tag.id.joinToString("") { byte -> "%02X".format(byte) }
                lastNfcReadAtMs = System.currentTimeMillis()
                lastNfcUid = uid
                if (uiState == UiState.Idle) {
                    runOnUiThread { requestBookingUrl(uid) }
                }
            },
            NfcAdapter.FLAG_READER_NFC_A or
                NfcAdapter.FLAG_READER_NFC_B or
                NfcAdapter.FLAG_READER_NFC_F or
                NfcAdapter.FLAG_READER_NFC_V or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            Bundle()
        )
        verifyHandler.postDelayed(verifyRunnable, verifyIntervalMs)
        if (uiState == UiState.Pairing) {
            startPairingLoop()
        }
        if (uiState is UiState.Showing) {
            restartKioskInactivityTimer()
        }
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableReaderMode(this)
        verifyHandler.removeCallbacks(verifyRunnable)
        pairingJob?.cancel()
        pairingJob = null
        stopKioskInactivityTimer()
    }

    override fun onUserInteraction() {
        super.onUserInteraction()
        if (uiState is UiState.Showing) {
            restartKioskInactivityTimer()
        }
    }

    override fun onDestroy() {
        emReaderJob?.cancel()
        emReaderJob = null
        toneGenerator?.release()
        toneGenerator = null
        super.onDestroy()
    }

    private fun startEmReaderLoop() {
        if (emReaderJob?.isActive == true) return
        emReaderJob = lifecycleScope.launch(Dispatchers.IO) {
            while (isActive) {
                try {
                    configureEmSerialPort()
                    FileInputStream(emSerialDevice).use { input ->
                        val buffer = ByteArray(128)
                        val frame = ArrayList<Int>(32)
                        while (isActive) {
                            val read = input.read(buffer)
                            if (read <= 0) continue
                            for (i in 0 until read) {
                                val value = buffer[i].toInt() and 0xFF
                                if (value == 0x02) {
                                    frame.clear()
                                    frame.add(value)
                                    continue
                                }
                                if (frame.isEmpty()) continue
                                frame.add(value)
                                if (value == 0x03) {
                                    handleEmFrame(frame.toIntArray())
                                    frame.clear()
                                } else if (frame.size > 128) {
                                    frame.clear()
                                }
                            }
                        }
                    }
                } catch (ex: Exception) {
                    delay(1000)
                }
            }
        }
    }

    private fun configureEmSerialPort() {
        try {
            Runtime.getRuntime()
                .exec(arrayOf("sh", "-c", "stty -F $emSerialDevice 9600 cs8 -cstopb -parenb raw -echo"))
                .waitFor()
        } catch (_: Exception) {}
    }

    private suspend fun handleEmFrame(frame: IntArray) {
        if (frame.size < 3 || frame.first() != 0x02 || frame.last() != 0x03) return
        val hexFrame = frame.joinToString(" ") { "%02X".format(it) }
        val uid = extractEmUid(frame) ?: return
        val now = System.currentTimeMillis()
        if (uid == lastEmUid && now - lastEmUidAtMs < emDuplicateWindowMs) {
            return
        }
        lastEmUid = uid
        lastEmUidAtMs = now
        withContext(Dispatchers.Main) {
            // If NFC just fired, this is likely the same card being picked up by both paths.
            if (now - lastNfcReadAtMs < nfcVsEmWindowMs) {
                rfidInfoMessage = "Taggen lästes via både NFC och EM. Använd MiFare-läsaren."
                return@withContext
            }
            if (uiState == UiState.Idle) {
                requestBookingUrl(uid.uppercase())
            }
        }
    }

    private fun extractEmUid(frame: IntArray): String? {
        if (frame.size < 3 || frame.first() != 0x02 || frame.last() != 0x03) return null

        // EM frame variant observed:
        // 02 09 10 <UID4> <CRC1> 03  -> use bytes 3..6
        if (frame.size >= 9 && frame[1] == 0x09 && frame[2] == 0x10) {
            return frame.slice(3..6).joinToString("") { "%02X".format(it) }
        }

        // EM frame variant observed:
        // 02 0A 01 0E/0F 00 <UID4> 03 -> use bytes 5..8
        if (frame.size >= 10 && frame[1] == 0x0A && frame[2] == 0x01 && frame[4] == 0x00) {
            return frame.slice(5..8).joinToString("") { "%02X".format(it) }
        }

        val body = frame.drop(1).dropLast(1)
        if (body.size >= 4) {
            // Fallback for unknown variants.
            return body.takeLast(4).joinToString("") { "%02X".format(it) }
        }
        return body.joinToString("") { "%02X".format(it) }.ifBlank { null }
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if (handleHidKeyUp(keyCode, event)) {
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    private fun handleHidKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        val now = System.currentTimeMillis()
        if (now - lastHidKeyTimestamp > hidKeyTimeoutMs) {
            hidBuffer.setLength(0)
        }
        lastHidKeyTimestamp = now

        when (keyCode) {
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                val uid = hidBuffer.toString().trim()
                hidBuffer.setLength(0)
                if (uid.isNotBlank()) {
                    val normalizedUid = uid.uppercase()
                    if (uiState == UiState.Idle) {
                        requestBookingUrl(normalizedUid)
                    }
                    return true
                }
            }
            else -> {
                val ch = event.unicodeChar
                if (ch != 0) {
                    val char = ch.toChar()
                    if (char.isLetterOrDigit()) {
                        if (hidBuffer.length < hidMaxLength) {
                            hidBuffer.append(char)
                        }
                        return true
                    }
                }
            }
        }
        return false
    }

    private fun requestBookingUrl(uid: String) {
        rfidErrorMessage = null
        uiState = UiState.Loading
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                fetchBookingUrl(uid)
            }
            if (result is BookingResult.Failure) {
                rfidErrorMessage = when {
                    result.statusCode == 401 && result.responseBody?.contains("invalid_rfid") == true ->
                        "Taggen finns inte i systemet."
                    result.statusCode == null ->
                        "Kunde inte kontakta servern. Kontrollera internetanslutningen."
                    result.statusCode in 500..599 ->
                        "Serverfel. Försök igen om en stund."
                    else ->
                        "Inloggning misslyckades (HTTP ${result.statusCode ?: "okänt"})."
                }
                playFailureTone()
                uiState = UiState.Idle
                return@launch
            }

            val success = result as BookingResult.Success
            rfidErrorMessage = null
            rfidInfoMessage = null
            playSuccessTone()
            uiState = UiState.Showing(withKioskModeQuery(success.fullUrl), success.bookingPath)
            restartKioskInactivityTimer()
        }
    }

    private fun withKioskModeQuery(rawUrl: String): String {
        return try {
            val uri = Uri.parse(rawUrl)
            if (uri.getQueryParameter("kiosk") == "1") return rawUrl
            uri.buildUpon()
                .appendQueryParameter("kiosk", "1")
                .build()
                .toString()
        } catch (_: Exception) {
            rawUrl
        }
    }

    private fun getToneGenerator(): ToneGenerator? {
        if (toneGenerator != null) return toneGenerator
        toneGenerator = try {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 90)
        } catch (_: Exception) { null }
        return toneGenerator
    }

    private fun playSuccessTone() {
        getToneGenerator()?.startTone(ToneGenerator.TONE_PROP_ACK, 180)
    }

    private fun playFailureTone() {
        val tg = getToneGenerator() ?: return
        tg.startTone(ToneGenerator.TONE_PROP_NACK, 250)
    }

    private fun fetchBookingUrl(uid: String): BookingResult {
        val endpoint = if (kioskConfig?.screenToken?.isNotBlank() == true) {
            screenRfidLoginEndpoint
        } else {
            loginEndpoint
        }
        val token = kioskConfig?.screenToken?.takeIf { it.isNotBlank() }
        val tenantId = kioskConfig?.tenantId
        val primaryResult = doRequest(endpoint, uid, token, tenantId)
        if (primaryResult is BookingResult.Failure && primaryResult.statusCode == 405) {
            val alternateUrl = if (endpoint.endsWith("/")) {
                endpoint.dropLast(1)
            } else {
                "$endpoint/"
            }
            return doRequest(alternateUrl, uid, token, tenantId)
        }
        return primaryResult
    }

    private fun doRequest(requestUrl: String, uid: String, screenToken: String? = null, tenantId: String? = null): BookingResult {
        return try {
            val connection = (URL(requestUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 10000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "AndroidKiosk/1.0")
                if (!screenToken.isNullOrBlank()) {
                    setRequestProperty("Authorization", "Bearer $screenToken")
                }
            }

            connection.outputStream.use { stream ->
                val payload = JSONObject().put("uid", uid)
                if (!tenantId.isNullOrBlank()) {
                    payload.put("tenant_id", tenantId)
                }
                stream.write(payload.toString().toByteArray(Charsets.UTF_8))
            }

            val responseCode = connection.responseCode
            val inputStream = if (responseCode in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }

            if (inputStream == null) {
                return BookingResult.Failure(
                    requestUrl = requestUrl,
                    statusCode = responseCode,
                    message = "Tomt svar från servern (HTTP $responseCode)."
                )
            }
            val responseBody = BufferedReader(InputStreamReader(inputStream)).use { it.readText() }
            if (responseCode !in 200..299) {
                return BookingResult.Failure(
                    requestUrl = requestUrl,
                    statusCode = responseCode,
                    message = "API-fel (HTTP $responseCode).",
                    responseBody = responseBody
                )
            }

            val json = JSONObject(responseBody)
            val bookingUrlRaw = json.optString("booking_url", "")
            if (bookingUrlRaw.isBlank()) {
                return BookingResult.Failure(
                    requestUrl = requestUrl,
                    statusCode = responseCode,
                    message = "Svar saknar booking_url.",
                    responseBody = responseBody
                )
            }

            val fullUrl = if (bookingUrlRaw.startsWith("http")) {
                bookingUrlRaw
            } else {
                frontendBaseUrl.trimEnd('/') + "/" + bookingUrlRaw.trimStart('/')
            }

            val bookingPath = if (bookingUrlRaw.startsWith("http")) {
                Uri.parse(bookingUrlRaw).path ?: ""
            } else {
                bookingUrlRaw
            }

            BookingResult.Success(
                requestUrl = requestUrl,
                statusCode = responseCode,
                fullUrl = fullUrl,
                bookingPath = bookingPath,
                responseBody = responseBody
            )
        } catch (ex: Exception) {
            BookingResult.Failure(
                requestUrl = requestUrl,
                statusCode = null,
                message = "Undantag: ${ex.message ?: "Okänt fel"}"
            )
        }
    }

    private fun startPairingLoop() {
        if (pairingJob?.isActive == true) return
        pairingJob = lifecycleScope.launch {
            isPairingBusy = true
            pairingErrorMessage = null
            while (isActive && uiState == UiState.Pairing) {
                val code = generatePairingCode()
                val expiresAtMs = System.currentTimeMillis() + pairingCodeValidityMs
                pairingCodeDisplay = code
                pairingCodeExpiresAtMs = expiresAtMs
                pairingStatusMessage = "Skriv in koden i admin för att koppla skärmen. Koden gäller i 30 minuter."
                pairingErrorMessage = null
                val pairedConfig = runPairingFlow(code, expiresAtMs)
                if (pairedConfig != null) {
                    applyKioskConfig(pairedConfig)
                    withContext(Dispatchers.IO) { kioskConfigStore.save(pairedConfig) }
                    pairingCodeDisplay = ""
                    pairingCodeExpiresAtMs = null
                    pairingStatusMessage = "Skärmen är kopplad."
                    pairingErrorMessage = null
                    isPairingBusy = false
                    uiState = UiState.Idle
                    pairingJob = null
                    return@launch
                }
                if (!isActive || uiState != UiState.Pairing) {
                    break
                }
                pairingErrorMessage = "Koden gick ut. Ny kod skapas..."
                delay(1500)
            }
            isPairingBusy = false
            pairingJob = null
        }
    }

    private suspend fun runPairingFlow(code: String, expiresAtMs: Long): KioskConfig? {
        var lastAnnounceAt = 0L
        while (uiState == UiState.Pairing && System.currentTimeMillis() < expiresAtMs) {
            if (uiState != UiState.Pairing) return null

            val now = System.currentTimeMillis()
            if (now - lastAnnounceAt >= pairingAnnounceIntervalMs) {
                pairingStatusMessage = "Registrerar kod mot servern..."
                val announceResult = withContext(Dispatchers.IO) {
                    postJson(
                        pairingAnnounceEndpoint,
                        JSONObject().put("pairing_code", code)
                    )
                }
                if (!announceResult.ok) {
                    pairingErrorMessage = "Kunde inte kontakta servern. Försöker igen..."
                    delay(2_000)
                    continue
                }
                lastAnnounceAt = now
                pairingErrorMessage = null
            }

            pairingStatusMessage = "Väntar på koppling från admin..."
            val claimResult = withContext(Dispatchers.IO) {
                postJson(
                    pairingClaimEndpoint,
                    JSONObject().put("pairing_code", code)
                )
            }
            if (claimResult.ok && !claimResult.body.isNullOrBlank()) {
                val parsed = parseClaimedKioskConfig(claimResult.body)
                if (parsed != null) {
                    return parsed
                }
                pairingErrorMessage = "Ogiltigt svar från servern. Försöker igen..."
            }
            if (claimResult.statusCode != null && claimResult.statusCode !in setOf(404, 409)) {
                pairingErrorMessage = "Tillfälligt serverfel (${claimResult.statusCode}). Försöker igen..."
            }
            delay(pairingPollIntervalMs)
        }
        return null
    }

    private fun parseClaimedKioskConfig(responseBody: String): KioskConfig? {
        return try {
            val payload = JSONObject(responseBody)
            val screen = payload.optJSONObject("screen") ?: return null
            val tenantId = screen.optString("tenant_id")
            val tenantName = screen.optString("tenant_name")
            val screenToken = screen.optString("screen_token")
            if (tenantId.isBlank() || screenToken.isBlank()) {
                null
            } else {
                KioskConfig(
                    tenantId = tenantId,
                    tenantName = tenantName,
                    screenToken = screenToken,
                    screenName = screen.optString("name").ifBlank { null }
                )
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun generatePairingCode(): String {
        return buildString {
            repeat(6) {
                append(pairingCodeAlphabet[Random.nextInt(pairingCodeAlphabet.length)])
            }
        }
    }

    private suspend fun verifyCurrentBinding() {
        val config = kioskConfig ?: return
        if (config.screenToken.isBlank()) {
            return
        }
        val statusResult = withContext(Dispatchers.IO) {
            getJson(screenStatusEndpoint, config.screenToken)
        }
        if (statusResult.statusCode in setOf(401, 403)) {
            resetBindingToPairing()
            return
        }
        if (!statusResult.ok || statusResult.statusCode !in 200..299 || statusResult.body.isNullOrBlank()) {
            if (statusResult.statusCode == null) {
                rfidErrorMessage = "Ingen kontakt med backend. Försöker igen."
            } else if (statusResult.statusCode in 500..599) {
                rfidErrorMessage = "Backend svarar med fel (${statusResult.statusCode}). Försöker igen."
            }
            return
        }
        val stillConnected = try {
            val payload = JSONObject(statusResult.body)
            payload.optBoolean("connected", false)
        } catch (_: Exception) {
            true
        }
        if (!stillConnected) {
            resetBindingToPairing()
        }
    }

    private suspend fun resetBindingToPairing() {
        withContext(Dispatchers.IO) {
            kioskConfigStore.clear()
        }
        applyKioskConfig(null)
        resetToIdle()
        pairingCodeDisplay = ""
        pairingCodeExpiresAtMs = null
        pairingStatusMessage = "Initierar koppling..."
        pairingErrorMessage = null
        uiState = UiState.Pairing
        startPairingLoop()
    }

    private fun applyKioskConfig(config: KioskConfig?) {
        kioskConfig = config
        frontendBaseUrl = defaultFrontendBaseUrl
        apiBaseUrl = defaultApiBaseUrl
        loginEndpoint = "$apiBaseUrl/api/rfid-login"
    }

    private fun postJson(requestUrl: String, payload: JSONObject): NetworkResult {
        return try {
            val connection = (URL(requestUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 10000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "AndroidKiosk/1.0")
            }
            connection.outputStream.use { stream ->
                stream.write(payload.toString().toByteArray(Charsets.UTF_8))
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.let { BufferedReader(InputStreamReader(it)).use { reader -> reader.readText() } }
            NetworkResult(ok = code in 200..299, statusCode = code, body = body)
        } catch (_: Exception) {
            NetworkResult(ok = false, statusCode = null, body = null)
        }
    }

    private fun getJson(requestUrl: String, screenToken: String): NetworkResult {
        return try {
            val connection = (URL(requestUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 10000
                readTimeout = 10000
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "AndroidKiosk/1.0")
                setRequestProperty("Authorization", "Bearer $screenToken")
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.let { BufferedReader(InputStreamReader(it)).use { reader -> reader.readText() } }
            NetworkResult(ok = code in 200..299, statusCode = code, body = body)
        } catch (_: Exception) {
            NetworkResult(ok = false, statusCode = null, body = null)
        }
    }

    private fun shouldReturnToIdle(url: String?, bookingPath: String): Boolean {
        if (url.isNullOrBlank()) return false

        val uri = Uri.parse(url)
        if (uri.host != Uri.parse(frontendBaseUrl).host) return false

        val path = uri.path.orEmpty()
        if (path == "/" || path.startsWith("/login") || path.startsWith("/kiosk") || path.startsWith("/pos")) {
            return true
        }

        if (bookingPath.isNotBlank() && !path.startsWith(bookingPath)) {
            return path == "/" || path.startsWith("/login")
        }

        return false
    }

    private fun resetToIdle() {
        stopKioskInactivityTimer()
        webViewRef?.apply {
            stopLoading()
            clearHistory()
            loadUrl("about:blank")
        }
        uiState = UiState.Idle
    }

    private fun restartKioskInactivityTimer() {
        verifyHandler.removeCallbacks(kioskInactivityRunnable)
        verifyHandler.postDelayed(kioskInactivityRunnable, kioskInactivityTimeoutMs)
    }

    private fun stopKioskInactivityTimer() {
        verifyHandler.removeCallbacks(kioskInactivityRunnable)
    }
}

private sealed interface UiState {
    data object Pairing : UiState
    data object Idle : UiState
    data object Loading : UiState
    data class Showing(val url: String, val bookingPath: String) : UiState
}

private data class NetworkResult(
    val ok: Boolean,
    val statusCode: Int?,
    val body: String?
)

private sealed interface BookingResult {
    data class Success(
        val requestUrl: String,
        val statusCode: Int,
        val fullUrl: String,
        val bookingPath: String,
        val responseBody: String
    ) : BookingResult

    data class Failure(
        val requestUrl: String,
        val statusCode: Int?,
        val message: String,
        val responseBody: String? = null
    ) : BookingResult
}

@Composable
private fun IdleScreen(tenantName: String?, rfidErrorMessage: String?, rfidInfoMessage: String?) {
    var popupMessage by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(rfidErrorMessage) {
        if (!rfidErrorMessage.isNullOrBlank()) {
            popupMessage = rfidErrorMessage
            delay(5_000)
            if (popupMessage == rfidErrorMessage) {
                popupMessage = null
            }
        }
    }
    LaunchedEffect(rfidInfoMessage) {
        if (!rfidInfoMessage.isNullOrBlank()) {
            popupMessage = rfidInfoMessage
            delay(5_000)
            if (popupMessage == rfidInfoMessage) {
                popupMessage = null
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
            modifier = Modifier.padding(24.dp)
        ) {
            Text(
                text = "Digital Bokningstavla",
                color = Color.White,
                textAlign = TextAlign.Center,
                fontSize = 56.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "för",
                color = Color(0xFFD1D5DB),
                textAlign = TextAlign.Center,
                fontSize = 24.sp
            )
            Text(
                text = tenantName?.takeIf { it.isNotBlank() } ?: "Bokningsskärm",
                color = Color.White,
                textAlign = TextAlign.Center,
                fontSize = 44.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "",
                color = Color.Transparent
            )
            Text(
                text = "Blippa din tagg eller iLoq-nyckel för att logga in",
                color = Color.White,
                textAlign = TextAlign.Center,
                fontSize = 28.sp
            )
        }
        if (!popupMessage.isNullOrBlank()) {
            val isError = popupMessage == rfidErrorMessage
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(24.dp)
                    .width(560.dp)
                    .height(160.dp)
                    .background(
                        if (isError) Color(0xFF7F1D1D) else Color(0xFF1E3A8A),
                        RoundedCornerShape(10.dp)
                    )
                    .border(
                        1.dp,
                        if (isError) Color(0xFFFCA5A5) else Color(0xFF93C5FD),
                        RoundedCornerShape(10.dp)
                    )
                    .padding(12.dp)
            ) {
                Text(
                    text = popupMessage ?: "",
                    color = if (isError) Color(0xFFFECACA) else Color(0xFFDBEAFE),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().align(Alignment.Center)
                )
            }
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Startar bokningsskärmen...",
            color = Color.White,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun PairingScreen(
    codeValue: String,
    expiresAtMs: Long?,
    isBusy: Boolean,
    statusMessage: String,
    errorMessage: String?,
) {
    var nowMs by remember(expiresAtMs) { mutableStateOf(System.currentTimeMillis()) }
    LaunchedEffect(expiresAtMs) {
        if (expiresAtMs == null) return@LaunchedEffect
        while (true) {
            nowMs = System.currentTimeMillis()
            delay(1000)
        }
    }
    val remainingSeconds = ((expiresAtMs ?: nowMs) - nowMs).coerceAtLeast(0L) / 1000
    val countdownText = "Koden gäller i ${remainingSeconds / 60}:${(remainingSeconds % 60).toString().padStart(2, '0')}"

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(720.dp)
                .border(1.dp, Color(0xFF374151), RoundedCornerShape(16.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            Text(
                text = "Kopplingsläge",
                color = Color.White,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )
            Text(
                text = "Starta koppling i admin och skriv in koden som visas här.",
                color = Color(0xFFD1D5DB),
                textAlign = TextAlign.Center
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                repeat(6) { index ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(64.dp)
                            .border(2.dp, Color(0xFF60A5FA), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = codeValue.getOrNull(index)?.toString() ?: "",
                            color = Color.White,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            Text(
                text = statusMessage,
                color = Color(0xFFD1D5DB),
                textAlign = TextAlign.Center
            )
            if (expiresAtMs != null) {
                Text(
                    text = countdownText,
                    color = Color(0xFF93C5FD),
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.SemiBold
                )
            }
            if (!errorMessage.isNullOrBlank()) {
                Text(
                    text = errorMessage,
                    color = Color(0xFFF87171),
                    textAlign = TextAlign.Center
                )
            }
            if (isBusy) {
                Text(
                    text = "Väntar på administratör...",
                    color = Color(0xFF93C5FD),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
private fun WebScreen(
    url: String,
    onWebViewCreated: (WebView) -> Unit,
    onPageFinished: (String?) -> Unit
) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.cacheMode = WebSettings.LOAD_DEFAULT
                clearCache(true)
                clearHistory()
                clearFormData()
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        onPageFinished(url)
                    }
                }
                loadUrl(url)
            }
        },
        update = { webView ->
            onWebViewCreated(webView)
            if (webView.url != url) {
                webView.loadUrl(url)
            }
        }
    )
}