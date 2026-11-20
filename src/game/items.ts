import { MONEY_SCALE } from '../ui/format';

/*
 * EIENDELER: biler, fly og yachter man kan kjøpe for moro skyld (de gir ingen inntekt).
 *
 * KJØP: hver ting har en grunnpris. Valgene legger på en prosent av grunnprisen:
 *   Bil:   motor DF / BST (+15 %) / S+ (+35 %), utstyr Standard / Premium (+40 %)  → maks +75 %
 *   Fly:   team (+10 %), design Premium (+25 %)
 *   Yacht: team (+15 %), design Premium (+30 %), og en plassering (et sted man eier)
 * SALG: bil 67 %, fly og yacht 70 % av det man betalte. Kjøper man den igjen, koster den det samme som før.
 * PLASSERINGER (yachter): den første (offentlig havn) er gratis. De andre kjøpes én gang
 *   og kan brukes av alle yachtene man eier, også de man kjøper senere.
 *
 * Prisene under er slik de VISES. Spillet lagrer 1/10 (se MONEY_SCALE i ui/format.ts).
 * Bilder: public/items/<type>/<id>.png (pngimg.com, se public/items/KILDER.txt), noen gjenbrukt
 * fra bilforhandleren (public/dealer), taxiene (public/cars) og flyselskapet (public/airline).
 */

export type ItemKind = 'car' | 'plane' | 'yacht';
/** Fargene på bilene (billigst → dyrest). */
export type CarTier = 'grey' | 'sky' | 'navy' | 'purple' | 'red' | 'gold';

export interface ItemDef {
  id: string;
  kind: ItemKind;
  name: string;
  /** Grunnpris (intern verdi). */
  price: number;
  image: string;
  /** Bildet speilvendes så alle peker samme vei. */
  flip?: boolean;
  tier?: CarTier;
}

const shown = (display: number) => display / MONEY_SCALE;

const car = (id: string, name: string, tier: CarTier, display: number, dir = 'items/cars/', flip = false): ItemDef => ({
  id,
  kind: 'car',
  name,
  price: shown(display),
  image: `${dir}${id}.png`,
  flip,
  tier,
});
const plane = (id: string, name: string, display: number, flip = false, image = `items/planes/${id}.png`): ItemDef => ({
  id,
  kind: 'plane',
  name,
  price: shown(display),
  image,
  flip,
});
const yacht = (id: string, name: string, display: number, flip = false): ItemDef => ({
  id,
  kind: 'yacht',
  name,
  price: shown(display),
  image: `items/yachts/${id}.png`,
  flip,
});

