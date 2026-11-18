import type { Business } from './business';
import type { GameState } from './state';

/*
 * AVDELINGER (fabrikk, IT-selskap og bank)
 * ----------------------------------------
 * Bedriften har 5 avdelinger. Hver avdeling bygges og oppgraderes i nivåer (1–10):
 *   - Hvert nivå koster penger og tar tid å bygge. Bare én bygging om gangen.
 *   - Hvert nivå gir mer inntekt per time. Oppgraderinger blir dyrere og tar lengre tid.
 *   - Neste avdeling låses opp når forrige avdeling har nådd nivå 3 ("bygg deg opp").
 *   - Når en avdeling når maks nivå (10), får HELE bedriften +10 % inntekt.
 * Bedriften tjener penger hele tiden, også mens noe bygges.
 */

export type UnitsKind = 'factory' | 'it' | 'bank';

export interface UnitDef {
  id: string;
  name: string;
  /** Kort forklaring av hva avdelingen gjør. */
  desc: string;
  /** Bilde: public/biz/<id>.png */
  image: string;
  /** Pris for nivå 1 (internt, vises 10x høyere). */
  cost: number;
  /** Inntekt per time på nivå 1 (internt). */
  income: number;
  /** Byggetid for nivå 1 (sekunder). */
  seconds: number;
}

/** Høyeste nivå en avdeling kan ha. */
export const MAX_UNIT_LEVEL = 10;
/** Nivået forrige avdeling må ha før neste låses opp. */
export const UNLOCK_LEVEL = 3;
/** Prisen øker så mye for hvert nivå (1,6 = 60 %). */
const COST_GROWTH = 1.6;
/** Byggetiden øker så mye for hvert nivå, men aldri over 8 timer. */
const TIME_GROWTH = 1.55;
const MAX_SECONDS = 8 * 3600;
/** Inntekten vokser litt ekstra for hvert nivå (nivå × 1,15^(nivå−1)). */
const INCOME_GROWTH = 1.15;
/** Bonus for hver avdeling på maks nivå. */
export const MAX_LEVEL_BONUS = 0.1;

// Tallene er interne (1/10 av det som vises).
export const UNITS: Record<UnitsKind, UnitDef[]> = {
  factory: [
    { id: 'boxes', name: 'Pakkeavdeling', desc: 'Pakker og sender varene ut til kundene', image: 'biz/boxes.png', cost: 500, income: 20, seconds: 2 * 60 },
    { id: 'hall', name: 'Produksjonshall', desc: 'En stor hall med samlebånd', image: 'biz/hall.png', cost: 2_500, income: 100, seconds: 10 * 60 },
    { id: 'crane', name: 'Tungløft', desc: 'Kraner som flytter tunge maskiner og materialer', image: 'biz/crane.png', cost: 12_000, income: 480, seconds: 30 * 60 },
    { id: 'robot', name: 'Robotlinje', desc: 'Roboter som jobber døgnet rundt', image: 'biz/robot.png', cost: 60_000, income: 2_400, seconds: 60 * 60 },
    { id: 'solar', name: 'Solkraftverk', desc: 'Egen strøm gjør produksjonen mye billigere', image: 'biz/solar.png', cost: 300_000, income: 12_000, seconds: 2 * 3600 },
  ],
  it: [
    { id: 'laptop', name: 'Utviklerteam', desc: 'Programmerere som lager programvare til kunder', image: 'biz/laptop.png', cost: 1_500, income: 60, seconds: 2 * 60 },
    { id: 'smartphone', name: 'Mobilapp', desc: 'En app som millioner laster ned', image: 'biz/smartphone.png', cost: 7_500, income: 300, seconds: 10 * 60 },
    { id: 'server', name: 'Serverrom', desc: 'Egne servere som andre bedrifter leier', image: 'biz/server.png', cost: 37_500, income: 1_500, seconds: 30 * 60 },
    { id: 'cloud', name: 'Skytjeneste', desc: 'Lagring og databaser i skyen', image: 'biz/cloud.png', cost: 190_000, income: 7_600, seconds: 60 * 60 },
    { id: 'ai', name: 'AI-lab', desc: 'Kunstig intelligens som alle vil betale for', image: 'biz/ai.png', cost: 950_000, income: 38_000, seconds: 2 * 3600 },
  ],
  bank: [
    { id: 'bank', name: 'Filial', desc: 'Et bankkontor der kundene kan møte opp', image: 'biz/bank.png', cost: 5_000, income: 200, seconds: 2 * 60 },
    { id: 'piggy', name: 'Sparekontoer', desc: 'Kundene sparer – banken låner ut pengene', image: 'biz/piggy.png', cost: 25_000, income: 1_000, seconds: 10 * 60 },
    { id: 'cards', name: 'Kredittkort', desc: 'Gebyrer og renter fra kortkundene', image: 'biz/cards.png', cost: 125_000, income: 5_000, seconds: 30 * 60 },
    { id: 'vault', name: 'Hvelv', desc: 'Oppbevaring av verdisaker for de rikeste', image: 'biz/vault.png', cost: 625_000, income: 25_000, seconds: 60 * 60 },
    { id: 'gold', name: 'Gullreserve', desc: 'Handel med gull på verdensmarkedet', image: 'biz/gold.png', cost: 3_100_000, income: 125_000, seconds: 2 * 3600 },
  ],
};

