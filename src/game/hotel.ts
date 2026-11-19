import type { Business } from './business';
import {
  CITIES,
  FACILITIES,
  GUESTS,
  REVIEW_TEXTS,
  ROOMS,
  SEASON_CURVE,
  cityById,
  facilityById,
  roomById,
  type CityDef,
  type FacilityId,
  type RoomType,
} from './hotelData';
import { hashString, seededRandom } from './random';

/*
 * HOTELLKJEDE
 * -----------
 * Man starter med et hotell i Oslo (3 stjerner, 370 rom) og kan kjøpe hoteller i 20 andre byer.
 *
 * INNTEKT PER TIME (for hvert hotell):
 *   romsinntekt = "romenheter" × grunnpris × byens prisnivå × stjerner × (1 + prisvalg) × belegg
 *     (et standardrom = 1 enhet, superior 1,8, suite 4, penthouse 12)
 *   + fasiliteter (restaurant, spa ... gir en andel ekstra)
 *   − renhold (18 % av romsinntekten) og ansatte (fast, etter hvor stort hotellet er)
 *
 * BELEGG (hvor mange rom som er utleid) avhenger av:
 *   - prisen du setter (dyrere = færre gjester), gjestevurderingen og tilstanden til hotellet
 *   - sesongen i byen (ekte måned), helg/hverdag og hendelser i byen (f.eks. Formel 1)
 *
 * TILSTAND: hotellet slites (−0,5 per time). Lav tilstand gir dårligere vurdering og færre gjester.
 *   Renovering setter tilstanden til 100 igjen.
 * BYGGEARBEID: ett om gangen per hotell (nye rom, fasilitet, flere stjerner eller renovering).
 *
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const HOTEL_TYPE = 'hotel-chain';
export const isHotelType = (typeId: string) => typeId === HOTEL_TYPE;

const HOUR = 3_600_000;

// --- Balansering ---------------------------------------------------------------------------
/** Inntekt per romenhet per time ved 3 stjerner i Oslo, full pris (vises som $ 37 000). */
const ROOM_BASE = 3_700;
/** Hvor mye stjernene ganger inntekten med (indeks = antall stjerner). */
export const STAR_MULT = [0, 0.5, 0.75, 1, 1.5, 2.3];
/** Belegg i en vanlig uke med vanlig pris. */
const BASE_OCCUPANCY = 0.75;
/** Hvor mye beleggen faller når prisen går opp (høyere = mer prisfølsomme gjester). */
const PRICE_SENSITIVITY = 2.2;
export const PRICE_RANGE: [number, number] = [-0.3, 0.6];
/** Renhold (andel av romsinntekten) og ansatte (andel av full kapasitet). */
const CLEANING = 0.18;
const STAFF = 0.08;
/** Tilstanden synker så mye per time. */
const WEAR_PER_HOUR = 0.25;
/** Over denne tilstanden merkes ikke slitasjen på inntekten. */
export const WEAR_LIMIT = 80;
/** Hvor mye slitasjen under grensen trekker ned (0 = ingen, 1 = helt nedslitt). */
const wearPenalty = (h: Hotel) => Math.max(0, WEAR_LIMIT - h.condition) / WEAR_LIMIT;
/** Pris per romenhet å bygge (ganges med byens prisnivå og stjernene). */
const ROOM_COST = 380_000;
/** Pris for et nytt hotell (ganges med byens prisnivå). Oslo = $ 1,5 mrd. */
const HOTEL_COST = 150_000_000;
/** Pris for flere stjerner (ganges med byens prisnivå). */
const STAR_COST: Record<number, number> = { 4: 100_000_000, 5: 300_000_000 };
const STAR_HOURS: Record<number, number> = { 4: 2, 5: 6 };
/** Fasiliteter som trengs for 4 og 5 stjerner. */
export const STAR_FACILITIES: Record<number, number> = { 4: 2, 5: 4 };
/** Renovering: pris per romenhet, og hvor lang tid det tar. */
const RENOVATE_COST = 5_000;
const RENOVATE_MIN = 30;
/** Sjansen for en hendelse i en by en gitt dag, og hvor mange flere gjester den gir. */
const EVENT_CHANCE = 0.1;
const EVENT_BOOST = 1.6;

