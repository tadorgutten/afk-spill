import type { GameState } from './state';
import { SIMPLIFIED_RATE } from './taxes';
import {
  capacityOf,
  capacityOptions,
  carsOf,
  driveCars,
  fleetIncome,
  fleetOf,
  isFleetType,
  modelById,
  SHIPPING_TYPE,
  START_CAPACITY_BY,
  type TaxiCar,
} from './taxi';
import {
  buildingById,
  emptyResources,
  hasResources,
  isConstructionType,
  isReady,
  isUnlocked,
  MAX_PROJECTS,
  building as underConstruction,
  missingFor,
  projectsOf,
  QUICK_FEE,
  resourcesCost,
  resourcesOf,
  RESOURCES,
  type Project,
  type Resources,
} from './construction';
import { DEALER_TYPE, isDealerType, newDealer, tickDealer, type DealerPay, type DealerState } from './dealer';
import { IT_TYPE, isItType, newIt, tickIt, wagesPerHour, type ItState } from './it';
import { BANK_TYPE, bankIncome, isBankType, newBank, tickBank, type BankState } from './bank';
import { FOOTBALL_TYPE, isFootballType, newFootball, tickFootball, type FcPay, type FootballState } from './football';
import { HOTEL_TYPE, chainIncome, isHotelType, newHotelChain, tickHotels, type HotelChainState } from './hotel';

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
 * Bedriftene har to ulike måter å tjene penger på ("motor"):
 *   - stage: butikk og fabrikk – utvid i trinn (her i denne fila)
 *   - fleet: taxi og fraktselskap – kjøp kjøretøy (taxi.ts)
 *   - build: byggefirma – kjøp ressurser, bygg og selg bygg (construction.ts)
 *   - dealer: bilforhandler – kjøp brukte biler, reparer og selg dem (dealer.ts)
 *   - it: IT-selskap – ansett folk, lag prosjekter og selg dem (it.ts)
 *   - bank: bank – velg innskudds- og utlånsrente, utvid hvelvet (bank.ts)
 *   - football: fotballklubb – kjøp spillere, tren laget og vinn turneringer (football.ts)
 *   - hotel: hotellkjede – hoteller i byer rundt om i verden, rom, stjerner, pris (hotel.ts)
 *
 * Kapitalisering = alt du har puttet inn i bedriften (åpningskostnad + investeringer).
 * Legger du ned bedriften, får du tilbake 30 % av kapitaliseringen.
 */

export type BusinessCategoryId =
  | 'shop'
  | 'taxi'
  | 'shipping'
  | 'factory'
  | 'construction'
  | 'dealer'
  | 'it'
  | 'bank'
  | 'football'
  | 'hotel';

export type Engine = 'stage' | 'fleet' | 'build' | 'dealer' | 'it' | 'bank' | 'football' | 'hotel';

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
  /** Hvor mye dyrere hver investering blir (1,3 = 30 %). Standard 1,3. */
  investGrowth?: number;
}

