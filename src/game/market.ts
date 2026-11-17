import { hashString, randomNormal, seededRandom } from './random';
import { STOCKS, type StockDef, type StockProfile } from './stockData';
import type { GameState } from './state';
import { taxDividend } from './taxes';

/*
 * AKSJEMARKEDET – slik fungerer det
 * ---------------------------------
 * Hver aksje har en PRIS og en "RIKTIG VERDI" (det selskapet egentlig er verdt).
 *
 * 1. Riktig verdi vokser (eller synker) sakte over tid, med litt tilfeldighet.
 * 2. Prisen svinger tilfeldig rundt den riktige verdien, og trekkes mot den over tid.
 * 2b. VEKSTPOTENSIAL: analytikerne har et KURSMÅL for hver aksje (f.eks. 25 % over prisen).
 *    Riktig verdi trekkes sakte mot kursmålet – men hvor mye analytikerne "treffer" er
 *    forskjellig fra aksje til aksje, og kursmålet endres (opp eller ned) omtrent én gang
 *    i døgnet. Høyt vekstpotensial betyr altså at aksjen KAN stige mye over dager,
 *    ikke at den gjør det. Ingenting er garantert.
 * 3. Av og til kommer det NYHETER: et plutselig hopp opp eller ned.
 *    En del av hoppet er varig (endrer riktig verdi), resten går tilbake.
 * 4. UTBYTTE: hver aksje betaler et fast beløp per aksje per periode (3 timer).
 *    Faller prisen, blir utbytte-prosenten høyere (og omvendt) – akkurat som i virkeligheten.
 *    Utbyttet betales løpende rett inn på saldoen, også mens appen er lukket.
 *
 * Markedet går i ekte tid. Når appen åpnes, regnes alt som skjedde mens den var lukket ut.
 */

// --- Innstillinger ----------------------------------------------------------
export const DIVIDEND_PERIOD_HOURS = 3;
/** Prisene endres én gang i minuttet (på hele minutter), og hvert minutt blir et punkt i grafen. */
export const SAMPLE_MS = 60_000;
/** Antall punkter i grafen (120 × 1 min = 2 timer). */
export const HISTORY_POINTS = 120;
const HOUR_MS = 3_600_000;
/** Hvor raskt prisen trekkes mot riktig verdi (per time). */
const PRICE_REVERSION = 0.35;
/** Hvor raskt riktig verdi trekkes tilbake mot startprisen (hindrer at alt løper løpsk over uker). */
const VALUE_REVERSION = 0.01;
/** Hvor ofte det kommer nyheter (per time per aksje). */
const NEWS_RATE = 0.03;
/** Økes når reglene for markedet endres – da lages markedet på nytt (aksjene du eier beholdes). */
const MARKET_VERSION = 3;
/** Hvor ofte analytikerne lager et nytt kursmål (per time per aksje – 1/24 = ca. én gang i døgnet). */
const TARGET_REVISION_RATE = 1 / 24;
/** Hvor raskt riktig verdi trekkes mot kursmålet (per time, for en aksje der analytikerne treffer helt). */
const TARGET_PULL = 0.004;

interface ProfileRange {
  /** Kursmålet ligger så mye over (eller under) riktig verdi (0,2 = ca. 20 %). */
  upside: [number, number];
  /** Hvor godt analytikerne treffer (0 = kursmålet betyr ingenting, 1 = aksjen går mot det). */
  reliability: [number, number];
  /** Svingninger per time (0,1 = ca. 10 %). */
  volatility: [number, number];
  /** Forventet vekst per time. */
  drift: [number, number];
  /** Utbytte i % per periode, ved startprisen. */
  dividend: [number, number];
  /** Størrelse på nyhetshopp. */
  newsSize: number;
}

// Svingningene er valgt så endringen de siste 2 timene som regel ligger mellom −1 % og +1 %,
// og bare sjelden rundt 2 % (de urolige aksjene svinger litt mer enn de stabile).
// Kursmålene gir et vekstpotensial på ca. 0–40 %. Vekstaksjene har de høyeste,
// mens de urolige aksjene kan ha høyt potensial som sjelden slår til.
const PROFILES: Record<StockProfile, ProfileRange> = {
  stable: { upside: [0.02, 0.18], reliability: [0.5, 1], volatility: [0.0025, 0.004], drift: [0, 0.0002], dividend: [0.2, 1.0], newsSize: 0.005 },
  balanced: { upside: [0.05, 0.28], reliability: [0.4, 1], volatility: [0.004, 0.006], drift: [0.00005, 0.0003], dividend: [0.03, 0.4], newsSize: 0.007 },
  growth: { upside: [0.12, 0.4], reliability: [0.3, 1], volatility: [0.005, 0.008], drift: [0.0002, 0.0006], dividend: [0, 0.03], newsSize: 0.009 },
  risky: { upside: [-0.08, 0.4], reliability: [0, 0.6], volatility: [0.006, 0.009], drift: [-0.0004, 0.0003], dividend: [0, 1.5], newsSize: 0.012 },
};

