import type { GameState } from './state';
import { SIMPLIFIED_RATE } from './taxes';
import { capacityOf, capacityOptions, carsOf, driveCars, fleetIncome, modelById, SHIPPING_TYPE, START_CAPACITY, type TaxiCar } from './taxi';

/*
 * BEDRIFTER
 * ---------
 * Du starter en bedrift (koster en åpningskostnad), og den tjener penger hver time –
 * også mens appen er lukket.
 *
 * "Åpne nye utsalgssteder" = utvide bedriften (flere butikker). Det koster en investering
 * og tar litt tid. Når utvidelsen er ferdig, går bedriften opp ett trinn og tjener mer.
 *   - Inntekt per time øker med en fast prosent per trinn (35 % for lokal butikk osv.)
 *   - Investeringen blir 30 % dyrere for hvert trinn
 *   - Utvidelsen tar lengre tid for hvert trinn, men aldri mer enn 8 timer
 *
 * Kapitalisering = alt du har puttet inn i bedriften (åpningskostnad + investeringer).
 * Legger du ned bedriften, får du tilbake 30 % av kapitaliseringen.
 */

export type BusinessCategoryId = 'shop' | 'taxi' | 'shipping';

export interface BusinessCategory {
  id: BusinessCategoryId;
  name: string;
  /** Overskrift på siden der man velger type, f.eks. "Velg type butikk". */
  chooseTitle: string;
  /** Overskrift når man skriver navn, f.eks. "Skriv inn navnet på butikken". */
  nameTitle: string;
  color: string;
}

export interface BusinessType {
  id: string;
  category: BusinessCategoryId;
  name: string;
  /** Hvor mange mynter ikonet har (1–3). */
  coins: number;
  /** Pris for å starte bedriften (kr). */
  openingCost: number;
  /** Inntekt per time på trinn 1 (kr). */
  baseIncome: number;
  /** Investering for å gå fra trinn 1 til 2 (kr). */
  baseInvestment: number;
  /** Hvor mye inntekten øker per trinn (0,35 = 35 %). */
  growth: number;
  /** Tiden den første utvidelsen tar (sekunder). */
  firstExpansionSec: number;
  /** Hvor mye lengre hver utvidelse tar enn forrige (1,8 = 80 % lengre). */
  timeGrowth: number;
}

export const CATEGORIES: BusinessCategory[] = [
  { id: 'shop', name: 'Butikk', chooseTitle: 'Velg type butikk', nameTitle: 'Skriv inn navnet på butikken', color: 'green' },
  { id: 'taxi', name: 'Taxiselskap', chooseTitle: '', nameTitle: 'Skriv inn navnet på taxiselskapet', color: 'yellow' },
  { id: 'shipping', name: 'Fraktselskap', chooseTitle: '', nameTitle: 'Skriv inn navnet på fraktselskapet', color: 'orange' },
];

