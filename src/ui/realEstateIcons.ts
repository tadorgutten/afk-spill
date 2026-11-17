/** Strek-ikoner for eiendomsforbedringene (se UPGRADES i src/game/realEstate.ts). */
const svg = (content: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;

/** Kartnål ved stedsnavnet. */
export const pinIcon = svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>');

export const upgradeIcons: Record<string, string> = {
  // Hus og leilighet
  roller: svg('<rect x="3" y="3" width="14" height="5" rx="1.5"/><path d="M17 5.5h3v5h-8v3"/><rect x="10.5" y="13.5" width="3" height="7" rx="1"/>'),
  fridge: svg('<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M5 9.5h14M8.5 5.5v2M8.5 12.5v3"/>'),
  sofa: svg('<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3Z"/><path d="M5 17v2M19 17v2"/>'),
  cable: svg('<rect x="5" y="2.5" width="4" height="5" rx="1"/><rect x="15" y="2.5" width="4" height="5" rx="1"/><path d="M7 7.5v8a5 5 0 0 0 10 0v-8"/>'),
  parking: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>'),
  kitchen: svg('<rect x="3" y="10" width="18" height="11" rx="1.5"/><path d="M3 14h18M8 17h2M14 17h2"/><path d="M7 10V6a3 3 0 0 1 6 0"/>'),
  smart: svg('<path d="M3 11 12 4l9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 14a3.5 3.5 0 0 1 5 0M11 15.8a1.3 1.3 0 0 1 2 0"/>'),
  bike: svg('<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16 10 8h5l3 8M10 8l3 8h-7M9 5.5h3"/>'),
  // Villa
  pool: svg('<path d="M3 17c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0"/><path d="M3 20.5c1.5 1.2 3 1.2 4.5 0s3-1.2 4.5 0 3 1.2 4.5 0 3-1.2 4.5 0"/><path d="M8 14V5a2 2 0 0 1 4 0M14 14V5a2 2 0 0 1 4 0M8 8h6M8 11.5h6"/>'),
  tree: svg('<path d="M12 21v-5"/><path d="M12 3 6.5 10H9l-4 6h14l-4-6h2.5Z"/>'),
  film: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4"/>'),
  wine: svg('<path d="M8 3h8l-.5 5a3.5 3.5 0 0 1-7 0Z"/><path d="M12 11.5V20M8.5 20.5h7"/>'),
  shield: svg('<path d="M12 3 5 6v5.5c0 4.3 3 7.7 7 9.5 4-1.8 7-5.2 7-9.5V6Z"/><path d="m9 12 2 2 4-4"/>'),
  // Hotell
  bed: svg('<path d="M3 19V7M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11.5" r="1.8"/>'),
  spa: svg('<path d="M12 21c-4 0-7-2.5-7-6 2 0 5 1 7 3 2-2 5-3 7-3 0 3.5-3 6-7 6Z"/><path d="M12 18c-2-2-2.5-6 0-10 2.5 4 2 8 0 10Z"/>'),
  dining: svg('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2 1-3 4-3 7h3"/>'),
  presentation: svg('<rect x="3" y="4" width="18" height="11" rx="1.5"/><path d="M12 15v3M8 21l4-3 4 3M7 11l3-3 2 2 4-4"/>'),
  megaphone: svg('<path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1Z"/><path d="M7 15l1 5h2l-1-5M18 9.5a3 3 0 0 1 0 5"/>'),
  // Kontor (som i originalen: skriver, lyn, folk, kamera, stol)
  printer: svg('<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7Z"/><path d="M17 11h1"/>'),
  bolt: svg('<path d="M13 2 5 13.5h6L10 22l9-12.5h-6Z"/>'),
  people: svg('<circle cx="12" cy="6" r="2.5"/><circle cx="5.5" cy="13" r="2"/><circle cx="18.5" cy="13" r="2"/><path d="M8.5 13a3.5 3.5 0 0 1 7 0M2 20a3.5 3.5 0 0 1 7 0M15 20a3.5 3.5 0 0 1 7 0M12 8.5v3"/>'),
  camera: svg('<path d="M3 7h12l3 3v2H6Z"/><path d="M18 10l3-1.5v5L18 12M8 12v3M6 15h4M3 4v7"/>'),
  chair: svg('<rect x="7" y="2.5" width="10" height="9" rx="2"/><path d="M5 13.5h14M12 13.5v4M7 21l5-3.5 5 3.5M12 17.5V21"/>'),
  // Landemerke
  landmark: svg('<path d="M3 21h18M5 18h14M4 9h16L12 4Z"/><path d="M6.5 9v9M10 9v9M14 9v9M17.5 9v9"/>'),
  map: svg('<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z"/><path d="M9 4v13.5M15 6.5V20"/>'),
  ticket: svg('<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3Z"/><path d="M14 6v12" stroke-dasharray="2 2"/>'),
  bus: svg('<rect x="4" y="3" width="16" height="15" rx="2.5"/><path d="M4 11h16M7 21v-3M17 21v-3M7.5 14.5h1M15.5 14.5h1M9 6h6"/>'),
};
