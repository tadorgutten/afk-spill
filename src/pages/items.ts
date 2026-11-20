import {
  ALL_ITEMS,
  fixItems,
  OPTIONS,
  PLACES,
  buyItem,
  buyPlace,
  itemDef,
  itemsOfKind,
  itemsValue,
  movePlace,
  ownedOfKind,
  ownsPlace,
  placeDef,
  priceWith,
  saleValue,
  sellItem,
  type ItemDef,
  type ItemKind,
  type OwnedItem,
} from '../game/items';
import type { GameState } from '../game/state';
import { formatMoney, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';
import { showToast } from '../ui/toast';
import { COLLECTIONS, buyCollItem, buyNft, collItem, receiveBadge, sellCollItem, badgeById } from '../game/collections';
import { nftById } from '../game/nft';
import { fortune } from '../game/cards';
import { renderBadge, renderBadges, renderCollectHome, renderCollItem, renderCollection, renderNft, renderNfts, type CollTab } from './collectViews';
import { html, type Page } from './page';

/*
 * EIENDELER-SIDEN: garasje, hangar og havn (det man eier), og en butikk for biler, fly og yachter.
 *   home   – oversikten
 *   owned  – garasjen / hangaren / havna (det man eier av én type)
 *   item   – én eiendel man eier: valgene, plasseringen (yacht) og salg
 *   shop   – butikken for én type
 *   buy    – kjøp: velg motor/utstyr, team/design og plassering (yacht)
 *   places – plasseringene for yachter (velg eller kjøp)
 * Eiendelene gir ingen inntekt – de er bare for moro skyld (men teller i formuen).
 */

type Sort = 'desc' | 'asc';
type View =
  | { name: 'home' }
  | { name: 'owned'; kind: ItemKind; sort: Sort }
  | { name: 'item'; uid: string }
  | { name: 'shop'; kind: ItemKind }
  | { name: 'buy'; id: string; a: number; b: number; place: string }
  | { name: 'places'; uid?: string; islands?: boolean }
  | { name: 'coll'; id: string; tab: CollTab }
  | { name: 'citem'; id: string }
  | { name: 'badges' }
  | { name: 'badge'; id: string }
  | { name: 'nft'; tab: 'buy' | 'mine' }
  | { name: 'nftitem'; id: string };

const ROOM: Record<ItemKind, { title: string; empty: string; shop: string }> = {
  car: { title: 'Garasje', empty: 'Du har ingen biler ennå.', shop: 'Bilbutikk' },
  plane: { title: 'Hangar', empty: 'Du har ingen fly ennå.', shop: 'Flybutikk' },
  yacht: { title: 'Havn', empty: 'Du har ingen yachter ennå.', shop: 'Yachtbutikk' },
};

const img = (def: ItemDef, cls = '') =>
  `<img class="ei-img ${def.flip ? 'flip' : ''} ${def.photo ? 'photo' : ''} ${cls}" src="${def.image}" alt="" decoding="async" draggable="false" />`;
const placeImg = (id: string) => `<img src="items/places/${id}.jpg" alt="" onerror="this.style.display='none'" />`;
/** Fargen på kortet: bilene etter klasse, fly blått, yachter havblått. */
const tone = (def: ItemDef) => (def.kind === 'car' ? `tier-${def.tier}` : def.kind);
const optionText = (o: OwnedItem, def: ItemDef) => {
  const [ga, gb] = OPTIONS[def.kind];
  return [ga.options[o.a]?.short, gb.options[o.b]?.short];
};

/** Henter alle bildene i bakgrunnen, så listene vises med en gang. */
let preloaded = false;
const keep: HTMLImageElement[] = [];
function preloadImages() {
  if (preloaded) return;
  preloaded = true;
  const urls = [...ALL_ITEMS.map((d) => d.image), ...PLACES.map((p) => `items/places/${p.id}.jpg`), ...COLLECTIONS.flatMap((c) => c.items.map((i) => i.image))];
  for (const url of urls) {
    const im = new Image();
    im.decoding = 'async';
    im.src = url;
    keep.push(im);
  }
}

export function createItemsPage(state: GameState): Page {
  fixItems(state.assets);
  // Start å hente bildene litt etter at appen har startet
  setTimeout(preloadImages, 3000);
  const element = html(`<section class="page items"></section>`);
  let stack: View[] = [{ name: 'home' }];
  const current = () => stack[stack.length - 1];
  /** "Trykk igjen" for å selge. */
  let confirmSell = false;
  let lastRender = 0;

  /** Hvor langt ned man var på hver side i stabelen (så man kommer tilbake til samme sted i lista). */
  let scrolls: number[] = [];

  function go(view: View) {
    scrolls[stack.length - 1] = window.scrollY;
    stack.push(view);
    confirmSell = false;
    render();
    window.scrollTo(0, 0);
  }
  function back() {
    if (stack.length > 1) stack.pop();
    confirmSell = false;
    render();
    // Tilbake til en liste: samme sted som før. Går man ut av lista og inn igjen, starter den på toppen.
    window.scrollTo(0, scrolls[stack.length - 1] ?? 0);
    scrolls.length = stack.length;
  }

  function shake(el: HTMLElement) {
    el.classList.remove('ei-shake');
    void el.offsetWidth;
    el.classList.add('ei-shake');
  }

  // =========================================================================
  // Oversikten
  // =========================================================================
  function renderHome(): string {
    const s = state.assets;
    const ROOM_IMG: Record<ItemKind, string> = { car: 'items/rooms/garage.png', plane: 'items/rooms/hangar.jpg', yacht: 'items/rooms/harbor.jpg' };
    const room = (kind: ItemKind) => {
      const n = ownedOfKind(s, kind).length;
      return `
        <button class="ei-room ${kind}" data-action="owned" data-kind="${kind}">
          <img class="ei-room-photo" src="${ROOM_IMG[kind]}" alt="" draggable="false" />
          <span class="ei-room-name">${ROOM[kind].title}</span>
          ${n ? `<span class="ei-room-count">${n}</span>` : ''}
        </button>`;
    };
    return `
      <h1 class="ei-title">Eiendeler</h1>
      <div class="ei-rooms">${room('car')}${room('plane')}${room('yacht')}</div>
      <div class="ei-shops">
        <button data-action="shop" data-kind="car"><span>${icons.carShop}</span><b>Bilbutikk</b></button>
        <button data-action="shop" data-kind="plane"><span>${icons.planeShop}</span><b>Flybutikk</b></button>
        <button data-action="shop" data-kind="yacht"><span>${icons.yachtShop}</span><b>Yachtbutikk</b></button>
      </div>
      <hr class="ei-sep" />
      <div class="ei-worth">
        <div><span>Verdien av eiendelene</span><strong>${formatMoneyFull(itemsValue(s))}</strong></div>
        <div class="ei-worth-counts">
          <span>${icons.dealer}${ownedOfKind(s, 'car').length}</span>
          <span>${icons.plane}${ownedOfKind(s, 'plane').length}</span>
          <span>${icons.yacht}${ownedOfKind(s, 'yacht').length}</span>
        </div>
      </div>
      <p class="ei-note">Eiendelene gir ingen inntekt – de er for moro skyld, men teller med i formuen din.</p>
      <hr class="ei-sep" />
      ${renderCollectHome(state)}`;
  }

  // =========================================================================
  // Garasje / hangar / havn
  // =========================================================================
  function ownedCard(o: OwnedItem): string {
    const def = itemDef(o.id)!;
    const [x, y] = optionText(o, def);
    if (def.photo) {
      return `
        <button class="ei-yacht-card ${def.kind}" data-action="item" data-uid="${o.uid}">
          <div class="ei-sea">${img(def)}</div>
          <div class="ei-yacht-foot">
            <div class="ei-tags"><span>${y}</span><span>${x}</span></div>
            <strong>${def.name}</strong>${def.info ? `<small>${def.info}</small>` : ''}
          </div>
        </button>`;
    }
    return `
      <button class="ei-owned ${def.kind} ${tone(def)}" data-action="item" data-uid="${o.uid}">
        ${img(def)}
        <div class="ei-owned-text"><strong>${def.name}</strong><span>${x}<i></i>${y}</span></div>
      </button>`;
  }

  function renderOwned(kind: ItemKind, sort: Sort): string {
    const list = ownedOfKind(state.assets, kind).sort((p, q) => (sort === 'asc' ? 1 : -1) * (p.paid - q.paid));
    const chip = (key: Sort, label: string) =>
      `<button class="ei-chip ${sort === key ? 'active' : ''}" data-action="sort" data-sort="${key}">${label}</button>`;
    return `
      <div class="ei-head"><h1>${ROOM[kind].title}</h1></div>
      <div class="ei-chips">${chip('desc', 'Dyreste først')}${chip('asc', 'Billigste først')}</div>
      ${
        list.length
          ? `<div class="ei-list">${list.map(ownedCard).join('')}</div>`
          : `<div class="ei-empty">${kind === 'car' ? icons.carShop : kind === 'plane' ? icons.planeShop : icons.yachtShop}<p>${ROOM[kind].empty}</p>
              <button class="ei-btn ${kind}" data-action="shop" data-kind="${kind}">Til ${ROOM[kind].shop.toLowerCase()}en</button></div>`
      }`;
  }

  // =========================================================================
  // Én eiendel man eier
  // =========================================================================
  function renderItem(o: OwnedItem): string {
    const def = itemDef(o.id)!;
    const [ga, gb] = OPTIONS[def.kind];
    const optCard = (value: string | undefined, caption: string) =>
      `<div class="ei-opt static"><strong>${value}</strong><span>${caption}</span></div>`;
    const p = o.place ? placeDef(o.place) : null;
    return `
      ${def.photo ? `<div class="ei-hero-sea">${img(def)}</div>` : ''}
      <div class="ei-item-head ${def.photo ? 'on-sea' : ''}">
        <h1>${def.name}</h1>
        <span>Kjøpspris: <b>${formatMoneyWhole(o.paid)}</b></span>
      </div>
      ${!def.photo ? `<div class="ei-big">${img(def)}</div>` : ''}
      <h2 class="ei-sub">Valg</h2>
      <div class="ei-opts">${optCard(ga.options[o.a]?.short, ga.caption)}${optCard(gb.options[o.b]?.short, gb.caption)}</div>
      ${
        p
          ? `<h2 class="ei-sub">Plassering</h2>
             <button class="ei-place-row" data-action="places" data-uid="${o.uid}">
               <span class="ei-place-photo">${placeImg(p.id)}</span>
               <div><strong>${p.name}</strong><span>Endre ${icons.arrowRight}</span></div>
             </button>`
          : ''
      }
      <hr class="ei-sep" />
      <p class="ei-sum">Salgspris: <strong>${formatMoneyFull(saleValue(o))}</strong></p>
      <button class="ei-btn sell ${confirmSell ? 'confirm' : ''}" data-action="sell" data-uid="${o.uid}">${confirmSell ? 'Trykk igjen for å selge' : 'Selg'}</button>
      <p class="ei-note center">Du får ${Math.round((saleValue(o) / o.paid) * 100)} % av det du betalte. Kjøper du den igjen, koster den det samme som før.</p>`;
  }

  // =========================================================================
  // Butikken
  // =========================================================================
  function shopCard(def: ItemDef): string {
    if (def.photo) {
      return `
        <button class="ei-yacht-shop ${def.kind}" data-action="buy" data-id="${def.id}">
          <div class="ei-sea">${img(def)}</div>
          <div class="ei-yacht-shop-text"><strong>${def.name}</strong>${def.info ? `<em>${def.info}</em>` : ''}<span>Startpris:</span><b>${formatMoneyWhole(def.price)}</b></div>
        </button>`;
    }
    return `
      <button class="ei-shop-card ${def.kind} ${tone(def)}" data-action="buy" data-id="${def.id}">
        <div class="ei-shop-text"><strong>${def.name}</strong><span>Pris fra ${formatMoneyWhole(def.price)}</span></div>
        ${img(def)}
      </button>`;
  }

  function renderShop(kind: ItemKind): string {
    return `
      <div class="ei-head two"><h1>${ROOM[kind].shop}</h1><span>Saldo: <b data-balance>${formatMoneyFull(state.balance)}</b></span></div>
      <div class="ei-list">${itemsOfKind(kind).map(shopCard).join('')}</div>`;
  }

  // =========================================================================
  // Kjøp
  // =========================================================================
  function renderBuy(v: Extract<View, { name: 'buy' }>): string {
    const def = itemDef(v.id)!;
    const [ga, gb] = OPTIONS[def.kind];
    const price = priceWith(def, v.a, v.b);
    const group = (title: string, opts: typeof ga.options, chosen: number, which: 'a' | 'b') => `
      <h2 class="ei-sub">${title}</h2>
      <div class="ei-opts">${opts
        .map(
          (opt, i) => `
          <button class="ei-opt ${i === chosen ? 'chosen' : ''}" data-action="opt" data-group="${which}" data-index="${i}">
            <strong>${opt.label}</strong>${opt.pct ? `<span>+ ${opt.pct} %</span>` : '<span>&nbsp;</span>'}
          </button>`,
        )
        .join('')}</div>`;
    const p = placeDef(v.place);
    return `
      ${def.photo ? `<div class="ei-hero-sea">${img(def)}</div>` : ''}
      <div class="ei-item-head ${def.photo ? 'on-sea' : ''} ${def.kind === 'car' ? 'right' : ''}">
        <h1>${def.name}</h1>
        <span>Pris fra <b>${formatMoneyWhole(def.price)}</b></span>
      </div>
      ${!def.photo ? `<div class="ei-big">${img(def)}</div>` : ''}
      <div class="ei-buy ${tone(def)}">
        ${group(ga.title, ga.options, v.a, 'a')}
        ${group(gb.title, gb.options, v.b, 'b')}
        ${
          def.kind === 'yacht'
            ? `<h2 class="ei-sub">Yachtens plassering</h2>
               <button class="ei-place-row" data-action="places">
                 <span class="ei-place-photo">${placeImg(p.id)}</span>
                 <div><strong>${p.name}</strong><span>Endre ${icons.arrowRight}</span></div>
               </button>`
            : ''
        }
        <hr class="ei-sep" />
        <p class="ei-sum">Sum: <strong>${formatMoneyFull(price)}</strong></p>
        <button class="ei-btn buy ${state.balance >= price ? '' : 'off'}" data-action="purchase">Kjøp</button>
        <p class="ei-balance">Saldo: <span data-balance>${formatMoneyFull(state.balance)}</span></p>
      </div>`;
  }

  // =========================================================================
  // Plasseringer (yacht)
  // =========================================================================
  function renderPlaces(uid?: string, islands = false): string {
    const chosen = islands ? undefined : uid ? state.assets.items.find((o) => o.uid === uid)?.place : buyView()?.place;
    const cards = PLACES.map((p) => {
      const owned = ownsPlace(state.assets, p.id);
      const isChosen = chosen === p.id;
      return `
        <div class="ei-place ${owned ? 'owned' : ''} ${isChosen ? 'chosen' : ''}">
          <div class="ei-place-top"><strong>${p.name}</strong><span>${p.where}</span></div>
          <div class="ei-place-img">${placeImg(p.id)}</div>
          <div class="ei-place-foot">
            ${
              owned
                ? islands
                  ? `<span class="ei-chosen">${icons.check} Din</span>`
                  : isChosen
                  ? `<span class="ei-chosen">${icons.check} Valgt</span>`
                  : `<button class="ei-pill" data-action="pick-place" data-place="${p.id}">Velg</button>`
                : `<b>${formatMoneyWhole(p.price)}</b><button class="ei-pill ${state.balance >= p.price ? '' : 'off'}" data-action="buy-place" data-place="${p.id}">Kjøp</button>`
            }
          </div>
        </div>`;
    }).join('');
    return `
      <div class="ei-head two"><h1>${islands ? 'Øyer' : 'Yachtens plassering'}</h1><span>Saldo: <b data-balance>${formatMoneyFull(state.balance)}</b></span></div>
      <p class="ei-note">${islands ? 'Stedene du eier her, kan du også velge som plassering for yachtene dine.' : 'Et sted du kjøper, kan brukes av alle yachtene dine – også dem du kjøper senere.'}</p>
      <div class="ei-list">${cards}</div>`;
  }

  /** Kjøpssiden under plasseringslista (når man velger plassering før kjøp). */
  function buyView() {
    for (let i = stack.length - 1; i >= 0; i--) {
      const v = stack[i];
      if (v.name === 'buy') return v;
    }
    return null;
  }

  // =========================================================================
  function render() {
    lastRender = performance.now();
    const v = current();
    element.dataset.view = v.name;
    const backBtn = `<button class="ei-back ${v.name === 'buy' || v.name === 'item' ? 'light' : ''}" data-action="back" aria-label="Tilbake">${icons.back}</button>`;
    let body = '';
    switch (v.name) {
      case 'home':
        body = renderHome();
        break;
      case 'owned':
        body = backBtn + renderOwned(v.kind, v.sort);
        break;
      case 'item': {
        const o = state.assets.items.find((x) => x.uid === v.uid);
        if (!o) {
          stack.pop();
          return render();
        }
        body = backBtn + renderItem(o);
        break;
      }
      case 'shop':
        body = backBtn + renderShop(v.kind);
        break;
      case 'buy':
        body = backBtn + renderBuy(v);
        break;
      case 'places':
        body = backBtn + renderPlaces(v.uid, v.islands);
        break;
      case 'coll':
        body = backBtn + renderCollection(state, v.id, v.tab);
        break;
      case 'citem':
        body = backBtn + renderCollItem(state, v.id, confirmSell);
        break;
      case 'badges':
        body = backBtn + renderBadges(state, fortune(state));
        break;
      case 'badge':
        body = backBtn + renderBadge(state, v.id, fortune(state));
        break;
      case 'nft':
        body = backBtn + renderNfts(state, v.tab);
        break;
      case 'nftitem':
        body = backBtn + renderNft(state, v.id);
        break;
    }
    const kind = v.name === 'owned' || v.name === 'shop' ? v.kind : v.name === 'buy' ? itemDef(v.id)?.kind : undefined;
    element.dataset.kind = kind ?? '';
    element.dataset.sea = body.includes('ei-hero-sea') ? '1' : '';
    element.innerHTML = body;
  }

  element.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const { action } = target.dataset;
    const v = current();
    if (action !== 'sell' && action !== 'csell') confirmSell = false;

    switch (action) {
      case 'back':
        return back();
      // --- Samlinger, merker, NFT og øyer ---
      case 'coll':
        return go({ name: 'coll', id: target.dataset.coll!, tab: 'market' });
      case 'ctab':
        if (v.name === 'coll') v.tab = target.dataset.tab === 'a' ? 'market' : 'mine';
        render();
        window.scrollTo(0, 0);
        return;
      case 'citem':
        return go({ name: 'citem', id: target.dataset.item! });
      case 'cbuy': {
        const id = target.dataset.item!;
        if (!buyCollItem(state, id)) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast(`Du kjøpte ${collItem(id)!.name}!`);
        return back();
      }
      case 'csell': {
        const id = target.dataset.item!;
        if (!confirmSell) {
          confirmSell = true;
          return render();
        }
        confirmSell = false;
        const got = sellCollItem(state, id);
        if (got > 0) showToast(`Solgt for ${formatMoney(got)}`);
        return back();
      }
      case 'badges':
        return go({ name: 'badges' });
      case 'badge':
        return go({ name: 'badge', id: target.dataset.badge! });
      case 'receive': {
        const id = target.dataset.badge!;
        if (!receiveBadge(state, id, fortune(state))) {
          shake(target);
          return showToast('Du har ikke nådd målet ennå');
        }
        showToast(`Du fikk merket «${badgeById(id)!.name}»!`);
        return render();
      }
      case 'nft':
        return go({ name: 'nft', tab: 'buy' });
      case 'ntab':
        if (v.name === 'nft') v.tab = target.dataset.tab === 'a' ? 'buy' : 'mine';
        render();
        window.scrollTo(0, 0);
        return;
      case 'nftitem':
        return go({ name: 'nftitem', id: target.dataset.nft! });
      case 'nftbuy': {
        const id = target.dataset.nft!;
        if (!buyNft(state, id)) {
          shake(target);
          return showToast('Du har ikke nok ETH');
        }
        showToast(`Du kjøpte ${nftById(id)!.name}!`);
        return back();
      }
      case 'islands':
        return go({ name: 'places', islands: true });
      case 'owned':
        return go({ name: 'owned', kind: target.dataset.kind as ItemKind, sort: 'desc' });
      case 'shop':
        return go({ name: 'shop', kind: target.dataset.kind as ItemKind });
      case 'item':
        return go({ name: 'item', uid: target.dataset.uid! });
      case 'buy':
        return go({ name: 'buy', id: target.dataset.id!, a: 0, b: 0, place: 'public' });
      case 'places':
        return go({ name: 'places', uid: target.dataset.uid });
      case 'sort':
        if (v.name === 'owned') v.sort = target.dataset.sort as Sort;
        return render();
      case 'opt':
        if (v.name === 'buy') {
          const i = Number(target.dataset.index);
          if (target.dataset.group === 'a') v.a = i;
          else v.b = i;
        }
        return render();
      case 'purchase': {
        if (v.name !== 'buy') return;
        const def = itemDef(v.id)!;
        const item = buyItem(state, state.assets, v.id, v.a, v.b, v.place);
        if (!item) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast(`Du kjøpte ${def.name}!`);
        // Gå til den nye eiendelen (i garasjen / hangaren / havna)
        stack = [{ name: 'home' }, { name: 'owned', kind: def.kind, sort: 'desc' }, { name: 'item', uid: item.uid }];
        render();
        window.scrollTo(0, 0);
        return;
      }
      case 'sell': {
        if (v.name !== 'item') return;
        if (!confirmSell) {
          confirmSell = true;
          return render();
        }
        confirmSell = false;
        const def = itemDef(state.assets.items.find((o) => o.uid === v.uid)?.id ?? '');
        const got = sellItem(state, state.assets, v.uid);
        if (got > 0) showToast(`Solgt ${def?.name ?? ''} for ${formatMoney(got)}`);
        return back();
      }
      case 'pick-place': {
        if (v.name !== 'places') return;
        const id = target.dataset.place!;
        if (v.uid) movePlace(state.assets, v.uid, id);
        else {
          const bv = buyView();
          if (bv) bv.place = id;
        }
        showToast(`Plassering: ${placeDef(id).name}`);
        return back();
      }
      case 'buy-place': {
        if (v.name !== 'places') return;
        const id = target.dataset.place!;
        if (!buyPlace(state, state.assets, id)) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        // Velg det nye stedet med en gang
        if (v.uid) movePlace(state.assets, v.uid, id);
        else {
          const bv = buyView();
          if (bv) bv.place = id;
        }
        showToast(`Du kjøpte ${placeDef(id).name}!`);
        return render();
      }
    }
  });

  return {
    id: 'items',
    label: 'Eiendeler',
    icon: icons.items,
    element,
    onShow() {
      stack = [{ name: 'home' }];
      scrolls = [];
      confirmSell = false;
      render();
      preloadImages();
    },
    onBack() {
      if (stack.length <= 1) return false;
      back();
      return true;
    },
    navHidden: () => stack.length > 1,
    update() {
      // Saldoen endrer seg hele tiden: bytt bare tallet (å tegne lista på nytt får bildene til å blinke)
      if (performance.now() - lastRender < 250) return;
      lastRender = performance.now();
      const text = formatMoneyFull(state.balance);
      element.querySelectorAll<HTMLElement>('[data-balance]').forEach((el) => {
        if (el.textContent !== text) el.textContent = text;
      });
      const v = current();
      if (v.name === 'citem') {
        const btn = element.querySelector<HTMLElement>('[data-action=cbuy]');
        if (btn) btn.classList.toggle('off', state.balance < Number(btn.dataset.price));
      }
      if (v.name === 'buy') {
        const btn = element.querySelector('[data-action=purchase]');
        const def = itemDef(v.id);
        if (btn && def) btn.classList.toggle('off', state.balance < priceWith(def, v.a, v.b));
      }
    },
  };
}
