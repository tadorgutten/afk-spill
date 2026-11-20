import { MONEY_SCALE } from '../ui/format';
import { COLLECTION_DATA } from './collectionData';
import { COINS, coinHolding } from './crypto';
import { STOCKS } from './stockData';
import { availableShares } from './market';
import { NFTS, nftById } from './nft';
import type { GameState } from './state';

/*
 * SAMLINGER (mynter, malerier, unike ting, veteranbiler, smykker og frimerker),
 * MERKER (premier man henter når man har nådd et mål) og NFT-er (kjøpes med ETH).
 * Ingenting her gir inntekt – det er for moro skyld, men samlingene teller i formuen.
 *
 * SALG: man får 86 % av prisen (f.eks. $ 414 000 → $ 356 040), som i originalen.
 * Bildene ligger i public/collect/<samling>/<id>.jpg (Wikimedia Commons, se KILDER.txt der).
 */

export type CollId = 'coins' | 'paintings' | 'unique' | 'retro' | 'jewels' | 'stamps';

export interface CollItem {
  /** Unik id: "<samling>:<id>". */
  id: string;
  name: string;
  /** Pris (intern verdi, 1/10 av det som vises). */
  price: number;
  image: string;
}

export interface CollDef {
  id: CollId;
  name: string;
  /** Hvordan lista ser ut: store kort (mynter, malerier …) eller rader med lite bilde (frimerker, smykker). */
  layout: 'card' | 'row';
  /** Bildet på flisen på Eiendeler-siden. */
  cover: string;
  items: CollItem[];
}

export const SELL_SHARE = 0.86;

const nice = (v: number) => {
  const step = v < 1e6 ? 1_000 : v < 1e8 ? 100_000 : v < 1e9 ? 1_000_000 : 10_000_000;
  return Math.round(v / step) * step;
};

/** Prisene fordeles jevnt (geometrisk) fra den billigste til den dyreste. */
function build(id: CollId, name: string, layout: 'card' | 'row', min: number, max: number, cover = 0): CollDef {
  const raw = COLLECTION_DATA[id];
  const n = raw.length;
  const items = raw.map(([key, label], i) => {
    const shown = i === 0 ? min : i === n - 1 ? max : nice(min * (max / min) ** (i / (n - 1)));
    return { id: `${id}:${key}`, name: label, price: shown / MONEY_SCALE, image: `collect/${id}/${key}.jpg` };
  });
  void cover;
  return { id, name, layout, cover: `collect/icons/${id}.png`, items };
}

export const COLLECTIONS: CollDef[] = [
  build('coins', 'Mynter', 'card', 414_000, 18_900_000, 19),
  build('paintings', 'Malerier', 'card', 1_100_000, 2_500_000_000, 24),
  build('unique', 'Unike ting', 'card', 5_000_000, 100_000_000, 2),
  build('retro', 'Veteranbiler', 'card', 120_000, 40_000_000, 19),
  build('jewels', 'Smykker', 'row', 10_000_000, 250_000_000, 19),
  build('stamps', 'Frimerker', 'row', 73_000, 24_300_000, 14),
];
export const collById = (id: string) => COLLECTIONS.find((c) => c.id === id)!;
export const collItem = (id: string) => collById(id.split(':')[0] as CollId)?.items.find((i) => i.id === id);

// --- Tilstand ------------------------------------------------------------------------------
export interface CollectState {
  /** Ting man eier fra samlingene. */
  owned: string[];
  /** Merker man har hentet. */
  badges: string[];
  /** NFT-er man eier. */
  nfts: string[];
}
export const newCollect = (): CollectState => ({ owned: [], badges: [], nfts: [] });
export const collectOf = (state: GameState) => (state.collect ??= newCollect());

export const ownsItem = (state: GameState, id: string) => collectOf(state).owned.includes(id);
export const ownedIn = (state: GameState, c: CollDef) => c.items.filter((i) => ownsItem(state, i.id));
export const salePrice = (i: CollItem) => i.price * SELL_SHARE;
/** Hva samlingene er verdt (det man får ved å selge). */
export const collectionsValue = (state: GameState) =>
  collectOf(state).owned.reduce((sum, id) => sum + salePrice(collItem(id) ?? { price: 0 } as CollItem), 0);

