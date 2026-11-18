import type { Page, PageId } from '../pages/page';

/**
 * Den flytende, hvite menyen nederst (Apple-stil).
 *
 * - Trykk på et ikon, eller DRA den blå "pillen" bortover menyen.
 * - Ikonene blir blå akkurat der pillen er: et ikon som er halvveis inne er halvveis blått.
 *   Det gjøres med to lag ikoner: svarte under, og blå over som klippes til pillens form.
 * - Ny side lastes først når man slipper.
 *
 * Bevegelsen styres av en "fjær" (spring): pillen trekkes mot målet og bremses opp.
 *   - Trykk: fjæren er godt dempet, så pillen bare så vidt sklir forbi målet.
 *   - Dra: pillen blir "flytende glass" – den vokser litt, henger etter fingeren
 *     og strekkes i fartsretningen, og trekker seg sammen igjen når den stopper.
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

  // --- Innstillinger for bevegelsen ---------------------------------------------
  /** Trykk: stivhet og demping (0,82 = nesten ingen sprett, bare et lite hint). */
  const TAP = { stiffness: 320, damping: 0.82 };
  /** Dra: mykere fjær, så pillen henger litt etter fingeren. */
  const DRAG = { stiffness: 180, damping: 0.75 };
  /** Hvor mye større pillen blir mens man drar (0,14 = 14 %). */
  const LIFT_SCALE = 0.14;
  /** Hvor mye pillen strekkes av farten (og maks strekk). */
  const STRETCH_PER_SPEED = 1 / 2600;
  const MAX_STRETCH = 0.35;

  // --- Tilstand -----------------------------------------------------------------
  let x = 0; // pillens posisjon (px fra venstre, innenfor padding)
  let v = 0; // fart (px/s)
  let target = 0; // hvor fjæren trekker pillen
  let lift = 0; // 0 = vanlig, 1 = løftet (mens man drar)
  let stretch = 0; // strekk fra farten (glattet ut)
  let activeIndex = -1;
  let frame = 0;
  let lastTime = 0;

  const metrics = () => {
    const inner = container.clientWidth - PADDING * 2;
    return { inner, tab: inner / n };
  };

  function render() {
    const { inner, tab } = metrics();
    const grow = 1 + LIFT_SCALE * lift;
    const sx = grow * (1 + stretch);
    const sy = grow / Math.sqrt(1 + stretch); // litt flatere når den strekkes
    indicator.style.transform = `translateX(${x}px) scale(${sx}, ${sy})`;
    // Klipp de blå ikonene til nøyaktig samme område som pillen
    const w = tab * sx;
    const left = Math.max(0, x + tab / 2 - w / 2);
    const right = Math.max(0, inner - (x + tab / 2 + w / 2));
    overlay.style.clipPath = `inset(0 ${right}px 0 ${left}px round 999px)`;
  }

  /** Ett steg i animasjonen. Kjører til pillen står helt stille. */
  function step(now: number) {
    const dt = Math.min(0.032, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    const spring = dragging ? DRAG : TAP;
    // Fjær: kraft mot målet, minus demping (kritisk demping er 2·√stivhet)
    const accel = spring.stiffness * (target - x) - 2 * spring.damping * Math.sqrt(spring.stiffness) * v;
    v += accel * dt;
    x += v * dt;

    // Løft og strekk glir mykt mot ønsket verdi
    const wantLift = dragging ? 1 : 0;
    lift += (wantLift - lift) * Math.min(1, dt * 14);
    const wantStretch = dragging ? Math.min(MAX_STRETCH, Math.abs(v) * STRETCH_PER_SPEED) : 0;
    stretch += (wantStretch - stretch) * Math.min(1, dt * 12);

    render();
    const still = Math.abs(target - x) < 0.3 && Math.abs(v) < 5 && lift < 0.005 && stretch < 0.002;
    if (still && !dragging) {
      x = target;
      v = 0;
      lift = 0;
      stretch = 0;
      render();
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(step);
  }

  function animateTo(to: number) {
    target = to;
    if (!frame) {
      lastTime = performance.now();
      frame = requestAnimationFrame(step);
    }
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
      container.classList.add('dragging');
    }
    if (dragging) {
      const { inner, tab } = metrics();
      // Målet følger fingeren (midt på fingeren), men holder seg inne i menyen.
      // Pillen selv henger litt etter (fjæren).
      animateTo(Math.max(0, Math.min(inner - tab, localX(e) - tab / 2)));
    }
  });

  const release = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    const wasDragging = dragging;
    dragging = false;
    container.classList.remove('dragging');
    const { tab } = metrics();
    // Dra: fanen pillen (målet) er mest over. Trykk: fanen man trykket på.
    const index = clampIndex(wasDragging ? Math.round(target / tab) : Math.floor(localX(e) / tab));
    select(index);
  };
  container.addEventListener('pointerup', release);
  container.addEventListener('pointercancel', (e) => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    dragging = false;
    container.classList.remove('dragging');
    animateTo(activeIndex * metrics().tab); // tilbake dit den var
  });

  // Hold pillen på riktig sted hvis skjermen endrer størrelse (f.eks. rotasjon)
  window.addEventListener('resize', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    x = target = Math.max(0, activeIndex) * metrics().tab;
    v = 0;
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
        x = target = index * metrics().tab;
        render();
      } else {
        animateTo(index * metrics().tab);
      }
    },
  };
}
