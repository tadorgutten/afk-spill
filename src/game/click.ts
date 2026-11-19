import type { GameState } from './state';

/*
 * KLIKK-NIVÅER
 * ------------
 * - Nivå 1 gir 0,125 per klikk (vises som $ 1,25). Per klikk ganges med 1,64 for hvert nivå.
 * - Nivå 1 → 2 er et billig start-nivå: 100 (= 800 klikk).
 * - Fra nivå 2 koster neste nivå det samme som 1 000 klikk, og for hvert nivå
 *   trengs 20 % flere klikk enn forrige gang (1 000 → 1 200 → 1 440 ...).
 *   Jo høyere nivå, jo flere klikk (og mer penger) trengs altså for neste.
 * - Høyeste nivå er 10 (ca. $ 107 per klikk).
 *
 * Oppgraderingen kjøpes bare med penger på saldoen – det spiller ingen rolle
 * om pengene kommer fra klikk, aksjer eller noe annet.
 */

// --- Balansering: juster tallene her ----------------------------------------
/** Hvor mye ett klikk gir på nivå 1 (vises 10x høyere). */
export const BASE_PER_CLICK = 0.125;
/** Per klikk ganges med dette for hvert nivå (1,64 = 64 % mer). */
export const PER_CLICK_GROWTH = 1.64;
/** Høyeste nivå. */
export const MAX_LEVEL = 10;
/** Pris for å gå fra nivå 1 til 2. */
const FIRST_UPGRADE_COST = 100;
/** Antall klikk det koster å gå fra nivå 2 til 3. */
const BASE_CLICKS = 1000;
/** Hvor mange flere klikk hvert nivå krever enn forrige (1,2 = 20 % flere). */
const CLICKS_GROWTH = 1.2;
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
