import type { GameState } from './state';

/*
 * EIENDOM – slik fungerer det (samme regler som originalappen)
 * -----------------------------------------------------------
 * - Inntekt per time = 1,58 % av alt du har betalt for eiendommen (kjøp + forbedringer).
 * - Hver eiendom har 5 forbedringer. En forbedring koster X % av kjøpsprisen og
 *   øker inntekten med X % av startinntekten – den lønner seg altså like godt som kjøpet.
 *   Prosentene avhenger av typen eiendom (hus, leilighet, hotell, landemerke …).
 * - Markedsverdi = alt du har betalt. Ved salg trekkes 12 % salgsskatt.
 * - Leieinntekten betales løpende, også mens appen er lukket.
 * - Prisene står her i dollar slik de vises i spillet; internt deles de på 10 (se MONEY_SCALE).
 */

export const RENT_PER_HOUR = 0.0158;
export const SALES_TAX = 0.12;

export type PropertyType = 'house' | 'apartment' | 'villa' | 'hotel' | 'office' | 'landmark';

export interface Upgrade {
  /** Ikon-navn i src/ui/realEstateIcons.ts */
  icon: string;
  name: string;
  /** Andel av kjøpsprisen (1 = 100 %). */
  pct: number;
}

/** De fem forbedringene for hver type eiendom. */
export const UPGRADES: Record<PropertyType, Upgrade[]> = {
  // Fra originalen: 100 + 30 + 15 + 10 + 5 = 160 %  → inntekten blir 2,6x
  house: [
    { icon: 'roller', name: 'Kosmetisk oppussing', pct: 1 },
    { icon: 'fridge', name: 'Nye hvitevarer', pct: 0.3 },
    { icon: 'sofa', name: 'Nye møbler', pct: 0.15 },
    { icon: 'cable', name: 'Legge inn fiber', pct: 0.1 },
    { icon: 'parking', name: 'Parkering for leietakerne', pct: 0.05 },
  ],
  // 90 + 30 + 15 + 10 + 5 = 150 % → 2,5x
  apartment: [
    { icon: 'roller', name: 'Pusse opp leiligheten', pct: 0.9 },
    { icon: 'kitchen', name: 'Nytt kjøkken', pct: 0.3 },
    { icon: 'sofa', name: 'Nye møbler', pct: 0.15 },
    { icon: 'smart', name: 'Smarthus-system', pct: 0.1 },
    { icon: 'bike', name: 'Bod og sykkelparkering', pct: 0.05 },
  ],
  // 100 + 40 + 20 + 10 + 5 = 175 % → 2,75x
  villa: [
    { icon: 'pool', name: 'Bygge basseng', pct: 1 },
    { icon: 'tree', name: 'Nytt hageanlegg', pct: 0.4 },
    { icon: 'film', name: 'Hjemmekino', pct: 0.2 },
    { icon: 'wine', name: 'Vinkjeller', pct: 0.1 },
    { icon: 'shield', name: 'Alarm og vakthold', pct: 0.05 },
  ],
  // 110 + 50 + 25 + 10 + 5 = 200 % → 3x
  hotel: [
    { icon: 'bed', name: 'Pusse opp rommene', pct: 1.1 },
    { icon: 'spa', name: 'Spa og basseng', pct: 0.5 },
    { icon: 'dining', name: 'Åpne restaurant', pct: 0.25 },
    { icon: 'presentation', name: 'Konferansesal', pct: 0.1 },
    { icon: 'megaphone', name: 'Reklamekampanje', pct: 0.05 },
  ],
  // Som Moskva i originalen: 80 + 40 + 15 + 10 + 5 = 150 % → 2,5x
  office: [
    { icon: 'printer', name: 'Moderne kontorutstyr', pct: 0.8 },
    { icon: 'bolt', name: 'Ny strømforsyning', pct: 0.4 },
    { icon: 'people', name: 'Coworking-lokaler', pct: 0.15 },
    { icon: 'camera', name: 'Videoovervåking', pct: 0.1 },
    { icon: 'chair', name: 'Ergonomiske møbler', pct: 0.05 },
  ],
  // Fra originalen (broa): 120 + 60 + 30 + 10 + 5 = 225 % → 3,25x
  landmark: [
    { icon: 'landmark', name: 'Restaurere landemerket', pct: 1.2 },
    { icon: 'map', name: 'Bygge turistanlegg', pct: 0.6 },
    { icon: 'ticket', name: 'Arrangere omvisninger', pct: 0.3 },
    { icon: 'bus', name: 'Transport fra hotellet', pct: 0.1 },
    { icon: 'megaphone', name: 'Reklame for turister', pct: 0.05 },
  ],
};

