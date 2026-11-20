import type { Business } from './business';

/*
 * OLJESELSKAP
 * -----------
 * Man eier oljeplattformer, men bare ÉN pumper olje om gangen (den man har valgt).
 * Oljen havner på lageret, og man selger selv når oljeprisen er god (prisen går opp og ned som en aksje).
 *
 * PLATTFORMER: 7 stykker, én i hvert land (Norge først, den største sist), kjøpes i rekkefølge. Den første følger med bedriften.
 *   Hver ny plattform pumper mer, men koster mer og tar lengre tid å bygge.
 *   Mens en bygges, pumper den som er valgt som før, og man kan ikke kjøpe flere.
 *   Når den nye er ferdig, tas den i bruk med en gang (man kan bytte tilbake når man vil).
 * OPPGRADERINGER: 5 per plattform, hver gir +10 % olje per time på den plattformen. Koster penger.
 * LAGER: fullt lager = plattformen står stille. Utbygging er gratis, men tar tid (lengre for hvert nivå).
 *   Alt maks (beste plattform med alle oppgraderinger + største lager): fullt på ca. 3 døgn.
 * PRIS: svinger rundt $ 80 per fat, nytt punkt hvert 10. minutt. Grafen viser siste døgn.
 *
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const OIL_TYPE = 'oil';
export const isOilType = (typeId: string) => typeId === OIL_TYPE;

const HOUR = 3_600_000;

// --- Plattformer ---------------------------------------------------------------------------------
export interface PlatformDef {
  id: string;
  name: string;
  place: string;
  country: string;
  /** Fat olje per time uten oppgraderinger. */
  rate: number;
  /** Pris (den første følger med bedriften). */
  price: number;
  /** Timer det tar å bygge den. */
  buildHours: number;
}

/** Bildene ligger i public/oil/<id>.jpg (fra Wikimedia Commons, se public/oil/KILDER.txt). */
export const PLATFORMS: PlatformDef[] = [
  { id: 'gullfaks', name: 'Gullfaks A', place: 'Nordsjøen', country: 'Norge', rate: 190_000, price: 0, buildHours: 0 },
  { id: 'oilrocks', name: 'Oljesteinene', place: 'Kaspihavet', country: 'Aserbajdsjan', rate: 440_000, price: 400_000_000, buildHours: 2 },
  { id: 'prirazlomnaya', name: 'Prirazlomnaja', place: 'Petsjorahavet', country: 'Russland', rate: 840_000, price: 640_000_000, buildHours: 4 },
  { id: 'p51', name: 'P-51', place: 'Campos-bassenget', country: 'Brasil', rate: 1_480_000, price: 1_020_000_000, buildHours: 8 },
  { id: 'hebron', name: 'Hebron', place: 'Grand Banks', country: 'Canada', rate: 2_500_000, price: 1_640_000_000, buildHours: 12 },
  { id: 'perdido', name: 'Perdido', place: 'Mexicogolfen', country: 'USA', rate: 4_100_000, price: 2_620_000_000, buildHours: 18 },
  { id: 'prelude', name: 'Prelude FLNG', place: 'Browse-bassenget', country: 'Australia', rate: 6_750_000, price: 4_190_000_000, buildHours: 24 },
];
/** Bildefilen (de fleste er .jpg). */
export const platformImage = (id: string) => `oil/${id}.${id === 'prelude' ? 'png' : 'jpg'}`;
/** Gamle id-er (før én plattform per land) → nye. */
const OLD_IDS: Record<string, string> = { ekofisk: 'gullfaks', statfjord: 'oilrocks', troll: 'p51', thunderhorse: 'hebron', sverdrup: 'prelude' };
export const platformById = (id: string) => PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
export const platformIndex = (id: string) => PLATFORMS.findIndex((p) => p.id === id);

// --- Oppgraderinger (på hver plattform) ------------------------------------------------------------
export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  icon: 'gauge' | 'tools' | 'plusBox' | 'sliders' | 'gearWrench';
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'pumps', name: 'Kraftigere pumper', text: 'Pumper oljen raskere opp', icon: 'gauge' },
  { id: 'drill', name: 'Ny borerigg', text: 'Borer dypere ned i feltet', icon: 'tools' },
  { id: 'wells', name: 'Flere brønner', text: 'Henter olje fra flere steder', icon: 'plusBox' },
  { id: 'control', name: 'Automatisk styring', text: 'Mindre stans og bedre flyt', icon: 'sliders' },
  { id: 'robots', name: 'Undervannsroboter', text: 'Vedlikehold uten å stoppe', icon: 'gearWrench' },
];
/** Hver oppgradering gir +10 % olje per time. */
export const UPGRADE_BONUS = 0.1;