export function buyCollItem(state: GameState, id: string): boolean {
  const item = collItem(id);
  if (!item || ownsItem(state, id) || state.balance < item.price) return false;
  state.balance -= item.price;
  collectOf(state).owned.push(id);
  return true;
}

export function sellCollItem(state: GameState, id: string): number {
  const item = collItem(id);
  const s = collectOf(state);
  if (!item || !s.owned.includes(id)) return 0;
  s.owned = s.owned.filter((x) => x !== id);
  const value = salePrice(item);
  state.balance += value;
  return value;
}

// --- NFT (betales med ETH) -------------------------------------------------------------------
const ETH = COINS.find((c) => c.id === 'ethereum')!;
export const ethBalance = (state: GameState) => coinHolding(state, ETH).owned;

export function buyNft(state: GameState, id: string): boolean {
  const n = nftById(id);
  const s = collectOf(state);
  if (!n || s.nfts.includes(id)) return false;
  const h = coinHolding(state, ETH);
  if (h.owned < n.eth) return false;
  // Det man betalte for ETH-en som brukes, går ut av "investert"
  h.invested *= (h.owned - n.eth) / h.owned;
  h.owned -= n.eth;
  s.nfts.push(id);
  return true;
}
export const ownedNfts = (state: GameState) => NFTS.filter((n) => collectOf(state).nfts.includes(n.id));

// --- Merker ----------------------------------------------------------------------------------
export interface BadgeDef {
  id: string;
  name: string;
  condition: string;
  icon: 'wallet' | 'briefcase' | 'vault' | 'dollar' | 'trophy';
  /** Fargen på sirkelen bak ikonet. */
  colors: [string, string];
  reached(state: GameState, fortune: number): boolean;
}

export const BADGES: BadgeDef[] = [
  {
    id: 'richman',
    name: 'Rikmann',
    condition: 'Ha en formue på mer enn $ 1 million.',
    icon: 'wallet',
    colors: ['#4fb8a5', '#22305e'],
    reached: (_s, f) => f >= 1e6 / MONEY_SCALE,
  },
  {
    id: 'investor',
    name: 'Investor',
    condition: 'Eie alle aksjene i alle selskapene i aksjemarkedet.',
    icon: 'briefcase',
    colors: ['#a9b0ba', '#3c4452'],
    reached: (s) => STOCKS.every((d) => availableShares(s, d) <= 0),
  },
  {
    id: 'crypto',
    name: 'Kryptokonge',
    condition: 'Eie litt av hver eneste kryptovaluta.',
    icon: 'dollar',
    colors: ['#f7b733', '#7a3fc4'],
    reached: (s) => COINS.every((c) => coinHolding(s, c).owned > 0),
  },
  {
    id: 'empire',
    name: 'Business Empire',
    condition: 'Tjen mer enn $ 100 T på bedriftene dine (etter skatt).',
    icon: 'vault',
    colors: ['#e0386e', '#ec6a2c'],
    reached: (s) => s.businessEarned >= 1e14 / MONEY_SCALE,
  },
  {
    id: 'trillion',
    name: 'Hundre billioner',
    condition: 'Ha en formue på mer enn $ 100 T.',
    icon: 'trophy',
    colors: ['#f5c542', '#b8862b'],
    reached: (_s, f) => f >= 1e14 / MONEY_SCALE,
  },
];
export const badgeById = (id: string) => BADGES.find((b) => b.id === id);
export const hasBadge = (state: GameState, id: string) => collectOf(state).badges.includes(id);

export function receiveBadge(state: GameState, id: string, fortune: number): boolean {
  const b = badgeById(id);
  if (!b || hasBadge(state, id) || !b.reached(state, fortune)) return false;
  collectOf(state).badges.push(id);
  return true;
}
