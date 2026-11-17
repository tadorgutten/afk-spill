import { portfolioSummary } from './market';
import type { GameState } from './state';

/*
 * SKATT
 * -----
 * Det finnes to skatteordninger:
 *
 * FORENKLET ordning (5 %) – skatten trekkes automatisk, du trenger ikke gjøre noe.
 *   - Alle butikker (bedrifter)
 *   - Aksjer, så lenge porteføljen er verdt under 3 mill. kr
 *
 * ORDINÆR ordning (9 %) – du må betale skatten selv.
 *   - Aksjer, når porteføljen er verdt 3 mill. kr eller mer
 *   Skatten samler seg opp som skattegjeld. Fra gjelden starter har du 24 timer på å betale.
 *   Betaler du ikke i tide:
 *     - utbyttet stopper (inntektsstans)
 *     - du kan ikke kjøpe eller selge aksjer (begrensning av markedsoperasjoner)
 *     - du får en bot på 25 % av gjelden
 *   Betaler du gjeld + bot, er alt i orden igjen.
 */

export const SIMPLIFIED_RATE = 0.05;
export const BASIC_RATE = 0.09;
/** Aksjeporteføljer på eller over dette beløpet havner i ordinær ordning. */
export const STOCK_BASIC_THRESHOLD = 3_000_000;
/** Betalingsfrist fra gjelden starter. */
export const PAYMENT_TERM_MS = 24 * 3_600_000;
/** Bot hvis man ikke betaler i tide (andel av gjelden). */
export const FINE_RATE = 0.25;

export interface TaxAccount {
  /** Skatt som skal betales (kr). */
  debt: number;
  /** Bot (kr). */
  fine: number;
  /** Fristen for å betale (ms), eller null hvis det ikke er noen gjeld. */
  dueAt: number | null;
  /** Fristen har gått ut: inntekten er stanset. */
  suspended: boolean;
}

export type Scheme = 'simplified' | 'basic';

/** Hvilken ordning aksjene dine er i nå. */
export function stockScheme(state: GameState): Scheme {
  return portfolioSummary(state).value >= STOCK_BASIC_THRESHOLD ? 'basic' : 'simplified';
}

export const rateOf = (scheme: Scheme) => (scheme === 'basic' ? BASIC_RATE : SIMPLIFIED_RATE);

/**
 * Utbytte inn: trekker skatt (forenklet) eller legger skatten til gjelden (ordinær).
 * Returnerer hvor mye som faktisk havner på saldoen.
 */
export function taxDividend(state: GameState, gross: number, now = Date.now()): number {
  const acc = state.stockTax;
  if (acc.suspended) return 0; // inntektsstans
  if (stockScheme(state) === 'simplified') {
    const tax = gross * SIMPLIFIED_RATE;
    state.taxesPaid += tax;
    return gross - tax;
  }
  acc.debt += gross * BASIC_RATE;
  acc.dueAt ??= now + PAYMENT_TERM_MS;
  return gross;
}

/** Sjekker om fristen har gått ut (kjøres hele tiden). */
export function checkTaxes(state: GameState, now = Date.now()) {
  const acc = state.stockTax;
  if (!acc.suspended && acc.dueAt !== null && now >= acc.dueAt && acc.debt > 0) {
    acc.suspended = true;
    acc.fine = acc.debt * FINE_RATE;
  }
}

export const totalOwed = (acc: TaxAccount) => acc.debt + acc.fine;

/** Betaler skatt og bot. Returnerer false hvis man ikke har råd. */
export function payTax(state: GameState, acc: TaxAccount): boolean {
  const owed = totalOwed(acc);
  if (owed <= 0 || state.balance < owed) return false;
  state.balance -= owed;
  state.taxesPaid += owed;
  acc.debt = 0;
  acc.fine = 0;
  acc.dueAt = null;
  acc.suspended = false;
  return true;
}

/** Kan man handle aksjer? (Nei, hvis skatten ikke er betalt i tide.) */
export const canTradeStocks = (state: GameState) => !state.stockTax.suspended;
