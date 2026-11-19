import type { Business } from './business';
import type { DealerPay } from './dealer';

/*
 * BANK
 * ----
 * Banken har PENGER I HVELVET (innskudd fra kunder). Startbeløpet er $ 10 M.
 *
 * - UTBETALING TIL INNSKYTERE per time = penger i hvelvet × innskuddsrenten.
 * - INNTEKT FRA LÅN per time = penger i hvelvet × utlånsrenten × etterspørsel.
 * - Inntekt per time = inntekt fra lån − utbetaling til innskytere (kan bli negativ!).
 *
 * ETTERSPØRSELEN er størst ved standardverdiene (7,04 % og 8,85 %). Den synker jo lenger
 * unna man flytter rentene:
 *   - Høyere innskuddsrente: dyrere for banken, men lokker nye kunder → hvelvet vokser.
 *   - Lavere innskuddsrente: billigere, men færre lån blir gitt.
 *   - Lavere utlånsrente: mindre inntekt per lån (og lavere etterspørsel her).
 *   - Høyere utlånsrente: mer per lån, men litt færre som vil låne.
 * Tallene er tilpasset originalen (5 målinger fra skjermbilder treffer nøyaktig).
 *
 * TILTRUKKET INNSKUDD: med innskuddsrente over 7,04 % kommer nye kunder, og pengene
 * i hvelvet vokser – helt opp til hvelvets kapasitet. Mer penger = mer av alt over.
 * UTVID HVELVET: koster en investering (24 % dyrere hver gang) og tar tid (15 min lengre
 * hver gang). Kapasiteten blir 36 % større.
 *
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const BANK_TYPE = 'bank';
export const isBankType = (typeId: string) => typeId === BANK_TYPE;

// --- Renter -------------------------------------------------------------------------
export const DEPOSIT_RANGE: [number, number] = [6.3, 8.5];
export const LOAN_RANGE: [number, number] = [7.4, 10.8];
export const DEFAULT_DEPOSIT = 7.04;
export const DEFAULT_LOAN = 8.85;

/** Etterspørsel ved standardverdiene, og hvor mye den synker per prosentpoeng unna. */
const DEMAND_TOP = 1.132782;
const DEMAND_DEPOSIT_UP = 0.224307;
const DEMAND_DEPOSIT_DOWN = 0.231505;
const DEMAND_LOAN_DOWN = 0.250316;
const DEMAND_LOAN_UP = 0.083626;

/** Nye innskudd per time (andel av hvelvet) per prosentpoeng innskuddsrenten er over standard. */
const ATTRACT_PER_POINT = 0.04;

// --- Hvelvet --------------------------------------------------------------------------
/** Penger i hvelvet fra start ($ 10 M) og kapasitet ($ 15 M). */
const START_FUNDS = 1_000_000;
const START_CAPACITY = 1_500_000;
/** Hver utvidelse gjør kapasiteten så mye større ($ 15 M → $ 20,4 M → $ 27,744 M ...). */
const CAPACITY_GROWTH = 1.36;
/** Første investering ($ 1,85 M), og hver neste blir 24 % dyrere ($ 2,294 M, $ 2,84456 M ...). */
const FIRST_INVESTMENT = 185_000;
const INVESTMENT_GROWTH = 1.24;
/** Første utvidelse tar 30 min, hver neste 15 min lengre (45 min, 1 t, 1 t 15 min ...), maks 8 timer. */
const FIRST_EXPANSION_SEC = 30 * 60;
const EXPANSION_TIME_STEP = 15 * 60;
const MAX_EXPANSION_SEC = 8 * 3600;
/** Flest utvidelser. */
export const MAX_VAULT_LEVEL = 25;

export interface BankState {
  /** Penger i hvelvet. */
  funds: number;
  capacity: number;
  /** Antall utvidelser som er gjort. */
  level: number;
  deposit: number;
  loan: number;
  /** Når utvidelsen som pågår er ferdig (ms). */
  expansionEnd: number | null;
}

export function newBank(): BankState {
  return { funds: START_FUNDS, capacity: START_CAPACITY, level: 0, deposit: DEFAULT_DEPOSIT, loan: DEFAULT_LOAN, expansionEnd: null };
}

