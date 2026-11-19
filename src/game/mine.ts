import type { Business } from './business';
import { MINERALS, MINES, TOOLS, mineById, mineralById, mineralTier, toolById, type MineDef, type MineralId } from './mineData';

/*
 * GRUVESELSKAP
 * ------------
 * Gruvene graver hele tiden (også mens appen er lukket). Det som graves fram, havner på lageret
 * for hvert mineral. Man selger selv når prisen er god – prisene går opp og ned som aksjer.
 *
 * GRAVING: graveverktøyet graver X tonn masse per time. Hvert tonn gir en "fangst" (kg funn),
 *   fordelt på mineralene gruva har (f.eks. 55 % sølv, 40 % kobber, 5 % gull).
 *   Dyrere gruver har mer verdifulle funn. Hvert tonn er verdt 1,45 ganger mer for hver gruve nedover.
 * VERKTØY: slites ut etter et visst antall tonn (= timer med graving). Da stopper gruva
 *   til man kjøper et nytt. Bedre verktøy graver mer per time, men koster mer.
 * LAGER: ett lager per mineral. Er det fullt, går nye funn av det mineralet tapt.
 *   Lagrene kan bygges ut (dyrere jo mer verdifullt mineralet er).
 * PRISER: svinger rundt normalprisen, nytt punkt hvert 10. minutt. Grafen viser siste døgn.
 *
 * Alt maks utbygd (alle gruver med beste verktøy) gir ca. $ 800 M per time ved normalpris.
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const MINE_TYPE = 'mining';
export const isMineType = (typeId: string) => typeId === MINE_TYPE;

const HOUR = 3_600_000;

// --- Balansering ---------------------------------------------------------------------------
/** Hva ett tonn masse i den første gruva er verdt ved normalpris. */
const VALUE_PER_TONN = 289;
/** Lager: verdien et nytt lager har plass til, vekst per utvidelse og pris (andel av verdien). */
const STORAGE_START_VALUE = 2_000_000;
const STORAGE_GROWTH = 1.5;
const STORAGE_TIER_GROWTH = 1.3;
const STORAGE_COST_SHARE = 0.35;
export const MAX_STORAGE_LEVEL = 15;
/** Priser: nytt punkt hvert 10. minutt, 144 punkter = ett døgn. */
export const PRICE_STEP_MS = 10 * 60_000;
const HISTORY = 144;
const PRICE_PULL = 0.03;
const PRICE_NOISE = 0.025;

// --- Tilstand ---------------------------------------------------------------------------------
export interface OwnedMine {
  id: string;
  /** Verktøyet som brukes nå (null = ingen). */
  tool: string | null;
  /** Hvor mange tonn verktøyet kan grave før det er slitt ut. */
  wear: number;
  /** Når gruva er klar (null = klar). */
  openAt: number | null;
  /** Tonn gravd totalt. */
  dug: number;
}

export interface MineralPrice {
  /** Avvik fra normalprisen (logaritmisk). */
  x: number;
  /** Prisene siste døgn (siste punkt = prisen nå). */
  hist: number[];
}

export interface MineState {
  mines: OwnedMine[];
  /** Kg på lager. */
  stock: Record<MineralId, number>;
  /** Hvor utbygd hvert lager er. */
  storage: Record<MineralId, number>;
  prices: Record<MineralId, MineralPrice>;
  /** Tidspunktet for siste prispunkt. */
  priceAt: number;
  /** Solgt for totalt (før skatt). */
  sold: number;
}

const perMineral = <T>(fn: (id: MineralId) => T) => Object.fromEntries(MINERALS.map((m) => [m.id, fn(m.id)])) as Record<MineralId, T>;

function gauss(): number {
  const u = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
}

function stepPrice(id: MineralId, p: MineralPrice) {
  p.x = p.x * (1 - PRICE_PULL) + gauss() * PRICE_NOISE;
  p.hist.push(mineralById(id).price * Math.exp(p.x));
  if (p.hist.length > HISTORY) p.hist.splice(0, p.hist.length - HISTORY);
}

