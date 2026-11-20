import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import type { Business } from './business';
import type { TaxAccount } from './taxes';
import { MAX_LEVEL } from './click';
import { createMarket, ensureMarket, type Holding, type MarketState } from './market';
import { createCrypto, ensureCrypto, type CryptoState } from './crypto';
import type { OwnedProperty } from './realEstate';
import type { ItemsState } from './items';
import type { CollectState } from './collections';

/**
 * Spillets tilstand: alt som skal huskes mellom økter.
 * Lagres i telefonens lagring (Preferences) og i localStorage (se initStorage).
 */
export interface GameState {
  /** Penger spilleren har nå (kr). */
  balance: number;
  /** Nivået på "per klikk"-oppgraderingen. Starter på 1. */
  clickLevel: number;

  /** Aksjer spilleren eier (aksje-id → antall og hva de kostet). */
  holdings: Record<string, Holding>;
  /** Prisene i aksjemarkedet. */
  market: MarketState;
  /** Mynter spilleren eier (mynt-id → antall og hva de kostet). */
  cryptoHoldings: Record<string, Holding>;
  /** Prisene i kryptomarkedet. */
  crypto: CryptoState;
  /** Eiendommer spilleren eier (eiendom-id → kjøpte forbedringer). */
  properties: Record<string, OwnedProperty>;
  /** Sist leieinntekten ble betalt ut (ms). */
  realEstateUpdate: number;
  /** Tjent på leieinntekter. */
  rentEarned: number;

  // --- Statistikk ---
  totalEarned: number;
  totalClicks: number;
  dividendsEarned: number;
  /** Tjent ved å klikke. */
  clickEarned: number;
  /** Tjent fra bedriftene (etter skatt). */
  businessEarned: number;
  /** Gevinst (eller tap) ved salg av aksjer. */
  tradingProfit: number;
  /** All skatt og alle bøter som er betalt. */
  taxesPaid: number;

  // --- Skatt på aksjer (se src/game/taxes.ts) ---
  stockTax: TaxAccount;

  // --- Profil ---
  profile: { firstName: string; lastName: string; work: string };

  // --- Bankkortet ---
  /** De fire siste sifrene på kortet. */
  cardNumber: string;
  /** Utløpsdato, f.eks. "09/29". */
  cardExpiry: string;
  /** Det beste kortet du noen gang har nådd (brukes til "Nytt kort låst opp!"-meldingen). */
  bestCard: string;
  /** Kortet du har valgt å bruke (brukes bare så lenge formuen holder til det). */
  selectedCard: string;

  // --- Bedrifter ---
  businesses: Business[];
  /** Sist bedriftene betalte ut inntekt (ms). */
  businessUpdate: number;
  /** Hvor mange bedrifter man kan eie (starter på 5, maks 20). */
  businessSlots: number;
  /** Når plassen som bygges nå er ferdig (ms), eller null. */
  slotExpansionEnd: number | null;

  // --- Eiendeler (biler, fly og yachter) ---
  assets: ItemsState;
  /** Samlinger, merker og NFT-er (se collections.ts). */
  collect?: CollectState;
}

const SAVE_KEY = 'afk-game-save-v3';

/** Alt unntatt markedene (som er tyngre å lage). */
function baseState(): Omit<GameState, 'market' | 'crypto'> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String((now.getFullYear() + 3) % 100).padStart(2, '0');
  return {
    balance: 0,
    clickLevel: 1,
    holdings: {},
    cryptoHoldings: {},
    properties: {},
    realEstateUpdate: Date.now(),
    rentEarned: 0,
    totalEarned: 0,
    totalClicks: 0,
    dividendsEarned: 0,
    clickEarned: 0,
    businessEarned: 0,
    tradingProfit: 0,
    taxesPaid: 0,
    stockTax: { debt: 0, fine: 0, dueAt: null, suspended: false },
    profile: { firstName: '', lastName: '', work: '' },
    cardNumber: String(1000 + Math.floor(Math.random() * 9000)),
    cardExpiry: `${month}/${year}`,
    bestCard: 'base',
    selectedCard: 'base',
    businesses: [],
    businessUpdate: Date.now(),
    businessSlots: 5,
    slotExpansionEnd: null,
    assets: { items: [], places: [] },
  };
}

export function createDefaultState(): GameState {
  return { ...baseState(), market: createMarket(Date.now()), crypto: createCrypto(Date.now()) };
}

/** Henter lagret spill, eller lager et nytt hvis det ikke finnes. */
export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultState();
    // Slår sammen med standardverdier, så nye felter får en verdi i gamle lagringer
    const saved = JSON.parse(raw) as Partial<GameState>;
    const state = { ...baseState(), ...saved } as GameState;
    // Gamle lagringer (før bedriftsplasser fantes) beholder alle bedriftene sine
    if (saved.businessSlots === undefined) state.businessSlots = Math.max(5, state.businesses.length);    ensureMarket(state, Date.now());
    ensureCrypto(state, Date.now());
    // Gamle lagringer kan ha høyere nivå enn dagens maks
    state.clickLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(state.clickLevel) || 1));
    return state;
  } catch {
    return createDefaultState();
  }
}

/**
 * Kjøres før loadState(). I appen ligger lagringen i telefonens egen lagring
 * (Preferences), som ikke avhenger av hvilken adresse spillet lastes fra.
 * Den kopieres inn i localStorage, så loadState() kan lese den som før.
 * Finnes det bare en gammel localStorage-lagring, flyttes den over til Preferences.
 */
export async function initStorage(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { value } = await Preferences.get({ key: SAVE_KEY });
    if (value) {
      localStorage.setItem(SAVE_KEY, value);
    } else {
      const local = localStorage.getItem(SAVE_KEY);
      if (local) await Preferences.set({ key: SAVE_KEY, value: local });
    }
  } catch {
    // Faller tilbake til localStorage
  }
}

/** Lagrer spillet. Promiset er ferdig når telefonens lagring også er skrevet. */
export function saveState(state: GameState): Promise<void> {
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(SAVE_KEY, json);
  } catch {
    // Lagring kan feile – spillet fungerer likevel
  }
  if (Capacitor.isNativePlatform()) {
    return Preferences.set({ key: SAVE_KEY, value: json }).catch(() => {});
  }
  return Promise.resolve();
}