export const CATEGORIES: BusinessCategory[] = [
  { id: 'shop', name: 'Butikk', chooseTitle: 'Velg type butikk', nameTitle: 'Skriv inn navnet på butikken', color: 'green' },
  { id: 'taxi', name: 'Taxiselskap', chooseTitle: '', nameTitle: 'Skriv inn navnet på taxiselskapet', color: 'yellow' },
  { id: 'shipping', name: 'Fraktselskap', chooseTitle: '', nameTitle: 'Skriv inn navnet på fraktselskapet', color: 'orange' },
  { id: 'factory', name: 'Fabrikk', chooseTitle: 'Velg type fabrikk', nameTitle: 'Skriv inn navnet på fabrikken', color: 'blue' },
  { id: 'construction', name: 'Byggefirma', chooseTitle: '', nameTitle: 'Skriv inn navnet på byggefirmaet', color: 'red' },
  { id: 'dealer', name: 'Bilforhandler', chooseTitle: '', nameTitle: 'Skriv inn navnet på bilforhandleren', color: 'dark' },
  { id: 'it', name: 'IT-selskap', chooseTitle: '', nameTitle: 'Skriv inn navnet på IT-selskapet', color: 'purple' },
  { id: 'bank', name: 'Bank', chooseTitle: '', nameTitle: 'Skriv inn navnet på banken', color: 'slate' },
  { id: 'football', name: 'Fotballklubb', chooseTitle: '', nameTitle: 'Skriv inn navnet på fotballklubben', color: 'crimson' },
  { id: 'hotel', name: 'Hotellkjede', chooseTitle: '', nameTitle: 'Skriv inn navnet på hotellkjeden', color: 'lagoon' },
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
  // Fabrikk: som butikk, men tjener mer. Tallene er som i originalen (vises 10x høyere):
  // trinn 1 = $ 520/t, investering $ 2 999,88 (+12 % per trinn), +16 % inntekt per trinn,
  // første utvidelse tar 10 min, så 20 min osv.
  {
    id: 'small-factory',
    category: 'factory',
    name: 'Liten fabrikk',
    coins: 1,
    openingCost: 2499.9, // vises som $ 24 999
    baseIncome: 52,
    baseInvestment: 299.988,
    growth: 0.16,
    investGrowth: 1.12,
    firstExpansionSec: 600,
    timeGrowth: 2,
  },
  // Byggefirma: inntekten kommer fra byggene som selges (se construction.ts)
  {
    id: 'construction',
    category: 'construction',
    name: 'Byggefirma',
    coins: 1,
    openingCost: 3540, // vises som $ 35 400
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  // Bilforhandler: inntekten kommer fra bilene som selges (se dealer.ts)
  {
    id: DEALER_TYPE,
    category: 'dealer',
    name: 'Bilforhandler',
    coins: 1,
    openingCost: 4000, // vises som $ 40 000
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  // IT-selskap: inntekten kommer fra prosjektene som selges, og de ansatte får lønn (se it.ts)
  {
    id: IT_TYPE,
    category: 'it',
    name: 'IT-selskap',
    coins: 1,
    openingCost: 35_000, // vises som $ 350 000
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  // Bank: inntekten kommer fra rentene (se bank.ts)
  {
    id: BANK_TYPE,
    category: 'bank',
    name: 'Bank',
    coins: 1,
    openingCost: 1_000_000, // vises som $ 10 000 000
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  // Hotellkjede: inntekten kommer fra hotellene (se hotel.ts)
  {
    id: HOTEL_TYPE,
    category: 'hotel',
    name: 'Hotellkjede',
    coins: 1,
    openingCost: 150_000_000, // vises som $ 1 500 000 000
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  // Fotballklubb: inntekten kommer fra premiepenger og salg av spillere (se football.ts)
  {
    id: FOOTBALL_TYPE,
    category: 'football',
    name: 'Fotballklubb',
    coins: 1,
    openingCost: 4_000_000, // vises som $ 40 000 000
    baseIncome: 0,
    baseInvestment: 0,
    growth: 0,
    firstExpansionSec: 0,
    timeGrowth: 1,
  },
  // Trinn 1 = $ 3 853/t, investering $ 27 748,50 (+15 % per trinn), +17 % inntekt per trinn,
  // første utvidelse 2 min, så 3 min 36 s, 6 min 29 s ... (×1,8 som lokal butikk)
  {
    id: 'large-factory',
    category: 'factory',
    name: 'Stor fabrikk',
    coins: 3,
    openingCost: 18499, // vises som $ 184 990
    baseIncome: 385.3,
    baseInvestment: 2774.85,
    growth: 0.17,
    investGrowth: 1.15,
    firstExpansionSec: 120,
    timeGrowth: 1.8,
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
  // --- Bare for byggefirma ---
  /** Lageret: byggere, metall, treverk og betong. */
  resources?: Resources;
  /** Bygg som pågår eller står klare for salg. */
  projects?: Project[];
  /** Hvor mange av hvert bygg som er solgt (for å låse opp nye). */
  built?: Record<string, number>;

  // --- Bare for bilforhandler ---
  dealer?: DealerState;

  // --- Bare for IT-selskap ---
  it?: ItState;

  // --- Bare for bank ---
  bank?: BankState;

  // --- Bare for fotballklubb ---
  football?: FootballState;

  // --- Bare for hotellkjede ---
  hotels?: HotelChainState;

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

/** Hvordan bedriften tjener penger. */
export function engineOf(b: Business): Engine {
  if (isFleetType(b.type)) return 'fleet';
  if (isDealerType(b.type)) return 'dealer';
  if (isItType(b.type)) return 'it';
  if (isBankType(b.type)) return 'bank';
  if (isFootballType(b.type)) return 'football';
  if (isHotelType(b.type)) return 'hotel';
  return isConstructionType(b.type) ? 'build' : 'stage';
}

/** Taxi og fraktselskap: inntekten kommer fra kjøretøyene. */
export const isTaxi = (b: Business) => engineOf(b) === 'fleet';

/** Inntekt per time. */
export function incomePerHour(b: Business): number {
  switch (engineOf(b)) {
    case 'fleet':
      return fleetIncome(b);
    case 'build':
    case 'dealer':
      return 0; // tjener penger når byggene/bilene selges
    case 'it':
      return -wagesPerHour(b); // tjener penger når prosjektene selges, men betaler lønn hele tiden
    case 'bank':
      return bankIncome(b);
    case 'football':
      return 0; // tjener på premiepenger og salg av spillere
    case 'hotel':
      return chainIncome(b);
    default:
      return incomeAt(typeById(b.type), b.stage);
  }
}

/** Investeringen som trengs for å utvide fra dagens trinn. */
export function expansionCost(b: Business): number {
  const t = typeById(b.type);
  // Rundes til hele cent slik prisen VISES ($ 2 999,88), ikke bare internt
  return Math.round(t.baseInvestment * (t.investGrowth ?? INVESTMENT_GROWTH) ** (b.stage - 1) * 1000) / 1000;
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

/**
 * Bedriftstyper som er fjernet (byggefirma, bank, flyselskap osv. og den gamle fabrikken).
 * Har man en slik i en gammel lagring, legges den ned og man får tilbake ALT man puttet inn.
 */
const RETIRED_ORDER_COST: Record<string, number> = {
  excavator: 600, house: 4_000, villa: 15_000, apartments: 70_000, office: 300_000, bridge: 1_400_000, skyscraper: 7_000_000,
  granta: 780, solaris: 1_260, octavia: 2_200, camry: 2_950, bmw5: 6_200, sclass: 13_750, porsche911: 23_000,
  ferrari: 48_000, huracan: 65_000, rollsroyce: 110_000, chiron: 350_000,
};
export function removeRetiredBusinesses(state: GameState): number {
  let refund = 0;
  state.businesses = state.businesses.filter((b) => {
    // Det gamle byggefirmaet (med oppdrag) er byttet ut med et nytt
    const oldConstruction = b.type === 'construction' && 'orders' in b;
    if (!oldConstruction && BUSINESS_TYPES.some((t) => t.id === b.type)) return true;
    // Penger som stod i oppdrag (byggefirma/bilforhandler) som ikke var ferdige
    const orders = (b as Business & { orders?: { item: string }[] }).orders ?? [];
    refund += b.invested + orders.reduce((sum, o) => sum + (RETIRED_ORDER_COST[o.item] ?? 0), 0);
    return false;
  });
  state.balance += refund;
  return refund;
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
  if (engineOf(b) === 'fleet') {
    b.capacity = START_CAPACITY_BY[fleetOf(b)];
    b.cars = [];
  } else if (engineOf(b) === 'build') {
    b.resources = emptyResources();
    b.projects = [];
    b.built = {};
  } else if (engineOf(b) === 'dealer') {
    b.dealer = newDealer();
  } else if (engineOf(b) === 'it') {
    b.it = newIt();
  } else if (engineOf(b) === 'bank') {
    b.bank = newBank();
  } else if (engineOf(b) === 'football') {
    b.football = newFootball();
  } else if (engineOf(b) === 'hotel') {
    b.hotels = newHotelChain();
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
    // Byggefirma: byggene blir ferdige av seg selv, og selges når man trykker på dem
    if (engineOf(b) === 'build') continue;
    // Bilforhandler: reparasjoner og utvidelser blir ferdige, og biler i utstillingen selges
    if (engineOf(b) === 'dealer') {
      for (const sale of tickDealer(b, now)) {
        payGross(state, b, sale.price);
        b.invested = Math.max(typeById(b.type).openingCost, b.invested - sale.cost);
      }
      continue;
    }
    // IT-selskap: lønn trekkes hele tiden (også mens appen var lukket)
    if (engineOf(b) === 'it') {
      payWages(state, b, tickIt(b, from, now));
      continue;
    }
    // Hotellkjede: fast inntekt fra hotellene
    if (engineOf(b) === 'hotel') {
      const income = tickHotels(b, from, now);
      if (income >= 0) payGross(state, b, income);
      else payWages(state, b, -income);
      continue;
    }
    // Fotballklubb: trening, kontrakter, kamper og premiepenger
    if (engineOf(b) === 'football') {
      tickFootball(b, footballPay(state, b), now);
      continue;
    }
    // Bank: rentene gir pluss eller minus (minus trekkes som en utgift)
    if (engineOf(b) === 'bank') {
      const income = tickBank(b, from, now);
      if (income >= 0) payGross(state, b, income);
      else payWages(state, b, -income);
      continue;
    }
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
export const taxPerHour = (b: Business) => Math.max(0, incomePerHour(b)) * businessTaxRate();

/** Lønn til de ansatte (IT-selskap) eller tap (bank). Trekkes fra saldoen – saldoen kan gå i minus. */
function payWages(state: GameState, b: Business, wages: number) {
  if (wages <= 0) return;
  state.balance -= wages;
  state.businessEarned -= wages;
  b.earned -= wages;
}

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

// --- Byggefirma: ressurser, bygg og salg ---------------------------------------------
/** Kjøper ressurser til lageret. `fee` = gebyr (0,07 når man fyller på og bygger med en gang). */
export function buyResources(state: GameState, b: Business, amounts: Resources, fee = 0): boolean {
  const cost = resourcesCost(amounts) * (1 + fee);
  if (cost <= 0 || state.balance < cost) return false;
  state.balance -= cost;
  b.invested += cost;
  const store = resourcesOf(b);
  for (const r of RESOURCES) store[r.id] += Math.max(0, Math.floor(amounts[r.id]));
  return true;
}

/** Pris for å kjøpe det som mangler for et bygg (inkludert 7 % gebyr). */
export const quickBuyCost = (b: Business, buildingId: string) => resourcesCost(missingFor(b, buildingById(buildingId))) * (1 + QUICK_FEE);

export type StartProjectResult = 'ok' | 'locked' | 'resources' | 'money' | 'full';

/** Starter et bygg. Med `buyMissing` kjøpes det som mangler først (med gebyr). */
export function startProject(state: GameState, b: Business, buildingId: string, buyMissing = false, now = Date.now()): StartProjectResult {
  const def = buildingById(buildingId);
  if (!isUnlocked(b, def, now)) return 'locked';
  if (underConstruction(b, now).length >= MAX_PROJECTS) return 'full';
  if (!hasResources(b, def)) {
    if (!buyMissing) return 'resources';
    if (!buyResources(state, b, missingFor(b, def), QUICK_FEE)) return 'money';
  }
  const store = resourcesOf(b);
  for (const r of RESOURCES) store[r.id] -= def.need[r.id];
  projectsOf(b).push({ id: `p${now.toString(36)}${Math.floor(Math.random() * 1e4)}`, building: def.id, start: now, end: now + def.hours * 3_600_000 });
  return 'ok';
}

/** Selger et ferdig bygg. Gir tilbake det man fikk (etter 5 % skatt), eller 0. */
export function sellProject(state: GameState, b: Business, projectId: string, now = Date.now()): number {
  const p = projectsOf(b).find((x) => x.id === projectId);
  if (!p || !isReady(p, now)) return 0;
  b.projects = projectsOf(b).filter((x) => x !== p);
  b.built = { ...b.built, [p.building]: (b.built?.[p.building] ?? 0) + 1 };
  const before = state.balance;
  payGross(state, b, buildingById(p.building).price);
  return state.balance - before;
}

// --- Fotballklubb: betaling ---------------------------------------------------------------
export function footballPay(state: GameState, b: Business): FcPay {
  return {
    spend(amount, capital) {
      if (amount <= 0) return true;
      if (state.balance < amount) return false;
      state.balance -= amount;
      if (capital) b.invested += amount;
      return true;
    },
    earn(gross) {
      payGross(state, b, gross);
    },
    receive(amount, paid) {
      // Salg av en spiller: pengene rett inn (ingen skatt), og spilleren er ikke lenger en del av verdien
      state.balance += amount;
      b.invested = Math.max(typeById(b.type).openingCost, b.invested - paid);
    },
  };
}

// --- Bilforhandler: betaling ------------------------------------------------------------
/** Hvordan bilforhandleren betaler. `capital` = pengene blir en del av bedriften (kapitalisering). */
export function dealerPay(state: GameState, b: Business): DealerPay {
  return {
    spend(amount, capital) {
      if (amount <= 0) return true;
      if (state.balance < amount) return false;
      state.balance -= amount;
      if (capital) b.invested += amount;
      return true;
    },
    earn(gross) {
      payGross(state, b, gross);
    },
  };
}
