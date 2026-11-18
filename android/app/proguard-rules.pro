# Regras R8/ProGuard para WebView Offline e JavascriptInterface
-keepattributes JavascriptInterface
-keepclassmembers class com.nexusplanilhas.app.MainActivity$AndroidBridge {
    @android.webkit.JavascriptInterface <methods>;
}