// Grå 20 · lyseblå 20 · mørkeblå 20 · lilla 15 · rød 10 · gul 5
export const CARS: ItemDef[] = [
  car('granta', 'Lada Granta', 'grey', 2_250, 'cars/'),
  car('logan', 'Renault Logan', 'grey', 2_500, 'cars/', true),
  car('solaris', 'Hyundai Solaris', 'grey', 2_750, 'cars/'),
  car('picanto', 'Kia Picanto', 'grey', 3_000, 'dealer/'),
  car('rio', 'Kia Rio', 'grey', 3_300, 'dealer/', true),
  car('fiesta', 'Ford Fiesta', 'grey', 3_650, 'dealer/', true),
  car('duster', 'Renault Duster', 'grey', 4_000, 'dealer/'),
  car('polo', 'Volkswagen Polo', 'grey', 4_400, 'dealer/'),
  car('corsa', 'Opel Corsa', 'grey', 4_850, 'dealer/', true),
  car('yaris', 'Toyota Yaris', 'grey', 5_350, 'dealer/'),
  car('clio', 'Renault Clio', 'grey', 5_900, 'dealer/', true),
  car('cruze', 'Chevrolet Cruze', 'grey', 6_500, 'dealer/'),
  car('focus', 'Ford Focus', 'grey', 7_150, 'dealer/'),
  car('captur', 'Renault Captur', 'grey', 7_850, 'dealer/'),
  car('astra', 'Opel Astra', 'grey', 8_650, 'dealer/'),
  car('juke', 'Nissan Juke', 'grey', 9_550, 'dealer/'),
  car('corolla', 'Toyota Corolla', 'grey', 10_500, 'dealer/'),
  car('beetle', 'Volkswagen Beetle', 'grey', 11_500, 'dealer/', true),
  car('elantra', 'Hyundai Elantra', 'grey', 12_750, 'cars/'),
  car('jetta', 'Volkswagen Jetta', 'grey', 14_000, 'cars/'),
  car('octavia', 'Škoda Octavia', 'sky', 15_650, 'cars/', true),
  car('golf', 'Volkswagen Golf', 'sky', 16_500, 'dealer/', true),
  car('civic', 'Honda Civic', 'sky', 17_750),
  car('qashqai', 'Nissan Qashqai', 'sky', 18_750, 'dealer/'),
  car('sportage', 'Kia Sportage', 'sky', 20_000, 'dealer/'),
  car('kuga', 'Ford Kuga', 'sky', 21_250, 'dealer/'),
  car('cx5', 'Mazda CX-5', 'sky', 22_500, 'items/cars/', true),
  car('crv', 'Honda CR-V', 'sky', 23_750),
  car('rav4', 'Toyota RAV4', 'sky', 25_250, 'dealer/'),
  car('tiguan', 'Volkswagen Tiguan', 'sky', 26_750, 'dealer/'),
  car('camry', 'Toyota Camry', 'sky', 28_500, 'cars/'),
  car('passat', 'Volkswagen Passat', 'sky', 30_250, 'cars/'),
  car('sonata', 'Hyundai Sonata', 'sky', 32_250, 'cars/'),
  car('mx5', 'Mazda MX-5', 'sky', 34_250, 'items/cars/', true),
  car('wrangler', 'Jeep Wrangler', 'sky', 36_250),
  car('camaro', 'Chevrolet Camaro', 'sky', 38_500, 'dealer/', true),
  car('mustang', 'Ford Mustang', 'sky', 41_000, 'dealer/'),
  car('grandcherokee', 'Jeep Grand Cherokee', 'sky', 43_500),
  car('xc60', 'Volvo XC60', 'sky', 46_250),
  car('xc90', 'Volvo XC90', 'sky', 49_000),
  car('a6', 'Audi A6', 'navy', 50_000, 'cars/'),
  car('bmw5', 'BMW 5-serie', 'navy', 53_000, 'cars/'),
  car('eclass', 'Mercedes-Benz E-klasse', 'navy', 56_250, 'cars/'),
  car('defender', 'Land Rover Defender', 'navy', 59_750, 'dealer/', true),
  car('q7', 'Audi Q7', 'navy', 63_500, 'dealer/'),
  car('cayman', 'Porsche 718 Cayman', 'navy', 67_250, 'dealer/'),
  car('x5', 'BMW X5', 'navy', 71_500, 'dealer/'),
  car('ghibli', 'Maserati Ghibli', 'navy', 75_750, 'dealer/'),
  car('levante', 'Maserati Levante', 'navy', 80_500, 'dealer/'),
  car('cayenne', 'Porsche Cayenne', 'navy', 85_500, 'dealer/'),
  car('amggt', 'Mercedes-AMG GT', 'navy', 90_750),
  car('panamera', 'Porsche Panamera', 'navy', 96_250, 'dealer/'),
  car('rangerover', 'Range Rover', 'navy', 102_000, 'dealer/'),
  car('vantage', 'Aston Martin V8 Vantage', 'navy', 108_000, 'items/cars/', true),
  car('p911', 'Porsche 911', 'navy', 115_000, 'dealer/'),
  car('a8', 'Audi A8', 'navy', 122_000, 'cars/'),
  car('bmw7', 'BMW 7-serie', 'navy', 130_000, 'cars/'),
  car('gclass', 'Mercedes-Benz G-klasse', 'navy', 138_000, 'dealer/'),
  car('sclass', 'Mercedes-Benz S-klasse', 'navy', 146_000, 'cars/'),
  car('r8', 'Audi R8', 'navy', 155_000, 'dealer/', true),
  car('db11', 'Aston Martin DB11', 'purple', 165_000, 'dealer/'),
  car('urus', 'Lamborghini Urus', 'purple', 182_000, 'dealer/'),
  car('continental', 'Bentley Continental GT', 'purple', 200_000, 'dealer/'),
  car('huracan', 'Lamborghini Huracán', 'purple', 220_000, 'dealer/'),
  car('f488', 'Ferrari 488 GTB', 'purple', 242_000, 'dealer/'),
  car('mc720s', 'McLaren 720S', 'purple', 266_000, 'dealer/', true),
  car('maybach', 'Mercedes-Maybach S-klasse', 'purple', 292_000, 'cars/'),
  car('f12', 'Ferrari F12berlinetta', 'purple', 322_000, 'items/cars/', true),
  car('vanquish', 'Aston Martin Vanquish', 'purple', 354_000),
  car('wraith', 'Rolls-Royce Wraith', 'purple', 389_000),
  car('ghost', 'Rolls-Royce Ghost', 'purple', 428_000, 'dealer/'),
  car('mc675lt', 'McLaren 675LT', 'purple', 471_000, 'items/cars/'),
  car('f812', 'Ferrari 812 Superfast', 'purple', 518_000, 'dealer/', true),
  car('phantom', 'Rolls-Royce Phantom', 'purple', 570_000, 'dealer/'),
  car('aventador', 'Lamborghini Aventador', 'purple', 626_600, 'dealer/'),
  car('p1', 'McLaren P1', 'red', 1_000_000, 'dealer/'),
  car('p918', 'Porsche 918 Spyder', 'red', 1_500_000),
  car('veyron', 'Bugatti Veyron', 'red', 1_900_000, 'dealer/', true),
  car('regera', 'Koenigsegg Regera', 'red', 2_500_000),
  car('agerars', 'Koenigsegg Agera RS', 'red', 2_800_000, 'items/cars/', true),
  car('enzo', 'Ferrari Enzo', 'red', 3_200_000),
  car('chiron', 'Bugatti Chiron', 'red', 3_300_000, 'dealer/'),
  car('laferrari', 'Ferrari LaFerrari', 'red', 3_800_000, 'dealer/'),
  car('zonda', 'Pagani Zonda Cinque', 'red', 8_000_000),
  car('f1gtr', 'McLaren F1 GTR', 'red', 13_500_000, 'items/cars/', true),
  car('veneno', 'Lamborghini Veneno', 'gold', 19_000_000),
  car('visiongt', 'Bugatti Vision Gran Turismo', 'gold', 22_000_000),
  car('mb540k', 'Mercedes-Benz 540K Autobahn-Kurier', 'gold', 28_000_000),
  car('royale', 'Bugatti Type 41 Royale', 'gold', 38_000_000, 'items/cars/', true),
  car('silverghost', 'Rolls-Royce Silver Ghost', 'gold', 50_000_000),
];

