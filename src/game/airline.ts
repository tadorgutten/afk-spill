import type { Business } from './business';
import {
  ALL_FLIGHTS,
  BASE_INCOME,
  CONTINENTS,
  DOMESTIC_COUNT,
  INTL_LICENSE,
  PLANES,
  continentById,
  flightById,
  planeById,
  type ContinentId,
  type FlightDef,
  type PlaneId,
} from './airlineData';

/*
 * FLYSELSKAP (den siste bedriften)
 * ------------
 * Gir en fast inntekt fra starten. Mer tjenes ved å lansere flyvninger:
 *   1. Kjøp lisens for et kontinent (da kan man fly der).
 *   2. Lei hubs (flyplasser) i kontinentet – én om gangen, i fast rekkefølge.
 *      Hver hub har sine egne flyvninger, så flere hubs gir flere flyvninger.
 *   3. Kjøp fly (lite/mellomstort/stort/ekstra stort) og lanser flyvningen.
 *      Lanseringen tar 1 time; da kommer neste flyvning i kontinentet.
 * Når alle innenriksflyvningene er lansert (50 % verdensdekning), kreves en
 * internasjonal lisens for å fortsette.
 * VEDLIKEHOLD: flyene i bruk må ha service hver 48. time (4 % av verdien deres).
 *   Går fristen ut, stopper ALL inntekt til man betaler.
 * Fly som ikke er i bruk kan selges for full pris.
 */

export const AIRLINE_TYPE = 'airline';
export const isAirlineType = (typeId: string) => typeId === AIRLINE_TYPE;

const HOUR = 3_600_000;
/** Hvor lang tid en lansering tar. */
export const LAUNCH_MS = HOUR;
/** Hvor ofte flyene må på service. */
export const SERVICE_MS = 48 * HOUR;
/** Service koster denne andelen av verdien til flyene som er i bruk. */
const SERVICE_SHARE = 0.04;
export const INTL = 'intl';

// --- Tilstand ---------------------------------------------------------------------------------
export interface AirlineState {
  /** Kjøpte lisenser (kontinenter og 'intl'). */
  licenses: string[];
  /** Hvor mange hubs som er leid i hvert kontinent. */
  hubs: Partial<Record<ContinentId, number>>;
  /** Lanserte flyvninger → når de er i gang (ms). */
  flights: Record<string, number>;
  /** Fly man eier (både i bruk og ledige). */
  planes: Record<PlaneId, number>;
  /** Frist for neste service. */
  serviceDue: number;
}

export function newAirline(now = Date.now()): AirlineState {
  return { licenses: [], hubs: {}, flights: {}, planes: { small: 0, medium: 0, large: 0, xlarge: 0 }, serviceDue: now + SERVICE_MS };
}

export function airlineOf(b: Business): AirlineState {
  b.airline ??= newAirline();
  return b.airline;
}

// --- Tall ------------------------------------------------------------------------------------------
export const hasLicense = (s: AirlineState, id: string) => s.licenses.includes(id);
export const hubsLeased = (s: AirlineState, c: ContinentId) => s.hubs[c] ?? 0;
export const isLaunched = (s: AirlineState, id: string) => id in s.flights;
export const isActive = (s: AirlineState, id: string, now = Date.now()) => id in s.flights && s.flights[id] <= now;

/** Lanserte flyvninger (også de som er på vei). */
export const launchedFlights = (s: AirlineState) => ALL_FLIGHTS.filter((f) => isLaunched(s, f.id));
export const launchedIn = (s: AirlineState, c: ContinentId) => continentById(c).flights.filter((f) => isLaunched(s, f.id)).length;
export const domesticLaunched = (s: AirlineState) => ALL_FLIGHTS.filter((f) => !f.intl && isLaunched(s, f.id)).length;
/** Verdensdekning (0–1): andelen av alle flyvningene som er lansert. */
export const coverage = (s: AirlineState) => launchedFlights(s).length / ALL_FLIGHTS.length;

/** Flyvningen i kontinentet som lanseres nå (venter på å komme i gang), eller null. */
export function launching(s: AirlineState, c: ContinentId, now = Date.now()): FlightDef | null {
  return continentById(c).flights.find((f) => isLaunched(s, f.id) && s.flights[f.id] > now) ?? null;
}

/** Hvor mange fly av hver type som er i bruk. */
export function planesInUse(s: AirlineState): Record<PlaneId, number> {
  const used: Record<PlaneId, number> = { small: 0, medium: 0, large: 0, xlarge: 0 };
  for (const f of launchedFlights(s)) used[f.plane] += f.count;
  return used;
}
export const freePlanes = (s: AirlineState, p: PlaneId) => s.planes[p] - planesInUse(s)[p];
export const planeCount = (s: AirlineState) => PLANES.reduce((sum, p) => sum + s.planes[p.id], 0);
export const usedCount = (s: AirlineState) => Object.values(planesInUse(s)).reduce((a, b) => a + b, 0);
export const unusedValue = (s: AirlineState) => PLANES.reduce((sum, p) => sum + freePlanes(s, p.id) * p.price, 0);

/** Pris for service: 4 % av verdien til flyene som er i bruk. */
export function serviceCost(s: AirlineState): number {
  const used = planesInUse(s);
  return PLANES.reduce((sum, p) => sum + used[p.id] * p.price, 0) * SERVICE_SHARE;
}
/** Er fristen for service gått ut? (Da tjener ikke selskapet noe.) */
export const isGrounded = (s: AirlineState, now = Date.now()) => serviceCost(s) > 0 && now >= s.serviceDue;