// --- Typer ------------------------------------------------------------------
export interface StockParams {
  volatility: number;
  drift: number;
  /** Utbytte i kr per aksje per periode (fast). */
  dividendPerShare: number;
  newsSize: number;
  upside: [number, number];
  reliability: number;
}

export interface StockMarketState {
  price: number;
  /** Riktig verdi (skjult for spilleren). */
  fair: number;
  /** Analytikernes kursmål (vekstpotensial = hvor mye over prisen det ligger). */
  target: number;
  /** Prisen hvert minutt de siste 2 timene. */
  history: number[];
}

export interface MarketState {
  /** Hvilke markedsregler markedet ble laget med (se MARKET_VERSION). */
  version?: number;
  lastUpdate: number;
  /** Tidspunktet for siste punkt i grafene. */
  lastSample: number;
  stocks: Record<string, StockMarketState>;
}

export interface Holding {
  owned: number;
  /** Hva spilleren har betalt for aksjene hen eier nå. */
  invested: number;
}

// --- Faste egenskaper per aksje -------------------------------------------------
const paramsCache = new Map<string, StockParams>();

/** Egenskapene er tilfeldige, men alltid de samme for samme aksje. */
export function stockParams(def: StockDef): StockParams {
  const cached = paramsCache.get(def.id);
  if (cached) return cached;
  const rand = seededRandom(hashString(def.id));
  const range = PROFILES[def.profile];
  const pick = ([min, max]: [number, number]) => min + (max - min) * rand();
  const params: StockParams = {
    volatility: pick(range.volatility),
    drift: pick(range.drift),
    dividendPerShare: (def.price * pick(range.dividend)) / 100,
    newsSize: range.newsSize,
    upside: range.upside,
    reliability: pick(range.reliability),
  };
  paramsCache.set(def.id, params);
  return params;
}

// --- Simulering --------------------------------------------------------------
const round = (x: number) => Math.round(x * 10_000) / 10_000;

/** Et nytt kursmål et tilfeldig stykke over (eller under) verdien. */
function newTarget(p: StockParams, value: number): number {
  const [min, max] = p.upside;
  return value * Math.exp(min + (max - min) * Math.random());
}

/** Flytter én aksje `dt` timer frem i tid. */
function stepStock(def: StockDef, s: StockMarketState, dt: number) {
  const p = stockParams(def);
  const anchor = Math.log(def.price);

  // 1. Riktig verdi: vekst + tilfeldighet, trekkes svakt mot startprisen
  let lnFair = Math.log(s.fair);
  const valueDecay = Math.exp(-VALUE_REVERSION * dt);
  lnFair = anchor + (lnFair - anchor) * valueDecay + p.drift * dt + p.volatility * 0.35 * Math.sqrt(dt) * randomNormal();

  // 1b. Kursmålet: riktig verdi trekkes sakte mot det (mer eller mindre, avhengig av aksjen)
  const pull = 1 - Math.exp(-TARGET_PULL * p.reliability * dt);
  lnFair += (Math.log(s.target) - lnFair) * pull;
  // Av og til lager analytikerne et nytt kursmål – det kan bli både høyere og lavere
  if (Math.random() < 1 - Math.exp(-TARGET_REVISION_RATE * dt)) s.target = newTarget(p, Math.exp(lnFair));

  // 2. Prisen svinger rundt riktig verdi (Ornstein-Uhlenbeck – fungerer for både korte og lange tidssteg)
  const decay = Math.exp(-PRICE_REVERSION * dt);
  let deviation = Math.log(s.price) - Math.log(s.fair);
  deviation =
    deviation * decay + p.volatility * Math.sqrt((1 - decay * decay) / (2 * PRICE_REVERSION)) * randomNormal();

  // 3. Nyheter: plutselig hopp. 60 % er varig, 40 % går tilbake over tid.
  if (Math.random() < 1 - Math.exp(-NEWS_RATE * dt)) {
    const jump = randomNormal() * p.newsSize;
    lnFair += jump * 0.6;
    deviation += jump * 0.4;
  }

  s.fair = Math.exp(lnFair);
  s.price = Math.max(0.01, Math.exp(lnFair + deviation));
}

