/**
 * AUTOMATISK OPPDATERING
 * GitHub Pages lar telefonen mellomlagre siden i opptil 10 minutter, så appen kan vise
 * en gammel versjon en stund etter en push. Her sjekker vi selv (uten mellomlager) om
 * det finnes en nyere versjon, og laster den inn i så fall.
 *
 * Sjekken kjøres når appen starter, når den kommer tilbake fra bakgrunnen, og hvert 5. minutt.
 * Vite gir JS-fila et nytt navn (index-XXXX.js) for hver versjon, så vi sammenligner navnet.
 */
const SCRIPT_RE = /assets\/index-[\w-]+\.js/;

function currentScript(): string | null {
  for (const s of document.querySelectorAll<HTMLScriptElement>('script[src]')) {
    const m = s.src.match(SCRIPT_RE);
    if (m) return m[0];
  }
  return null;
}

async function check(beforeReload: () => Promise<void>) {
  const mine = currentScript();
  if (!mine || !navigator.onLine) return; // dev-server eller uten nett: ingenting å sjekke
  try {
    const base = location.href.split(/[?#]/)[0];
    const res = await fetch(`${base}?sjekk=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const latest = (await res.text()).match(SCRIPT_RE)?.[0];
    if (!latest || latest === mine) return;
    // Ikke prøv i ring hvis noe er rart: maks ett forsøk per versjon
    const key = `oppdatert-til-${latest}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    await beforeReload(); // lagre spillet først (vent til det er skrevet)
    // Ny adresse (?v=...) gjør at nettleseren ikke kan bruke den gamle kopien
    location.replace(`${base}?v=${Date.now()}`);
  } catch {
    // Uten nett eller feil: prøv igjen neste gang
  }
}

export function initUpdater(beforeReload: () => Promise<void>) {
  check(beforeReload);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check(beforeReload);
  });
  setInterval(() => check(beforeReload), 5 * 60_000);
}
