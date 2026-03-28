package com.example.brfbokatvttidkiosk

import android.app.PendingIntent
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
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
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import kotlin.random.Random

class MainActivity : ComponentActivity() {

    private val defaultFrontendBaseUrl = "https://bokningsportal.app"
    private val defaultApiBaseUrl = "https://bokningsportal.embsign.workers.dev"
    private var frontendBaseUrl = defaultFrontendBaseUrl
    private var apiBaseUrl = defaultApiBaseUrl
    private var loginEndpoint = "$apiBaseUrl/api/rfid-login"
    private val pairingAnnounceEndpoint get() = "$apiBaseUrl/api/kiosk/pairing/announce"
    private val pairingClaimEndpoint get() = "$apiBaseUrl/api/kiosk/pairing/claim"
    private val screenStatusEndpoint get() = "$apiBaseUrl/api/kiosk/screen/status"
    private val screenRfidLoginEndpoint get() = "$apiBaseUrl/api/kiosk/rfid-login"

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var pendingIntent: PendingIntent
    private var webViewRef: WebView? = null

    private lateinit var kioskConfigStore: KioskConfigStore
    private var kioskConfig: KioskConfig? = null
    private var uiState by mutableStateOf<UiState>(UiState.Pairing)
    private var pairingCodeDisplay by mutableStateOf("")
    private var pairingStatusMessage by mutableStateOf("Initierar koppling...")
    private var pairingErrorMessage by mutableStateOf<String?>(null)
    private var isPairingBusy by mutableStateOf(false)
    private var pairingJob: Job? = null
    private val hidBuffer = StringBuilder()
    private var lastHidKeyTimestamp = 0L

    private val hidKeyTimeoutMs = 300L
    private val hidMaxLength = 64
    private val verifyIntervalMs = 90_000L
    private val pairingPollIntervalMs = 3_000L
    private val pairingAnnounceIntervalMs = 25_000L
    private val pairingSessionMaxPolls = 100
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
        pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        )

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
                        isBusy = isPairingBusy,
                        statusMessage = pairingStatusMessage,
                        errorMessage = pairingErrorMessage,
                    )
                    UiState.Idle -> IdleScreen(tenantName = kioskConfig?.tenantName)
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
    }

    override fun onResume() {
        super.onResume()
        nfcAdapter?.enableForegroundDispatch(this, pendingIntent, null, null)
        verifyHandler.postDelayed(verifyRunnable, verifyIntervalMs)
        if (uiState == UiState.Pairing) {
            startPairingLoop()
        }
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
        verifyHandler.removeCallbacks(verifyRunnable)
        pairingJob?.cancel()
        pairingJob = null
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        if (uiState != UiState.Idle) return

        val tag: Tag? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
        }

        tag?.let {
            val uid = it.id.joinToString("") { byte -> "%02X".format(byte) }
            requestBookingUrl(uid)
        }
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if (uiState != UiState.Idle) {
            return super.onKeyUp(keyCode, event)
        }

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
                    requestBookingUrl(uid.uppercase())
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

        return super.onKeyUp(keyCode, event)
    }

    private fun requestBookingUrl(uid: String) {
        uiState = UiState.Loading
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                fetchBookingUrl(uid)
            }
            if (result is BookingResult.Failure) {
                uiState = UiState.Idle
                return@launch
            }

            val success = result as BookingResult.Success
            uiState = UiState.Showing(success.fullUrl, success.bookingPath)
        }
    }

    private fun fetchBookingUrl(uid: String): BookingResult {
        val endpoint = if (kioskConfig?.screenToken?.isNotBlank() == true) {
            screenRfidLoginEndpoint
        } else {
            loginEndpoint
        }
        val token = kioskConfig?.screenToken?.takeIf { it.isNotBlank() }
        val primaryResult = doRequest(endpoint, uid, token)
        if (primaryResult is BookingResult.Failure && primaryResult.statusCode == 405) {
            val alternateUrl = if (endpoint.endsWith("/")) {
                endpoint.dropLast(1)
            } else {
                "$endpoint/"
            }
            return doRequest(alternateUrl, uid, token)
        }
        return primaryResult
    }

    private fun doRequest(requestUrl: String, uid: String, screenToken: String? = null): BookingResult {
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
                stream.write("""{"uid":"$uid"}""".toByteArray(Charsets.UTF_8))
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
                pairingCodeDisplay = code
                pairingStatusMessage = "Skriv in koden i admin för att koppla skärmen."
                val pairedConfig = runPairingFlow(code)
                if (pairedConfig != null) {
                    applyKioskConfig(pairedConfig)
                    withContext(Dispatchers.IO) { kioskConfigStore.save(pairedConfig) }
                    pairingCodeDisplay = ""
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
                pairingErrorMessage = "Ingen koppling ännu. Ny kod skapas..."
                delay(1500)
            }
            isPairingBusy = false
            pairingJob = null
        }
    }

    private suspend fun runPairingFlow(code: String): KioskConfig? {
        var lastAnnounceAt = 0L
        repeat(pairingSessionMaxPolls) {
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
                    return null
                }
                lastAnnounceAt = now
            }

            pairingStatusMessage = "Väntar på koppling från admin..."
            val claimResult = withContext(Dispatchers.IO) {
                postJson(
                    pairingClaimEndpoint,
                    JSONObject().put("pairing_code", code)
                )
            }
            if (claimResult.ok && !claimResult.body.isNullOrBlank()) {
                return try {
                    val payload = JSONObject(claimResult.body)
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
            if (claimResult.statusCode != null && claimResult.statusCode !in setOf(404, 409)) {
                return null
            }
            delay(pairingPollIntervalMs)
        }
        return null
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
        if (!statusResult.ok || statusResult.statusCode !in 200..299 || statusResult.body.isNullOrBlank()) {
            resetBindingToPairing()
            return
        }
        val stillConnected = try {
            val payload = JSONObject(statusResult.body)
            payload.optBoolean("connected", false)
        } catch (_: Exception) {
            false
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
        webViewRef?.apply {
            stopLoading()
            clearHistory()
            loadUrl("about:blank")
        }
        uiState = UiState.Idle
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
private fun IdleScreen(tenantName: String?) {
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
                text = tenantName?.takeIf { it.isNotBlank() } ?: "Bokningsskärm",
                color = Color.White,
                textAlign = TextAlign.Center,
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "Väntar på RFID-tag",
                color = Color(0xFFD1D5DB),
                textAlign = TextAlign.Center,
                fontSize = 22.sp
            )
            Text(
                text = "Blippa din tagg för att starta bokningsskärmen",
                color = Color.White,
                textAlign = TextAlign.Center
            )
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
    isBusy: Boolean,
    statusMessage: String,
    errorMessage: String?,
) {
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