/** Inntekt per time akkurat nå (0 hvis fristen for service er gått ut). */
export function airlineIncome(b: Business, now = Date.now()): number {
  const s = airlineOf(b);
  if (isGrounded(s, now)) return 0;
  return BASE_INCOME + ALL_FLIGHTS.reduce((sum, f) => sum + (isActive(s, f.id, now) ? f.income : 0), 0);
}

export type NextFlight =
  | { kind: 'flight'; flight: FlightDef }
  | { kind: 'launching'; flight: FlightDef; readyAt: number }
  | { kind: 'hub' }
  | { kind: 'intl' }
  | { kind: 'done' };

/** Hva som er det neste man kan gjøre i et kontinent. */
export function nextFlight(s: AirlineState, c: ContinentId, now = Date.now()): NextFlight {
  const busy = launching(s, c, now);
  if (busy) return { kind: 'launching', flight: busy, readyAt: s.flights[busy.id] };
  const f = continentById(c).flights.find((x) => !isLaunched(s, x.id));
  if (!f) return { kind: 'done' };
  if (f.intl && !hasLicense(s, INTL)) return { kind: 'intl' };
  if (f.hub >= hubsLeased(s, c)) return { kind: 'hub' };
  return { kind: 'flight', flight: f };
}

// --- Handlinger ----------------------------------------------------------------------------------------
export interface AirlinePay {
  spend(amount: number, capital: boolean): boolean;
  earn(gross: number): void;
  /** Penger rett inn (uten skatt), og `paid` trekkes fra bedriftens verdi. */
  receive(amount: number, paid: number): void;
}
export type AirResult = 'ok' | 'money' | 'owned' | 'locked' | 'planes' | 'busy' | 'none';

export const licensePrice = (id: string) => (id === INTL ? INTL_LICENSE : continentById(id as ContinentId).license);
/** Den internasjonale lisensen krever at alle innenriksflyvningene er lansert. */
export const canBuyIntl = (s: AirlineState) => domesticLaunched(s) >= DOMESTIC_COUNT;

export function buyLicense(b: Business, pay: AirlinePay, id: string): AirResult {
  const s = airlineOf(b);
  if (hasLicense(s, id)) return 'owned';
  if (id === INTL && !canBuyIntl(s)) return 'locked';
  if (!pay.spend(licensePrice(id), true)) return 'money';
  s.licenses.push(id);
  return 'ok';
}

/** Neste hub man kan leie i et kontinent (eller null når alle er leid). */
export const nextHub = (s: AirlineState, c: ContinentId) => continentById(c).hubs[hubsLeased(s, c)] ?? null;

export function leaseHub(b: Business, pay: AirlinePay, c: ContinentId): AirResult {
  const s = airlineOf(b);
  if (!hasLicense(s, c)) return 'locked';
  const hub = nextHub(s, c);
  if (!hub) return 'none';
  if (!pay.spend(hub.price, true)) return 'money';
  s.hubs[c] = hubsLeased(s, c) + 1;
  return 'ok';
}

export function launchFlight(b: Business, pay: AirlinePay, c: ContinentId, now = Date.now()): AirResult {
  const s = airlineOf(b);
  const next = nextFlight(s, c, now);
  if (next.kind === 'launching') return 'busy';
  if (next.kind !== 'flight') return 'locked';
  const f = next.flight;
  if (freePlanes(s, f.plane) < f.count) return 'planes';
  // Første fly i bruk: fristen for service starter nå
  const firstInUse = serviceCost(s) === 0;
  if (!pay.spend(f.cost, true)) return 'money';
  s.flights[f.id] = now + LAUNCH_MS;
  if (firstInUse) s.serviceDue = now + SERVICE_MS;
  return 'ok';
}

export const maxAffordable = (balance: number, p: PlaneId) => Math.max(0, Math.floor(balance / planeById(p).price));

export function buyPlanes(b: Business, pay: AirlinePay, p: PlaneId, qty: number): AirResult {
  const s = airlineOf(b);
  const n = Math.max(1, Math.floor(qty));
  if (!pay.spend(planeById(p).price * n, true)) return 'money';
  s.planes[p] += n;
  return 'ok';
}

/** Selger alle ledige fly for full pris. Returnerer beløpet. */
export function sellUnused(b: Business, pay: AirlinePay): number {
  const s = airlineOf(b);
  const value = unusedValue(s);
  if (value <= 0) return 0;
  const used = planesInUse(s);
  for (const p of PLANES) s.planes[p.id] = used[p.id];
  pay.receive(value, value);
  return value;
}

export function performService(b: Business, pay: AirlinePay, now = Date.now()): AirResult {
  const s = airlineOf(b);
  const cost = serviceCost(s);
  if (cost <= 0) return 'none';
  if (!pay.spend(cost, false)) return 'money';
  s.serviceDue = now + SERVICE_MS;
  return 'ok';
}

// --- Tiden går -----------------------------------------------------------------------------------------
/**
 * Inntekten fra `from` til `now` (før skatt). Flyvninger som kommer i gang underveis teller fra da,
 * og etter fristen for service tjenes ingenting.
 */
export function tickAirline(b: Business, from: number, now: number): number {
  const s = airlineOf(b);
  // Ingen fly i bruk: ingenting å ha service på, så fristen flytter seg
  if (serviceCost(s) === 0) s.serviceDue = Math.max(s.serviceDue, now + SERVICE_MS);
  const stop = Math.min(now, s.serviceDue);
  if (stop <= from) return 0;
  const starts = [...new Set(Object.values(s.flights).filter((t) => t > from && t < stop))].sort((a, b) => a - b);
  let gross = 0;
  let t = from;
  for (const point of [...starts, stop]) {
    gross += airlineIncome(b, t) * ((point - t) / HOUR);
    t = point;
  }
  return gross;
}

export { CONTINENTS, PLANES, continentById, flightById, planeById };
