import {
  BADGES,
  COLLECTIONS,
  badgeById,
  collById,
  collItem,
  ethBalance,
  hasBadge,
  ownedIn,
  ownedNfts,
  ownsItem,
  salePrice,
  type CollDef,
  type CollItem,
} from '../game/collections';
import { NFTS, NFT_COLLECTION, NFT_TEXT, nftById, nftSvg } from '../game/nft';
import type { GameState } from '../game/state';
import { formatInt, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Sidene til samlingene, merkene og NFT-ene (brukes av Eiendeler-siden, src/pages/items.ts).
 * Klassene starter med cl- (samlinger), bd- (merker) og nft- (NFT).
 */

export type CollTab = 'market' | 'mine';

const tag = (price: number) => `<span class="cl-price">${icons.tag}<b>${formatMoneyWhole(price)}</b></span>`;
const photo = (i: CollItem) => `<img src="${i.image}" alt="" decoding="async" draggable="false" />`;
const eth = (v: number) => `<span class="nft-eth"><i>${ethIcon}</i>${formatInt(v)} ETH</span>`;
const ethIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#627eea"/><path d="M12 3.5 6.8 12.3 12 15.4l5.2-3.1Z" fill="#fff" opacity=".9"/><path d="M12 16.4 6.8 13.3 12 20.5l5.2-7.2Z" fill="#fff" opacity=".7"/></svg>';

// =========================================================================
// Flisene på Eiendeler-siden
// =========================================================================
export function renderCollectHome(state: GameState): string {
  const tiles = COLLECTIONS.map(
    (c) => `
      <button class="cl-tile" data-action="coll" data-coll="${c.id}">
        <span class="cl-tile-img ${c.layout === 'row' ? 'small' : ''}"><img src="${c.cover}" alt="" decoding="async" /></span>
        <strong>${c.name}</strong>
        <span>${ownedIn(state, c).length} av ${c.items.length}</span>
      </button>`,
  ).join('');
  const badges = BADGES.filter((b) => hasBadge(state, b.id)).length;
  const nfts = ownedNfts(state).length;
  return `
    <h2 class="ei-section">Samlinger</h2>
    <div class="cl-tiles">${tiles}</div>
    <hr class="ei-sep" />
    <button class="cl-wide" data-action="badges">
      <span class="bd-medal">${icons.trophy}</span>
      <div><strong>Merker</strong><span>${badges} av ${BADGES.length}</span></div>
    </button>
    <hr class="ei-sep" />
    <button class="cl-wide nft" data-action="nft">
      <span class="nft-frame">${nftSvg(NFTS[2])}</span>
      <div><strong>NFT</strong><span>${nfts} av ${NFTS.length}</span></div>
    </button>
    <button class="cl-islands" data-action="islands">
      <span class="cl-islands-art">${islandArt}</span>
      <b>Øyer</b>
    </button>`;
}

const islandArt = `<svg viewBox="0 0 120 70" aria-hidden="true">
  <circle cx="98" cy="14" r="9" fill="#f2c94c"/>
  <path d="M20 58c10-12 70-12 80 0Z" fill="#f2c94c"/>
  <path d="M50 52c-1-14 2-26 8-36" stroke="#8a5a3c" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M66 54c2-10 6-18 12-24" stroke="#8a5a3c" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M58 16c-8-6-18-5-24 2 8-2 15 0 20 4-9-1-16 3-19 10 7-5 14-6 21-4M58 16c8-6 18-4 23 3-8-2-14-1-19 3 8 0 14 5 15 12-5-7-11-9-18-9" fill="#4caf6a"/>
  <path d="M78 30c-6-5-13-4-17 1 6-1 11 0 14 3M78 30c6-5 14-3 17 3-6-2-11-1-14 2" fill="#4caf6a"/>
  <path d="M8 60c6 0 6-3 12-3s6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3 6 3 12 3 6-3 12-3v10H8Z" fill="#4aa3c9"/>
</svg>`;

// =========================================================================
// Én samling: Marked / Min samling
// =========================================================================
function tabs(left: string, right: string, active: 'a' | 'b', action: string): string {
  return `<div class="cl-tabs">
    <button class="${active === 'a' ? 'active' : ''}" data-action="${action}" data-tab="a">${left}</button>
    <button class="${active === 'b' ? 'active' : ''}" data-action="${action}" data-tab="b">${right}</button>
  </div>`;
}

function itemCard(c: CollDef, i: CollItem, mine: boolean): string {
  const price = mine ? salePrice(i) : i.price;
  if (c.layout === 'row') {
    return `
      <button class="cl-row" data-action="citem" data-item="${i.id}">
        <span class="cl-row-img">${photo(i)}</span>
        <div><strong>${i.name}</strong>${tag(price)}</div>
      </button>`;
  }
  return `
    <button class="cl-card ${c.id}" data-action="citem" data-item="${i.id}">
      <span class="cl-card-img">${photo(i)}</span>
      <div class="cl-card-text"><strong>${i.name}</strong>${tag(price)}</div>
    </button>`;
}

export function renderCollection(state: GameState, id: string, tab: CollTab): string {
  const c = collById(id);
  const list = c.items.filter((i) => ownsItem(state, i.id) === (tab === 'mine'));
  const empty = tab === 'market' ? 'Akkurat nå er det ingen tilbud i markedet.' : 'Du eier ingen ting i denne samlingen ennå.';
  return `
    <div class="ei-head two"><h1>${c.name}</h1><span>Saldo: <b data-balance>${formatMoneyFull(state.balance)}</b></span></div>
    ${tabs('Marked', 'Min samling', tab === 'market' ? 'a' : 'b', 'ctab')}
    ${list.length ? `<div class="cl-list ${c.layout}">${list.map((i) => itemCard(c, i, tab === 'mine')).join('')}</div>` : `<p class="cl-empty">${empty}</p>`}`;
}

/** Én ting: kjøp (markedet) eller selg (min samling). */
export function renderCollItem(state: GameState, id: string, confirm: boolean): string {
  const i = collItem(id)!;
  const c = collById(id.split(':')[0]);
  const owned = ownsItem(state, id);
  return `
    <div class="cl-hero ${c.layout} ${c.id}">${photo(i)}</div>
    <div class="cl-item-body">
      <h1 class="cl-item-name">${i.name}</h1>
      <p class="cl-coll-name">${c.name}</p>
      <hr class="cl-line" />
      ${
        owned
          ? `<p class="cl-label">Salgspris:</p><p class="cl-big">${formatMoneyWhole(salePrice(i))}</p>
             <button class="ei-btn ${confirm ? 'confirm' : ''}" data-action="csell" data-item="${id}">${confirm ? 'Trykk igjen for å selge' : 'Selg'}</button>
             <p class="ei-note center">Du får ${Math.round((salePrice(i) / i.price) * 100)} % av verdien (${formatMoneyWhole(i.price)}).</p>`
          : `<p class="cl-label">Pris:</p><p class="cl-big">${formatMoneyWhole(i.price)}</p>
             <button class="ei-btn ${state.balance >= i.price ? '' : 'off'}" data-action="cbuy" data-item="${id}" data-price="${i.price}">Kjøp</button>
             <p class="ei-balance">Saldo: <span data-balance>${formatMoneyFull(state.balance)}</span></p>`
      }
    </div>`;
}

// =========================================================================
// Merker
// =========================================================================
const badgeCircle = (id: string, big = false) => {
  const b = badgeById(id)!;
  return `<span class="bd-circle ${big ? 'big' : ''}" style="--a:${b.colors[0]};--b:${b.colors[1]}">${icons[b.icon]}</span>`;
};

export function renderBadges(state: GameState, fortune: number): string {
  const rows = BADGES.map((b) => {
    const got = hasBadge(state, b.id);
    const ready = !got && b.reached(state, fortune);
    return `
      <button class="bd-row" data-action="badge" data-badge="${b.id}">
        ${badgeCircle(b.id)}
        <div><strong>${b.name}</strong>${got ? '<span class="bd-got">Mottatt</span>' : ready ? '<span class="bd-ready">Klar til å hentes</span>' : ''}</div>
      </button>`;
  }).join('');
  return `<div class="ei-head"><h1>Merker</h1></div><div class="bd-list">${rows}</div>`;
}

export function renderBadge(state: GameState, id: string, fortune: number): string {
  const b = badgeById(id)!;
  const got = hasBadge(state, id);
  const ready = b.reached(state, fortune);
  return `
    <div class="bd-page">
      ${badgeCircle(id, true)}
      <h1>${b.name}</h1>
      <hr class="cl-line" />
      <p class="cl-label">Betingelser:</p>
      <p class="bd-cond">${b.condition}</p>
      ${
        got
          ? `<p class="bd-done">${icons.checkCircle} Du har fått dette merket</p>`
          : `<button class="ei-btn ${ready ? '' : 'off'}" data-action="receive" data-badge="${id}">Motta</button>
             ${ready ? '' : '<p class="ei-note center">Du har ikke nådd målet ennå.</p>'}`
      }
    </div>`;
}

// =========================================================================
// NFT
// =========================================================================
export function renderNfts(state: GameState, tab: 'buy' | 'mine'): string {
  const list = tab === 'mine' ? ownedNfts(state) : NFTS.filter((n) => !ownedNfts(state).includes(n));
  const cards = list
    .map(
      (n) => `
      <button class="nft-card" data-action="nftitem" data-nft="${n.id}" style="background:${n.bg}">
        ${eth(n.eth)}${nftSvg(n)}
      </button>`,
    )
    .join('');
  return `
    <div class="ei-head two"><h1>${NFT_COLLECTION}</h1><span>Saldo: <b>${ethBalance(state).toLocaleString('nb-NO', { maximumFractionDigits: 4 })} ETH</b></span></div>
    ${tabs('Kjøp', 'Samling', tab === 'buy' ? 'a' : 'b', 'ntab')}
    ${list.length ? `<div class="nft-grid">${cards}</div>` : `<p class="cl-empty">${tab === 'buy' ? 'Du eier alle NFT-ene!' : 'Du eier ingen NFT-er ennå.'}</p>`}`;
}

export function renderNft(state: GameState, id: string): string {
  const n = nftById(id)!;
  const owned = ownedNfts(state).includes(n);
  const bal = ethBalance(state);
  return `
    <p class="nft-balance">Saldo: <b>${bal.toLocaleString('nb-NO', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ETH</b></p>
    <div class="nft-big" style="background:${n.bg}">${nftSvg(n)}</div>
    <div class="nft-head">
      <h1>${n.name}</h1>
      <div><span>Pris</span>${eth(n.eth)}</div>
    </div>
    <hr class="cl-line" />
    <p class="nft-text">${NFT_COLLECTION}: ${NFT_TEXT}</p>
    ${
      owned
        ? `<p class="bd-done">${icons.checkCircle} Du eier denne NFT-en</p>`
        : `<button class="ei-btn ${bal >= n.eth ? '' : 'off'}" data-action="nftbuy" data-nft="${id}">Kjøp</button>
           <p class="ei-note center">NFT-er betales med ETH (Ethereum). Kjøp ETH under Investering → Krypto.</p>`
    }`;
}
