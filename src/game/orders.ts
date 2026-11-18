import type { Business } from './business';
import type { GameState } from './state';

/*
 * OPPDRAG (byggefirma og bilforhandler)
 * -------------------------------------
 * Her tjener bedriften ikke en fast sum per time. I stedet starter du oppdrag:
 *   - Byggefirma: du betaler materialene, laget bygger i en viss tid,
 *     og når bygget er ferdig får du kontraktssummen (mer enn du betalte).
 *   - Bilforhandler: du kjøper inn en bil, den står i bilhallen en stund,
 *     og blir så solgt dyrere enn du kjøpte den.
 * - Hvor mange oppdrag som kan pågå samtidig, avhenger av KAPASITETEN
 *   (arbeidslag / plasser i bilhallen). Den kan kjøpes mer av.
 * - Hvert ferdige oppdrag gir ERFARING. Større oppdrag krever mer erfaring.
 * - "Start på nytt automatisk": når et oppdrag er ferdig, startes det samme igjen
 *   (hvis du har råd) – også mens appen er lukket.
 * Skatt: 5 % av fortjenesten trekkes automatisk (se business.ts).
 */

export type OrdersKind = 'construction' | 'dealer';

export interface OrderDef {
  id: string;
  name: string;
  /** Bilde (fra public/). */
  image: string;
  /** Hva det koster å starte (internt, vises 10x høyere). */
  cost: number;
  /** Hva man får når det er ferdig. */
  payout: number;
  /** Hvor lang tid det tar (sekunder). */
  seconds: number;
  /** Hvor mange fullførte oppdrag som trengs for å låse det opp. */
  need: number;
  /** Speilvend bildet (bilene skal peke mot venstre). */
  flip?: boolean;
}

export interface ActiveOrder {
  id: string;
  item: string;
  /** Når oppdraget startet og blir ferdig (ms). */
  start: number;
  end: number;
}

const min = 60;
const h = 3600;

// Tallene er interne (1/10 av det som vises).
export const ORDERS: Record<OrdersKind, OrderDef[]> = {
  construction: [
    { id: 'excavator', name: 'Grunnarbeid', image: 'biz/excavator.png', cost: 600, payout: 660, seconds: 15 * min, need: 0 },
    { id: 'house', name: 'Enebolig', image: 'biz/house.png', cost: 4_000, payout: 4_600, seconds: 1 * h, need: 3 },
    { id: 'villa', name: 'Villa', image: 'biz/villa.png', cost: 15_000, payout: 17_500, seconds: 2 * h, need: 8 },
    { id: 'apartments', name: 'Boligblokk', image: 'biz/apartments.png', cost: 70_000, payout: 83_000, seconds: 4 * h, need: 15 },
    { id: 'office', name: 'Kontorbygg', image: 'biz/office.png', cost: 300_000, payout: 360_000, seconds: 6 * h, need: 25 },
    { id: 'bridge', name: 'Bro', image: 'biz/bridge.png', cost: 1_400_000, payout: 1_700_000, seconds: 8 * h, need: 40 },
    { id: 'skyscraper', name: 'Skyskraper', image: 'biz/skyscraper.png', cost: 7_000_000, payout: 8_600_000, seconds: 12 * h, need: 60 },
  ],
  dealer: [
    { id: 'granta', name: 'Lada Granta', image: 'cars/granta.png', cost: 780, payout: 870, seconds: 20 * min, need: 0 },
    { id: 'solaris', name: 'Hyundai Solaris', image: 'cars/solaris.png', cost: 1_260, payout: 1_400, seconds: 30 * min, need: 0 },
    { id: 'octavia', name: 'Škoda Octavia', image: 'cars/octavia.png', cost: 2_200, payout: 2_460, seconds: 45 * min, need: 3, flip: true },
    { id: 'camry', name: 'Toyota Camry', image: 'cars/camry.png', cost: 2_950, payout: 3_320, seconds: 1 * h, need: 6, flip: true },
    { id: 'bmw5', name: 'BMW 5-serie', image: 'cars/bmw5.png', cost: 6_200, payout: 7_000, seconds: 1.5 * h, need: 10 },
    { id: 'sclass', name: 'Mercedes-Benz S-klasse', image: 'cars/sclass.png', cost: 13_750, payout: 15_600, seconds: 2 * h, need: 15 },
    { id: 'porsche911', name: 'Porsche 911', image: 'cars/porsche911.png', cost: 23_000, payout: 26_200, seconds: 3 * h, need: 22 },
    { id: 'ferrari', name: 'Ferrari 458 Italia', image: 'cars/ferrari.png', cost: 48_000, payout: 55_000, seconds: 4 * h, need: 30 },
    { id: 'huracan', name: 'Lamborghini Huracán', image: 'cars/huracan.png', cost: 65_000, payout: 75_000, seconds: 5 * h, need: 40 },
    { id: 'rollsroyce', name: 'Rolls-Royce Ghost', image: 'cars/rollsroyce.png', cost: 110_000, payout: 127_000, seconds: 6 * h, need: 50 },
    { id: 'chiron', name: 'Bugatti Chiron', image: 'cars/chiron.png', cost: 350_000, payout: 410_000, seconds: 8 * h, need: 65 },
  ],
};