// --- Tilstand ---------------------------------------------------------------------------------
export type HotelJob =
  | { kind: 'rooms'; room: RoomType; count: number; end: number }
  | { kind: 'facility'; id: FacilityId; end: number }
  | { kind: 'stars'; to: number; end: number }
  | { kind: 'renovate'; end: number }
  | { kind: 'open'; end: number };

export interface Hotel {
  city: string;
  stars: number;
  rooms: Record<RoomType, number>;
  facilities: FacilityId[];
  /** Prisvalg: −0,3 = 30 % billigere enn markedet, +0,6 = 60 % dyrere. */
  price: number;
  /** Tilstand 0–100. */
  condition: number;
  job: HotelJob | null;
  /** Tjent totalt (etter kostnader, før skatt). */
  earned: number;
}

export interface HotelChainState {
  hotels: Hotel[];
}

const startRooms = (): Record<RoomType, number> => ({ standard: 300, superior: 60, suite: 10, penthouse: 0 });

function newHotel(cityId: string, opening: number | null): Hotel {
  return {
    city: cityId,
    stars: 3,
    rooms: startRooms(),
    facilities: [],
    price: 0,
    condition: 100,
    job: opening ? { kind: 'open', end: opening } : null,
    earned: 0,
  };
}

export const newHotelChain = (): HotelChainState => ({ hotels: [newHotel('oslo', null)] });

export function hotelsOf(b: Business): HotelChainState {
  b.hotels ??= newHotelChain();
  return b.hotels;
}
export const hotelIn = (b: Business, cityId: string) => hotelsOf(b).hotels.find((h) => h.city === cityId);

// --- Tid: sesong, ukedag og hendelser -----------------------------------------------------------
export const seasonFactor = (c: CityDef, now: number) => SEASON_CURVE[c.season][new Date(now).getMonth()];

export function weekFactor(c: CityDef, now: number): number {
  const day = new Date(now).getDay(); // 0 = søndag
  const weekend = day === 5 || day === 6;
  if (c.leisure) return weekend ? 1.15 : 0.97;
  return day >= 1 && day <= 4 ? 1.08 : 0.85;
}

/** Hendelsen i byen i dag (samme for alle, endres ved midnatt), eller null. */
export function eventToday(c: CityDef, now: number): string | null {
  const d = new Date(now);
  const rand = seededRandom(hashString(`${c.id}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`));
  if (rand() >= EVENT_CHANCE) return null;
  return c.events[Math.floor(rand() * c.events.length)];
}

// --- Tall for et hotell -------------------------------------------------------------------------
export const isOpen = (h: Hotel) => h.job?.kind !== 'open';
export const roomUnits = (h: Hotel) => ROOMS.reduce((sum, r) => sum + h.rooms[r.id] * r.factor, 0);
export const roomCount = (h: Hotel) => ROOMS.reduce((sum, r) => sum + h.rooms[r.id], 0);

/** Gjestevurdering 1–10. */
export function reviewScore(h: Hotel): number {
  const facilities = h.facilities.reduce((sum, id) => sum + facilityById(id).review, 0);
  const score = 4.2 + h.stars * 0.55 + facilities + 1 - wearPenalty(h) * 3.3 - Math.max(0, h.price) * 4 + Math.max(0, -h.price) * 1.5;
  return Math.max(1, Math.min(10, score));
}

export interface HotelNumbers {
  occupancy: number;
  roomRevenue: number;
  facilityRevenue: number;
  costs: number;
  net: number;
  demand: number;
  event: string | null;
}