/** Flytter hele markedet frem i tid og betaler utbytte for perioden. */
function advanceAll(state: GameState, dtHours: number) {
  let gross = 0;
  for (const def of STOCKS) {
    const s = state.market.stocks[def.id];
    stepStock(def, s, dtHours);

    const owned = state.holdings[def.id]?.owned ?? 0;
    if (owned > 0) gross += owned * stockParams(def).dividendPerShare * (dtHours / DIVIDEND_PERIOD_HOURS);
  }
  if (gross > 0) {
    // Skatt: trekkes automatisk, eller legges til skattegjelden (se taxes.ts)
    const net = taxDividend(state, gross);
    state.balance += net;
    state.totalEarned += net;
    state.dividendsEarned += net;
  }
}

/** Lager startverdier for én aksje, med 2 timer historikk så grafen ikke er tom. */
function initStock(def: StockDef): StockMarketState {
  const target = newTarget(stockParams(def), def.price);
  const s: StockMarketState = { price: def.price, fair: def.price, target, history: [def.price] };
  for (let i = 1; i < HISTORY_POINTS; i++) {
    stepStock(def, s, SAMPLE_MS / HOUR_MS);
    s.history.push(round(s.price));
  }
  return s;
}

/** Starten av minuttet `t` er i. */
const minuteStart = (t: number) => Math.floor(t / SAMPLE_MS) * SAMPLE_MS;

export function createMarket(now: number): MarketState {
  const stocks: Record<string, StockMarketState> = {};
  for (const def of STOCKS) stocks[def.id] = initStock(def);
  const t = minuteStart(now);
  return { version: MARKET_VERSION, lastUpdate: t, lastSample: t, stocks };
}

/** Sørger for at markedet finnes (med dagens regler), og at nye aksjer i lista får verdier. */
export function ensureMarket(state: GameState, now: number) {
  if (state.market?.version !== MARKET_VERSION) state.market = createMarket(now);
  for (const def of STOCKS) {
    if (!state.market.stocks[def.id]) state.market.stocks[def.id] = initStock(def);
  }
}

let version = 0;
/** Øker hver gang prisene endres – sidene bruker dette for å vite når de skal tegnes på nytt. */
export const marketVersion = () => version;

/**
 * Kjøres hele tiden, men gjør bare noe når et nytt minutt har startet
 * (da endres prisene). Tar også igjen all tid som har gått mens appen var lukket.
 */
export function tickMarket(state: GameState, now: number): boolean {
  const m = state.market;
  const target = minuteStart(now);
  if (target <= m.lastUpdate) return false;

  // Lang pause: alt eldre enn 2 timer regnes ut i ett stort steg
  const windowStart = target - (HISTORY_POINTS - 1) * SAMPLE_MS;
  if (m.lastUpdate < windowStart) {
    advanceAll(state, (windowStart - m.lastUpdate) / HOUR_MS);
    m.lastUpdate = windowStart;
    for (const def of STOCKS) m.stocks[def.id].history = [round(m.stocks[def.id].price)];
  }

  // Resten ett minutt om gangen, med et punkt i grafen for hvert minutt
  while (m.lastUpdate < target) {
    const next = minuteStart(m.lastUpdate) + SAMPLE_MS;
    advanceAll(state, (next - m.lastUpdate) / HOUR_MS);
    m.lastUpdate = next;
    for (const def of STOCKS) {
      const s = m.stocks[def.id];
      s.history.push(round(s.price));
      if (s.history.length > HISTORY_POINTS) s.history.splice(0, s.history.length - HISTORY_POINTS);
    }
  }

  m.lastSample = m.lastUpdate;
  version++;
  return true;
}

// --- Tall som vises -------------------------------------------------------------
export function marketOf(state: GameState, def: StockDef): StockMarketState {
  return state.market.stocks[def.id];
}

export function holdingOf(state: GameState, def: StockDef): Holding {
  return state.holdings[def.id] ?? { owned: 0, invested: 0 };
}

/** Utbytte i % per periode, ved dagens pris. */
export function dividendYield(state: GameState, def: StockDef): number {
  return (stockParams(def).dividendPerShare / marketOf(state, def).price) * 100;
}

/** Endring i pris de siste 2 timene. */
export function priceChange(state: GameState, def: StockDef): { diff: number; pct: number } {
  const s = marketOf(state, def);
  const start = s.history[0];
  return { diff: s.price - start, pct: ((s.price - start) / start) * 100 };
}

/** Vekstpotensial i %: hvor langt over dagens pris analytikernes kursmål ligger (ingen garanti!). */
export function growthPotential(state: GameState, def: StockDef): number {
  const s = marketOf(state, def);
  return (s.target / s.price - 1) * 100;
}

export function capitalization(state: GameState, def: StockDef): number {
  return marketOf(state, def).price * def.shares;
}

