import { randomNormal } from './random';
import { HISTORY_POINTS, SAMPLE_MS, type Holding } from './market';
import type { GameState } from './state';

/*
 * KRYPTOMARKEDET
 * --------------
 * Mynter svinger mer enn aksjer og betaler ikke utbytte. Prisen vandrer tilfeldig,
 * men trekkes svakt tilbake mot startprisen over tid, så den ikke løper løpsk.
 * Man kan kjøpe og selge så små eller store beløp man vil (desimaler er lov).
 * Markedet går i ekte tid, også mens appen er lukket – akkurat som aksjene.
 */

export interface CoinDef {
  id: string;
  name: string;
  ticker: string;
  /** Antall mynter som finnes. */
  supply: number;
  /** Startpris (kr). Omtrent ekte pris delt på 10, som aksjene. */
  price: number;
  /** Svingninger per time (0,01 = ca. 1 %). */
  volatility: number;
  /** Farge på merket (brukes hvis logobildet mangler). */
  color: string;
}

export const COINS: CoinDef[] = [
  { id: 'bitcoin', name: 'Bitcoin', ticker: 'BTC', supply: 19_950_000, price: 9_500, volatility: 0.01, color: '#f7931a' },
  { id: 'xrp', name: 'XRP', ticker: 'XRP', supply: 60_000_000_000, price: 0.25, volatility: 0.016, color: '#000000' },
  { id: 'litecoin', name: 'Litecoin', ticker: 'LTC', supply: 76_000_000, price: 9.5, volatility: 0.014, color: '#345d9d' },
  { id: 'tellor', name: 'Tellor', ticker: 'TRB', supply: 2_700_000, price: 6, volatility: 0.022, color: '#20fe9c' },
  { id: 'cosmos', name: 'Cosmos', ticker: 'ATOM', supply: 420_000_000, price: 0.5, volatility: 0.018, color: '#a3a9d0' },
  { id: 'ravencoin', name: 'Ravencoin', ticker: 'RVN', supply: 15_500_000_000, price: 0.0018, volatility: 0.022, color: '#e0604b' },
  { id: 'axie', name: 'Axie Infinity', ticker: 'AXS', supply: 165_000_000, price: 0.45, volatility: 0.02, color: '#0055d5' },
];

export const coinById = (id: string) => COINS.find((c) => c.id === id);

const HOUR_MS = 3_600_000;
/** Hvor raskt prisen trekkes tilbake mot startprisen (per time). */
const REVERSION = 0.01;

export interface CoinMarketState {
  price: number;
  /** Prisen hvert minutt de siste 2 timene. */
  history: number[];
}

export interface CryptoState {
  lastUpdate: number;
  lastSample: number;
  coins: Record<string, CoinMarketState>;
}

/** Runder til 6 gjeldende siffer (så små priser som Ravencoin ikke blir 0). */
const round = (x: number) => Number(x.toPrecision(6));

function stepCoin(def: CoinDef, c: CoinMarketState, dt: number) {
  const anchor = Math.log(def.price);
  const decay = Math.exp(-REVERSION * dt);
  const spread = def.volatility * Math.sqrt((1 - decay * decay) / (2 * REVERSION));
  c.price = Math.exp(anchor + (Math.log(c.price) - anchor) * decay + spread * randomNormal());
}

function initCoin(def: CoinDef): CoinMarketState {
  const c: CoinMarketState = { price: def.price, history: [def.price] };
  for (let i = 1; i < HISTORY_POINTS; i++) {
    stepCoin(def, c, SAMPLE_MS / HOUR_MS);
    c.history.push(round(c.price));
  }
  return c;
}

const minuteStart = (t: number) => Math.floor(t / SAMPLE_MS) * SAMPLE_MS;

export function createCrypto(now: number): CryptoState {
  const coins: Record<string, CoinMarketState> = {};
  for (const def of COINS) coins[def.id] = initCoin(def);
  const t = minuteStart(now);
  return { lastUpdate: t, lastSample: t, coins };
}

/** Sørger for at kryptomarkedet finnes, og at nye mynter i lista får verdier. */
export function ensureCrypto(state: GameState, now: number) {
  state.crypto ??= createCrypto(now);
  state.cryptoHoldings ??= {};
  for (const def of COINS) state.crypto.coins[def.id] ??= initCoin(def);
}