export interface PropertyDef {
  id: string;
  /** Sted, f.eks. "Detroit, Michigan". */
  location: string;
  type: PropertyType;
  /** Kjøpspris i dollar (slik den vises i spillet). */
  usd: number;
}

// [id, sted, type, pris i dollar]
const LIST: [string, string, PropertyType, number][] = [
  // --- Under 100 000 ---
  ['detroit', 'Detroit, Michigan', 'house', 25_000],
  ['cleveland', 'Cleveland, Ohio', 'house', 32_000],
  ['flint', 'Flint, Michigan', 'house', 45_000],
  ['gary', 'Gary, Indiana', 'house', 58_000],
  ['youngstown', 'Youngstown, Ohio', 'house', 79_000],
  // --- 100 000 – 200 000 ---
  ['memphis', 'Memphis, Tennessee', 'house', 115_000],
  ['birmingham', 'Birmingham, Alabama', 'house', 145_000],
  ['riga', 'Riga, Latvia', 'apartment', 180_000],
  // --- 200 000 – 300 000 ---
  ['krakow', 'Kraków, Polen', 'apartment', 220_000],
  ['tulsa', 'Tulsa, Oklahoma', 'house', 265_000],
  // --- 300 000 – 1 M ---
  ['trondheim', 'Trondheim, Norge', 'house', 340_000],
  ['bergen', 'Bergen, Norge', 'apartment', 420_000],
  ['barcelona', 'Barcelona, Spania', 'apartment', 480_000],
  ['berlin', 'Berlin, Tyskland', 'apartment', 520_000],
  ['austin', 'Austin, Texas', 'house', 560_000],
  ['stockholm', 'Stockholm, Sverige', 'apartment', 640_000],
  ['oslo', 'Oslo, Norge', 'apartment', 720_000],
  ['amsterdam', 'Amsterdam, Nederland', 'apartment', 790_000],
  ['copenhagen', 'København, Danmark', 'apartment', 860_000],
  ['sydney-house', 'Sydney, Australia', 'house', 950_000],
  // --- 1 M – 2 M ---
  ['losangeles', 'Los Angeles, California', 'house', 1_200_000],
  ['paris-apt', 'Paris, Frankrike', 'apartment', 1_450_000],
  ['toronto-house', 'Toronto, Canada', 'house', 1_600_000],
  ['zurich', 'Zürich, Sveits', 'apartment', 1_750_000],
  ['london-apt', 'London, England', 'apartment', 1_950_000],
  // --- 2 M – 10 M ---
  ['tuscany', 'Toscana, Italia', 'villa', 2_300_000],
  ['como', 'Comosjøen, Italia', 'villa', 2_900_000],
  ['marbella', 'Marbella, Spania', 'villa', 3_400_000],
  ['aspen', 'Aspen, Colorado', 'villa', 3_900_000],
  ['holmenkollen', 'Holmenkollen, Oslo', 'villa', 4_500_000],
  ['santorini', 'Santorini, Hellas', 'villa', 5_200_000],
  ['miami', 'Miami Beach, Florida', 'villa', 5_900_000],
  ['bali', 'Bali, Indonesia', 'hotel', 6_500_000],
  ['capetown', 'Cape Town, Sør-Afrika', 'villa', 7_200_000],
  ['malibu', 'Malibu, California', 'villa', 7_900_000],
  ['hamptons', 'The Hamptons, New York', 'villa', 8_800_000],
  ['lofoten', 'Lofoten, Norge', 'hotel', 9_500_000],
  // --- 10 M – 20 M ---
  ['beverlyhills', 'Beverly Hills, California', 'villa', 10_500_000],
  ['monaco', 'Monte Carlo, Monaco', 'apartment', 11_800_000],
  ['stmoritz', 'St. Moritz, Sveits', 'hotel', 12_500_000],
  ['cotedazur', "Côte d'Azur, Frankrike", 'villa', 13_900_000],
  ['maldives', 'Maldivene', 'hotel', 14_800_000],
  ['kensington', 'Kensington, London', 'villa', 15_500_000],
  ['hongkong-villa', 'The Peak, Hongkong', 'villa', 16_900_000],
  ['mallorca', 'Mallorca, Spania', 'hotel', 17_500_000],
  ['venice', 'Venezia, Italia', 'villa', 18_600_000],
  ['tromso', 'Tromsø, Norge', 'hotel', 19_400_000],
  // --- 20 M – 50 M ---
  ['palmjumeirah', 'Palm Jumeirah, Dubai', 'villa', 22_000_000],
  ['manhattan', 'Manhattan, New York', 'apartment', 28_000_000],
  ['belair', 'Bel Air, California', 'villa', 34_000_000],
  ['singapore-office', 'Singapore', 'office', 38_000_000],
  ['courchevel', 'Courchevel, Frankrike', 'hotel', 41_000_000],
  ['frankfurt', 'Frankfurt, Tyskland', 'office', 47_000_000],
  // --- 50 M – 100 M ---
  ['paris-hotel', 'Paris, Frankrike', 'hotel', 55_000_000],
  ['tokyo-office', 'Tokyo, Japan', 'office', 64_000_000],
  ['chicago', 'Chicago, Illinois', 'office', 72_000_000],
  ['sydney-office', 'Sydney, Australia', 'office', 83_000_000],
  ['london-office', 'London, England', 'office', 95_000_000],
  // --- 100 M – 300 M ---
  ['neuschwanstein', 'Bayern, Tyskland', 'landmark', 120_000_000],
  ['edinburgh', 'Edinburgh, Skottland', 'landmark', 145_000_000],
  ['lasvegas-hotel', 'Las Vegas, Nevada', 'hotel', 170_000_000],
  ['oslo-opera', 'Oslo, Norge', 'landmark', 190_000_000],
  ['singapore-hotel', 'Singapore', 'hotel', 230_000_000],
  ['rome-hotel', 'Roma, Italia', 'hotel', 255_000_000],
  ['toronto-office', 'Toronto, Canada', 'office', 280_000_000],
  // --- 300 M – 1 B ---
  ['prague', 'Praha, Tsjekkia', 'landmark', 340_000_000],
  ['westminster', 'London, England', 'landmark', 420_000_000],
  ['sydney-opera', 'Sydney, Australia', 'landmark', 520_000_000],
  ['seattle', 'Seattle, Washington', 'landmark', 610_000_000],
  ['ladefense', 'La Défense, Paris', 'office', 720_000_000],
  ['tokyo-tower', 'Tokyo, Japan', 'landmark', 830_000_000],
  ['rio', 'Rio de Janeiro, Brasil', 'landmark', 950_000_000],
  // --- 1 B – 3 B ---
  ['eiffel', 'Paris, Frankrike', 'landmark', 1_100_000_000],
  ['colosseum', 'Roma, Italia', 'landmark', 1_250_000_000],
  ['towerbridge', 'London, England', 'landmark', 1_400_000_000],
  ['chicago-tower', 'Chicago, Illinois', 'office', 1_550_000_000],
  ['sagrada', 'Barcelona, Spania', 'landmark', 1_700_000_000],
  ['petronas', 'Kuala Lumpur, Malaysia', 'office', 1_900_000_000],
  ['burjalarab', 'Dubai, De forente arabiske emirater', 'hotel', 2_100_000_000],
  ['empirestate', 'New York, New York', 'office', 2_350_000_000],
  ['tajmahal', 'Agra, India', 'landmark', 2_600_000_000],
  ['brandenburg', 'Berlin, Tyskland', 'landmark', 2_850_000_000],
  // --- 3 B – 10 B ---
  ['machupicchu', 'Cusco, Peru', 'landmark', 3_400_000_000],
  ['greatwall', 'Beijing, Kina', 'landmark', 4_200_000_000],
  ['giza', 'Giza, Egypt', 'landmark', 5_100_000_000],
  ['vegasstrip', 'Las Vegas, Nevada', 'hotel', 6_000_000_000],
  ['libertyisland', 'New York, New York', 'landmark', 7_000_000_000],
  ['goldengate', 'San Francisco, California', 'landmark', 8_600_000_000], // 27,95 mrd. ferdig forbedret
  // --- De største (kjøpspris regnet ut fra verdien etter alle forbedringer) ---
  ['moscow', 'Moskva, Russland', 'office', 24_638_000_000], // 61,595 mrd. ferdig forbedret
  ['hongkong', 'Hongkong, Kina', 'office', 32_980_000_000], // 82,45 mrd. ferdig forbedret
  ['shanghai', 'Shanghai, Kina', 'office', 36_400_000_000], // 91 mrd. ferdig forbedret
  ['dubai', 'Dubai, De forente arabiske emirater', 'office', 48_500_000_000], // 121,25 mrd. ferdig forbedret
];

