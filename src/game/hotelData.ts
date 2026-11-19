/*
 * HOTELLDATA: byer, romtyper og fasiliteter.
 * Bildene ligger i public/hotels/<id>.jpg (hentet fra Wikipedia, se public/hotels/KILDER.txt).
 * Alle beløp er 1/10 av det som vises (som resten av spillet).
 */

/** Hvordan sesongen er i en by (følger ekte måned). */
export type SeasonType = 'north' | 'city' | 'beach' | 'ski' | 'winterSun' | 'south';

export interface CityDef {
  id: string;
  name: string;
  country: string;
  /** Hvor mye mer gjestene betaler her enn i Oslo (1 = som Oslo). Påvirker også alle priser. */
  mult: number;
  season: SeasonType;
  /** Fritidsby (mest gjester i helgene) eller forretningsby (mest på hverdager). */
  leisure: boolean;
  /** Store hendelser som gir mange flere gjester den dagen. */
  events: string[];
  /** Kasino er bare lov her. */
  casino?: boolean;
  /** Wikipedia-artikkelen bildet er hentet fra. */
  wiki: string;
}

const city = (
  id: string,
  name: string,
  country: string,
  mult: number,
  season: SeasonType,
  leisure: boolean,
  events: string[],
  wiki: string,
  casino = false,
): CityDef => ({ id, name, country, mult, season, leisure, events, wiki, casino });

export const CITIES: CityDef[] = [
  city('oslo', 'Oslo', 'Norge', 1, 'north', false, ['Holmenkollen skifestival', 'Øyafestivalen', 'Nobels fredspris'], 'Oslo Opera House'),
  city('copenhagen', 'København', 'Danmark', 1.1, 'north', true, ['Roskilde-festivalen', 'Copenhagen Fashion Week'], 'Nyhavn'),
  city('stockholm', 'Stockholm', 'Sverige', 1.1, 'north', false, ['Nobelprisen', 'Stockholm Marathon'], 'Gamla stan'),
  city('reykjavik', 'Reykjavík', 'Island', 1.15, 'north', true, ['Iceland Airwaves', 'Nordlys-uke'], 'Hallgrímskirkja'),
  city('london', 'London', 'Storbritannia', 1.6, 'city', false, ['Wimbledon', 'London Marathon', 'Nyttårsaften ved Big Ben'], 'Tower Bridge'),
  city('paris', 'Paris', 'Frankrike', 1.7, 'city', true, ['Paris Fashion Week', 'Tour de France-finalen', 'Bastilledagen'], 'Eiffel Tower'),
  city('barcelona', 'Barcelona', 'Spania', 1.5, 'beach', true, ['El Clásico', 'Primavera Sound', 'Mobile World Congress'], 'Sagrada Família'),
  city('rome', 'Roma', 'Italia', 1.5, 'city', true, ['Påske i Vatikanet', 'Roma Maraton'], 'Colosseum'),
  city('santorini', 'Santorini', 'Hellas', 1.8, 'beach', true, ['Solnedgangsfestival', 'Vinfestival'], 'Oia, Greece'),
  city('zermatt', 'Zermatt', 'Sveits', 1.9, 'ski', true, ['Verdenscup i alpint', 'Zermatt Unplugged'], 'Matterhorn'),
  city('dubai', 'Dubai', 'De forente arabiske emirater', 2.2, 'winterSun', false, ['Dubai Shopping Festival', 'Expo-uke', 'Nyttårsfyrverkeri ved Burj Khalifa'], 'Burj Khalifa'),
  city('maldives', 'Maldivene', 'Maldivene', 2.6, 'winterSun', true, ['Dykkerfestival', 'Bryllupssesong'], 'Malé'),
  city('new-york', 'New York', 'USA', 2.3, 'city', false, ['Nyttårsaften på Times Square', 'New York Marathon', 'Met Gala'], 'Times Square'),
  city('las-vegas', 'Las Vegas', 'USA', 2.0, 'city', true, ['Formel 1 Las Vegas Grand Prix', 'Boksekamp i MGM', 'CES-messen'], 'Las Vegas Strip', true),
  city('miami', 'Miami', 'USA', 2.0, 'winterSun', true, ['Formel 1 Miami Grand Prix', 'Art Basel', 'Ultra Music Festival'], 'Miami Beach, Florida'),
  city('tokyo', 'Tokyo', 'Japan', 2.2, 'city', false, ['Kirsebærblomstring', 'Tokyo Game Show'], 'Shibuya Crossing'),
  city('singapore', 'Singapore', 'Singapore', 2.1, 'city', false, ['Formel 1 Singapore Grand Prix', 'Kinesisk nyttår'], 'Marina Bay Sands'),
  city('bali', 'Bali', 'Indonesia', 1.8, 'winterSun', true, ['Nyepi-dagen', 'Surfekonkurranse'], 'Tanah Lot'),
  city('sydney', 'Sydney', 'Australia', 2.0, 'south', true, ['Nyttårsfyrverkeri i havna', 'Vivid Sydney'], 'Sydney Opera House'),
  city('rio', 'Rio de Janeiro', 'Brasil', 1.8, 'south', true, ['Karnevalet', 'Nyttår på Copacabana'], 'Christ the Redeemer (statue)'),
  city('monaco', 'Monaco', 'Monaco', 3.0, 'beach', true, ['Formel 1 Monaco Grand Prix', 'Monaco Yacht Show'], 'Monte Carlo', true),
];
export const cityById = (id: string) => CITIES.find((c) => c.id === id) ?? CITIES[0];

