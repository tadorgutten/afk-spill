/**
 * ÅPNINGSSKJERMEN (Torfor Studios)
 * Selve skjermen og animasjonene ligger i index.html, så den vises med en gang.
 * Her venter vi til spillet er klart OG logoen har fått vist seg ferdig,
 * og så åpner det svarte seg inn mot midten og viser pengesiden.
 */
/** Hvor lenge logoen vises minst (ms fra appen startet). */
const MIN_SHOW_MS = 2000;
/** Hvor lang tid utgangen tar (må passe med index.html). */
const LEAVE_MS = 1050;

export function finishIntro() {
  const intro = document.getElementById('intro');
  if (!intro) return;
  if (document.documentElement.classList.contains('no-intro')) {
    intro.remove();
    return;
  }
  const wait = Math.max(0, MIN_SHOW_MS - performance.now());
  setTimeout(() => {
    intro.classList.add('leaving');
    document.body.classList.add('intro-reveal');
    setTimeout(() => {
      intro.remove();
      document.body.classList.remove('intro-reveal');
    }, LEAVE_MS);
  }, wait);
}
