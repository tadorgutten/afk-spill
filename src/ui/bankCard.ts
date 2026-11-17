/**
 * Tegner bankkortene. Hvert kort har sin egen bakgrunn (CSS-klassen card-<id>)
 * og sitt eget mønster (SVG under). Alt er laget med kode – ingen bilder.
 */

let uid = 0;
/** Unike id-er til fargeovergangene (flere kort kan vises samtidig). */
const nextId = () => `cg${++uid}`;

const svg = (content: string) =>
  `<svg class="bank-card-pattern" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${content}</svg>`;

/** Fargeovergang (metall-glans). `stops` = farger fra start til slutt. */
function gradient(id: string, stops: string[], x2 = 1, y2 = 1): string {
  const s = stops.map((c, i) => `<stop offset="${(i / (stops.length - 1)) * 100}%" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${s}</linearGradient>`;
}

/** Skrå "fasett"-linjer (brukes på edelsteinskortene). */
function facets(color: string, opacity: number): string {
  const lines = [
    'M150 0 L230 90 L400 40',
    'M230 90 L200 200',
    'M230 90 L330 200',
    'M290 0 L230 90',
    'M400 120 L330 200',
    'M230 90 L400 120',
    'M60 200 L150 0',
  ];
  return lines.map((d) => `<path d="${d}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.2" fill="none"/>`).join('');
}

const ART: Record<string, () => string> = {
  // Basis: myke bølgelinjer
  base: () => {
    let lines = '';
    for (let i = 0; i < 12; i++) {
      const y = 40 + i * 14;
      lines += `<path d="M120 ${y} C 200 ${y - 50}, 300 ${y + 60}, 420 ${y - 30}" stroke="#fff" stroke-opacity="${(0.03 + i * 0.012).toFixed(3)}" stroke-width="1.2" fill="none"/>`;
    }
    return svg(lines);
  },

  // Sølv: et bredt, blankt sølvbånd på skrå
  silver: () => {
    const g = nextId();
    return svg(`<defs>${gradient(g, ['#f5f7fa', '#9aa4af', '#e9edf1', '#7d8792'], 1, 0)}</defs>
      <polygon points="250,0 320,0 210,200 140,200" fill="url(#${g})" opacity="0.5"/>
      <polygon points="335,0 345,0 235,200 225,200" fill="#fff" opacity="0.35"/>`);
  },

  // Gull: en gullbue nederst til høyre med tynne ringer
  gold: () => {
    const g = nextId();
    let rings = '';
    for (let i = 0; i < 5; i++) rings += `<circle cx="400" cy="200" r="${150 + i * 22}" stroke="#e8c45c" stroke-opacity="${0.18 - i * 0.03}" fill="none"/>`;
    return svg(`<defs>${gradient(g, ['#fbe38e', '#d4a73a', '#f6d77a', '#b8862a'])}</defs>
      ${rings}
      <path d="M250 200 C 300 140, 350 110, 400 105 L400 200 Z" fill="url(#${g})"/>
      <path d="M235 200 C 290 128, 345 96, 400 90" stroke="#f6d77a" stroke-width="2" fill="none" opacity="0.7"/>`);
  },

  // Platinum: to metallbånd som krysser kortet
  platinum: () => {
    const g = nextId();
    return svg(`<defs>${gradient(g, ['#ffffff', '#b9c0c8', '#6e757e', '#dfe3e8'])}</defs>
      <polygon points="300,0 400,0 400,40 240,200 140,200" fill="url(#${g})" opacity="0.55"/>
      <polygon points="400,90 400,130 330,200 290,200" fill="url(#${g})" opacity="0.8"/>`);
  },

  // Safir, Smaragd, Rubin: edelsteinsfasetter med lys glans
  sapphire: () => svg(`${facets('#9cc4ff', 0.35)}<circle cx="320" cy="40" r="90" fill="#7fb2ff" opacity="0.12"/>`),
  emerald: () => {
    let hex = '';
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 9; col++) {
        const x = 170 + col * 28 + (row % 2) * 14;
        const y = row * 42 + 10;
        hex += `<path d="M${x} ${y} l12 7 v14 l-12 7 l-12 -7 v-14 Z" stroke="#7df0c2" stroke-opacity="0.16" fill="none"/>`;
      }
    return svg(hex);
  },
  ruby: () => svg(`${facets('#ff9aae', 0.3)}<circle cx="80" cy="200" r="110" fill="#ff5a7a" opacity="0.1"/>`),

  // Titan: børstet metall (mange tynne streker)
  titan: () => {
    let lines = '';
    for (let y = 2; y < 200; y += 4) lines += `<line x1="0" x2="400" y1="${y}" y2="${y}" stroke="#fff" stroke-opacity="${(0.02 + ((y * 7) % 5) * 0.012).toFixed(3)}"/>`;
    return svg(`${lines}<polygon points="0,0 120,0 40,200 0,200" fill="#fff" opacity="0.05"/>`);
  },

  // Obsidian: blank, svart stein med lilla glans
  obsidian: () => {
    const g = nextId();
    return svg(`<defs><radialGradient id="${g}" cx="0.8" cy="0.1" r="0.7"><stop offset="0%" stop-color="#b48cff" stop-opacity="0.45"/><stop offset="100%" stop-color="#b48cff" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="200" fill="url(#${g})"/>
      <polygon points="180,0 230,0 120,200 70,200" fill="#fff" opacity="0.06"/>`);
  },

  // Black Deluxe: gullstreker som danner skarpe flater
  blackdeluxe: () => {
    const g = nextId();
    const paths = [
      'M0 60 L70 20 L150 70 L230 10 L320 60 L400 20',
      'M70 20 L60 120 L150 70 L170 170 L60 120 L0 160',
      'M230 10 L250 120 L150 70',
      'M250 120 L320 60 L360 150 L400 110',
      'M170 170 L250 120 L280 200',
      'M360 150 L330 200',
    ];
    return svg(`<defs>${gradient(g, ['#f9e08a', '#b98a2e', '#f3d27a'], 1, 0)}</defs>
      ${paths.map((d) => `<path d="${d}" stroke="url(#${g})" stroke-width="1.6" fill="none" opacity="0.75"/>`).join('')}`);
  },

  // Diamant: glitrende stein (den prikkede doble rammen lages i CSS, så den passer alle størrelser)
  diamond: () => {
    const g = nextId();
    return svg(`<defs>${gradient(g, ['#ffffff', '#c9d3de', '#7d8a99', '#ffffff'])}</defs>
      <g transform="translate(348 92) scale(0.8)" opacity="0.9">
        <polygon points="-34,-14 -18,-30 18,-30 34,-14 0,30" fill="url(#${g})"/>
        <path d="M-34 -14 H34 M-18 -30 L-8 -14 L0 30 L8 -14 L18 -30 M-8 -14 L0 -30 L8 -14" stroke="#5b6675" stroke-opacity="0.6" fill="none"/>
      </g>
      <path d="M320 64 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 Z" fill="#fff" opacity="0.8"/>`);
  },

  // Infinity: regnbue-uendelighetstegn og stjerner
  infinity: () => {
    const g = nextId();
    let stars = '';
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % 400;
      const y = (i * 53) % 200;
      stars += `<circle cx="${x}" cy="${y}" r="${(i % 3) * 0.5 + 0.6}" fill="#fff" opacity="${0.25 + (i % 4) * 0.12}"/>`;
    }
    return svg(`<defs>${gradient(g, ['#ff6ec7', '#ffd36e', '#6effc4', '#6ec8ff', '#b36eff'], 1, 0)}</defs>
      ${stars}
      <path d="M260 100 C 260 60, 320 60, 340 100 C 360 140, 420 140, 420 100 C 420 60, 360 60, 340 100 C 320 140, 260 140, 260 100 Z"
        transform="translate(140 22) scale(0.58)" stroke="url(#${g})" stroke-width="7" fill="none" opacity="0.85"/>`);
  },
};

/** HTML for et bankkort. Saldoen fylles inn i elementet med `data-card-balance`. */
export function bankCard(cardId: string, number: string, expiry: string, balance = ''): string {
  const art = (ART[cardId] ?? ART.base)();
  return `
    <div class="bank-card card-${cardId}">
      ${art}
      <div class="bank-card-top">
        <span>**** ${number}</span>
        <span>${expiry}</span>
      </div>
      <div class="bank-card-label">Saldo:</div>
      <div class="bank-card-balance" data-card-balance>${balance}</div>
    </div>`;
}
