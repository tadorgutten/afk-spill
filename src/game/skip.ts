import type { Business } from './business';
import { bankOf } from './bank';
import { projectsOf } from './construction';
import { dealerOf } from './dealer';
import { fcOf } from './football';
import { itOf } from './it';
import { airlineOf } from './airline';
import { oilOf } from './oil';
import type { GameState } from './state';
import { goldBarSvg } from '../ui/goldBar';

/*
 * HOPP OVER VENTETID MED EN GULLBARRE
 * Overalt der man venter på noe (utvidelser, bygging, reparasjoner, flyvninger …) finnes en knapp
 * som bruker 1 gullbarre og gjør ventingen ferdig med en gang (i stedet for reklame).
 * Knappen har data-action="skip", data-skip="<hva>", data-id="<bedrift>" og data-key="<id>" (valgfri).
 * Selve ferdigstillingen skjer i neste tick (tiden settes til nå).
 */

export const SKIP_COST = 1;

export type SkipKind =
  | 'slot' // ny bedriftsplass
  | 'expand' // utvidelse av en bedrift (butikk, fabrikk, taxi, frakt)
  | 'bank' // utvidelse av hvelvet
  | 'project' // bygg (byggefirma)
  | 'repair' // reparasjon (bilforhandler)
  | 'segment' // bytte av spesialisering (bilforhandler)
  | 'service' // flere verkstedplasser
  | 'showroom' // flere utstillingsplasser
  | 'itproject' // IT-prosjekt
  | 'office' // nytt kontor (IT)
  | 'activity' // aktivitet (fotball)
  | 'cooldown' // pause etter aktivitet (fotball)
  | 'launch' // flyvning som lanseres
  | 'oilbuild' // ny oljeplattform
  | 'oilstore'; // utbygging av oljelageret

/** Knappen "Hopp over: 1 gullbarre". */
export function skipBtn(kind: SkipKind, bizId = '', key = '', small = false): string {
  return `<button class="gb-skip ${small ? 'small' : ''}" data-action="skip" data-skip="${kind}" data-id="${bizId}" data-key="${key}">
    ${goldBarSvg()}<span>${small ? `${SKIP_COST}` : `Hopp over · ${SKIP_COST}`}</span>
  </button>`;
}

/** Gjør ventingen ferdig. Returnerer false hvis det ikke var noe å hoppe over. */
function finish(state: GameState, b: Business | undefined, kind: SkipKind, key: string, now: number): boolean {
  if (kind === 'slot') {
    if (state.slotExpansionEnd === null) return false;
    state.slotExpansionEnd = now;
    return true;
  }
  if (!b) return false;
  switch (kind) {
    case 'expand':
      if (b.expansionEnd === null) return false;
      b.expansionEnd = now;
      return true;
    case 'bank': {
      const s = bankOf(b);
      if (s.expansionEnd === null) return false;
      s.expansionEnd = now;
      return true;
    }
    case 'project': {
      const p = projectsOf(b).find((x) => x.id === key);
      if (!p || p.end <= now) return false;
      p.end = now;
      return true;
    }
    case 'repair': {
      const c = dealerOf(b).cars.find((x) => x.id === key);
      if (!c?.repair) return false;
      c.repair.end = now;
      return true;
    }
    case 'segment':
    case 'service':
    case 'showroom': {
      const d = dealerOf(b);
      const t = kind === 'segment' ? d.segmentChange : kind === 'service' ? d.serviceExp : d.showroomExp;
      if (!t) return false;
      t.end = now;
      return true;
    }
    case 'itproject': {
      const p = itOf(b).projects.find((x) => x.id === key);
      if (!p || p.end <= now) return false;
      p.end = now;
      return true;
    }
    case 'office': {
      const it = itOf(b);
      if (!it.building) return false;
      it.building.end = now;
      return true;
    }
    case 'activity': {
      const s = fcOf(b);
      if (!s.activity) return false;
      s.activity.end = now;
      return true;
    }
    case 'cooldown': {
      const s = fcOf(b);
      if (s.activity || s.cooldownEnd <= now) return false;
      s.cooldownEnd = now;
      return true;
    }
    case 'launch': {
      const s = airlineOf(b);
      if (!(key in s.flights) || s.flights[key] <= now) return false;
      s.flights[key] = now;
      return true;
    }
    case 'oilbuild': {
      const s = oilOf(b);
      if (!s.building) return false;
      s.building.doneAt = now;
      return true;
    }
    case 'oilstore': {
      const s = oilOf(b);
      if (s.levelDoneAt === null) return false;
      s.levelDoneAt = now;
      return true;
    }
  }
  return false;
}

export type SkipResult = 'ok' | 'bars' | 'none';

/** Bruker en gullbarre på å hoppe over ventingen. */
export function useSkip(state: GameState, kind: SkipKind, bizId: string, key: string, now = Date.now()): SkipResult {
  if ((state.goldBars ?? 0) < SKIP_COST) return 'bars';
  const b = state.businesses.find((x) => x.id === bizId);
  if (!finish(state, b, kind, key, now)) return 'none';
  state.goldBars -= SKIP_COST;
  return 'ok';
}