// Tallene er 1/10 av Business Empire sine (spillet har 10 ganger lavere verdier).
export const BUSINESS_TYPES: BusinessType[] = [
  // Taxiselskap: inntekten kommer fra bilene (se taxi.ts), ikke fra trinn
  {
    id: 'taxi',
    category: 'taxi',
    name: 'Taxiselskap',
    coins: 1,
    openingCost: 999.9, // vises som $ 9 999
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  // Fraktselskap: som taxi, men med lastebiler
  {
    id: SHIPPING_TYPE,
    category: 'shipping',
    name: 'Fraktselskap',
    coins: 1,
    openingCost: 1989.9, // vises som $ 19 899
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  {
    id: 'local-shop',
    category: 'shop',
    name: 'Lokal butikk',
    coins: 1,
    openingCost: 489.9, // vises som $ 4 899
    baseIncome: 10.206,
    baseInvestment: 146.97,
    growth: 0.35,
    firstExpansionSec: 120,
    timeGrowth: 1.8,
  },
  {
    id: 'small-chain',
    category: 'shop',
    name: 'Liten butikkjede',
    coins: 2,
    openingCost: 1300,
    baseIncome: 32.497,
    baseInvestment: 389.97,
    growth: 0.38,
    firstExpansionSec: 1200,
    timeGrowth: 2,
  },
  {
    id: 'large-chain',
    category: 'shop',
    name: 'Stor butikkjede',
    coins: 3,
    openingCost: 5500,
    baseIncome: 152.775,
    baseInvestment: 1649.97,
    growth: 0.42,
    firstExpansionSec: 1200,
    timeGrowth: 2,
  },
];

// --- Innstillinger ----------------------------------------------------------------
/** Høyeste trinn en bedrift kan nå. */
export const MAX_STAGE = 15;
/** En utvidelse tar aldri lengre tid enn dette. */
const MAX_EXPANSION_SEC = 8 * 3600;
/** Investeringen blir så mye dyrere for hvert trinn (1,3 = 30 %). */
const INVESTMENT_GROWTH = 1.3;
/** Andel av kapitaliseringen man får tilbake når bedriften legges ned. */
export const CLOSE_REFUND = 0.3;
/** Navnebytte koster denne andelen av kapitaliseringen. */
const RENAME_COST = 0.05;
// --- Bedriftsplasser ------------------------------------------------------------------
/** Plasser man har fra starten (hvor mange bedrifter man kan eie). */
export const START_SLOTS = 5;
/** Flest plasser man kan ha. */
export const MAX_SLOTS = 20;
/** Hver nye plass tar 4 timer å bygge, uansett hvilken (kan ikke hoppes over). */
export const SLOT_SECONDS = 4 * 3600;
/**
 * Pris for hver plass (vises 10x høyere: plass 6 = $ 20 000, plass 20 = $ 25 T).
 * Billig i starten, så den første kan kjøpes tidlig – og svært dyr mot slutten.
 */
const SLOT_PRICES: Record<number, number> = {
  6: 2_000,
  7: 7_500,
  8: 25_000,
  9: 75_000,
  10: 200_000,
  11: 600_000,
  12: 1_500_000,
  13: 4_000_000,
  14: 10_000_000,
  15: 25_000_000,
  16: 400_000_000,
  17: 8_000_000_000,
  18: 150_000_000_000,
  19: 500_000_000_000,
  20: 2_500_000_000_000,
};

export const slotPrice = (slot: number) => SLOT_PRICES[slot] ?? Infinity;
export const slotsOf = (state: GameState) => state.businessSlots;
/** Plassen man kjøper nå (eller som bygges nå). */
export const nextSlot = (state: GameState) => state.businessSlots + 1;
export const slotsFull = (state: GameState) => state.businesses.length >= state.businessSlots;

/** Kjøper neste plass. Den er klar etter 4 timer. */
export function buySlot(state: GameState, now = Date.now()): 'ok' | 'money' | 'busy' | 'max' {
  if (state.slotExpansionEnd !== null) return 'busy';
  if (state.businessSlots >= MAX_SLOTS) return 'max';
  const price = slotPrice(nextSlot(state));
  if (state.balance < price) return 'money';
  state.balance -= price;
  state.slotExpansionEnd = now + SLOT_SECONDS * 1000;
  return 'ok';
}

export interface Business {
  id: string;
  type: string;
  name: string;
  stage: number;
  /** Kapitalisering: alt som er puttet inn (kr). */
  invested: number;
  /** Alt bedriften har tjent (kr). */
  earned: number;
  /** Når utvidelsen er ferdig (ms), eller null hvis ingen utvidelse pågår. */
  expansionEnd: number | null;

  // --- Bare for taxiselskap ---
  /** Plasser til biler. */
  capacity?: number;
  /** Bilene selskapet eier. */
  cars?: TaxiCar[];
  /** Hvor mange plasser utvidelsen som pågår gir. */
  pendingPlaces?: number;
}

const toOre = (kr: number) => Math.round(kr * 100) / 100;

export const typeById = (id: string): BusinessType => BUSINESS_TYPES.find((t) => t.id === id) ?? BUSINESS_TYPES[0];
export const categoryById = (id: BusinessCategoryId): BusinessCategory => CATEGORIES.find((c) => c.id === id)!;
export const typesIn = (category: BusinessCategoryId) => BUSINESS_TYPES.filter((t) => t.category === category);
export const cheapestIn = (category: BusinessCategoryId) => Math.min(...typesIn(category).map((t) => t.openingCost));

/** Inntekt per time på et trinn. */
export function incomeAt(type: BusinessType, stage: number): number {
  return type.baseIncome * (1 + type.growth) ** (stage - 1);
}

/** Taxi og fraktselskap: inntekten kommer fra kjøretøyene. */
export const isTaxi = (b: Business) => {
  const c = typeById(b.type).category;
  return c === 'taxi' || c === 'shipping';
};

export const incomePerHour = (b: Business) => (isTaxi(b) ? fleetIncome(b) : incomeAt(typeById(b.type), b.stage));

/** Investeringen som trengs for å utvide fra dagens trinn (hele øre). */
export function expansionCost(b: Business): number {
  return toOre(typeById(b.type).baseInvestment * INVESTMENT_GROWTH ** (b.stage - 1));
}

/** Hvor mye mer bedriften tjener per time etter neste utvidelse. */
export const expectedGrowth = (b: Business) => incomePerHour(b) * typeById(b.type).growth;

/** Hvor lang tid neste utvidelse tar (sekunder). */
export function expansionSeconds(b: Business): number {
  const t = typeById(b.type);
  return Math.min(MAX_EXPANSION_SEC, Math.round(t.firstExpansionSec * t.timeGrowth ** (b.stage - 1)));
}

export const isMaxStage = (b: Business) => b.stage >= MAX_STAGE;
export const closeRefund = (b: Business) => toOre(b.invested * CLOSE_REFUND);
export const renameCost = (b: Business) => toOre(b.invested * RENAME_COST);

export function totalIncomePerHour(state: GameState): number {
  return state.businesses.reduce((sum, b) => sum + incomePerHour(b), 0);
}

/** Verdien av alle bedriftene (kapitalisering) – teller med i formuen. */
export function businessesValue(state: GameState): number {
  return state.businesses.reduce((sum, b) => sum + b.invested, 0);
}

// --- Handlinger ---------------------------------------------------------------------
export function startBusiness(state: GameState, typeId: string, name: string): Business | null {
  const type = typeById(typeId);
  if (state.balance < type.openingCost || slotsFull(state)) return null;
  state.balance -= type.openingCost;
  const b: Business = {
    id: `b${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
    type: type.id,
    name: name.trim(),
    stage: 1,
    invested: type.openingCost,
    earned: 0,
    expansionEnd: null,
  };
  if (type.category === 'taxi' || type.category === 'shipping') {
    b.capacity = START_CAPACITY;
    b.cars = [];
  }
  state.businesses.unshift(b); // nyeste øverst
  return b;
}

/** Starter en utvidelse (betaler investeringen). */
export function startExpansion(state: GameState, b: Business, now = Date.now()): boolean {
  if (b.expansionEnd !== null || isMaxStage(b)) return false;
  const cost = expansionCost(b);
  if (state.balance < cost) return false;
  state.balance -= cost;
  b.invested += cost;
  b.expansionEnd = now + expansionSeconds(b) * 1000;
  return true;
}

export function renameBusiness(state: GameState, b: Business, name: string): boolean {
  const cost = renameCost(b);
  if (!name.trim() || state.balance < cost) return false;
  state.balance -= cost;
  b.name = name.trim();
  return true;
}

export function closeBusiness(state: GameState, b: Business): number {
  const refund = closeRefund(b);
  state.balance += refund;
  state.businesses = state.businesses.filter((x) => x !== b);
  return refund;
}

/**
 * Betaler ut inntekten for tiden som har gått, og gjør ferdig utvidelser.
 * Kjøres hele tiden, og tar igjen tiden mens appen var lukket.
 */
export function tickBusinesses(state: GameState, now: number) {
  // Ferdig med å bygge en ny bedriftsplass?
  if (state.slotExpansionEnd !== null && state.slotExpansionEnd <= now) {
    state.businessSlots = Math.min(MAX_SLOTS, state.businessSlots + 1);
    state.slotExpansionEnd = null;
  }
  const from = state.businessUpdate || now;
  state.businessUpdate = now;
  if (now <= from) return;
  for (const b of state.businesses) {
    if (isTaxi(b)) {
      // Taxi: utvidelse gir flere plasser, og bilene kjører og tjener penger
      if (b.expansionEnd !== null && b.expansionEnd <= now) {
        b.capacity = capacityOf(b) + (b.pendingPlaces ?? 0);
        b.pendingPlaces = 0;
        b.expansionEnd = null;
      }
      payGross(state, b, driveCars(b, (now - from) / 3_600_000));
      continue;
    }
    let t = from;
    // Ble utvidelsen ferdig underveis? Gammel inntekt frem til da, ny etterpå.
    if (b.expansionEnd !== null && b.expansionEnd <= now) {
      const end = Math.max(t, b.expansionEnd);
      pay(state, b, (end - t) / 3_600_000);
      t = end;
      b.stage += 1;
      b.expansionEnd = null;
    }
    pay(state, b, (now - t) / 3_600_000);
  }
}

/** Butikker er i forenklet skatteordning: 5 % av inntekten trekkes automatisk. */
export const businessTaxRate = () => SIMPLIFIED_RATE;
export const taxPerHour = (b: Business) => incomePerHour(b) * businessTaxRate();

function pay(state: GameState, b: Business, hours: number) {
  if (hours <= 0) return;
  payGross(state, b, incomePerHour(b) * hours);
}

/** Betaler ut inntekt (minus 5 % skatt). */
function payGross(state: GameState, b: Business, gross: number) {
  if (gross <= 0) return;
  const tax = gross * businessTaxRate();
  const net = gross - tax;
  state.balance += net;
  state.totalEarned += net;
  state.businessEarned += net;
  state.taxesPaid += tax;
  b.earned += net;
}

// --- Taxi: kjøp av biler og flere plasser --------------------------------------------
export type BuyCarResult = 'ok' | 'full' | 'money';

export function buyCar(state: GameState, b: Business, modelId: string): BuyCarResult {
  const m = modelById(modelId);
  if (carsOf(b).length >= capacityOf(b)) return 'full';
  if (state.balance < m.price) return 'money';
  state.balance -= m.price;
  b.invested += m.price;
  carsOf(b).push({ id: `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, model: m.id, km: 0 });
  return 'ok';
}

/** Starter utvidelse av kapasiteten (valg nr. `index` i CAPACITY_OPTIONS). */
export function expandCapacity(state: GameState, b: Business, index: number, now = Date.now()): boolean {
  const opt = capacityOptions(b)[index];
  if (!opt || b.expansionEnd !== null || state.balance < opt.price) return false;
  state.balance -= opt.price;
  b.invested += opt.price;
  b.pendingPlaces = opt.places;
  b.expansionEnd = now + opt.seconds * 1000;
  return true;
}
