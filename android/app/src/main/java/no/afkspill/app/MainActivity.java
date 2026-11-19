package no.afkspill.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/**
 * Appen kjører i fullskjerm (som et spill):
 * statuslinjen øverst (klokke, varsler) og navigasjonslinjen nederst skjules.
 * Sveip fra kanten av skjermen for å vise dem midlertidig.
 *
 * Oppstart: Androids svarte startbilde ligger over alt til spillet (Torfor Studios-logoen)
 * faktisk er tegnet. Ellers kan nettleservinduet blinke hvitt mens spillet lastes.
 */
public class MainActivity extends BridgeActivity {

    /** Hvor lenge startbildet maks ligger over (hvis siden aldri melder at den er klar). */
    private static final long MAX_SPLASH_MS = 6000;
    /** Litt ekstra tid etter at siden er klar, så første bilde rekker å bli tegnet. */
    private static final long AFTER_READY_MS = 150;

    private volatile boolean webReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        final long start = SystemClock.uptimeMillis();
        splash.setKeepOnScreenCondition(() -> !webReady && SystemClock.uptimeMillis() - start < MAX_SPLASH_MS);

        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        // Tøm WebView-ens mellomlager ved hver oppstart, så appen alltid henter
        // nyeste versjon av spillet fra GitHub Pages (ellers kan den vise en gammel i 10 min).
        // Lagringen (spillet ditt) ligger i Preferences og påvirkes ikke.
        webView.clearCache(true);
        webView.setBackgroundColor(Color.BLACK);
        getWindow().getDecorView().setBackgroundColor(Color.BLACK);

        // Ta bort startbildet først når siden er tegnet
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                markReady(view);
            }

            @Override
            public void onPageLoaded(WebView view) {
                markReady(view);
            }
        });

        // Tegn appen helt ut til kantene, også bak kamerahullet
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        hideSystemBars();
    }

    private void markReady(WebView view) {
        if (webReady) return;
        view.postDelayed(() -> {
            webReady = true;
            // Nå forsvinner det svarte startbildet: si fra til spillet, så logo-animasjonen starter
            view.evaluateJavascript(
                "document.documentElement.classList.remove('hold');window.__appVisible=performance.now();window.dispatchEvent(new Event('app-visible'))",
                null);
        }, AFTER_READY_MS);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        // Skjul igjen når man kommer tilbake til appen
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }
}
