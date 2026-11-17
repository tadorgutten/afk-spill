import type { GameState } from './state';

/*
 * KLIKK-NIVÅER
 * ------------
 * - Per klikk ganges med 1,64 for hvert nivå: 0,25 → 0,41 → 0,6724 → 1,1027 ...
 * - Nivå 1 → 2 er et billig start-nivå: 100 kr (= 400 klikk).
 * - Fra nivå 2 koster neste nivå det samme som 800 klikk, og for hvert nivå
 *   trengs 5 % flere klikk enn forrige gang (800 → 840 → 882 ...).
 * - Høyeste nivå er 15 (254,54 kr per klikk).
 *
 * Oppgraderingen kjøpes bare med penger på saldoen – det spiller ingen rolle
 * om pengene kommer fra klikk, aksjer eller noe annet.
 */

// --- Balansering: juster tallene her ----------------------------------------
/** Hvor mye ett klikk gir på nivå 1 (kr). */
export const BASE_PER_CLICK = 0.25;
/** Per klikk ganges med dette for hvert nivå (1,64 = 64 % mer). */
export const PER_CLICK_GROWTH = 1.64;
/** Høyeste nivå. */
export const MAX_LEVEL = 15;
/** Pris for å gå fra nivå 1 til 2 (kr). */
const FIRST_UPGRADE_COST = 100;
/** Antall klikk det koster å gå fra nivå 2 til 3. */
const BASE_CLICKS = 800;
/** Hvor mange flere klikk hvert nivå krever enn forrige (1,05 = 5 % flere). */
const CLICKS_GROWTH = 1.05;

const toOre = (kr: number) => Math.round(kr * 100) / 100;

/** Hvor mye ett klikk gir på et gitt nivå (nøyaktig – vises avrundet til 2 desimaler). */
export function perClick(level: number): number {
  return BASE_PER_CLICK * PER_CLICK_GROWTH ** (Math.min(level, MAX_LEVEL) - 1);
}

/** Antall klikk (på dagens nivå) som trengs for å ha råd til neste nivå. */
export function clicksToNext(level: number): number {
  return level <= 1 ? FIRST_UPGRADE_COST / BASE_PER_CLICK : BASE_CLICKS * CLICKS_GROWTH ** (level - 2);
}

/** Prisen for å gå fra `level` til neste nivå, i hele øre. Infinity på høyeste nivå. */
export function upgradeCost(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  if (level <= 1) return FIRST_UPGRADE_COST;
  return toOre(perClick(level) * clicksToNext(level));
}

export const isMaxLevel = (level: number) => level >= MAX_LEVEL;

/** Spilleren trykker i feltet. Returnerer hvor mye som ble tjent. */
export function click(state: GameState): number {
  const earned = perClick(state.clickLevel);
  state.balance += earned;
  state.totalEarned += earned;
  state.clickEarned += earned;
  state.totalClicks += 1;
  return earned;
}

/** Kjøper neste nivå hvis man har råd. Returnerer true hvis det gikk. */
export function buyClickUpgrade(state: GameState): boolean {
  const cost = upgradeCost(state.clickLevel);
  // Liten slingringsmonn så f.eks. 99,999999 kr regnes som 100 kr
  if (isMaxLevel(state.clickLevel) || state.balance + 1e-6 < cost) return false;
  state.balance = Math.max(0, state.balance - cost);
  state.clickLevel += 1;
  return true;
}
