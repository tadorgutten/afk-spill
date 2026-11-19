import type { Business } from './business';
import { CITIES, FACILITIES, ROOMS, cityById, facilityById, roomById, type CityDef, type FacilityId, type RoomType } from './hotelData';

/*
 * HOTELLKJEDE (enkel)
 * -------------------
 * Man starter med et hotell i Oslo (3 stjerner, 370 rom) og kan kjøpe hoteller i 20 andre byer.
 *
 * INNTEKT PER TIME (for hvert hotell) er FAST – den endres bare når man kjøper noe:
 *   rom × fast pris per rom × byens prisnivå × stjerner × (1 + fasiliteter)
 *
 *   Fast pris per rom (Oslo, 3 stjerner): standard $ 20 000, superior $ 36 000, suite $ 80 000, penthouse $ 240 000.
 *   Ingen sesonger, ingen slitasje, ingen kostnader og ingen prisvalg.
 *
 * BYGGEARBEID: ett om gangen per hotell (nye rom, en fasilitet eller flere stjerner).
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const HOTEL_TYPE = 'hotel-chain';
export const isHotelType = (typeId: string) => typeId === HOTEL_TYPE;

const HOUR = 3_600_000;

// --- Balansering ---------------------------------------------------------------------------
/** Inntekt per standardrom per time ved 3 stjerner i Oslo (vises som $ 20 000). */
const ROOM_INCOME = 2_000;
/** Hvor mye stjernene ganger inntekten med (indeks = antall stjerner). */
export const STAR_MULT = [0, 0.5, 0.75, 1, 1.5, 2.3];
/** Pris for å bygge ett standardrom (ganges med romtypen, byens prisnivå og stjernene). */
const ROOM_COST = 250_000;
/** Pris for et nytt hotell (ganges med byens prisnivå). Oslo = $ 1,5 mrd. */
const HOTEL_COST = 150_000_000;
/** Pris og byggetid for flere stjerner (prisen ganges med byens prisnivå). */
const STAR_COST: Record<number, number> = { 4: 100_000_000, 5: 300_000_000 };
export const STAR_HOURS: Record<number, number> = { 4: 2, 5: 6 };

// --- Tilstand ---------------------------------------------------------------------------------
export type HotelJob =
  | { kind: 'rooms'; room: RoomType; count: number; end: number }
  | { kind: 'facility'; id: FacilityId; end: number }
  | { kind: 'stars'; to: number; end: number }
  | { kind: 'open'; end: number };

export interface Hotel {
  city: string;
  stars: number;
  rooms: Record<RoomType, number>;
  facilities: FacilityId[];
  job: HotelJob | null;
  /** Tjent totalt (før skatt). */
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

// --- Tall for et hotell -------------------------------------------------------------------------
export const isOpen = (h: Hotel) => h.job?.kind !== 'open';
export const roomCount = (h: Hotel) => ROOMS.reduce((sum, r) => sum + h.rooms[r.id], 0);

/** Fast pris per rom av en type per time i dette hotellet (by og stjerner). */
export const roomIncome = (h: Hotel, room: RoomType, stars = h.stars) =>
  ROOM_INCOME * roomById(room).factor * cityById(h.city).mult * STAR_MULT[stars];

/** Hva rommene tjener per time (uten fasiliteter). */
export const roomsIncome = (h: Hotel, stars = h.stars) => ROOMS.reduce((sum, r) => sum + h.rooms[r.id] * roomIncome(h, r.id, stars), 0);

/** Fasilitetene til sammen: 0,15 = +15 %. */
export const facilityBonus = (h: Hotel) => h.facilities.reduce((sum, id) => sum + facilityById(id).income, 0);

/** Inntekten til hotellet per time. Fast – endres bare når man bygger noe. */
export function hotelIncome(h: Hotel): number {
  if (!isOpen(h)) return 0;
  return roomsIncome(h) * (1 + facilityBonus(h));
}

export const chainIncome = (b: Business) => hotelsOf(b).hotels.reduce((sum, h) => sum + hotelIncome(h), 0);

// --- Priser på ting ---------------------------------------------------------------------------------
export const hotelPrice = (c: CityDef) => HOTEL_COST * c.mult;
/** Hvor lang tid et nytt hotell tar å bygge (timer). */
export const hotelBuildHours = (c: CityDef) => Math.round(c.mult * 60) / 60;
/** Inntekten et nytt hotell i byen starter med (per time). */
export const newHotelIncome = (c: CityDef) => hotelIncome(newHotel(c.id, null));
export const roomCost = (h: Hotel, room: RoomType) => ROOM_COST * roomById(room).factor * cityById(h.city).mult * STAR_MULT[h.stars];
export const roomBuildSeconds = (count: number) => Math.min(6 * 3600, 600 + count * 15);
export const facilityCost = (h: Hotel, id: FacilityId) => facilityById(id).cost * cityById(h.city).mult;
export const starCost = (h: Hotel) => (STAR_COST[h.stars + 1] ?? Infinity) * cityById(h.city).mult;
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
  if (!pay.spend(starCost(h), true)) return 'money';
  h.job = { kind: 'stars', to, end: now + (STAR_HOURS[to] ?? 2) * HOUR };
  return 'ok';
}

function finishJob(h: Hotel) {
  const job = h.job!;
  if (job.kind === 'rooms') h.rooms[job.room] += job.count;
  else if (job.kind === 'facility') h.facilities.push(job.id);
  else if (job.kind === 'stars') h.stars = job.to;
  h.job = null;
}

/**
 * Tiden går (også mens appen var lukket): byggearbeid blir ferdig og hotellene tjener penger.
 * Returnerer inntekten for perioden.
 */
export function tickHotels(b: Business, from: number, now: number): number {
  let total = 0;
  for (const h of hotelsOf(b).hotels) {
    // Lagringer fra den gamle versjonen (pris, tilstand, renovering) ryddes bort
    const old = h as Hotel & { price?: number; condition?: number };
    delete old.price;
    delete old.condition;
    if (h.job && !['rooms', 'facility', 'stars', 'open'].includes(h.job.kind)) h.job = null;

    let t = from;
    while (t < now) {
      // Inntekten endres bare når byggearbeidet blir ferdig
      const next = h.job && h.job.end > t ? Math.min(now, h.job.end) : now;
      const income = (hotelIncome(h) * (next - t)) / HOUR;
      total += income;
      h.earned += income;
      t = next;
      if (h.job && h.job.end <= t) finishJob(h);
    }
  }
  return total;
}

export { CITIES, FACILITIES, ROOMS, cityById, facilityById, roomById };