const USD_SCALE = 10;
export const PROPERTIES: PropertyDef[] = LIST.map(([id, location, type, usd]) => ({ id, location, type, usd }));
export const propertyById = (id: string) => PROPERTIES.find((p) => p.id === id);

/** Kjøpspris (intern verdi). */
export const priceOf = (def: PropertyDef) => def.usd / USD_SCALE;
export const upgradesOf = (def: PropertyDef) => UPGRADES[def.type];
export const upgradeCost = (def: PropertyDef, i: number) => priceOf(def) * upgradesOf(def)[i].pct;
export const baseIncome = (def: PropertyDef) => priceOf(def) * RENT_PER_HOUR;

// --- Det spilleren eier -------------------------------------------------------------
export interface OwnedProperty {
  /** Hvilke av de 5 forbedringene som er kjøpt. */
  upgrades: boolean[];
}

export const ownedOf = (state: GameState, def: PropertyDef): OwnedProperty | undefined => state.properties[def.id];

/** Markedsverdi: kjøpspris + kjøpte forbedringer. */
export function marketValue(state: GameState, def: PropertyDef): number {
  const owned = ownedOf(state, def);
  if (!owned) return priceOf(def);
  return priceOf(def) + upgradesOf(def).reduce((sum, _u, i) => sum + (owned.upgrades[i] ? upgradeCost(def, i) : 0), 0);
}

