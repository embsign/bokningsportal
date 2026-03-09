package com.example.brfbokatvttidkiosk

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.viewinterop.AndroidView
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

    private val baseUrl = "https://bokningsportal.app"
    private val loginEndpoint = "$baseUrl/api/rfid-login"

    private var nfcAdapter: NfcAdapter? = null
    private lateinit var pendingIntent: PendingIntent
    private var webViewRef: WebView? = null

    private var uiState by mutableStateOf<UiState>(UiState.Idle)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

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

    private fun requestBookingUrl(uid: String) {
        uiState = UiState.Loading
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                fetchBookingUrl(uid)
            }
            uiState = result ?: UiState.Idle
        }
    }

    private fun fetchBookingUrl(uid: String): UiState.Showing? {
        return try {
            val connection = (URL(loginEndpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10000
                readTimeout = 10000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
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

            if (inputStream == null) return null
            val responseBody = BufferedReader(InputStreamReader(inputStream)).use { it.readText() }
            if (responseCode !in 200..299) return null

            val json = JSONObject(responseBody)
            val bookingUrlRaw = json.optString("booking_url", "")
            if (bookingUrlRaw.isBlank()) return null

            val fullUrl = if (bookingUrlRaw.startsWith("http")) {
                bookingUrlRaw
            } else {
                baseUrl.trimEnd('/') + "/" + bookingUrlRaw.trimStart('/')
            }

            val bookingPath = if (bookingUrlRaw.startsWith("http")) {
                Uri.parse(bookingUrlRaw).path ?: ""
            } else {
                bookingUrlRaw
            }

            UiState.Showing(fullUrl, bookingPath)
        } catch (_: Exception) {
            null
        }
    }

    private fun shouldReturnToIdle(url: String?, bookingPath: String): Boolean {
        if (url.isNullOrBlank()) return false

        val uri = Uri.parse(url)
        if (uri.host != Uri.parse(baseUrl).host) return false

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