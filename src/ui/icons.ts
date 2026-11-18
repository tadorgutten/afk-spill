/**
 * Enkle strek-ikoner (SVG). De arver tekstfargen (currentColor),
 * så fargen styres fra CSS – svart vanligvis, blå på aktiv fane.
 */
const svg = (content: string, strokeWidth = 2) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;

export const icons = {
  // --- Menyen ---
  /** Investering: søyler og en stigende linje */
  investing: svg('<path d="M3 21h18"/><path d="M6 18v-3M10 18v-5M14 18v-4M18 18v-7"/><path d="m4 10 5-4 4 3 7-6"/><path d="M16 3h4v4"/>'),
  /** Bedrifter: kontorbygg */
  business: svg(
    '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8.5 7h2M13.5 7h2M8.5 11h2M13.5 11h2M8.5 15h2M13.5 15h2"/><path d="M10 21v-3h4v3"/>',
  ),
  /** Inntekt: mynt med "kr" */
  earnings: svg(
    '<circle cx="12" cy="12" r="9.5"/><text x="12" y="16.2" text-anchor="middle" font-size="12" font-weight="800" font-family="system-ui, sans-serif" fill="currentColor" stroke="none">$</text>',
  ),
  /** Gjenstander: fire ruter */
  items: svg(
    '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  ),
  /** Profil: person */
  profile: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),

  // --- Investering ---
  back: svg('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>'),
  chevronRight: svg('<path d="m9 18 6-6-6-6"/>'),
  arrowRight: svg('<path d="M4 12h16"/><path d="m14 6 6 6-6 6"/>', 1.6),
  briefcase: svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
  scale: svg(
    '<path d="M12 3v18M7 21h10M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/><path d="m2 16 3-8 3 8a4.5 4.5 0 0 1-6 0Z"/><path d="m16 16 3-8 3 8a4.5 4.5 0 0 1-6 0Z"/>',
    1.6,
  ),
  flame: svg(
    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    1.8,
  ),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  // --- Bedrifter ---
  /** Handlekurv (butikk) */
  basket: svg('<path d="M3 10h18l-1.8 9.2a2 2 0 0 1-2 1.8H6.8a2 2 0 0 1-2-1.8Z"/><path d="m7 10 4-6M17 10l-4-6"/><path d="M9 14v3M12 14v3M15 14v3"/>', 1.8),
  /** Taxi (bil med skilt på taket) */
  taxi: svg('<path d="M10 3h4l1 3"/><path d="M9 6h6"/><path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 6h7a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M5 17v2.5M19 17v2.5"/><circle cx="7.5" cy="14" r="1.2"/><circle cx="16.5" cy="14" r="1.2"/>', 1.7),
  /** Lastebil med fartsstreker (fraktselskap) */
  truck: svg('<path d="M1.5 7h2M1 10h2.5M2 13h1.5"/><path d="M5 5h10v11H5Z"/><path d="M15 9h3.5l3 3.5V16H15"/><circle cx="8.5" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>', 1.6),
  /** Fabrikk med skorsteiner */
  factory: svg('<path d="M3 21h18"/><path d="M4 21V11h16v10"/><path d="M6 11V4h2.5v7M10.75 11V4h2.5v7M15.5 11V4H18v7"/><path d="M7 14.5h2M11 14.5h2M15 14.5h2M7 17.5h2M11 17.5h2M15 17.5h2"/>', 1.5),
  /** Byggekran (byggefirma) */
  /** Bil med prislapp (bilforhandler) */
  /** Skjerm (IT-selskap) */
  /** Fly (flyselskap) */
  /** Skip (rederi) */
  /** Bedriftsplasser: ruter med et pluss */
  slots: svg('<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><path d="M17.25 14v6.5M14 17.25h6.5"/>', 1.7),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>', 1.7),
  pencil: svg('<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>', 1.6),
  /** Butikkfasade (utsalgssteder) */
  store: svg('<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 11.5V20h14v-8.5"/><path d="M10 20v-5h4v5"/>', 1.5),
  /** Søyler (trinn) */
  stage: svg('<rect x="3" y="14" width="4" height="6" rx="1"/><rect x="10" y="10" width="4" height="10" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/>', 1.6),
  clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4"/>', 1.8),
  arrowUp: svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 2.4),
  money: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>', 1.6),
  /** Mynt med "kr" (åpningskostnad) */
  coin: svg(
    '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><text x="12" y="16.2" text-anchor="middle" font-size="12" font-weight="800" font-family="system-ui, sans-serif" fill="#fff" stroke="none">$</text>',
  ),
  // --- Profil og skatt ---
  /** Kvittering med kr-tegn (skatt) */
  receipt: svg('<path d="M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21l-2.4-1.5L5 21Z"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4"/>', 1.6),
  /** Bank med søyler */
  bank: svg('<path d="M3 9.5 12 4l9 5.5"/><path d="M4 21h16M5 18h14M6.5 10.5v7M10 10.5v7M14 10.5v7M17.5 10.5v7"/>', 1.6),
  info: svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-5M12 8h.01"/>', 1.6),
  wallet: svg('<path d="M3 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>', 1.7),
  pause: svg('<circle cx="12" cy="12" r="9.5"/><path d="M10 9v6M14 9v6"/>', 1.6),
  ban: svg('<circle cx="12" cy="12" r="9.5"/><path d="m9 9 6 6M15 9l-6 6"/>', 1.6),
  chevronDown: svg('<path d="m6 9 6 6 6-6"/>', 2.2),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 2.4),
  /** Hengelås (låste kort) */
  lock: svg('<rect x="4.5" y="10.5" width="15" height="11" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><path d="M12 15v2.5"/>', 1.8),

  // --- Diverse ---
  /** Hånd som trykker (i klikkfeltet) */
  tap: svg(
    '<path d="M18 11V10a2 2 0 0 0-4 0"/><path d="M14 10V9a2 2 0 0 0-4 0v1"/><path d="M10 9.5V4a2 2 0 0 0-4 0v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    1.4,
  ),
};
