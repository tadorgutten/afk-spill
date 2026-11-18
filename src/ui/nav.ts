import type { Page, PageId } from '../pages/page';

/**
 * Den flytende, hvite menyen nederst (Apple-stil).
 *
 * - Trykk på et ikon for å bytte side. Den blå "pillen" glir dit.
 * - Ikonene blir blå akkurat der pillen er: et ikon som er halvveis inne er halvveis blått.
 *   Det gjøres med to lag ikoner: svarte under, og blå over som klippes til pillens form.
 *
 * Bevegelsen styres av en "fjær" (spring) som er godt dempet,
 * så pillen bare så vidt sklir forbi målet før den legger seg på plass.
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
    // pointerdown gjør at byttet skjer med en gang fingeren treffer
    button.addEventListener('pointerdown', () => select(i));
    // Tastatur (Enter/mellomrom)
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

  // --- Fjæren -------------------------------------------------------------------
  /** Stivhet og demping (0,82 = nesten ingen sprett, bare et lite hint). */
  const STIFFNESS = 320;
  const DAMPING = 0.82;

  let x = 0; // pillens posisjon (px fra venstre, innenfor padding)
  let v = 0; // fart (px/s)
  let target = 0;
  let activeIndex = -1;
  let frame = 0;
  let lastTime = 0;

  const tabWidth = () => (container.clientWidth - PADDING * 2) / n;

  function render() {
    const inner = container.clientWidth - PADDING * 2;
    const tab = inner / n;
    indicator.style.transform = `translateX(${x}px)`;
    // Klipp de blå ikonene til nøyaktig samme område som pillen
    overlay.style.clipPath = `inset(0 ${inner - x - tab}px 0 ${x}px round 999px)`;
  }

  function step(now: number) {
    const dt = Math.min(0.032, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    const accel = STIFFNESS * (target - x) - 2 * DAMPING * Math.sqrt(STIFFNESS) * v;
    v += accel * dt;
    x += v * dt;
    if (Math.abs(target - x) < 0.3 && Math.abs(v) < 5) {
      x = target;
      v = 0;
      render();
      frame = 0;
      return;
    }
    render();
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
    animateTo(index * tabWidth());
    if (index !== activeIndex) {
      activeIndex = index;
      updateAria();
      onSelect(pages[index].id);
    }
  }

  function updateAria() {
    buttons.forEach((b, i) => b.toggleAttribute('aria-current', i === activeIndex));
  }

  // Hold pillen på riktig sted hvis skjermen endrer størrelse (f.eks. rotasjon)
  window.addEventListener('resize', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    x = target = Math.max(0, activeIndex) * tabWidth();
    v = 0;
    render();
  });

  return {
    /** Marker aktiv side (brukes ved oppstart). */
    setActive(id: PageId) {
      const index = Math.max(0, Math.min(n - 1, pages.findIndex((p) => p.id === id)));
      if (index === activeIndex) return;
      const first = activeIndex === -1;
      activeIndex = index;
      updateAria();
      if (first) {
        x = target = index * tabWidth();
        render();
      } else {
        animateTo(index * tabWidth());
      }
    },
  };
}