export const UNITS_TEXT: Record<UnitsKind, { title: string; building: string }> = {
  factory: { title: 'Produksjon', building: 'Bygger' },
  it: { title: 'Avdelinger', building: 'Utvikler' },
  bank: { title: 'Avdelinger', building: 'Bygger' },
};

export const isUnitsType = (typeId: string): typeId is UnitsKind => typeId in UNITS;
export const unitsOf = (b: Business): UnitDef[] => UNITS[b.type as UnitsKind] ?? [];
export const levelOf = (b: Business, unitId: string) => b.units?.[unitId] ?? 0;
export const unitById = (b: Business, unitId: string) => unitsOf(b).find((u) => u.id === unitId);

/** Inntekt per time fra én avdeling på et nivå. */
export function unitIncomeAt(u: UnitDef, level: number): number {
  if (level <= 0) return 0;
  return u.income * level * INCOME_GROWTH ** (level - 1);
}

/** Pris for å bygge/oppgradere til nivå `level`. */
export const unitCost = (u: UnitDef, level: number) => Math.round(u.cost * COST_GROWTH ** (level - 1) * 100) / 100;
/** Byggetid til nivå `level` (sekunder). */
export const unitSeconds = (u: UnitDef, level: number) => Math.min(MAX_SECONDS, Math.round(u.seconds * TIME_GROWTH ** (level - 1)));

/** Er avdelingen låst opp? (Forrige avdeling må ha nivå 3.) */
export function isUnlocked(b: Business, index: number): boolean {
  if (index === 0) return true;
  return levelOf(b, unitsOf(b)[index - 1].id) >= UNLOCK_LEVEL;
}

/** Bonus fra avdelinger på maks nivå: 0,2 = +20 %. */
export function unitsBonus(b: Business): number {
  return unitsOf(b).filter((u) => levelOf(b, u.id) >= MAX_UNIT_LEVEL).length * MAX_LEVEL_BONUS;
}

export function unitsIncome(b: Business): number {
  const base = unitsOf(b).reduce((sum, u) => sum + unitIncomeAt(u, levelOf(b, u.id)), 0);
  return base * (1 + unitsBonus(b));
}

/** Hvor mye mer bedriften tjener per time når avdelingen går opp ett nivå. */
export function unitGain(b: Business, u: UnitDef): number {
  const lvl = levelOf(b, u.id);
  return (unitIncomeAt(u, lvl + 1) - unitIncomeAt(u, lvl)) * (1 + unitsBonus(b));
}

export type UnitResult = 'ok' | 'money' | 'busy' | 'locked' | 'max';

/** Starter bygging av neste nivå. Betaler med en gang; nivået kommer når tiden er ute. */
export function startUnitBuild(state: GameState, b: Business, unitId: string, now = Date.now()): UnitResult {
  const units = unitsOf(b);
  const index = units.findIndex((u) => u.id === unitId);
  if (index < 0) return 'locked';
  const u = units[index];
  if (b.expansionEnd !== null) return 'busy';
  if (!isUnlocked(b, index)) return 'locked';
  const next = levelOf(b, u.id) + 1;
  if (next > MAX_UNIT_LEVEL) return 'max';
  const cost = unitCost(u, next);
  if (state.balance < cost) return 'money';
  state.balance -= cost;
  b.invested += cost;
  b.buildUnit = u.id;
  b.expansionEnd = now + unitSeconds(u, next) * 1000;
  return 'ok';
}

/** Gjør ferdig byggingen (kalles når tiden er ute). */
export function finishUnitBuild(b: Business) {
  if (b.buildUnit) {
    b.units ??= {};
    b.units[b.buildUnit] = Math.min(MAX_UNIT_LEVEL, levelOf(b, b.buildUnit) + 1);
  }
  b.buildUnit = undefined;
  b.expansionEnd = null;
}