export const PLANES: ItemDef[] = [
  plane('cessna150', 'Cessna 150', 45_000, true),
  plane('r44', 'Robinson R44', 500_000),
  plane('bell206', 'Bell 206 JetRanger', 1_200_000, true),
  plane('h130', 'Airbus H130', 3_200_000),
  plane('aw109', 'AgustaWestland AW109', 6_500_000, true),
  plane('s76', 'Sikorsky S-76', 12_000_000, true),
  plane('aw139', 'AgustaWestland AW139', 14_500_000, true),
  plane('challenger850', 'Bombardier Challenger 850', 26_000_000, true),
  plane('legacy600', 'Embraer Legacy 600', 30_000_000, false, 'airline/small.png'),
  plane('falcon7x', 'Dassault Falcon 7X', 54_000_000, true),
  plane('bbj', 'Boeing Business Jet', 95_000_000),
  plane('acj320', 'Airbus ACJ320neo', 110_000_000, false, 'airline/medium.png'),
  plane('b787', 'Boeing 787 BBJ', 250_000_000, true),
  plane('b747', 'Boeing 747-8 BBJ', 400_000_000),
  plane('a380', 'Airbus A380', 520_000_000, false, 'airline/xlarge.png'),
];

export const YACHTS: ItemDef[] = [
  yacht('predator74', 'Sunseeker Predator 74', 20_500_000),
  yacht('y95', 'Princess Y95', 48_000_000),
  yacht('pershing140', 'Pershing 140', 95_000_000),
  yacht('sanlorenzo52', 'Sanlorenzo 52Steel', 210_000_000, true),
  yacht('oasis40', 'Benetti Oasis 40M', 480_000_000),
  yacht('seaxplorer77', 'Damen SeaXplorer 77', 1_100_000_000),
  yacht('symphony', 'Feadship Symphony', 2_600_000_000),
  yacht('dilbar', 'Lürssen Dilbar', 6_000_000_000),
  yacht('azzam', 'Lürssen Azzam', 14_000_000_000),
  yacht('historysupreme', 'History Supreme', 27_500_000_000),
  yacht('streetsofmonaco', 'Streets of Monaco', 45_000_000_000, true),
];

