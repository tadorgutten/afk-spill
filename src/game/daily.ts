import type { GameState } from './state';

/*
 * GULLBARRER: en egen valuta. Man får 1 gullbarre første gang man åpner appen hver dag.
 * "Dag" følger norsk tid (Europe/Oslo, også sommertid), uansett hvor telefonen står innstilt.
 * Barrene skal senere kunne brukes til å hoppe over ventetid.
 */

/** Dagens dato i Norge, f.eks. "2026-11-20". */
export function osloDay(now = Date.now()): string {
  // sv-SE gir formatet ÅÅÅÅ-MM-DD
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Gir dagens gullbarre hvis man ikke har fått den ennå. Returnerer true hvis den ble gitt nå. */
export function claimDailyBar(state: GameState, now = Date.now()): boolean {
  const today = osloDay(now);
  if (state.lastBarDay === today) return false;
  state.lastBarDay = today;
  state.goldBars = (state.goldBars ?? 0) + 1;
  return true;
}