/** Alt om inntekten til et hotell akkurat nå (per time). `price` kan settes for å se hva en annen pris gir. */
export function hotelNumbers(h: Hotel, now = Date.now(), price = h.price): HotelNumbers {
  const c = cityById(h.city);
  const event = eventToday(c, now);
  if (!isOpen(h)) return { occupancy: 0, roomRevenue: 0, facilityRevenue: 0, costs: 0, net: 0, demand: 0, event };
  const season = seasonFactor(c, now);
  const trial = { ...h, price };
  const rating = 0.7 + reviewScore(trial) * 0.05;
  const condition = 1 - 0.4 * wearPenalty(h);
  const pool = h.facilities.includes('pool') && season > 1.1 ? 1.05 : 1;
  const demand = BASE_OCCUPANCY * season * weekFactor(c, now) * (event ? EVENT_BOOST : 1) * rating * condition * pool;
  let occupancy = Math.max(0.03, Math.min(0.97, demand * Math.exp(-PRICE_SENSITIVITY * price)));
  if (h.job?.kind === 'renovate') occupancy *= 0.5;
  const unitValue = ROOM_BASE * c.mult * STAR_MULT[h.stars];
  const units = roomUnits(h);
  const roomRevenue = units * unitValue * (1 + price) * occupancy;
  const day = new Date(now).getDay();
  const weekday = day >= 1 && day <= 4;
  const facilityShare = h.facilities.reduce((sum, id) => {
    const f = facilityById(id);
    if (id === 'conference') return sum + f.income * (weekday ? 1.5 : 0.3);
    return sum + f.income;
  }, 0);
  const facilityRevenue = roomRevenue * facilityShare;
  const costs = roomRevenue * CLEANING + units * unitValue * STAFF;
  return { occupancy, roomRevenue, facilityRevenue, costs, net: roomRevenue + facilityRevenue - costs, demand, event };
}

export const hotelIncome = (h: Hotel, now = Date.now()) => hotelNumbers(h, now).net;
export const chainIncome = (b: Business, now = Date.now()) => hotelsOf(b).hotels.reduce((sum, h) => sum + hotelIncome(h, now), 0);

// --- Priser på ting ---------------------------------------------------------------------------------
export const hotelPrice = (c: CityDef) => HOTEL_COST * c.mult;
/** Hvor lang tid et nytt hotell tar å bygge (timer). */
export const hotelBuildHours = (c: CityDef) => Math.round(c.mult * 60) / 60;
export const roomCost = (h: Hotel, room: RoomType) => ROOM_COST * roomById(room).factor * cityById(h.city).mult * STAR_MULT[h.stars];
export const roomBuildSeconds = (count: number) => Math.min(6 * 3600, 600 + count * 15);
export const facilityCost = (h: Hotel, id: FacilityId) => facilityById(id).cost * cityById(h.city).mult;
export const starCost = (h: Hotel) => (STAR_COST[h.stars + 1] ?? Infinity) * cityById(h.city).mult;
export const renovateCost = (h: Hotel) => roomUnits(h) * RENOVATE_COST * cityById(h.city).mult * STAR_MULT[h.stars];
export const canHaveFacility = (h: Hotel, id: FacilityId) => id !== 'casino' || !!cityById(h.city).casino;

// --- Handlinger ---------------------------------------------------------------------------------------
export interface HotelPay {
  spend(amount: number, capital: boolean): boolean;
}
export type HotelResult = 'ok' | 'money' | 'busy' | 'owned' | 'max' | 'locked' | 'need';

export function buyHotel(b: Business, pay: HotelPay, cityId: string, now = Date.now()): HotelResult {
  const c = cityById(cityId);
  if (hotelIn(b, c.id)) return 'owned';
  if (!pay.spend(hotelPrice(c), true)) return 'money';
  hotelsOf(b).hotels.push(newHotel(c.id, now + hotelBuildHours(c) * HOUR));
  return 'ok';
}

export function buildRooms(h: Hotel, pay: HotelPay, room: RoomType, count: number, now = Date.now()): HotelResult {
  const def = roomById(room);
  const n = Math.floor(count);
  if (h.job) return 'busy';
  if (h.stars < def.minStars) return 'locked';
  if (n <= 0) return 'need';
  if (h.rooms[room] + n > def.max) return 'max';
  if (!pay.spend(roomCost(h, room) * n, true)) return 'money';
  h.job = { kind: 'rooms', room, count: n, end: now + roomBuildSeconds(n) * 1000 };
  return 'ok';
}

