package no.afkspill.app;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Appen kjører i fullskjerm (som et spill):
 * statuslinjen øverst (klokke, varsler) og navigasjonslinjen nederst skjules.
 * Sveip fra kanten av skjermen for å vise dem midlertidig.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Tøm WebView-ens mellomlager ved hver oppstart, så appen alltid henter
        // nyeste versjon av spillet fra GitHub Pages (ellers kan den vise en gammel i 10 min).
        // Lagringen (spillet ditt) ligger i Preferences og påvirkes ikke.
        getBridge().getWebView().clearCache(true);
        // Tegn appen helt ut til kantene, også bak kamerahullet
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        hideSystemBars();
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
