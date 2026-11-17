import type { Page, PageId } from '../pages/page';

/**
 * Den flytende, hvite menyen nederst (Apple-stil).
 *
 * - Trykk på et ikon, eller DRA den blå "pillen" bortover menyen.
 * - Ikonene blir blå akkurat der pillen er: et ikon som er halvveis inne er halvveis blått.
 *   Det gjøres med to lag ikoner: svarte under, og blå over som klippes til pillens form.
 * - Ny side lastes først når man slipper.
 */
export function createNav(container: HTMLElement, pages: Page[], onSelect: (id: PageId) => void) {
  const n = pages.length;
  const PADDING = 8; // samme som padding i CSS
  container.style.setProperty('--tabs', String(n));

  // Lag 1: pillen
  const indicator = document.createElement('div');
  indicator.className = 'nav-indicator';
  container.appendChild(indicator);

  // Lag 2: svarte ikoner (knappene)
  const buttons = pages.map((page, i) => {
    const button = document.createElement('button');
    button.className = 'nav-button';
    button.setAttribute('aria-label', page.label);
    button.innerHTML = page.icon;
    // Tastatur (Enter/mellomrom) – trykk med finger/mus håndteres under
    button.addEventListener('click', (e) => {
      if (e.detail === 0) select(i);
    });
    container.appendChild(button);
    return button;
  });

  // Lag 3: blå ikoner, klippet til pillen
  const overlay = document.createElement('div');
  overlay.className = 'nav-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = pages.map((p) => `<span>${p.icon}</span>`).join('');
  container.appendChild(overlay);

  // --- Posisjon og tegning -----------------------------------------------------
  let x = 0; // pillens posisjon (px fra venstre, innenfor padding)
  let activeIndex = -1;
  let animation = 0;

  const metrics = () => {
    const inner = container.clientWidth - PADDING * 2;
    return { inner, tab: inner / n };
  };

  function render() {
    const { inner, tab } = metrics();
    indicator.style.transform = `translateX(${x}px)`;
    // Klipp de blå ikonene til nøyaktig samme område som pillen
    overlay.style.clipPath = `inset(0 ${inner - x - tab}px 0 ${x}px round 999px)`;
  }

  /** "Spretten" overgang (litt forbi målet og tilbake), som på iPhone. */
  const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

  function animateTo(target: number) {
    cancelAnimationFrame(animation);
    const from = x;
    const start = performance.now();
    const duration = 380;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      x = from + (target - from) * easeOutBack(t);
      render();
      if (t < 1) animation = requestAnimationFrame(step);
    };
    animation = requestAnimationFrame(step);
  }

  function select(index: number) {
    animateTo(index * metrics().tab);
    if (index !== activeIndex) {
      activeIndex = index;
      updateAria();
      onSelect(pages[index].id);
    }
  }

  function updateAria() {
    buttons.forEach((b, i) => b.toggleAttribute('aria-current', i === activeIndex));
  }

  // --- Dra og trykk ---------------------------------------------------------
  let pointerId: number | null = null;
  let startX = 0;
  let dragging = false;

  /** Fingerens posisjon inne i menyen (px). */
  const localX = (e: PointerEvent) => e.clientX - container.getBoundingClientRect().left - PADDING;
  const clampIndex = (i: number) => Math.max(0, Math.min(n - 1, i));

  container.addEventListener('pointerdown', (e) => {
    pointerId = e.pointerId;
    startX = e.clientX;
    dragging = false;
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    // Først når fingeren har flyttet seg litt, regnes det som dra (ellers er det et trykk)
    if (!dragging && Math.abs(e.clientX - startX) > 6) {
      dragging = true;
      cancelAnimationFrame(animation);
      container.classList.add('dragging');
    }
    if (dragging) {
      const { inner, tab } = metrics();
      // Pillen følger fingeren (midt på fingeren), men holder seg inne i menyen
      x = Math.max(0, Math.min(inner - tab, localX(e) - tab / 2));
      render();
    }
  });

  const release = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    container.classList.remove('dragging');
    const { tab } = metrics();
    // Dra: fanen pillen er mest over. Trykk: fanen man trykket på.
    const index = clampIndex(dragging ? Math.round(x / tab) : Math.floor(localX(e) / tab));
    select(index);
  };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    container.classList.remove('dragging');
    animateTo(activeIndex * metrics().tab); // tilbake dit den var
  });

  // Hold pillen på riktig sted hvis skjermen endrer størrelse (f.eks. rotasjon)
  window.addEventListener('resize', () => {
    cancelAnimationFrame(animation);
    x = Math.max(0, activeIndex) * metrics().tab;
    render();
  });

  return {
    /** Marker aktiv side (brukes ved oppstart). */
    setActive(id: PageId) {
      const index = clampIndex(pages.findIndex((p) => p.id === id));
      if (index === activeIndex) return;
      const first = activeIndex === -1;
      activeIndex = index;
      updateAria();
      if (first) {
        x = index * metrics().tab;
        render();
      } else {
        animateTo(index * metrics().tab);
      }
    },
  };
}