export function availableShares(state: GameState, def: StockDef): number {
  return def.shares - holdingOf(state, def).owned;
}

/** Oversikt over alt spilleren eier. */
export function portfolioSummary(state: GameState) {
  let value = 0;
  let invested = 0;
  let perHour = 0;
  for (const def of STOCKS) {
    const h = holdingOf(state, def);
    if (h.owned <= 0) continue;
    value += h.owned * marketOf(state, def).price;
    invested += h.invested;
    perHour += (h.owned * stockParams(def).dividendPerShare) / DIVIDEND_PERIOD_HOURS;
  }
  return { value, invested, perHour };
}

export function ownedStocks(state: GameState): StockDef[] {
  return STOCKS.filter((def) => holdingOf(state, def).owned > 0);
}

// --- Kjøp og salg ------------------------------------------------------------------
/** Hvor mange aksjer man har råd til (og som er tilgjengelige). */
export function maxBuyable(state: GameState, def: StockDef): number {
  const price = marketOf(state, def).price;
  return Math.max(0, Math.min(Math.floor(state.balance / price), availableShares(state, def)));
}

/** Kjøper aksjer. Returnerer antall kjøpt. */
export function buyShares(state: GameState, def: StockDef, quantity: number): number {
  const count = Math.min(Math.floor(quantity), maxBuyable(state, def));
  if (count <= 0) return 0;
  const cost = count * marketOf(state, def).price;
  const h = (state.holdings[def.id] ??= { owned: 0, invested: 0 });
  state.balance -= cost;
  h.owned += count;
  h.invested += cost;
  return count;
}

/** Selger aksjer. Returnerer antall solgt. */
export function sellShares(state: GameState, def: StockDef, quantity: number): number {
  const h = state.holdings[def.id];
  if (!h) return 0;
  const count = Math.min(Math.floor(quantity), h.owned);
  if (count <= 0) return 0;
  // Det investerte beløpet reduseres i samme forhold som aksjene som selges
  const remaining = h.invested * ((h.owned - count) / h.owned);
  const proceeds = count * marketOf(state, def).price;
  state.tradingProfit += proceeds - (h.invested - remaining); // gevinst eller tap
  h.invested = remaining;
  h.owned -= count;
  state.balance += proceeds;
  return count;
}

// --- Sortering og anbefalinger -----------------------------------------------------
export type SortKey = 'div-desc' | 'div-asc' | 'price-asc' | 'price-desc' | 'cap-desc' | 'cap-asc' | 'growth-desc';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'div-desc', label: 'Høyest utbytte' },
  { key: 'div-asc', label: 'Lavest utbytte' },
  { key: 'price-asc', label: 'Billigst først' },
  { key: 'price-desc', label: 'Dyrest først' },
  { key: 'cap-desc', label: 'Høyest markedsverdi' },
  { key: 'cap-asc', label: 'Lavest markedsverdi' },
  { key: 'growth-desc', label: 'Vekstpotensial' },
];

export function sortedStocks(state: GameState, key: SortKey): StockDef[] {
  const value: Record<SortKey, (d: StockDef) => number> = {
    'div-desc': (d) => -dividendYield(state, d),
    'div-asc': (d) => dividendYield(state, d),
    'price-asc': (d) => marketOf(state, d).price,
    'price-desc': (d) => -marketOf(state, d).price,
    'cap-desc': (d) => -capitalization(state, d),
    'cap-asc': (d) => capitalization(state, d),
    'growth-desc': (d) => -growthPotential(state, d),
  };
  return [...STOCKS].sort((a, b) => value[key](a) - value[key](b));
}

/** Antall aksjer på sidene "Stabil inntekt" og "Vekstpotensial". */
const PICK_LIST_SIZE = 15;

/** "Stabil inntekt": høyest utbytte blant de tryggere aksjene (ikke de risikable), best først. */
export function incomeStocks(state: GameState): StockDef[] {
  return STOCKS.filter((d) => d.profile !== 'risky' && stockParams(d).dividendPerShare > 0)
    .sort((a, b) => dividendYield(state, b) - dividendYield(state, a))
    .slice(0, PICK_LIST_SIZE);
}

/** "Vekstpotensial": aksjene med høyest kursmål over dagens pris, best først. */
export function growthStocks(state: GameState): StockDef[] {
  return STOCKS.filter((d) => growthPotential(state, d) > 0)
    .sort((a, b) => growthPotential(state, b) - growthPotential(state, a))
    .slice(0, PICK_LIST_SIZE);
}

export const topDividendStock = (state: GameState): StockDef => incomeStocks(state)[0] ?? STOCKS[0];
export const topGrowthStock = (state: GameState): StockDef => growthStocks(state)[0] ?? STOCKS[0];
