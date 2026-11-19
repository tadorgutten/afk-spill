/*
 * HOTELLDATA: byer, romtyper og fasiliteter.
 * Bildene ligger i public/hotels/<id>.jpg (hentet fra Wikipedia, se public/hotels/KILDER.txt).
 * Alle beløp er 1/10 av det som vises (som resten av spillet).
 */

export interface CityDef {
  id: string;
  name: string;
  country: string;
  /** Hvor mye mer rommene tjener (og alt koster) her enn i Oslo (1 = som Oslo). */
  mult: number;
  /** Kasino er bare lov her. */
  casino?: boolean;
}

const city = (id: string, name: string, country: string, mult: number, casino = false): CityDef => ({ id, name, country, mult, casino });

export const CITIES: CityDef[] = [
  city('oslo', 'Oslo', 'Norge', 1),
  city('copenhagen', 'København', 'Danmark', 1.1),
  city('stockholm', 'Stockholm', 'Sverige', 1.1),
  city('reykjavik', 'Reykjavík', 'Island', 1.15),
  city('london', 'London', 'Storbritannia', 1.6),
  city('paris', 'Paris', 'Frankrike', 1.7),
  city('barcelona', 'Barcelona', 'Spania', 1.5),
  city('rome', 'Roma', 'Italia', 1.5),
  city('santorini', 'Santorini', 'Hellas', 1.8),
  city('zermatt', 'Zermatt', 'Sveits', 1.9),
  city('dubai', 'Dubai', 'De forente arabiske emirater', 2.2),
  city('maldives', 'Maldivene', 'Maldivene', 2.6),
  city('new-york', 'New York', 'USA', 2.3),
  city('las-vegas', 'Las Vegas', 'USA', 2.0, true),
  city('miami', 'Miami', 'USA', 2.0),
  city('tokyo', 'Tokyo', 'Japan', 2.2),
  city('singapore', 'Singapore', 'Singapore', 2.1),
  city('bali', 'Bali', 'Indonesia', 1.8),
  city('sydney', 'Sydney', 'Australia', 2.0),
  city('rio', 'Rio de Janeiro', 'Brasil', 1.8),
  city('monaco', 'Monaco', 'Monaco', 3.0, true),
];
export const cityById = (id: string) => CITIES.find((c) => c.id === id) ?? CITIES[0];

// --- Romtyper -------------------------------------------------------------------------------
export type RoomType = 'standard' | 'superior' | 'suite' | 'penthouse';
export interface RoomDef {
  id: RoomType;
  name: string;
  /** Hvor mye mer rommet tjener (og koster) enn et standardrom. */
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
  /** Ekstra inntekt for hele hotellet: 0,08 = +8 %. */
  income: number;
  /** Pris (ganges med byens prisnivå). */
  cost: number;
  hours: number;
}
export const FACILITIES: FacilityDef[] = [
  { id: 'gym', name: 'Treningssenter', text: 'Billig og raskt å bygge.', income: 0.03, cost: 4_000_000, hours: 0.5 },
  { id: 'bar', name: 'Bar på taket', text: 'Drinker med utsikt.', income: 0.05, cost: 10_000_000, hours: 0.75 },
  { id: 'restaurant', name: 'Restaurant', text: 'Gjestene spiser middag på hotellet.', income: 0.08, cost: 15_000_000, hours: 1 },
  { id: 'pool', name: 'Basseng', text: 'Basseng på taket.', income: 0.08, cost: 18_000_000, hours: 1.5 },
  { id: 'spa', name: 'Spa', text: 'Massasje og badstue.', income: 0.1, cost: 22_000_000, hours: 2 },
  { id: 'conference', name: 'Konferansesenter', text: 'Store firmaer holder møter her.', income: 0.12, cost: 30_000_000, hours: 2 },
  { id: 'casino', name: 'Kasino', text: 'Bare i Las Vegas og Monaco. Tjener svært mye.', income: 0.3, cost: 80_000_000, hours: 4 },
];
export const facilityById = (id: FacilityId) => FACILITIES.find((f) => f.id === id)!;
