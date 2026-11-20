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
  // --- Byggefirma ---
  /** Kranblokk med krok */
  hook: svg('<rect x="6" y="2.5" width="12" height="7" rx=".5"/><path d="M12 9.5v4"/><path d="M12 13.5a3 3 0 1 1-3 3"/>', 1.5),
  /** Murstein med murskje */
  bricks: svg('<path d="M3 15h6M11 15h6M3 19h3M8 19h7M17 19h4M6 11h5"/><path d="m13 11 6-6M17 3l4 4-2 2-4-4Z"/>', 1.8),
  /** Klokke med stiplet kant (under bygging) */
  clockDashed: svg('<path d="M12 3a9 9 0 0 1 9 9"/><path d="M21 12a9 9 0 0 1-9 9" stroke-dasharray="2 3"/><path d="M12 21a9 9 0 0 1 0-18" /><path d="M12 7v5l3 2"/>', 1.6),
  /** Hake i sirkel (ferdig) */
  checkCircle: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', 1.6),
  /** Bygningsarbeider med hjelm */
  worker: svg('<path d="M7 9a5 5 0 0 1 10 0"/><path d="M5.5 9h13"/><path d="M12 4v2"/><path d="M8 10.5a4 4 0 0 0 8 0"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M10 15v6M14 15v6"/>', 1.4),
  /** Metallbarrer */
  ingots: svg('<path d="M4 20h7l-1.5-5h-4Z"/><path d="M13 20h7l-1.5-5h-4Z"/><path d="M8.5 14h7L14 9h-4Z"/>', 1.4),
  /** Tømmerstokker */
  logs: svg('<rect x="3" y="5" width="18" height="4" rx="2"/><rect x="3" y="10" width="18" height="4" rx="2"/><rect x="3" y="15" width="18" height="4" rx="2"/><circle cx="5" cy="7" r=".8"/><circle cx="5" cy="12" r=".8"/><circle cx="5" cy="17" r=".8"/>', 1.4),
  /** Betongblander */
  mixer: svg('<path d="M6 6l9 3-2 6-8-3Z"/><path d="M15 9l3-2"/><path d="M9 14l-2 6"/><path d="M13 15l2 5"/><circle cx="7" cy="20" r="1.2"/><path d="M15 20h4"/>', 1.4),
  /** Prislapp */
  tag: svg('<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9Z"/><circle cx="8" cy="8" r="1.4"/>', 1.6),
  /** Dollartegn */
  dollar: svg('<path d="M12 3v18"/><path d="M16.5 7.5A3.5 3 0 0 0 13 5h-2a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6h-2a3.5 3 0 0 1-3.5-2.5"/>', 2.4),
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
  // --- Bilforhandler ---
  /** Bil med åpent panser (bilforhandler) */
  dealer: svg('<path d="M2.5 18v-5.5l2-5h8.5l3.5 5h3.5a1.5 1.5 0 0 1 1.5 1.5v4h-2"/><path d="M12.5 7.5 20 3.5"/><path d="M5 12.5h11"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M9 18h6"/>', 1.6),
  /** Motor */
  engine: svg('<path d="M6 9h2V7h6v2h3l2 2h2v6h-2l-2 2H8l-2-2H4v-6h2Z"/><path d="M2 11v5M10 4h4M12 4v3"/><path d="m12.5 10-2 3h3l-2 3"/>', 1.5),
  /** Girkasse (tannhjul) */
  transmission: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/>', 1.5),
  /** Understell (hjul og aksler) */
  chassis: svg('<rect x="3" y="2.5" width="4" height="6" rx="1"/><rect x="17" y="2.5" width="4" height="6" rx="1"/><rect x="3" y="15.5" width="4" height="6" rx="1"/><rect x="17" y="15.5" width="4" height="6" rx="1"/><path d="M7 5.5h10M7 18.5h10M12 5.5v13"/>', 1.5),
  /** Karosseri (bildør) */
  carBody: svg('<path d="M3 20V12l6-7h12v15Z"/><path d="M3.5 12.5H21"/><path d="M15 15.5h3"/><path d="M3 18h18"/>', 1.5),
  /** Elektrisk anlegg (kretskort) */
  electrics: svg('<rect x="5" y="6" width="14" height="12" rx="2"/><path d="M8 6V3M12 6V3M16 6V3M8 21v-3M12 21v-3M16 21v-3"/><path d="M8.5 12h7M8.5 12l2-2M8.5 12l2 2M15.5 12l-2-2M15.5 12l-2 2"/>', 1.4),
  /** Interiør (bilsete) */
  seat: svg('<path d="M9 2.5h6l-.5 9h-5Z"/><path d="M7.5 13.5h9l1 5.5h-11Z"/><path d="M10 6h4M10 9h4M9 15.5l6 2M15 15.5l-6 2"/><path d="M7 19v2.5M17 19v2.5"/>', 1.4),
  /** Skiftenøkkel */
  wrench: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>', 1.6),
  /** Skrutrekker og skiftenøkkel (verksted) */
  tools: svg('<path d="m3 21 8-8"/><path d="M11 13 9 11l1-1 2 2"/><path d="M13.5 6.8a4.5 4.5 0 0 1 5.7-4.3l-2.7 2.7.5 2.3 2.3.5 2.7-2.7a4.5 4.5 0 0 1-5.7 5.7L8.5 18.8a1.8 1.8 0 0 1-2.6-2.6Z"/>', 1.6),
  /** Bilutstilling (bygg med glassvegg) */
  showroom: svg('<path d="M3 21V4h18v17"/><path d="M3 9h18M8 9v12M12 9v12M16 9v12M3 15h18"/><path d="M2 21h20"/>', 1.4),
  /** Ferdigheter (person i et tannhjul) */
  skills: svg('<circle cx="12" cy="9" r="2.6"/><path d="M7.5 17a4.5 4.5 0 0 1 9 0"/><circle cx="12" cy="12" r="9.5" stroke-dasharray="2.5 2.5"/><circle cx="12" cy="2.5" r="1.2"/><circle cx="21.5" cy="12" r="1.2"/><circle cx="2.5" cy="12" r="1.2"/>', 1.4),
  /** Tre prikker i en sirkel (venter) */
  dotsCircle: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>', 2),
  /** Ramme (kapasitet) */
  frame: svg('<path d="M3 8V4h4M17 4h4v4M21 16v4h-4M7 20H3v-4"/><rect x="7.5" y="7.5" width="9" height="9" rx="1"/>', 1.6),
  /** Speedometer (treffsikkerhet) */
  gauge: svg('<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="m12 17-3.5-5"/><circle cx="12" cy="17" r="1.2"/>', 1.5),
  /** Søyler (neste nivå) */
  levels: svg('<rect x="3" y="14" width="4" height="7" rx="1"/><rect x="10" y="9" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="17" rx="1"/>', 1.5),
  /** Skjerm med bil (diagnose) */
  diagnostics: svg('<rect x="2.5" y="3.5" width="19" height="13" rx="1.5"/><path d="M8 21h8M12 16.5V21"/><path d="M6.5 12.5v-2l1.5-2.5h8l1.5 2.5v2Z"/><circle cx="9" cy="12.5" r=".8"/><circle cx="15" cy="12.5" r=".8"/>', 1.4),
  /** Pengeseddel */
  bill: svg('<rect x="2.5" y="6" width="19" height="12" rx="1"/><circle cx="12" cy="12" r="2.8"/><path d="M5.5 9v.01M18.5 15v.01"/>', 1.5),

  // --- Hotellkjede ---
  /** Hotell (bygning med H) */
  hotel: svg('<path d="M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16"/><path d="M2.5 21h19"/><path d="M9 8v6M15 8v6M9 11h6"/><path d="M10.5 21v-3.5h3V21"/>', 1.6),
  /** Hakke (gruve) */
  pickaxe: svg('<path d="M3.5 9C8 4.5 16 4.5 20.5 9"/><path d="M12 6.2V21"/>', 1.8),
  /** Edelstein */
  gem: svg('<path d="M6.5 4h11L22 9.5 12 21 2 9.5z"/><path d="M2 9.5h20M12 21 8.5 9.5 12 4l3.5 5.5z"/>', 1.6),
  /** Steinklump (malm) */
  ore: svg('<path d="M3 16.5 6.5 8 12 5l6 3 3 8.5-6 3.5H8.5z"/><path d="M8.5 10.5l2.5 2M14 9.5l1.5 3M10 16l2.5-1"/>', 1.6),
  /** Lager */
  warehouse: svg('<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>', 1.6),
  /** Seng (rom) */
  bed: svg('<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>', 1.6),
  /** Stjerne (fylt) */
  starFill: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2.8 2.8 5.8 6.3.8-4.6 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3-4.6-4.4 6.3-.8Z"/></svg>',
  /** Bestikk (restaurant) */
  fork: svg('<path d="M6 3v7a2 2 0 0 0 4 0V3M8 3v18"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>', 1.6),
  /** Cocktailglass (bar) */
  cocktail: svg('<path d="M4 4h16l-8 9Z"/><path d="M12 13v8M8 21h8M15 4l3-2"/>', 1.6),
  /** Lotus (spa) */
  lotus: svg('<path d="M12 20c-4 0-8-2.5-9-7 3 0 6 1.5 9 4.5 3-3 6-4.5 9-4.5-1 4.5-5 7-9 7Z"/><path d="M12 17.5C10 15 9.5 11 12 6c2.5 5 2 9 0 11.5Z"/>', 1.5),
  /** Bølger (basseng) */
  waves: svg('<path d="M2 9c2 0 2-1.5 4-1.5S8 9 10 9s2-1.5 4-1.5S16 9 18 9s2-1.5 4-1.5M2 14c2 0 2-1.5 4-1.5S8 14 10 14s2-1.5 4-1.5S16 14 18 14s2-1.5 4-1.5M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5S16 19 18 19s2-1.5 4-1.5"/>', 1.5),
  /** Tavle (konferanse) */
  board: svg('<rect x="3" y="3.5" width="18" height="12" rx="1"/><path d="M12 15.5V20M8 21l4-1.5 4 1.5M7 11l3-3 2.5 2L17 7"/>', 1.6),
  /** Spillterning (kasino) */
  dice: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/>', 1.6),
  /** Kost (renovering) */
  broom: svg('<path d="M19 3 11 11"/><path d="M11 11c-3 0-6 2-7 6l-1 4h4c1-1 2-3 2-3s0 2-1 3h3c1-1 1.5-3 1.5-3s.5 2 0 3H15c1-4 0-7-4-10Z"/>', 1.5),
  /** Kalender (sesong) */
  calendar: svg('<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 3v3M16 3v3"/>', 1.6),
  /** Gnister (hendelse) */
  sparkle: svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>', 1.6),

  // --- Fotballklubb ---
  /** Fotballbane med ball (fotballklubb) */
  pitch: svg('<rect x="2.5" y="8" width="19" height="13" rx="1.5"/><path d="M12 8v13"/><circle cx="12" cy="14.5" r="2"/><path d="M2.5 11.5h2.5v6H2.5M21.5 11.5H19v6h2.5"/><circle cx="12" cy="4" r="2.5"/>', 1.5),
  /** Pokal */
  trophy: svg('<path d="M8 3h8v6a4 4 0 0 1-8 0Z"/><path d="M8 5H4.5v1.5A3.5 3.5 0 0 0 8 10M16 5h3.5v1.5A3.5 3.5 0 0 1 16 10"/><path d="M12 13v4M8 21h8M9.5 17h5v4h-5Z"/>', 1.6),
  /** Fotball */
  ball: svg('<circle cx="12" cy="12" r="9.5"/><path d="m12 7.5 3.5 2.5-1.3 4h-4.4L8.5 10Z"/><path d="M12 7.5V2.5M15.5 10l4.5-1.5M14.2 14l2.8 4M9.8 14 7 18M8.5 10 4 8.5"/>', 1.4),
  /** Spiller som skyter (spillere) */
  kick: svg('<circle cx="14" cy="4" r="2"/><path d="M13 7 9 9.5l-3-1.5M13 7l1.5 5-3.5 3-1.5 6M14.5 12l4 1 1.5-2.5"/><circle cx="18.5" cy="19" r="2"/>', 1.6),
  /** Manual (trening) */
  dumbbell: svg('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>', 2),
  /** Fløyte (frispark) */
  whistle: svg('<circle cx="9" cy="14" r="5"/><path d="M11 9.5h10v3h-6"/><path d="M5 4l2 3M9 3v3M13 4l-1.5 3"/>', 1.6),
  /** Hjørneflagg / offside-flagg */
  flag: svg('<path d="M5 21V3"/><path d="M5 4h12l-3 3.5 3 3.5H5"/>', 1.7),
  /** Kort (gult/rødt) */
  card: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3.5" width="10" height="17" rx="1.5" fill="currentColor" transform="rotate(8 12 12)"/></svg>',
  /** Hanske (redning) */
  glove: svg('<path d="M7 21v-4.5L4.5 13a1.5 1.5 0 0 1 2.3-2l1.7 1.5V5a1.5 1.5 0 0 1 3 0v5V3.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v5.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-3.5 5.5V21Z"/>', 1.4),
  /** Liste med klokke (kamphistorikk) */
  history: svg('<path d="M14 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l4 4v4"/><path d="M8 8h6M8 12h4"/><circle cx="17" cy="17" r="4.5"/><path d="M17 15v2l1.5 1"/>', 1.5),

  // --- Bank ---
  /** Billett med % (innskudd) */
  percentTicket: svg('<path d="M2.5 6h19v3.2a2.8 2.8 0 0 0 0 5.6V18h-19v-3.2a2.8 2.8 0 0 0 0-5.6Z"/><path d="m9.5 14.5 5-5"/><circle cx="9.7" cy="9.7" r=".9"/><circle cx="14.3" cy="14.3" r=".9"/>', 1.8),
  /** % i en sirkel (lån) */
  percentCircle: svg('<circle cx="12" cy="12" r="9.5"/><path d="m8.5 15.5 7-7"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/>', 1.8),
  /** To skyveknapper (innstillinger for renter) */
  sliders: svg('<path d="M3 7h3M10 7h11M3 17h11M18 17h3"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>', 1.4),
  /** Hvelvdør (utvid hvelvet) */
  vault: svg('<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M6.5 8.5v7"/><circle cx="14" cy="12" r="3"/><path d="m11.5 9.5 1 1M16.5 9.5l-1 1M11.5 14.5l1-1M16.5 14.5l-1-1"/>', 1.6),
  /** Pil opp i en boks */
  arrowUpBox: svg('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M12 17V7M7.5 11.5 12 7l4.5 4.5"/>', 2),
  /** Pil ned i en boks */
  arrowDownBox: svg('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M12 7v10M7.5 12.5 12 17l4.5-4.5"/>', 2),
  /** Lyspære (tips) */
  bulb: svg('<path d="M9 18h6M10 21h4"/><path d="M8.5 14.5A6.5 6.5 0 1 1 15.5 14.5c-.6.6-1 1.4-1 2.3V18h-5v-1.2c0-.9-.4-1.7-1-2.3Z"/>', 1.5),

  // --- IT-selskap ---
  /** Dataskjerm (IT-selskap) */
  monitor: svg('<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M8 21h8M10 16.5 9.5 21M14 16.5l.5 4.5"/>', 1.8),
  /** </> (utvikling) */
  code: svg('<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>', 2.2),
  /** Bærbar PC med </> (utvikler) */
  laptopCode: svg('<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/><path d="m10 8.5-2 2 2 2M14 8.5l2 2-2 2"/>', 1.7),
  /** Kopp med pensler (design) */
  mug: svg('<path d="M5 11h11v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z"/><path d="M16 13h1.5a2 2 0 0 1 0 4H16"/><path d="m8 11-1.5-6M12 11l1.5-7"/>', 1.8),
  /** Personer over en hånd (teamleder) */
  team: svg('<circle cx="6" cy="5" r="2"/><circle cx="12" cy="4.5" r="2"/><circle cx="18" cy="5" r="2"/><path d="M3.5 11a2.5 2.5 0 0 1 5 0M9.5 10.5a2.5 2.5 0 0 1 5 0M15.5 11a2.5 2.5 0 0 1 5 0"/><path d="M3 21v-6h3l4 2h4a1.5 1.5 0 0 1 0 3H9"/><path d="M14 20h4.5l2.5-3.5"/>', 1.6),
  /** Tannhjul med skiftenøkkel (testing) */
  gearWrench: svg('<path d="M12 3.5 13.3 5l2-.4.7 1.9 1.9.7-.4 2L19 10.5l-1 1.5"/><path d="M12 20.5 10.7 19l-2 .4-.7-1.9-1.9-.7.4-2L5 13.5l1-1.5"/><path d="M5 12V10.5L6.5 9.2l-.4-2 1.9-.7.7-1.9 2 .4L12 3.5"/><path d="m8.5 15.5 7-7a2.5 2.5 0 1 1 1.5 3l-7 7a2.5 2.5 0 1 1-1.5-3Z"/>', 1.5),
  /** Timeglass (pågår) */
  hourglass: svg('<path d="M7 3h10M7 21h10"/><path d="M8 3v3.5L12 12l4-5.5V3M8 21v-3.5L12 12l4 5.5V21"/><path d="M3.5 12a8.5 8.5 0 0 1 15-5.5M20.5 12a8.5 8.5 0 0 1-15 5.5"/>', 1.5),
  /** Nettleservindu (nettside-prosjekt) */
  web: svg('<rect x="2.5" y="4" width="19" height="16" rx="1.5"/><path d="M2.5 8h19M5 6h.01M7 6h.01M9 6h.01"/><rect x="5.5" y="10.5" width="13" height="4" rx=".5"/><path d="M5.5 17.5h5M13.5 17.5h5"/>', 1.4),
  /** Programvindu med tannhjul (program-prosjekt) */
  app: svg('<rect x="2.5" y="4" width="19" height="16" rx="1.5"/><path d="M2.5 8h19M5 6h.01M7 6h.01M9 6h.01"/><circle cx="12" cy="14" r="2"/><path d="M12 10.5v1.5M12 16v1.5M8.5 14H10M14 14h1.5M9.5 11.5l1 1M13.5 15.5l1 1M9.5 16.5l1-1M13.5 12.5l1-1"/>', 1.4),
  /** Person (ansatte) */
  person: svg('<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3Z"/><path d="m12 14-1 3 1 2 1-2Z"/>', 1.5),
  /** Person med pluss (rekrutterere) */
  personPlus: svg('<circle cx="10" cy="8" r="3.5"/><path d="M3 21v-3a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v3Z"/><circle cx="18.5" cy="5.5" r="3"/><path d="M18.5 4v3M17 5.5h3"/>', 1.5),
  /** Laurbærkrans (senior) */
  laurel: svg('<path d="M7 20c-3-2-4.5-5.5-4-9.5M17 20c3-2 4.5-5.5 4-9.5"/><path d="M4 14.5c1.5.2 2.5 1 3 2.3M3.3 10.8c1.4.4 2.2 1.3 2.5 2.6M20 14.5c-1.5.2-2.5 1-3 2.3M20.7 10.8c-1.4.4-2.2 1.3-2.5 2.6"/><rect x="8" y="7" width="8" height="6" rx="1"/><path d="M7 15h10"/>', 1.4),
  /** Kontorbygg (forbedringer) */
  office: svg('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h.01M12 7h.01M15 7h.01M9 11h.01M12 11h.01M15 11h.01M9 15h.01M15 15h.01"/><path d="M10.5 21v-3.5h3V21"/>', 2),

  // --- Flyselskap ---
  /** Fly sett ovenfra, på skrå */
  plane: svg('<path d="M16.5 3.5c.9-.9 2.6-1.1 3.4-.3.8.8.6 2.5-.3 3.4l-3.4 3.4 2.1 8.3-1.8 1.8-3.8-6.6-3.3 3.3.4 2.7-1.4 1.4-1.6-3.2-3.2-1.6 1.4-1.4 2.7.4 3.3-3.3-6.6-3.8 1.8-1.8 8.3 2.1z"/>', 1.6),
  /** Kontrolltårn (hubs) */
  tower: svg('<path d="M8 3h8l1.5 4h-11z"/><path d="M6.5 7 8 11h8l1.5-4"/><path d="M9.5 11v10M14.5 11v10M7 21h10"/><path d="M12 3V1.5"/>', 1.6),
  /** Dokument med segl (lisens) */
  license: svg('<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21H11"/><path d="M14 3l5 5v3"/><path d="M14 3v5h5"/><path d="M8 9h3M8 12.5h6M8 16h3"/><circle cx="16.5" cy="16" r="2.8"/><path d="m15 18.4-.6 3.1 2.1-1 2.1 1-.6-3.1"/>', 1.5),
  /** Jordklode */
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9M12 3C9.4 5.6 8.2 8.6 8.2 12s1.2 6.4 3.8 9"/>', 1.6),
  /** Dokument med pluss (kontinent med lisens) */
  filePlus: svg('<path d="M13 3H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4"/><path d="M13 3l5 5v3"/><path d="M13 3v5h5"/><path d="M8.5 10h5M8.5 13.5h3"/><circle cx="17" cy="17" r="4"/><path d="M17 15v4M15 17h4"/>', 1.5),
  /** Pluss i en firkant (kjøp flere) */
  plusBox: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M12 8v8M8 12h8"/>', 1.7),
  /** Oljeplattform på havet (oljeselskap) */
  rig: svg('<path d="M3 13h18"/><path d="M6 13v5M12 13v5M18 13v5"/><path d="M5 13V9h7v4"/><path d="M15 13V3l3 4v6"/><path d="M15 6h3"/><path d="M2 21c1.7 0 1.7-1.2 3.3-1.2S7 21 8.7 21s1.7-1.2 3.3-1.2 1.7 1.2 3.3 1.2 1.7-1.2 3.3-1.2S20.3 21 22 21"/>', 1.5),
  /** Yacht på bølger (eiendeler) */
  yacht: svg('<path d="M3 15h16.5l-2.5 3.5H5.5Z"/><path d="M6 15v-3h9l2.5 3"/><path d="M8.5 12V9.5h4.5l1.5 2.5"/><path d="M11 9.5V6"/><path d="M2 21c1.7 0 1.7-1.2 3.3-1.2S7 21 8.7 21s1.7-1.2 3.3-1.2 1.7 1.2 3.3 1.2 1.7-1.2 3.3-1.2S20.3 21 22 21"/>', 1.5),
  /** Hangar med fly (eiendeler) */
  hangar: svg('<path d="M3 21V10l9-5 9 5v11"/><path d="M6.5 21v-7h11v7"/><path d="M12 15v4M9.5 17.5h5"/><circle cx="10" cy="19.5" r=".6"/><circle cx="14" cy="19.5" r=".6"/>', 1.5),
  /** Bilbutikk: bil foran et utstillingsbygg */
  carShop: svg('<path d="M2.5 10 12 4l9.5 6"/><path d="M4.5 9v11.5M19.5 9v11.5"/><path d="M7.2 15.5 8.4 12.6A1.5 1.5 0 0 1 9.8 11.7h4.4a1.5 1.5 0 0 1 1.4.9l1.2 2.9"/><rect x="6.2" y="15.5" width="11.6" height="3.5" rx="1.2"/><path d="M7.5 19v1.5M16.5 19v1.5"/><circle cx="8.8" cy="17.25" r=".5"/><circle cx="15.2" cy="17.25" r=".5"/>', 1.5),
  /** Flybutikk: fly sett ovenfra */
  planeShop: svg('<path d="M12 2.5c.9 0 1.5.8 1.5 1.8v5.4l7.5 4.3v2l-7.5-2.3v4.6l2.2 1.7v1.6L12 20.5l-3.7 1.1V20l2.2-1.7v-4.6L3 16v-2l7.5-4.3V4.3c0-1 .6-1.8 1.5-1.8Z"/>', 1.5),
  /** Yachtbutikk: yacht sett fra siden */
  yachtShop: svg('<path d="M2 15.5h18.5l-2.8 3.5H5Z"/><path d="M5 15.5 6.5 12h10l2 3.5"/><path d="M8.5 12l1.2-2.5h5l1.3 2.5"/><path d="M12 9.5V6.5M10.5 6.5h3"/><path d="M8 13.8h1.5M11.2 13.8h1.5M14.4 13.8h1.5"/>', 1.5),
  /** Oljedråpe */
  drop: svg('<path d="M12 3s-6.5 7.2-6.5 11.5a6.5 6.5 0 0 0 13 0C18.5 10.2 12 3 12 3Z"/><path d="M9 15a3 3 0 0 0 3 3"/>', 1.6),
};
