import './style.css';
import './business.css';
import './taxi.css';
import './empire.css';
import './profile.css';
import { App } from '@capacitor/app';
import { checkNewBestCard } from './game/cards';
import { removeRetiredBusinesses, tickBusinesses } from './game/business';
import { tickMarket } from './game/market';
import { tickCrypto } from './game/crypto';
import { tickRealEstate } from './game/realEstate';
import { showToast } from './ui/toast';
import { initStorage, loadState, saveState } from './game/state';
import { createBusinessPage } from './pages/business';
import { createEarningsPage } from './pages/earnings';
import { createInvestingPage } from './pages/investing';
import { createPlaceholderPage } from './pages/placeholder';
import { createProfilePage } from './pages/profile';
import { checkTaxes } from './game/taxes';
import { applyZoom } from './ui/zoom';
import type { PageId } from './pages/page';
import { icons } from './ui/icons';
import { createNav } from './ui/nav';
import { initLogos } from './ui/stockLogo';
import { initUpdater } from './ui/updater';
import { finishIntro } from './ui/intro';
import { formatMoney } from './ui/format';

applyZoom(); // hele appen litt mindre (se src/ui/zoom.ts)

await initStorage(); // hent lagringen fra telefonen før spillet starter
const state = loadState();
// Ta igjen det som skjedde i aksjemarkedet mens appen var lukket (inkl. utbytte)
tickMarket(state, Date.now());
tickCrypto(state, Date.now());
tickRealEstate(state, Date.now());
// Bedrifter som er fjernet fra spillet: legges ned, og man får tilbake alt man betalte
const retiredRefund = removeRetiredBusinesses(state);
tickBusinesses(state, Date.now());
checkTaxes(state);

const profilePage = createProfilePage(state);

// Sidene i menyen, fra venstre mot høyre
const pages = [
  createInvestingPage(state),
  createBusinessPage(state),
  createEarningsPage(state),
  createPlaceholderPage('items', 'Eiendeler', icons.items),
  profilePage,
];

const pageContainer = document.getElementById('page')!;
const nav = createNav(document.getElementById('nav')!, pages, showPage);
let currentPage = pages[2];

function showPage(id: PageId) {
  currentPage = pages.find((p) => p.id === id) ?? pages[2];
  pageContainer.replaceChildren(currentPage.element);
  document.body.dataset.page = currentPage.id;
  nav.setActive(currentPage.id);
  currentPage.onShow?.();
  currentPage.update(state);
  window.scrollTo(0, 0);
}

// "Gå til skatt" fra en bedrift: bytt til Profil og åpne Skatt
window.addEventListener('open-taxes', () => {
  showPage('profile');
  profilePage.openTaxes();
});

// Appen starter alltid på Inntekt (midten).
// For testing i nettleseren: legg til ?side=investing / business / profile i adressen.
const startPage = new URLSearchParams(location.search).get('side') as PageId | null;
showPage(startPage && pages.some((p) => p.id === startPage) ? startPage : 'earnings');

// Spillet er klart: la åpningsskjermen (Torfor Studios) åpne seg inn til pengesiden
finishIntro();
if (retiredRefund > 0) {
  setTimeout(() => showToast(`Noen bedriftstyper er fjernet. Du fikk tilbake ${formatMoney(retiredRefund)}`, 5000), 2500);
  saveState(state);
}

// Finn logobilder i public/logos/ (vises automatisk ved neste oppdatering)
initLogos();

// --- Mobilens tilbakeknapp (Android) ---------------------------------------------
// Går ett steg tilbake inne på siden (f.eks. Aksjemarkedet → Investering).
// Er man allerede på en hovedside, legges appen i bakgrunnen (spillet lagres).
App.addListener('backButton', () => {
  if (currentPage.onBack?.()) return;
  saveState(state);
  void App.minimizeApp();
}).catch(() => {
  // Ikke tilgjengelig i nettleseren – der brukes nettleserens egen tilbakeknapp
});

// Tilbake-pila får en skygge når man har scrollet (så den synes over innholdet)
window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', window.scrollY > 4), {
  passive: true,
});

// --- Spill-løkke --------------------------------------------------------------
let lastCardCheck = 0;
function loop() {
  const now = Date.now();
  tickMarket(state, now);
  tickCrypto(state, now);
  tickRealEstate(state, now); // leieinntekt fra eiendommene
  tickBusinesses(state, now); // inntekt fra bedriftene + ferdige utvidelser

  // Bankkort: lås opp nye kort når formuen er stor nok (sjekkes én gang i sekundet)
  if (now - lastCardCheck > 1000) {
    lastCardCheck = now;
    checkTaxes(state, now); // har skattefristen gått ut?
    const card = checkNewBestCard(state);
    if (card) showToast(`Nytt kort låst opp: ${card.name}!`, 4000);
  }

  currentPage.update(state);
  // Undersider (f.eks. inne i en bedrift) skjuler menyen nederst
  document.body.classList.toggle('nav-hidden', !!currentPage.navHidden?.());
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- Lagring: hvert 5. sekund, og når appen lukkes / legges i bakgrunnen ---
setInterval(() => saveState(state), 5000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveState(state);
});
window.addEventListener('pagehide', () => saveState(state));

// Hent ny versjon av spillet med en gang den er lagt ut (se src/ui/updater.ts)
initUpdater(() => saveState(state));