/** Prisen på en oppgradering: dyrere jo bedre plattformen er (og for hver oppgradering man har). */
export function upgradeCost(platformId: string, owned: number): number {
  const p = platformById(platformId);
  return Math.round((p.rate * NORMAL_PRICE * 12 * (1 + 0.4 * owned)) / 1000) * 1000;
}

// --- Lager -----------------------------------------------------------------------------------------
/** Plass på lageret (fat) for hvert nivå. Nivå 10 + beste plattform maks oppgradert = fullt på ca. 72 timer. */
export const STORAGE: number[] = [
  2_500_000, 4_500_000, 8_000_000, 14_000_000, 25_000_000, 45_000_000, 80_000_000, 140_000_000, 250_000_000, 450_000_000,
  730_000_000,
];
export const MAX_LEVEL = STORAGE.length - 1;
/** Timer det tar å bygge ut lageret til neste nivå. */
const STORAGE_HOURS = [1, 2, 3, 5, 8, 12, 16, 24, 36, 48];
export const storageHours = (level: number) => STORAGE_HOURS[Math.min(level, STORAGE_HOURS.length - 1)];

// --- Pris ------------------------------------------------------------------------------------------
/** Normalpris per fat ($ 80 når den vises). */
export const NORMAL_PRICE = 8;
export const PRICE_STEP_MS = 10 * 60_000;
const HISTORY = 144;
const PRICE_PULL = 0.03;
const PRICE_NOISE = 0.022;

// --- Tilstand --------------------------------------------------------------------------------------
export interface OwnedPlatform {
  id: string;
  /** Oppgraderingene som er kjøpt. */
  ups: string[];
}

export interface OilState {
  owned: OwnedPlatform[];
  /** Plattformen som pumper nå. */
  active: string;
  /** Plattformen som bygges (null = ingen). */
  building: { id: string; doneAt: number } | null;
  /** Fat på lager. */
  stock: number;
  level: number;
  /** Når utbyggingen av lageret er ferdig (null = ingen pågår). */
  levelDoneAt: number | null;
  price: { x: number; hist: number[] };
  priceAt: number;
  /** Solgt for totalt (før skatt). */
  sold: number;
  /** Fat pumpet totalt. */
  pumped: number;
}