export const SEASON_NAMES: Record<SeasonType, string> = {
  north: 'Nordisk (høysesong om sommeren)',
  city: 'Storby (jevnt hele året)',
  beach: 'Strand (høysesong om sommeren)',
  ski: 'Skisted (høysesong om vinteren)',
  winterSun: 'Vintersol (høysesong om vinteren)',
  south: 'Sørlige halvkule (høysesong i desember–februar)',
};

/** Etterspørsel per måned (jan–des) for hver sesongtype. */
export const SEASON_CURVE: Record<SeasonType, number[]> = {
  north: [0.8, 0.8, 0.85, 0.95, 1.05, 1.25, 1.35, 1.3, 1.05, 0.9, 0.9, 1.1],
  city: [0.9, 0.9, 1, 1.05, 1.05, 1.1, 1.05, 1, 1.1, 1.05, 1, 1.2],
  beach: [0.6, 0.6, 0.7, 0.9, 1.15, 1.4, 1.5, 1.5, 1.2, 0.9, 0.65, 0.65],
  ski: [1.5, 1.55, 1.4, 1.0, 0.55, 0.6, 0.7, 0.7, 0.6, 0.6, 0.9, 1.45],
  winterSun: [1.35, 1.35, 1.25, 1.1, 0.9, 0.75, 0.7, 0.7, 0.85, 1.0, 1.2, 1.4],
  south: [1.35, 1.3, 1.1, 0.95, 0.85, 0.8, 0.8, 0.85, 0.95, 1.05, 1.15, 1.35],
};

// --- Romtyper -------------------------------------------------------------------------------
export type RoomType = 'standard' | 'superior' | 'suite' | 'penthouse';
export interface RoomDef {
  id: RoomType;
  name: string;
  /** Hvor mye mer rommet tjener enn et standardrom. */
  factor: number;
  /** Flest rom av denne typen i ett hotell. */
  max: number;
  /** Hotellet må ha minst så mange stjerner. */
  minStars: number;
}
export const ROOMS: RoomDef[] = [
  { id: 'standard', name: 'Standardrom', factor: 1, max: 1500, minStars: 1 },
  { id: 'superior', name: 'Superior', factor: 1.8, max: 500, minStars: 1 },
  { id: 'suite', name: 'Suite', factor: 4, max: 120, minStars: 3 },
  { id: 'penthouse', name: 'Penthouse', factor: 12, max: 12, minStars: 4 },
];
export const roomById = (id: RoomType) => ROOMS.find((r) => r.id === id)!;