export function newMining(now = Date.now()): MineState {
  const prices = perMineral(() => ({ x: 0, hist: [] as number[] }));
  // Lag et døgn med prishistorikk så grafen ikke er tom
  for (const m of MINERALS) for (let i = 0; i < HISTORY; i++) stepPrice(m.id, prices[m.id]);
  const first = TOOLS[0];
  return {
    mines: [{ id: MINES[0].id, tool: first.id, wear: first.rate * first.lifeHours, openAt: null, dug: 0 }],
    stock: perMineral(() => 0),
    storage: perMineral(() => 0),
    prices,
    priceAt: Math.floor(now / PRICE_STEP_MS) * PRICE_STEP_MS,
    sold: 0,
  };
}

export function miningOf(b: Business): MineState {
  b.mining ??= newMining();
  return b.mining;
}
export const ownedMine = (b: Business, id: string) => miningOf(b).mines.find((m) => m.id === id);

// --- Tall -----------------------------------------------------------------------------------------
export const priceNow = (s: MineState, id: MineralId) => s.prices[id].hist.at(-1) ?? mineralById(id).price;
/** Endring siste døgn (0,05 = +5 %). */
export const priceChange = (s: MineState, id: MineralId) => priceNow(s, id) / (s.prices[id].hist[0] ?? priceNow(s, id)) - 1;

/** Kg funn per tonn masse i en gruve (alle mineraler til sammen). */
export function yieldPerTonn(def: MineDef): number {
  const avgPrice = Object.entries(def.finds).reduce((sum, [id, share]) => sum + share! * mineralById(id as MineralId).price, 0);
  return (VALUE_PER_TONN * def.mult) / avgPrice;
}
/** Verdien av ett tonn masse ved normalpris. */
export const valuePerTonn = (def: MineDef) => VALUE_PER_TONN * def.mult;

export const isOpen = (m: OwnedMine, now = Date.now()) => m.openAt === null || m.openAt <= now;
/** Tonn per time akkurat nå (0 hvis verktøyet er slitt ut eller gruva ikke er klar). */
export const digRate = (m: OwnedMine, now = Date.now()) => (m.tool && m.wear > 0 && isOpen(m, now) ? toolById(m.tool).rate : 0);
/** Timer til verktøyet er slitt ut. */
export const hoursLeft = (m: OwnedMine) => (m.tool ? m.wear / toolById(m.tool).rate : 0);

/** Kg per time av hvert mineral fra en gruve. */
export function findsPerHour(m: OwnedMine, now = Date.now()): [MineralId, number][] {
  const def = mineById(m.id);
  const kg = digRate(m, now) * yieldPerTonn(def);
  return Object.entries(def.finds).map(([id, share]) => [id as MineralId, kg * share!]);
}

/** Verdien av det gruva finner per time, med prisene nå. */
export const mineValuePerHour = (s: MineState, m: OwnedMine) =>
  findsPerHour(m).reduce((sum, [id, kg]) => sum + kg * priceNow(s, id), 0);

/** Verdien av alt som graves per time (det som går tapt fordi lageret er fullt, teller ikke). */
export function miningIncome(b: Business): number {
  const s = miningOf(b);
  return s.mines.reduce(
    (sum, m) => sum + findsPerHour(m).reduce((t, [id, kg]) => t + (isFull(s, id) ? 0 : kg * priceNow(s, id)), 0),
    0,
  );
}

// --- Lager ------------------------------------------------------------------------------------------
const storageValue = (id: MineralId, level: number) =>
  STORAGE_START_VALUE * STORAGE_TIER_GROWTH ** mineralTier(id) * STORAGE_GROWTH ** level;
/** Hvor mange kg lageret har plass til. */
export const capacity = (id: MineralId, level: number) => storageValue(id, level) / mineralById(id).price;
export const capacityOf = (s: MineState, id: MineralId) => capacity(id, s.storage[id]);
export const isFull = (s: MineState, id: MineralId) => s.stock[id] >= capacityOf(s, id) * 0.9999;
export const storageCost = (s: MineState, id: MineralId) => STORAGE_COST_SHARE * storageValue(id, s.storage[id] + 1);
/** Verdien av alt på lageret med prisene nå. */
export const stockValue = (s: MineState) => MINERALS.reduce((sum, m) => sum + s.stock[m.id] * priceNow(s, m.id), 0);