export function bankOf(b: Business): BankState {
  b.bank ??= newBank();
  return b.bank;
}

const clamp = (v: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, v));
export const roundRate = (v: number) => Math.round(v * 100) / 100;

/** Etterspørselen etter lån med disse rentene. */
export function demand(deposit: number, loan: number): number {
  const d = deposit - DEFAULT_DEPOSIT;
  const l = loan - DEFAULT_LOAN;
  const fromDeposit = d > 0 ? d * DEMAND_DEPOSIT_UP : -d * DEMAND_DEPOSIT_DOWN;
  const fromLoan = l < 0 ? -l * DEMAND_LOAN_DOWN : l * DEMAND_LOAN_UP;
  return Math.max(0.1, DEMAND_TOP - fromDeposit - fromLoan);
}

export interface BankFlows {
  /** Nye innskudd per time. */
  attracted: number;
  /** Inntekt fra lån per time. */
  proceeds: number;
  /** Utbetaling til innskytere per time. */
  payments: number;
  /** Inntekt per time (lån − utbetalinger). */
  income: number;
}

/** Pengestrømmene per time (med valgfrie renter, f.eks. for å vise hva nye renter gir). */
export function flows(s: BankState, deposit = s.deposit, loan = s.loan): BankFlows {
  const payments = s.funds * (deposit / 100);
  const proceeds = s.funds * (loan / 100) * demand(deposit, loan);
  const room = Math.max(0, s.capacity - s.funds);
  const attracted = Math.min(room, s.funds * ATTRACT_PER_POINT * Math.max(0, deposit - DEFAULT_DEPOSIT));
  return { attracted, proceeds, payments, income: proceeds - payments };
}

export const bankIncome = (b: Business) => flows(bankOf(b)).income;

export function setRates(b: Business, deposit: number, loan: number) {
  const s = bankOf(b);
  s.deposit = roundRate(clamp(deposit, DEPOSIT_RANGE));
  s.loan = roundRate(clamp(loan, LOAN_RANGE));
}

// --- Utvidelse av hvelvet ----------------------------------------------------------------
export const isMaxVault = (b: Business) => bankOf(b).level >= MAX_VAULT_LEVEL;
export const nextCapacity = (b: Business) => bankOf(b).capacity * CAPACITY_GROWTH;
export const vaultCost = (b: Business) => Math.round(FIRST_INVESTMENT * INVESTMENT_GROWTH ** bankOf(b).level * 1000) / 1000;
export const vaultSeconds = (b: Business) =>
  Math.min(MAX_EXPANSION_SEC, FIRST_EXPANSION_SEC + EXPANSION_TIME_STEP * bankOf(b).level);

/** Starter en utvidelse av hvelvet (betaler investeringen). */
export function expandVault(b: Business, pay: DealerPay, now = Date.now()): 'ok' | 'money' | 'busy' | 'max' {
  const s = bankOf(b);
  if (s.expansionEnd !== null) return 'busy';
  if (isMaxVault(b)) return 'max';
  const seconds = vaultSeconds(b);
  if (!pay.spend(vaultCost(b), true)) return 'money';
  s.expansionEnd = now + seconds * 1000;
  return 'ok';
}

/**
 * Tiden går: innskudd kommer inn (opp til kapasiteten) og utvidelser blir ferdige.
 * Returnerer inntekten for perioden (kan være negativ).
 */
export function tickBank(b: Business, from: number, now: number): number {
  const s = bankOf(b);
  let income = 0;
  let t = from;
  // Ble utvidelsen ferdig underveis? Regn frem til da med gammel kapasitet.
  if (s.expansionEnd !== null && s.expansionEnd <= now) {
    const end = Math.max(t, s.expansionEnd);
    income += step(s, (end - t) / 3_600_000);
    t = end;
    s.capacity = s.capacity * CAPACITY_GROWTH;
    s.level += 1;
    s.expansionEnd = null;
  }
  income += step(s, (now - t) / 3_600_000);
  return income;
}

function step(s: BankState, hours: number): number {
  if (hours <= 0) return 0;
  const f = flows(s);
  s.funds = Math.min(s.capacity, s.funds + f.attracted * hours);
  return f.income * hours;
}
