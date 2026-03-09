package com.example.brfbokatvttidkiosk

import android.app.PendingIntent
import android.content.Intent
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
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.lifecycleScope
import com.example.brfbokatvttidkiosk.ui.theme.BRFBokaTvättidKioskTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : ComponentActivity() {

    private val frontendBaseUrl = "https://bokningsportal.app"
    private val apiBaseUrl = "https://bokningsportal.embsign.workers.dev"
    private val loginEndpoint = "$apiBaseUrl/api/rfid-login"

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var pendingIntent: PendingIntent
    private var webViewRef: WebView? = null

    private var uiState by mutableStateOf<UiState>(UiState.Idle)
    private val hidBuffer = StringBuilder()
    private var lastHidKeyTimestamp = 0L

    private val hidKeyTimeoutMs = 300L
    private val hidMaxLength = 64

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).let { controller ->
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }

        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
        )

        setContent {
            BRFBokaTvättidKioskTheme {
                when (val state = uiState) {
                    UiState.Idle -> IdleScreen()
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
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
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
        val primaryResult = doRequest(loginEndpoint, uid)
        if (primaryResult is BookingResult.Failure && primaryResult.statusCode == 405) {
            val alternateUrl = if (loginEndpoint.endsWith("/")) {
                loginEndpoint.dropLast(1)
            } else {
                "$loginEndpoint/"
            }
            return doRequest(alternateUrl, uid)
        }
        return primaryResult
    }

    private fun doRequest(requestUrl: String, uid: String): BookingResult {
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
    data object Idle : UiState
    data object Loading : UiState
    data class Showing(val url: String, val bookingPath: String) : UiState
}

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
private fun IdleScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Blippa din tagg för att starta bokningsskärmen",
            color = Color.White,
            textAlign = TextAlign.Center
        )
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