export const ALL_ITEMS = [...CARS, ...PLANES, ...YACHTS];
export const itemsOfKind = (kind: ItemKind) => (kind === 'car' ? CARS : kind === 'plane' ? PLANES : YACHTS);
export const itemDef = (id: string) => ALL_ITEMS.find((d) => d.id === id);

// --- Valg ved kjøp -------------------------------------------------------------------------
export interface OptionDef {
  label: string;
  /** Det som vises på eiendelen etterpå (f.eks. "S+", "Team"). */
  short: string;
  /** Tillegg i prosent av grunnprisen. */
  pct: number;
}
export interface OptionGroup {
  title: string;
  /** Liten tekst under valget på siden til en eiendel man eier (f.eks. "Motor"). */
  caption: string;
  options: OptionDef[];
}

export const OPTIONS: Record<ItemKind, [OptionGroup, OptionGroup]> = {
  car: [
    {
      title: 'Motor',
      caption: 'Motor',
      options: [
        { label: 'DF', short: 'DF', pct: 0 },
        { label: 'BST', short: 'BST', pct: 15 },
        { label: 'S+', short: 'S+', pct: 35 },
      ],
    },
    {
      title: 'Utstyr',
      caption: 'Utstyr',
      options: [
        { label: 'Standard', short: 'Standard', pct: 0 },
        { label: 'Premium', short: 'Premium', pct: 40 },
      ],
    },
  ],
  plane: [
    {
      title: 'Pilot, kabinpersonale og mekanikere',
      caption: 'Mannskap',
      options: [
        { label: 'Uten team', short: 'Uten team', pct: 0 },
        { label: 'Ansett et team', short: 'Team', pct: 10 },
      ],
    },
    {
      title: 'Design',
      caption: 'Design',
      options: [
        { label: 'Standard', short: 'Standard', pct: 0 },
        { label: 'Premium', short: 'Premium', pct: 25 },
      ],
    },
  ],
  yacht: [
    {
      title: 'Kaptein og mannskap',
      caption: 'Mannskap',
      options: [
        { label: 'Uten team', short: 'Uten team', pct: 0 },
        { label: 'Ansett et team', short: 'Team', pct: 15 },
      ],
    },
    {
      title: 'Design',
      caption: 'Design',
      options: [
        { label: 'Standard', short: 'Standard', pct: 0 },
        { label: 'Premium', short: 'Premium', pct: 30 },
      ],
    },
  ],
};

/** Hvor mye man får igjen når man selger (andel av det man betalte). */
export const SELL_SHARE: Record<ItemKind, number> = { car: 0.67, plane: 0.7, yacht: 0.7 };

export function priceWith(def: ItemDef, a: number, b: number): number {
  const [ga, gb] = OPTIONS[def.kind];
  const pct = (ga.options[a]?.pct ?? 0) + (gb.options[b]?.pct ?? 0);
  return def.price * (1 + pct / 100);
}