let version = 0;
/** Øker hver gang prisene endres. */
export const cryptoVersion = () => version;

/** Som tickMarket: nye priser hvert minutt, og tar igjen tiden appen var lukket. */
export function tickCrypto(state: GameState, now: number) {
  const m = state.crypto;
  const target = minuteStart(now);
  if (target <= m.lastUpdate) return;

  const windowStart = target - (HISTORY_POINTS - 1) * SAMPLE_MS;
  if (m.lastUpdate < windowStart) {
    for (const def of COINS) {
      const c = m.coins[def.id];
      stepCoin(def, c, (windowStart - m.lastUpdate) / HOUR_MS);
      c.history = [round(c.price)];
    }
    m.lastUpdate = windowStart;
  }

  while (m.lastUpdate < target) {
    const next = minuteStart(m.lastUpdate) + SAMPLE_MS;
    for (const def of COINS) {
      const c = m.coins[def.id];
      stepCoin(def, c, (next - m.lastUpdate) / HOUR_MS);
      c.history.push(round(c.price));
      if (c.history.length > HISTORY_POINTS) c.history.splice(0, c.history.length - HISTORY_POINTS);
    }
    m.lastUpdate = next;
  }
  m.lastSample = m.lastUpdate;
  version++;
}

// --- Tall som vises -------------------------------------------------------------
export const coinMarket = (state: GameState, def: CoinDef) => state.crypto.coins[def.id];

export function coinHolding(state: GameState, def: CoinDef): Holding {
  return state.cryptoHoldings[def.id] ?? { owned: 0, invested: 0 };
}

export function coinChange(state: GameState, def: CoinDef): { diff: number; pct: number } {
  const c = coinMarket(state, def);
  const start = c.history[0];
  return { diff: c.price - start, pct: ((c.price - start) / start) * 100 };
}

export const coinCap = (state: GameState, def: CoinDef) => coinMarket(state, def).price * def.supply;
export const coinsAvailable = (state: GameState, def: CoinDef) => def.supply - coinHolding(state, def).owned;
export const ownedCoins = (state: GameState) => COINS.filter((d) => coinHolding(state, d).owned > 0);

/** Verdien av alle myntene du eier, og hva du betalte for dem. */
export function cryptoSummary(state: GameState) {
  let value = 0;
  let invested = 0;
  for (const def of COINS) {
    const h = coinHolding(state, def);
    if (h.owned <= 0) continue;
    value += h.owned * coinMarket(state, def).price;
    invested += h.invested;
  }
  return { value, invested };
}

// --- Kjøp og salg (ingen minstegrense) ---------------------------------------------
/** Antall mynter rundes til 8 desimaler (som ekte krypto). */
const roundCoins = (x: number) => Math.floor(x * 1e8 + 1e-6) / 1e8;

export function maxBuyableCoins(state: GameState, def: CoinDef): number {
  return Math.max(0, roundCoins(Math.min(state.balance / coinMarket(state, def).price, coinsAvailable(state, def))));
}

/** Kjøper mynter. Returnerer antall kjøpt. */
export function buyCoins(state: GameState, def: CoinDef, amount: number): number {
  const count = Math.min(roundCoins(amount), maxBuyableCoins(state, def));
  if (count <= 0) return 0;
  const cost = Math.min(count * coinMarket(state, def).price, state.balance);
  const h = (state.cryptoHoldings[def.id] ??= { owned: 0, invested: 0 });
  state.balance -= cost;
  h.owned = roundCoins(h.owned + count + 1e-12);
  h.invested += cost;
  return count;
}

/** Selger mynter. Returnerer antall solgt. */
export function sellCoins(state: GameState, def: CoinDef, amount: number): number {
  const h = state.cryptoHoldings[def.id];
  if (!h) return 0;
  const count = Math.min(roundCoins(amount), h.owned);
  if (count <= 0) return 0;
  const left = Math.max(0, h.owned - count);
  const remaining = left < 1e-8 ? 0 : h.invested * (left / h.owned);
  const proceeds = count * coinMarket(state, def).price;
  state.tradingProfit += proceeds - (h.invested - remaining);
  h.invested = remaining;
  h.owned = left < 1e-8 ? 0 : roundCoins(left + 1e-12);
  if (h.owned === 0) delete state.cryptoHoldings[def.id];
  state.balance += proceeds;
  return count;
}
