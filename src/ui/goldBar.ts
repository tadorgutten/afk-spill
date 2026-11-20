/*
 * Gullbarren: ikonet (SVG) og vinduet som vises når man får dagens barre.
 */

let uid = 0;

/** Gullbarre sett litt fra siden, med blank glans. */
export function goldBarSvg(cls = ''): string {
  const id = `gb${uid++}`;
  return `<svg class="gold-bar ${cls}" viewBox="0 0 64 44" aria-hidden="true">
    <defs>
      <linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff6c4"/><stop offset=".45" stop-color="#ffd84d"/><stop offset="1" stop-color="#f0a915"/>
      </linearGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f6b81f"/><stop offset="1" stop-color="#c47a08"/>
      </linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#d98d0b"/><stop offset="1" stop-color="#a65f04"/>
      </linearGradient>
    </defs>
    <path d="M14 6h36l12 22H2Z" fill="url(#${id}t)"/>
    <path d="M2 28h60v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3Z" fill="url(#${id}f)"/>
    <path d="M50 6l12 22v9L50 15Z" fill="url(#${id}s)" opacity=".55"/>
    <path d="M18 10h28l7 13H11Z" fill="#fff" opacity=".22"/>
    <path d="M19 9.5 14 19" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
    <path d="M6 33h52" stroke="#ffe08a" stroke-width="1.2" opacity=".6"/>
  </svg>`;
}

/** Viser vinduet "Daglig belønning: +1 gullbarre". */
export function showDailyBar(total: number): void {
  const sparkles = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const r = 105 + (i % 3) * 18;
    return `<i style="--x:${Math.round(Math.cos(a) * r)}px;--y:${Math.round(Math.sin(a) * r)}px;--d:${(i % 5) * 0.12}s"></i>`;
  }).join('');
  const el = document.createElement('div');
  el.className = 'daily-overlay';
  el.innerHTML = `
    <div class="daily-box" role="dialog" aria-label="Daglig belønning">
      <span class="daily-label">Daglig belønning</span>
      <div class="daily-stage">
        <span class="daily-rays"></span>
        <span class="daily-sparks">${sparkles}</span>
        ${goldBarSvg('big')}
        <b class="daily-plus">+1</b>
      </div>
      <h2>Du fikk en gullbarre!</h2>
      <p>Takk for at du kom innom i dag. Kom tilbake i morgen for en ny.</p>
      <div class="daily-total">${goldBarSvg('mini')}<span>Du har nå <b>${total}</b></span></div>
      <button class="daily-btn">Hent</button>
    </div>`;
  const close = () => {
    el.classList.add('closing');
    setTimeout(() => el.remove(), 260);
  };
  el.querySelector('.daily-btn')!.addEventListener('click', close);
  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });
  document.body.appendChild(el);
}