// --- Plasseringer for yachter ----------------------------------------------------------------
export interface PlaceDef {
  id: string;
  name: string;
  where: string;
  price: number;
}
const place = (id: string, name: string, where: string, display: number): PlaceDef => ({ id, name, where, price: shown(display) });

/** Bildene ligger i public/items/places/<id>.jpg (mangler et bilde, vises en havfarge). */
export const PLACES: PlaceDef[] = [
  place('public', 'Offentlig havn', 'Monaco', 0),
  place('portocervo', 'Porto Cervo', 'Sardinia, Italia', 5_000_000),
  place('sttropez', 'Saint-Tropez', 'Frankrike', 15_000_000),
  place('portofino', 'Portofino', 'Italia', 40_000_000),
  place('ferradura', 'Cala Comte', 'Ibiza, Spania', 120_000_000),
  place('pipecay', 'Big Major Cay', 'Exuma, Bahamas', 300_000_000),
  place('cayechapel', 'Caye Caulker', 'Belize', 750_000_000),
  place('necker', 'Virgin Gorda', 'De britiske Jomfruøyer', 2_000_000_000),
];
export const placeDef = (id: string) => PLACES.find((p) => p.id === id) ?? PLACES[0];

// --- Det man eier ----------------------------------------------------------------------------
export interface OwnedItem {
  /** Unik id (man kan eie flere av samme modell). */
  uid: string;
  id: string;
  /** Valgt alternativ i første og andre gruppe (indeks). */
  a: number;
  b: number;
  /** Det man betalte (intern verdi). */
  paid: number;
  /** Bare yachter: hvor den ligger. */
  place?: string;
  /** Når den ble kjøpt (ms). */
  at: number;
}

export interface ItemsState {
  items: OwnedItem[];
  /** Plasseringene man har kjøpt (offentlig havn eier alle). */
  places: string[];
}

export const ownsPlace = (s: ItemsState, id: string) => id === 'public' || s.places.includes(id);
export const ownedOfKind = (s: ItemsState, kind: ItemKind) => s.items.filter((o) => itemDef(o.id)?.kind === kind);
export const saleValue = (o: OwnedItem) => o.paid * SELL_SHARE[itemDef(o.id)?.kind ?? 'car'];
/** Hva eiendelene er verdt (det man får ved å selge, og 70 % av plasseringene). */
export const itemsValue = (s: ItemsState) =>
  s.items.reduce((sum, o) => sum + saleValue(o), 0) + s.places.reduce((sum, id) => sum + placeDef(id).price * 0.7, 0);

// --- Handlinger (endrer saldoen direkte) -----------------------------------------------------------
export interface Wallet {
  balance: number;
}

export function buyItem(w: Wallet, s: ItemsState, id: string, a: number, b: number, placeId = 'public'): OwnedItem | null {
  const def = itemDef(id);
  if (!def) return null;
  const price = priceWith(def, a, b);
  if (w.balance < price) return null;
  if (def.kind === 'yacht' && !ownsPlace(s, placeId)) return null;
  w.balance -= price;
  const item: OwnedItem = {
    uid: `${id}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    id,
    a,
    b,
    paid: price,
    place: def.kind === 'yacht' ? placeId : undefined,
    at: Date.now(),
  };
  s.items.push(item);
  return item;
}

/** Selger en eiendel. Returnerer hva man fikk (0 hvis den ikke finnes). */
export function sellItem(w: Wallet, s: ItemsState, uid: string): number {
  const item = s.items.find((o) => o.uid === uid);
  if (!item) return 0;
  const value = saleValue(item);
  s.items = s.items.filter((o) => o !== item);
  w.balance += value;
  return value;
}

export function buyPlace(w: Wallet, s: ItemsState, id: string): boolean {
  const p = PLACES.find((x) => x.id === id);
  if (!p || ownsPlace(s, id) || w.balance < p.price) return false;
  w.balance -= p.price;
  s.places.push(id);
  return true;
}

export function movePlace(s: ItemsState, uid: string, placeId: string): boolean {
  const item = s.items.find((o) => o.uid === uid);
  if (!item || !ownsPlace(s, placeId)) return false;
  item.place = placeId;
  return true;
}
