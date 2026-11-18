package com.nexusplanilhas.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import com.nexusplanilhas.app.ui.theme.DarkBackground
import com.nexusplanilhas.app.ui.theme.NexoTheme
import java.io.File
import java.io.FileOutputStream

class MainActivity : ComponentActivity() {

    companion object {
        private const val NOTIFICATION_CHANNEL_ID = "nexo_alertas"
    }

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var webViewRef: WebView? = null

    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        webViewRef?.post {
            webViewRef?.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('androidNotificationPermission', { detail: { granted: $granted } }));",
                null
            )
        }
    }

    private val openFileLauncher = registerForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
        val callback = fileUploadCallback
        fileUploadCallback = null
        if (callback != null) {
            if (uris.isNotEmpty()) {
                callback.onReceiveValue(uris.toTypedArray())
            } else {
                callback.onReceiveValue(null)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Alertas Nexo Financeiro"
            val descriptionText = "Lembretes de vencimento, metas e inteligência do momento"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(NOTIFICATION_CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableVibration(true)
                enableLights(true)
                lightColor = 0xFFDC143C.toInt()
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun hasPostNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun askNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasPostNotificationPermission()) {
            requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        createNotificationChannel()
        askNotificationPermissionIfNeeded()

        // Barra de status e barra de navegação (||| O <) sempre em modo escuro com ícones claros
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(0xFF08090D.toInt()),
            navigationBarStyle = SystemBarStyle.dark(0xFF08090D.toInt())
        )

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    val webView = webViewRef
                    if (webView != null && webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                    }
                }
            }
        )

        setContent {
            NexoTheme(darkTheme = true) {
                val assetLoader = remember {
                    WebViewAssetLoader.Builder()
                        .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
                        .build()
                }

                // Respeita todos os insets do sistema (barra de status, notch e botões ||| O <)
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DarkBackground)
                        .windowInsetsPadding(WindowInsets.safeDrawing)
                ) {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { ctx ->
                            WebView(ctx).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                setBackgroundColor(0xFF08090D.toInt())
                                overScrollMode = View.OVER_SCROLL_NEVER

                                settings.apply {
                                    javaScriptEnabled = true
                                    domStorageEnabled = true
                                    databaseEnabled = true
                                    allowFileAccess = false
                                    allowContentAccess = true
                                    setSupportZoom(false)
                                    builtInZoomControls = false
                                    displayZoomControls = false
                                    useWideViewPort = true
                                    loadWithOverviewMode = true
                                    cacheMode = WebSettings.LOAD_DEFAULT
                                }

                                addJavascriptInterface(AndroidBridge(), "AndroidBridge")

                                webViewClient = object : WebViewClient() {
                                    override fun shouldInterceptRequest(
                                        view: WebView,
                                        request: WebResourceRequest
                                    ): WebResourceResponse? {
                                        return assetLoader.shouldInterceptRequest(request.url)
                                    }
                                }

                                webChromeClient = object : WebChromeClient() {
                                    override fun onShowFileChooser(
                                        webView: WebView?,
                                        filePathCallback: ValueCallback<Array<Uri>>?,
                                        fileChooserParams: FileChooserParams?
                                    ): Boolean {
                                        fileUploadCallback?.onReceiveValue(null)
                                        fileUploadCallback = filePathCallback
                                        val rawAcceptTypes = fileChooserParams?.acceptTypes
                                            ?.flatMap { it.split(',') }
                                            ?.map { it.trim() }
                                            ?.filter { it.isNotBlank() }
                                            .orEmpty()

                                        // O seletor de documentos do Android (EXTRA_MIME_TYPES) bloqueia arquivos .json
                                        // quando recebe extensões literais (".json") ou MIME estrito em alguns gerenciadores.
                                        // Mantemos filtro de imagem para comprovantes e "*/*" nos demais casos (backup JSON/CSV).
                                        val hasOnlyImages = rawAcceptTypes.isNotEmpty() &&
                                            rawAcceptTypes.all { it.startsWith("image/") }
                                        val mimeTypes = if (hasOnlyImages) {
                                            rawAcceptTypes.toTypedArray()
                                        } else {
                                            arrayOf("*/*")
                                        }

                                        return try {
                                            openFileLauncher.launch(mimeTypes)
                                            true
                                        } catch (e: Exception) {
                                            fileUploadCallback = null
                                            false
                                        }
                                    }
                                }

                                loadUrl("https://appassets.androidplatform.net/assets/www/index.html")
                                webViewRef = this
                            }
                        }
                    )
                }

                DisposableEffect(Unit) {
                    onDispose {
                        webViewRef = null
                    }
                }
            }
        }
    }

    inner class AndroidBridge {
        @JavascriptInterface
        fun hasNotificationPermission(): Boolean {
            return hasPostNotificationPermission()
        }

        @JavascriptInterface
        fun requestNotificationPermission() {
            runOnUiThread {
                askNotificationPermissionIfNeeded()
            }
        }

        @JavascriptInterface
        fun showNotification(notificationId: Int, title: String, body: String) {
            runOnUiThread {
                try {
                    if (!hasPostNotificationPermission()) {
                        askNotificationPermissionIfNeeded()
                        return@runOnUiThread
                    }
                    createNotificationChannel()
                    val openAppIntent = Intent(this@MainActivity, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    }
                    val pendingIntent = PendingIntent.getActivity(
                        this@MainActivity,
                        notificationId,
                        openAppIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                    val largeIcon = BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
                    val notification = NotificationCompat.Builder(this@MainActivity, NOTIFICATION_CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_notification)
                        .setLargeIcon(largeIcon)
                        .setColor(0xFF9CA1B0.toInt())
                        .setColorized(false)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent)
                        .build()

                    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.notify(notificationId, notification)
                } catch (_: Exception) {
                    // Falha silenciosa para não interromper fluxo offline
                }
            }
        }

        @JavascriptInterface
        fun saveFile(filename: String, mimeType: String, base64Content: String) {
            runOnUiThread {
                try {
                    val bytes = Base64.decode(base64Content, Base64.DEFAULT)
                    val safeName = filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val values = ContentValues().apply {
                            put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                            put(MediaStore.Downloads.MIME_TYPE, mimeType)
                            put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                        }
                        val resolver = contentResolver
                        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                        if (uri != null) {
                            resolver.openOutputStream(uri)?.use { it.write(bytes) }
                        }
                    } else {
                        @Suppress("DEPRECATION")
                        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                        if (!downloadsDir.exists()) downloadsDir.mkdirs()
                        val file = File(downloadsDir, safeName)
                        FileOutputStream(file).use { it.write(bytes) }
                    }
                    Toast.makeText(
                        this@MainActivity,
                        "Salvo em Downloads: $safeName",
                        Toast.LENGTH_LONG
                    ).show()
                } catch (e: Exception) {
                    Toast.makeText(
                        this@MainActivity,
                        "Erro ao salvar arquivo: ${e.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }
}