function gauss(): number {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function stepPrice(s: OilState) {
  s.price.x = s.price.x * (1 - PRICE_PULL) + gauss() * PRICE_NOISE;
  s.price.hist.push(NORMAL_PRICE * Math.exp(s.price.x));
  if (s.price.hist.length > HISTORY) s.price.hist.splice(0, s.price.hist.length - HISTORY);
}

export function newOil(now = Date.now()): OilState {
  const s: OilState = {
    owned: [{ id: PLATFORMS[0].id, ups: [] }],
    active: PLATFORMS[0].id,
    building: null,
    stock: 0,
    level: 0,
    levelDoneAt: null,
    price: { x: 0, hist: [] },
    priceAt: Math.floor(now / PRICE_STEP_MS) * PRICE_STEP_MS,
    sold: 0,
    pumped: 0,
  };
  // Et døgn med prishistorikk så grafen ikke er tom
  for (let i = 0; i < HISTORY; i++) stepPrice(s);
  return s;
}

export function oilOf(b: Business): OilState {
  b.oil ??= newOil();
  const s = b.oil;
  // Gamle lagringer: bytt til de nye plattformene (samme plass i rekken)
  const fix = (id: string) => OLD_IDS[id] ?? id;
  if (OLD_IDS[s.active] || s.owned.some((o) => OLD_IDS[o.id]) || (s.building && OLD_IDS[s.building.id])) {
    s.active = fix(s.active);
    for (const o of s.owned) o.id = fix(o.id);
    if (s.building) s.building.id = fix(s.building.id);
  }
  return s;
}
export const ownedPlatform = (s: OilState, id: string) => s.owned.find((p) => p.id === id);

// --- Tall ------------------------------------------------------------------------------------------
export const oilPrice = (s: OilState) => s.price.hist.at(-1) ?? NORMAL_PRICE;
/** Endring siste døgn (0,05 = +5 %). */
export const oilChange = (s: OilState) => oilPrice(s) / (s.price.hist[0] ?? oilPrice(s)) - 1;

/** Fat per time for en plattform man eier (med oppgraderingene). */
export const platformRate = (p: OwnedPlatform) => platformById(p.id).rate * (1 + UPGRADE_BONUS * p.ups.length);
export const capacity = (level: number) => STORAGE[Math.min(level, MAX_LEVEL)];
export const capacityOf = (s: OilState) => capacity(s.level);
export const isFull = (s: OilState) => s.stock >= capacityOf(s) * 0.9999;
/** Fat per time akkurat nå (0 når lageret er fullt). */
export function pumpRate(s: OilState): number {
  const p = ownedPlatform(s, s.active) ?? s.owned[0];
  return p && !isFull(s) ? platformRate(p) : 0;
}
/** Verdien av oljen som pumpes per time, med prisen nå. */
export const oilIncome = (b: Business) => pumpRate(oilOf(b)) * oilPrice(oilOf(b));
/** Neste plattform man kan kjøpe (null = har alle). */
export const nextPlatform = (s: OilState) => PLATFORMS.find((p) => !ownedPlatform(s, p.id) && s.building?.id !== p.id) ?? null;

// --- Handlinger ------------------------------------------------------------------------------------
export interface OilPay {
  spend(amount: number, capital: boolean): boolean;
  earn(gross: number): void;
}
export type OilResult = 'ok' | 'money' | 'busy' | 'max' | 'owned' | 'missing';

/** Kjøper neste plattform (bygges ferdig etter en stund). */
export function buyPlatform(b: Business, pay: OilPay, now = Date.now()): OilResult {
  const s = oilOf(b);
  if (s.building) return 'busy';
  const next = nextPlatform(s);
  if (!next) return 'max';
  if (!pay.spend(next.price, true)) return 'money';
  s.building = { id: next.id, doneAt: now + next.buildHours * HOUR };
  return 'ok';
}

/** Velger hvilken plattform som skal pumpe. */
export function selectPlatform(b: Business, id: string): OilResult {
  const s = oilOf(b);
  if (!ownedPlatform(s, id)) return 'missing';
  s.active = id;
  return 'ok';
}

export function buyUpgrade(b: Business, pay: OilPay, platformId: string, upgradeId: string): OilResult {
  const p = ownedPlatform(oilOf(b), platformId);
  if (!p) return 'missing';
  if (p.ups.includes(upgradeId)) return 'owned';
  if (!pay.spend(upgradeCost(platformId, p.ups.length), true)) return 'money';
  p.ups.push(upgradeId);
  return 'ok';
}

/** Starter utbyggingen av lageret (gratis, men tar tid). */
export function upgradeStorage(b: Business, now = Date.now()): OilResult {
  const s = oilOf(b);
  if (s.level >= MAX_LEVEL) return 'max';
  if (s.levelDoneAt !== null) return 'busy';
  s.levelDoneAt = now + storageHours(s.level) * HOUR;
  return 'ok';
}

/** Selger en andel (0–1) av lageret. Returnerer hva det ble solgt for (før skatt). */
export function sellOil(b: Business, pay: OilPay, share: number): number {
  const s = oilOf(b);
  const barrels = s.stock * Math.max(0, Math.min(1, share));
  if (barrels <= 0) return 0;
  const gross = barrels * oilPrice(s);
  s.stock -= barrels;
  if (s.stock < 1e-6) s.stock = 0;
  s.sold += gross;
  pay.earn(gross);
  return gross;
}

// --- Tiden går -------------------------------------------------------------------------------------
function tickPrice(s: OilState, now: number) {
  // Har appen vært lukket lenge, holder det med en uke med prisendringer
  if (now - s.priceAt > 7 * 24 * HOUR) s.priceAt = Math.floor(now / PRICE_STEP_MS) * PRICE_STEP_MS - 7 * 24 * HOUR;
  while (s.priceAt + PRICE_STEP_MS <= now) {
    s.priceAt += PRICE_STEP_MS;
    stepPrice(s);
  }
}

function pump(s: OilState, ms: number) {
  if (ms <= 0) return;
  const add = Math.min(pumpRate(s) * (ms / HOUR), Math.max(0, capacityOf(s) - s.stock));
  s.stock += add;
  s.pumped += add;
}

/**
 * Plattformen pumper (også mens appen var lukket), og ting som bygges blir ferdige.
 * Tiden deles opp der noe blir ferdig, så en ny plattform eller et større lager teller fra det øyeblikket.
 */
export function tickOil(b: Business, from: number, now: number) {
  const s = oilOf(b);
  tickPrice(s, now);
  let t = Math.min(from, now);
  for (;;) {
    const events = [s.building?.doneAt, s.levelDoneAt ?? undefined].filter((x): x is number => x !== undefined && x <= now);
    const next = events.length ? Math.max(t, Math.min(...events)) : now;
    pump(s, next - t);
    t = next;
    if (s.building && s.building.doneAt <= t) {
      s.owned.push({ id: s.building.id, ups: [] });
      s.active = s.building.id; // den nye (og bedre) plattformen tas i bruk med en gang
      s.building = null;
    }
    if (s.levelDoneAt !== null && s.levelDoneAt <= t) {
      s.level = Math.min(MAX_LEVEL, s.level + 1);
      s.levelDoneAt = null;
    }
    if (t >= now) break;
  }
}