// --- Priser på ting ---------------------------------------------------------------------------------
export const toolPrice = (mineId: string, toolId: string) => toolById(toolId).price * mineById(mineId).mult;

// --- Handlinger ---------------------------------------------------------------------------------------
export interface MinePay {
  spend(amount: number, capital: boolean): boolean;
  earn(gross: number): void;
}
export type MineResult = 'ok' | 'money' | 'owned' | 'max' | 'empty' | 'closed';

export function buyMine(b: Business, pay: MinePay, id: string, now = Date.now()): MineResult {
  const def = mineById(id);
  if (ownedMine(b, def.id)) return 'owned';
  if (!pay.spend(def.price, true)) return 'money';
  miningOf(b).mines.push({ id: def.id, tool: null, wear: 0, openAt: now + def.openHours * HOUR, dug: 0 });
  return 'ok';
}

/** Kjøper et nytt verktøy til gruva (det gamle kastes). */
export function buyTool(b: Business, pay: MinePay, mineId: string, toolId: string): MineResult {
  const m = ownedMine(b, mineId);
  if (!m) return 'closed';
  if (!pay.spend(toolPrice(mineId, toolId), false)) return 'money';
  const t = toolById(toolId);
  m.tool = t.id;
  m.wear = t.rate * t.lifeHours;
  return 'ok';
}

export function upgradeStorage(b: Business, pay: MinePay, id: MineralId): MineResult {
  const s = miningOf(b);
  if (s.storage[id] >= MAX_STORAGE_LEVEL) return 'max';
  if (!pay.spend(storageCost(s, id), true)) return 'money';
  s.storage[id] += 1;
  return 'ok';
}

/** Selger en andel (0–1) av lageret. Returnerer hva det ble solgt for (før skatt). */
export function sellMineral(b: Business, pay: MinePay, id: MineralId, share: number): number {
  const s = miningOf(b);
  const kg = s.stock[id] * Math.max(0, Math.min(1, share));
  if (kg <= 0) return 0;
  const gross = kg * priceNow(s, id);
  s.stock[id] -= kg;
  if (s.stock[id] < 1e-6) s.stock[id] = 0;
  s.sold += gross;
  pay.earn(gross);
  return gross;
}

// --- Tiden går -----------------------------------------------------------------------------------------
function tickPrices(s: MineState, now: number) {
  // Har appen vært lukket lenge, holder det med en uke med prisendringer
  if (now - s.priceAt > 7 * 24 * HOUR) s.priceAt = Math.floor(now / PRICE_STEP_MS) * PRICE_STEP_MS - 7 * 24 * HOUR;
  while (s.priceAt + PRICE_STEP_MS <= now) {
    s.priceAt += PRICE_STEP_MS;
    for (const m of MINERALS) stepPrice(m.id, s.prices[m.id]);
  }
}

/** Gruvene graver (også mens appen var lukket), verktøyene slites og prisene endrer seg. */
export function tickMines(b: Business, from: number, now: number) {
  const s = miningOf(b);
  tickPrices(s, now);
  for (const m of s.mines) {
    const start = Math.max(from, m.openAt ?? from);
    if (start >= now || !m.tool || m.wear <= 0) {
      if (m.openAt !== null && m.openAt <= now) m.openAt = null;
      continue;
    }
    m.openAt = null;
    const def = mineById(m.id);
    const tonn = Math.min(toolById(m.tool).rate * ((now - start) / HOUR), m.wear);
    m.wear -= tonn;
    m.dug += tonn;
    const kg = tonn * yieldPerTonn(def);
    for (const [id, share] of Object.entries(def.finds) as [MineralId, number][]) {
      s.stock[id] = Math.min(capacityOf(s, id), s.stock[id] + kg * share);
    }
  }
}

export { MINERALS, MINES, TOOLS, mineById, mineralById, toolById };
