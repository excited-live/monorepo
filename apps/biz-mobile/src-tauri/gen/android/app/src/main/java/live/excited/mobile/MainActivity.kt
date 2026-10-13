package live.excited.mobile

import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent

class AndroidBridge(private val activity: MainActivity) {
  @JavascriptInterface
  fun openBrowser(url: String) {
    activity.runOnUiThread {
      try {
        // Signal Orange (#CF4500) brand topbar theming
        val colorParams = CustomTabColorSchemeParams.Builder()
          .setToolbarColor(Color.parseColor("#CF4500"))
          .setNavigationBarColor(Color.parseColor("#121212"))
          .build()

        val customTabsIntent = CustomTabsIntent.Builder()
          .setShowTitle(true)
          .setUrlBarHidingEnabled(true)
          .setDefaultColorSchemeParams(colorParams)
          .build()

        customTabsIntent.launchUrl(activity, Uri.parse(url))
      } catch (e: Exception) {
        try {
          val fallbackIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
          fallbackIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          activity.startActivity(fallbackIntent)
        } catch (_: Exception) {}
      }
    }
  }
}

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webView.addJavascriptInterface(AndroidBridge(this), "AndroidNative")
  }
}
