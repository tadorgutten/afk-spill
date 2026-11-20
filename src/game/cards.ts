import { businessesValue } from './business';
import { portfolioSummary } from './market';
import { cryptoSummary } from './crypto';
import { realEstateSummary } from './realEstate';
import type { GameState } from './state';
import { itemsValue } from './items';
import { collectionsValue } from './collections';

/*
 * BANKKORT
 * --------
 * Kortene låses opp av FORMUEN din akkurat nå (alt du eier, regnet om til kroner):
 *   saldo + verdien av aksjene dine (dagens kurs) + verdien av eiendelene dine.
 * Faller formuen under kravet, kan du ikke bruke kortet lenger. Da vises det beste kortet
 * du har råd til, og kortet du valgte kommer tilbake når formuen er stor nok igjen.
 */

export interface CardDef {
  id: string;
  name: string;
  /** Formuen som trengs for å bruke kortet (kr). */
  requirement: number;
  /** Teksten på kortets egen side. */
  description: string;
}

/** Fra billigst til dyrest. Omtrent 5 ganger dyrere for hvert kort. */
export const CARDS: CardDef[] = [
  {
    id: 'base',
    name: 'Basis',
    requirement: 0,
    description:
      'Basiskortet står for raffinert enkelhet og funksjonalitet. Det nøkterne, men elegante utseendet passer perfekt til hverdagen, og understreker din selvsikre stil og tidløse eleganse.',
  },
  {
    id: 'silver',
    name: 'Sølv',
    requirement: 10_000,
    description:
      'Sølvkortet utstråler raffinement og letthet. Den glatte sølvglansen gjenspeiler moderne verdighet og god smak. Det er et symbol på din sans for ekte eleganse.',
  },
  {
    id: 'gold',
    name: 'Gull',
    requirement: 50_000,
    description:
      'Gullkortet er ensbetydende med raffinert stil og prestisje. Den skinnende gylne fargen står for overflod og suksess, og understreker at du er eksklusiv og alltid sikter mot det høyeste.',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    requirement: 300_000,
    description:
      'Platinumkortet er selve symbolet på enestående luksus og fornemhet. Den utsøkte platinafargen gir en følelse av absolutt perfeksjon, og understreker din status og aristokratiske stil.',
  },
  {
    id: 'sapphire',
    name: 'Safir',
    requirement: 1_500_000,
    description:
      'Safirkortet glitrer med havets dybde og nattehimmelens ro. Den dype blåfargen står for visdom og tillit, og viser at du har tatt steget inn blant de virkelig velstående.',
  },
  {
    id: 'emerald',
    name: 'Smaragd',
    requirement: 7_000_000,
    description:
      'Smaragdkortet bærer fargen til vekst og fornyelse. Den rike grønne glansen viser at formuen din blomstrer, og at du vet hvordan pengene skal jobbe for deg.',
  },
  {
    id: 'ruby',
    name: 'Rubin',
    requirement: 30_000_000,
    description:
      'Rubinkortet brenner av lidenskap og makt. Den dype røde gløden er et tegn på mot og styrke, og viser at du ikke er redd for å satse stort – og vinne.',
  },
  {
    id: 'titan',
    name: 'Titan',
    requirement: 150_000_000,
    description:
      'Titankortet er like sterkt som metallet det er oppkalt etter. Den børstede overflaten står for styrke og utholdenhet – et kort for deg som har bygget et imperium som tåler alt.',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    requirement: 750_000_000,
    description:
      'Obsidiankortet er formet av ild og tid. Den blanke, svarte steinen med sin hemmelighetsfulle lilla glans er forbeholdt de få som har nådd en formue de fleste bare kan drømme om.',
  },
  {
    id: 'blackdeluxe',
    name: 'Black Deluxe',
    requirement: 3_000_000_000,
    description:
      'Omgi deg med en aura av mystikk og eleganse med Black Deluxe-kortet. Den dype, matte svartfargen står for eksklusivitet, og gjør hvert øyeblikk du bruker det til et ekte privilegium.',
  },
  {
    id: 'diamond',
    name: 'Diamant',
    requirement: 15_000_000_000,
    description:
      'Gratulerer! Du er nå eier av et symbol på ekte storhet og uovertruffen status. Diamantkortet er din personlige invitasjon til en verden der luksus er hverdag og unike muligheter er dine faste følgesvenner. Valget ditt viser kompromissløs selvtillit og utsøkt smak. Vær trygg på at du med dette kortet har trådt inn i eliten, der grensene viskes ut og alle drømmene dine blir virkelighet. Du er toppen av perfeksjon, og nå ligger hele verden for dine føtter. La deg selv skinne som aldri før.',
  },
  {
    id: 'infinity',
    name: 'Infinity',
    requirement: 100_000_000_000,
    description:
      'Det finnes ingen grenser lenger. Infinity-kortet er det sjeldneste av dem alle, forbeholdt den som har nådd en formue uten sidestykke. Fargene skifter som nordlyset – akkurat som mulighetene dine: uendelige. Du har ikke bare vunnet spillet. Du er spillet.',
  },
];

export function cardById(id: string): CardDef {
  return CARDS.find((c) => c.id === id) ?? CARDS[0];
}

/** Verdien av eiendelene dine (biler, fly og yachter – det du får ved å selge dem). */
export function assetsValue(state: GameState): number {
  return itemsValue(state.assets) + collectionsValue(state);
}

/** Formue = saldo + aksjer + krypto + bedrifter (kapitalisering) + eiendeler. */
export function fortune(state: GameState): number {
  return (
    state.balance +
    portfolioSummary(state).value +
    cryptoSummary(state).value +
    realEstateSummary(state).value +
    businessesValue(state) +
    assetsValue(state)
  );
}

/** Hvor mange kort formuen holder til nå (minst 1 – Basis har alle). */
export function unlockedCount(fortuneValue: number): number {
  let n = 0;
  while (n < CARDS.length && fortuneValue >= CARDS[n].requirement) n++;
  return Math.max(1, n);
}

/** Kortet som brukes: det du har valgt, eller det beste du har råd til hvis formuen er for lav. */
export function activeCard(state: GameState, fortuneValue = fortune(state)): CardDef {
  const n = unlockedCount(fortuneValue);
  const chosen = CARDS.findIndex((c) => c.id === state.selectedCard);
  return CARDS[chosen >= 0 && chosen < n ? chosen : n - 1];
}

/**
 * Har formuen nådd et kort du aldri har hatt før? Da tas det i bruk med en gang,
 * og kortet returneres (så det kan vises en melding). Ellers null.
 */
export function checkNewBestCard(state: GameState): CardDef | null {
  const best = CARDS[unlockedCount(fortune(state)) - 1];
  const record = CARDS.findIndex((c) => c.id === state.bestCard);
  if (CARDS.indexOf(best) <= record) return null;
  state.bestCard = best.id;
  state.selectedCard = best.id;
  return best;
}