/** Kapasitet: start, maks, og prisen for hver ekstra plass (internt). */
export const ORDER_CAPACITY: Record<OrdersKind, { start: number; prices: number[] }> = {
  // $ 15 000 → $ 10 M
  construction: { start: 1, prices: [1_500, 7_500, 40_000, 200_000, 1_000_000] },
  // $ 20 000 → $ 2,5 M
  dealer: { start: 2, prices: [2_000, 10_000, 50_000, 250_000] },
};

export const ORDERS_TEXT: Record<
  OrdersKind,
  { capacity: string; addCapacity: string; available: string; active: string; done: string; empty: string; start: string; payout: string; auto: string; finished: string }
> = {
  construction: {
    capacity: 'Arbeidslag',
    addCapacity: '+1 arbeidslag',
    available: 'Prosjekter',
    active: 'Pågående byggeprosjekter',
    done: 'Ferdige prosjekter',
    empty: 'Ingen byggeprosjekter pågår. Velg et prosjekt under.',
    start: 'Start',
    payout: 'Kontraktssum',
    auto: 'Start samme prosjekt på nytt automatisk',
    finished: 'ferdig bygget',
  },
  dealer: {
    capacity: 'Plasser i bilhallen',
    addCapacity: '+1 plass',
    available: 'Kjøp inn biler',
    active: 'Biler til salgs',
    done: 'Solgte biler',
    empty: 'Bilhallen er tom. Kjøp inn en bil under.',
    start: 'Kjøp inn',
    payout: 'Salgspris',
    auto: 'Kjøp inn samme bil på nytt automatisk',
    finished: 'solgt',
  },
};

export const isOrdersType = (typeId: string): typeId is OrdersKind => typeId in ORDERS;
export const orderKindOf = (b: Business) => b.type as OrdersKind;
export const orderDefs = (b: Business): OrderDef[] => ORDERS[orderKindOf(b)] ?? [];
export const orderDef = (b: Business, id: string) => orderDefs(b).find((o) => o.id === id) ?? orderDefs(b)[0];
export const ordersOf = (b: Business): ActiveOrder[] => (b.orders ??= []);
export const orderCapacity = (b: Business) => b.capacity ?? ORDER_CAPACITY[orderKindOf(b)].start;
export const doneCount = (b: Business) => b.done ?? 0;

/** Pris for neste kapasitet, eller null hvis maks. */
export function nextCapacityPrice(b: Business): number | null {
  const cfg = ORDER_CAPACITY[orderKindOf(b)];
  return cfg.prices[orderCapacity(b) - cfg.start] ?? null;
}

/** Forventet fortjeneste per time fra oppdragene som pågår (før skatt). */
export function ordersIncome(b: Business): number {
  return ordersOf(b).reduce((sum, o) => {
    const d = orderDef(b, o.item);
    return sum + (d.payout - d.cost) / (d.seconds / 3600);
  }, 0);
}

/** Penger som er bundet i oppdrag som pågår (teller med i formuen). */
export const ordersTiedUp = (b: Business) => ordersOf(b).reduce((sum, o) => sum + orderDef(b, o.item).cost, 0);

export type OrderResult = 'ok' | 'money' | 'full' | 'locked';

export function startOrder(state: GameState, b: Business, itemId: string, now = Date.now()): OrderResult {
  const d = orderDefs(b).find((o) => o.id === itemId);
  if (!d || doneCount(b) < d.need) return 'locked';
  if (ordersOf(b).length >= orderCapacity(b)) return 'full';
  if (state.balance < d.cost) return 'money';
  state.balance -= d.cost;
  ordersOf(b).push({ id: `o${now.toString(36)}${Math.floor(Math.random() * 1e4)}`, item: d.id, start: now, end: now + d.seconds * 1000 });
  return 'ok';
}

export function buyOrderCapacity(state: GameState, b: Business): boolean {
  const price = nextCapacityPrice(b);
  if (price === null || state.balance < price) return false;
  state.balance -= price;
  b.invested += price;
  b.capacity = orderCapacity(b) + 1;
  return true;
}

/**
 * Gjør ferdig oppdrag som er ferdige før `now`. `pay(cost, profit)` betaler ut.
 * Med "automatisk" startes samme oppdrag igjen fra det øyeblikket det forrige ble ferdig,
 * så det fortsetter også mens appen er lukket.
 */
export function tickOrders(state: GameState, b: Business, now: number, pay: (cost: number, profit: number) => void) {
  const list = ordersOf(b);
  // Maks antall runder, så en veldig lang pause ikke fryser spillet
  for (let guard = 0; guard < 5000; guard++) {
    let first: ActiveOrder | null = null;
    for (const o of list) if (o.end <= now && (!first || o.end < first.end)) first = o;
    if (!first) return;
    const d = orderDef(b, first.item);
    list.splice(list.indexOf(first), 1);
    pay(d.cost, d.payout - d.cost);
    b.done = doneCount(b) + 1;
    if (b.auto && state.balance >= d.cost) {
      state.balance -= d.cost;
      list.push({ id: `o${first.end.toString(36)}${Math.floor(Math.random() * 1e4)}`, item: d.id, start: first.end, end: first.end + d.seconds * 1000 });
    }
  }
}