// --- Fasiliteter -----------------------------------------------------------------------------
export type FacilityId = 'restaurant' | 'bar' | 'spa' | 'pool' | 'gym' | 'conference' | 'casino';
export interface FacilityDef {
  id: FacilityId;
  name: string;
  text: string;
  /** Ekstra inntekt (andel av romsinntekten). */
  income: number;
  /** Bedre gjestevurdering. */
  review: number;
  /** Pris (ganges med byens prisnivå). */
  cost: number;
  hours: number;
}
export const FACILITIES: FacilityDef[] = [
  { id: 'restaurant', name: 'Restaurant', text: 'Gjestene spiser middag på hotellet.', income: 0.08, review: 0.3, cost: 15_000_000, hours: 1 },
  { id: 'bar', name: 'Bar på taket', text: 'Drinker med utsikt – populært i helgene.', income: 0.05, review: 0.3, cost: 10_000_000, hours: 0.75 },
  { id: 'gym', name: 'Treningssenter', text: 'Billig å bygge, gjestene setter pris på det.', income: 0.02, review: 0.25, cost: 4_000_000, hours: 0.5 },
  { id: 'pool', name: 'Basseng', text: 'Gir ekstra mange gjester i sommerbyer.', income: 0.04, review: 0.4, cost: 18_000_000, hours: 1.5 },
  { id: 'spa', name: 'Spa', text: 'Massasje og badstue – gjestene betaler godt.', income: 0.07, review: 0.4, cost: 22_000_000, hours: 2 },
  { id: 'conference', name: 'Konferansesenter', text: 'Forretningsgjester på hverdagene.', income: 0.1, review: 0.15, cost: 25_000_000, hours: 2 },
  { id: 'casino', name: 'Kasino', text: 'Bare i Las Vegas og Monaco. Tjener svært mye.', income: 0.25, review: 0.2, cost: 80_000_000, hours: 4 },
];
export const facilityById = (id: FacilityId) => FACILITIES.find((f) => f.id === id)!;

// --- Gjester (til anmeldelsene) -------------------------------------------------------------------
export const GUESTS: [string, string][] = [
  ['Emma', 'Norge'], ['Lars', 'Norge'], ['Sofia', 'Sverige'], ['Mikkel', 'Danmark'], ['James', 'Storbritannia'],
  ['Chloé', 'Frankrike'], ['Lukas', 'Tyskland'], ['Giulia', 'Italia'], ['Carlos', 'Spania'], ['Olivia', 'USA'],
  ['Noah', 'USA'], ['Yuki', 'Japan'], ['Wei', 'Kina'], ['Aisha', 'De forente arabiske emirater'], ['Ana', 'Brasil'],
  ['Jack', 'Australia'], ['Priya', 'India'], ['Mateo', 'Argentina'], ['Freya', 'Island'], ['Hannah', 'Canada'],
];

/** Hva gjestene skriver, etter hvor fornøyde de er (dårlig → bra). */
export const REVIEW_TEXTS: string[][] = [
  ['Skittent rom og lang kø i resepsjonen. Aldri igjen.', 'Altfor dyrt for det vi fikk.', 'Slitent hotell, trenger oppussing.'],
  ['Helt greit, men ingenting spesielt.', 'Grei beliggenhet, men rommet var lite.', 'Ok frokost, men litt dyrt.'],
  ['Hyggelig personale og god seng.', 'Fin utsikt og rent rom.', 'Bra hotell til en god pris.'],
  ['Fantastisk opphold! Kommer gjerne tilbake.', 'Nydelig spa og fantastisk mat.', 'Beste hotellet jeg har bodd på!'],
];