/** Inntekt per time (1,58 % av markedsverdien). */
export const incomeOf = (state: GameState, def: PropertyDef) => marketValue(state, def) * RENT_PER_HOUR;

export const ownedProperties = (state: GameState) => PROPERTIES.filter((p) => ownedOf(state, p));
export const marketProperties = (state: GameState) => PROPERTIES.filter((p) => !ownedOf(state, p));
export const fullyUpgraded = (state: GameState, def: PropertyDef) => !!ownedOf(state, def)?.upgrades.every(Boolean);

/** Leieinntekt per time og samlet verdi for alle eiendommene. */
export function realEstateSummary(state: GameState) {
  let perHour = 0;
  let value = 0;
  for (const def of ownedProperties(state)) {
    const v = marketValue(state, def);
    value += v;
    perHour += v * RENT_PER_HOUR;
  }
  return { perHour, value };
}

// --- Handlinger -----------------------------------------------------------------------
export function buyProperty(state: GameState, def: PropertyDef): boolean {
  if (ownedOf(state, def) || state.balance + 1e-6 < priceOf(def)) return false;
  state.balance -= priceOf(def);
  state.properties[def.id] = { upgrades: [false, false, false, false, false] };
  return true;
}

export function buyUpgrade(state: GameState, def: PropertyDef, i: number): boolean {
  const owned = ownedOf(state, def);
  if (!owned || owned.upgrades[i] || state.balance + 1e-6 < upgradeCost(def, i)) return false;
  state.balance -= upgradeCost(def, i);
  owned.upgrades[i] = true;
  return true;
}

/** Selger eiendommen. Returnerer beløpet du fikk (markedsverdi minus 12 % skatt). */
export function sellProperty(state: GameState, def: PropertyDef): number {
  if (!ownedOf(state, def)) return 0;
  const value = marketValue(state, def);
  const tax = value * SALES_TAX;
  delete state.properties[def.id];
  state.balance += value - tax;
  state.taxesPaid += tax;
  return value - tax;
}

/** Betaler leieinntekt for tiden som har gått (også mens appen var lukket). */
export function tickRealEstate(state: GameState, now: number) {
  const hours = (now - state.realEstateUpdate) / 3_600_000;
  state.realEstateUpdate = now;
  if (hours <= 0) return;
  const income = realEstateSummary(state).perHour * hours;
  if (income <= 0) return;
  state.balance += income;
  state.totalEarned += income;
  state.rentEarned += income;
}