export function buildFacility(h: Hotel, pay: HotelPay, id: FacilityId, now = Date.now()): HotelResult {
  if (h.job) return 'busy';
  if (h.facilities.includes(id)) return 'owned';
  if (!canHaveFacility(h, id)) return 'locked';
  if (!pay.spend(facilityCost(h, id), true)) return 'money';
  h.job = { kind: 'facility', id, end: now + facilityById(id).hours * HOUR };
  return 'ok';
}

export function upgradeStars(h: Hotel, pay: HotelPay, now = Date.now()): HotelResult {
  const to = h.stars + 1;
  if (h.job) return 'busy';
  if (to > 5) return 'max';
  if (h.facilities.length < (STAR_FACILITIES[to] ?? 0) || (to === 5 && h.condition < 80)) return 'need';
  if (!pay.spend(starCost(h), true)) return 'money';
  h.job = { kind: 'stars', to, end: now + (STAR_HOURS[to] ?? 2) * HOUR };
  return 'ok';
}

export function renovate(h: Hotel, pay: HotelPay, now = Date.now()): HotelResult {
  if (h.job) return 'busy';
  if (h.condition >= 99.5) return 'max';
  if (!pay.spend(renovateCost(h), false)) return 'money';
  h.job = { kind: 'renovate', end: now + RENOVATE_MIN * 60_000 };
  return 'ok';
}

export function setPrice(h: Hotel, price: number) {
  h.price = Math.round(Math.max(PRICE_RANGE[0], Math.min(PRICE_RANGE[1], price)) * 100) / 100;
}

function finishJob(h: Hotel) {
  const job = h.job!;
  if (job.kind === 'rooms') h.rooms[job.room] += job.count;
  else if (job.kind === 'facility') h.facilities.push(job.id);
  else if (job.kind === 'stars') h.stars = job.to;
  else if (job.kind === 'renovate') h.condition = 100;
  h.job = null;
}

/**
 * Tiden går (også mens appen var lukket): byggearbeid blir ferdig, hotellene slites,
 * og inntekten regnes ut time for time (sesong, helg og hendelser kan endre seg underveis).
 * Returnerer inntekten for perioden (kan være negativ).
 */
export function tickHotels(b: Business, from: number, now: number): number {
  let total = 0;
  for (const h of hotelsOf(b).hotels) {
    let t = from;
    while (t < now) {
      // Stopp ved neste hele time eller når byggearbeidet er ferdig
      let next = Math.min(now, Math.floor(t / HOUR) * HOUR + HOUR);
      if (h.job && h.job.end > t) next = Math.min(next, h.job.end);
      const hours = (next - t) / HOUR;
      const income = hotelIncome(h, t) * hours;
      total += income;
      h.earned += income;
      if (isOpen(h)) h.condition = Math.max(0, h.condition - WEAR_PER_HOUR * hours);
      t = next;
      if (h.job && h.job.end <= t) finishJob(h);
    }
  }
  return total;
}

// --- Anmeldelser -------------------------------------------------------------------------------------------
export interface Review {
  name: string;
  country: string;
  score: number;
  text: string;
}

/** De siste anmeldelsene (nye hver time, ut fra hvor bra hotellet er nå). */
export function latestReviews(h: Hotel, now = Date.now(), count = 4): Review[] {
  const base = reviewScore(h);
  const rand = seededRandom(hashString(`${h.city}:${Math.floor(now / HOUR)}`));
  return Array.from({ length: count }, () => {
    const [name, country] = GUESTS[Math.floor(rand() * GUESTS.length)];
    const score = Math.round(Math.max(1, Math.min(10, base + (rand() - 0.5) * 3)) * 10) / 10;
    const bucket = score < 4 ? 0 : score < 6 ? 1 : score < 8 ? 2 : 3;
    const texts = REVIEW_TEXTS[bucket];
    return { name, country, score, text: texts[Math.floor(rand() * texts.length)] };
  });
}

export { CITIES, FACILITIES, ROOMS, cityById, facilityById, roomById };
