import type { GameState } from '../game/state';

export type PageId = 'investing' | 'business' | 'earnings' | 'items' | 'profile';

/** Felles mal for alle sidene i menyen. */
export interface Page {
  id: PageId;
  /** Navn på siden (for skjermlesere – vises ikke i menyen). */
  label: string;
  /** SVG-ikon i menyen. */
  icon: string;
  /** HTML-elementet med innholdet på siden. */
  element: HTMLElement;
  /** Kalles hele tiden mens siden vises, for å oppdatere tall. */
  update(state: GameState): void;
  /** Kalles når man går til siden (valgfritt). */
  onShow?(): void;
  /** Mobilens tilbakeknapp. Returner true hvis siden gikk tilbake selv (valgfritt). */
  onBack?(): boolean;
  /** Skal menyen nederst skjules nå? (f.eks. inne på en underside) */
  navHidden?(): boolean;
}

/** Hjelper: lag et element fra en HTML-tekst. */
export function html(markup: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild as HTMLElement;
}
