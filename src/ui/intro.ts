/**
 * ÅPNINGSSKJERMEN (Torfor Studios)
 * Selve skjermen og animasjonene ligger i index.html, så den vises med en gang.
 * Her venter vi til spillet er klart OG logoen har fått vist seg ferdig,
 * og så åpner det svarte seg inn mot midten og viser pengesiden.
 *
 * I appen ligger Androids svarte startbilde over mens spillet lastes. Da er logoen satt
 * på pause (html.hold), og appen sender 'app-visible' når startbildet forsvinner.
 * Først da starter logo-animasjonen og nedtellingen.
 */
/** Hvor lenge logoen vises minst (ms fra den ble synlig). */
const MIN_SHOW_MS = 2000;
/** Hvor lang tid utgangen tar (må passe med index.html). */
const LEAVE_MS = 1050;
/** Hvis appen aldri sier fra (feil), start likevel etter så lang tid. */
const HOLD_FALLBACK_MS = 7000;

declare global {
  interface Window {
    /** Når startbildet forsvant (performance.now()), satt av appen. */
    __appVisible?: number;
  }
}

export function finishIntro() {
  const intro = document.getElementById('intro');
  if (!intro) return;
  const html = document.documentElement;
  if (html.classList.contains('no-intro')) {
    intro.remove();
    return;
  }

  const leave = (wait: number) =>
    setTimeout(() => {
      intro.classList.add('leaving');
      document.body.classList.add('intro-reveal');
      setTimeout(() => {
        intro.remove();
        document.body.classList.remove('intro-reveal');
      }, LEAVE_MS);
    }, wait);

  // Nettleser / gammel APK: logoen har vist seg siden siden ble lastet
  if (!html.classList.contains('hold') || window.__appVisible !== undefined) {
    html.classList.remove('hold');
    const shownAt = window.__appVisible ?? 0;
    leave(Math.max(0, MIN_SHOW_MS - (performance.now() - shownAt)));
    return;
  }

  // Appen: vent til det svarte startbildet er borte
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    html.classList.remove('hold');
    leave(MIN_SHOW_MS);
  };
  window.addEventListener('app-visible', start, { once: true });
  setTimeout(start, HOLD_FALLBACK_MS);
}
