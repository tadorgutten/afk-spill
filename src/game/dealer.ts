import type { Business } from './business';

/*
 * BILFORHANDLER
 * -------------
 * Kjøp brukte biler billig, reparer dem på verkstedet og selg dem i bilutstillingen.
 *
 * - BRUKTBILMARKEDET har 100 biler fra segmentet forhandleren er spesialisert i.
 *   Lista lages helt på nytt hver hele time. Kjøper man en bil, kommer én ny bil inn i stedet.
 * - Hver bil har 6 DELER (motor, girkasse, understell, karosseri, elektrisk anlegg, interiør).
 *   Hver del har en skade målt i minutter: 0 = helt fin, maks = må fikses helt fra bunnen.
 *   Reparasjonen tar like mange minutter som skaden.
 * - I markedet ser man ikke den ekte tilstanden, bare et SPENN der den ekte verdien ligger.
 *   Hvor bredt spennet er, kommer an på ferdighetene (65 % treffsikkerhet i starten).
 *   En DIAGNOSE (6 % av bilprisen) gir 86 % treffsikkerhet. Kjøper man bilen, ser man alt.
 *   Prisen bygger på det man ser – så man kan gjøre et kupp eller bli lurt.
 * - VERKSTEDET har plasser (starter på 5). Bilen står der til den settes ut for salg.
 * - UTSTILLINGEN har plasser (starter på 5). En bil til salgs blir solgt etter en tilfeldig tid
 *   mellom 30 sekunder og 8 timer, for markedsverdien (minus 5 % skatt).
 * - Markedsverdi = bilens verdi × (tilstand)². En helt fin bil er verdt full verdi.
 *
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const DEALER_TYPE = 'car-dealer';
export const isDealerType = (typeId: string) => typeId === DEALER_TYPE;

// --- Bildeler ---------------------------------------------------------------------------
export type PartId = 'engine' | 'transmission' | 'chassis' | 'body' | 'electrics' | 'interior';

export interface PartDef {
  id: PartId;
  name: string;
  /** Lengste reparasjonstid (minutter) = skaden når delen er helt ødelagt. */
  maxMin: number;
  /** Hvor mye delen betyr for bilens tilstand og verdi (summen er 1). */
  weight: number;
}

export const PARTS: PartDef[] = [
  { id: 'engine', name: 'Motor', maxMin: 30, weight: 0.25 },
  { id: 'transmission', name: 'Girkasse', maxMin: 30, weight: 0.2 },
  { id: 'chassis', name: 'Understell', maxMin: 20, weight: 0.15 },
  { id: 'body', name: 'Karosseri', maxMin: 20, weight: 0.15 },
  { id: 'electrics', name: 'Elektrisk anlegg', maxMin: 20, weight: 0.15 },
  { id: 'interior', name: 'Interiør', maxMin: 10, weight: 0.1 },
];

/** Skade per del (minutter), i samme rekkefølge som PARTS. */
export type Damage = number[];

// --- Segmenter og bilmodeller -----------------------------------------------------------
export type SegmentId = 'mass' | 'luxury' | 'premium';

export const SEGMENTS: { id: SegmentId; name: string; examples: string; bar: [string, string] }[] = [
  { id: 'mass', name: 'Folkebiler', examples: 'Volkswagen Golf, Renault Clio, Toyota Corolla osv.', bar: ['#b9bfc6', '#4f95d8'] },
  { id: 'luxury', name: 'Luksus- og sportsbiler', examples: 'Audi A6, Porsche 911, Mercedes-Benz G-klasse osv.', bar: ['#4a6fe0', '#6c56d6'] },
  { id: 'premium', name: 'Premiumbiler', examples: 'Ferrari 812 Superfast, Rolls-Royce Phantom, Bugatti Chiron osv.', bar: ['#ec5b55', '#f2c14e'] },
];
export const segmentById = (id: SegmentId) => SEGMENTS.find((s) => s.id === id) ?? SEGMENTS[0];

export interface DealerModel {
  id: string;
  name: string;
  segment: SegmentId;
  /** Verdien når bilen er helt fin (vises 10x høyere). */
  value: number;
  image: string;
}

const car = (id: string, name: string, segment: SegmentId, value: number, image = `dealer/${id}.png`): DealerModel => ({ id, name, segment, value, image });
const taxiCar = (id: string, name: string, segment: SegmentId, value: number) => car(id, name, segment, value, `cars/${id}.png`);

export const DEALER_MODELS: DealerModel[] = [
  // Folkebiler (30) – snitt ca. $ 22 950
  taxiCar('granta', 'Lada Granta', 'mass', 945),
  taxiCar('logan', 'Renault Logan', 'mass', 1260),
  car('picanto', 'Kia Picanto', 'mass', 1365),
  taxiCar('solaris', 'Hyundai Solaris', 'mass', 1475),
  car('rio', 'Kia Rio', 'mass', 1685),
  car('fiesta', 'Ford Fiesta', 'mass', 1790),
  car('duster', 'Renault Duster', 'mass', 1840),
  car('polo', 'Volkswagen Polo', 'mass', 1895),
  car('corsa', 'Opel Corsa', 'mass', 1895),
  car('yaris', 'Toyota Yaris', 'mass', 1945),
  car('clio', 'Renault Clio', 'mass', 2000),
  car('cruze', 'Chevrolet Cruze', 'mass', 2105),
  taxiCar('elantra', 'Hyundai Elantra', 'mass', 2210),
  car('focus', 'Ford Focus', 'mass', 2315),
  car('captur', 'Renault Captur', 'mass', 2315),
  car('astra', 'Opel Astra', 'mass', 2365),
  taxiCar('jetta', 'Volkswagen Jetta', 'mass', 2420),
  car('juke', 'Nissan Juke', 'mass', 2420),
  car('corolla', 'Toyota Corolla', 'mass', 2470),
  taxiCar('octavia', 'Škoda Octavia', 'mass', 2525),
  car('beetle', 'Volkswagen Beetle', 'mass', 2525),
  car('golf', 'Volkswagen Golf', 'mass', 2630),
  taxiCar('sonata', 'Hyundai Sonata', 'mass', 2840),
  car('qashqai', 'Nissan Qashqai', 'mass', 2945),
  car('sportage', 'Kia Sportage', 'mass', 3000),
  taxiCar('camry', 'Toyota Camry', 'mass', 3050),
  car('kuga', 'Ford Kuga', 'mass', 3050),
  car('rav4', 'Toyota RAV4', 'mass', 3155),
  taxiCar('passat', 'Volkswagen Passat', 'mass', 3155),
  car('tiguan', 'Volkswagen Tiguan', 'mass', 3260),
  // Luksus- og sportsbiler (20) – snitt ca. $ 177 480
  car('camaro', 'Chevrolet Camaro', 'luxury', 8455),
  car('mustang', 'Ford Mustang', 'luxury', 9305),
  taxiCar('a6', 'Audi A6', 'luxury', 11000),
  taxiCar('bmw5', 'BMW 5-serie', 'luxury', 11500),
  taxiCar('eclass', 'Mercedes-Benz E-klasse', 'luxury', 11850),
  car('defender', 'Land Rover Defender', 'luxury', 12700),
  car('q7', 'Audi Q7', 'luxury', 13550),
  car('cayman', 'Porsche 718 Cayman', 'luxury', 14400),
  car('x5', 'BMW X5', 'luxury', 14400),
  car('ghibli', 'Maserati Ghibli', 'luxury', 15200),
  car('levante', 'Maserati Levante', 'luxury', 16050),
  car('cayenne', 'Porsche Cayenne', 'luxury', 18600),
  taxiCar('a8', 'Audi A8', 'luxury', 19450),
  taxiCar('bmw7', 'BMW 7-serie', 'luxury', 20300),
  car('panamera', 'Porsche Panamera', 'luxury', 21150),
  taxiCar('sclass', 'Mercedes-Benz S-klasse', 'luxury', 22000),
  car('rangerover', 'Range Rover', 'luxury', 23700),
  car('p911', 'Porsche 911', 'luxury', 27050),
  car('gclass', 'Mercedes-Benz G-klasse', 'luxury', 30450),
  car('r8', 'Audi R8', 'luxury', 33850),
  // Premiumbiler (15) – snitt ca. $ 8,3 M
  car('db11', 'Aston Martin DB11', 'premium', 206000),
  car('urus', 'Lamborghini Urus', 'premium', 215500),
  car('continental', 'Bentley Continental GT', 'premium', 234000),
  car('huracan', 'Lamborghini Huracán', 'premium', 243500),
  car('f488', 'Ferrari 488 GTB', 'premium', 262500),
  car('mc720s', 'McLaren 720S', 'premium', 281000),
  taxiCar('maybach', 'Mercedes-Maybach S-klasse', 'premium', 300000),
  car('ghost', 'Rolls-Royce Ghost', 'premium', 328000),
  car('f812', 'Ferrari 812 Superfast', 'premium', 375000),
  car('phantom', 'Rolls-Royce Phantom', 'premium', 468500),
  car('aventador', 'Lamborghini Aventador', 'premium', 468500),
  car('p1', 'McLaren P1', 'premium', 1124500),
  car('veyron', 'Bugatti Veyron', 'premium', 1874000),
  car('laferrari', 'Ferrari LaFerrari', 'premium', 2811000),
  car('chiron', 'Bugatti Chiron', 'premium', 3279500),
];

export const dealerModel = (id: string) => DEALER_MODELS.find((m) => m.id === id) ?? DEALER_MODELS[0];
export const modelsIn = (segment: SegmentId) => DEALER_MODELS.filter((m) => m.segment === segment);
export const averageValue = (segment: SegmentId) => {
  const list = modelsIn(segment);
  return list.reduce((sum, m) => sum + m.value, 0) / list.length;
};

// --- Innstillinger ----------------------------------------------------------------------
/** Biler i bruktbilmarkedet. */
export const MARKET_SIZE = 100;
/** Diagnosen koster så stor andel av bilprisen. */
export const DIAG_SHARE = 0.06;
/** Treffsikkerheten til diagnosen. */
export const DIAG_ACCURACY = 0.86;
/** Reparasjon av en helt ødelagt del koster så stor andel av (bilens verdi × delens vekt). */
const REPAIR_SHARE = 0.7;
/** Det tar så lang tid å bytte spesialisering. */
export const SEGMENT_CHANGE_MS = 15 * 60_000;
/** En bil i utstillingen blir solgt etter en tilfeldig tid mellom disse. */
const SELL_MIN_MS = 30_000;
const SELL_MAX_MS = 8 * 3_600_000;
export const START_PLACES = 5;

export interface ExpansionOption {
  name: string;
  places: number;
  price: number;
  seconds: number;
}

/** Utvidelser av verkstedet og utstillingen (vises 10x høyere: $ 30 000 osv.). */
export const EXPANSIONS: Record<'service' | 'showroom', ExpansionOption[]> = {
  service: [
    { name: 'Lite verksted', places: 5, price: 3_000, seconds: 15 * 60 },
    { name: 'Mellomstort verksted', places: 10, price: 12_000, seconds: 30 * 60 },
    { name: 'Stort verksted', places: 40, price: 130_000, seconds: 60 * 60 },
  ],
  showroom: [
    { name: 'Liten bilutstilling', places: 5, price: 2_000, seconds: 15 * 60 },
    { name: 'Mellomstor bilutstilling', places: 10, price: 8_000, seconds: 30 * 60 },
    { name: 'Stor bilutstilling', places: 40, price: 100_000, seconds: 60 * 60 },
  ],
};

/** Ferdigheter: antall reparasjoner av en del som trengs for hvert nivå, og treffsikkerheten. */
const SKILL_LEVELS = [0, 5, 15, 30, 50, 80];
const SKILL_ACCURACY = [0.65, 0.7, 0.75, 0.8, 0.85, 0.9];

// --- Lagring ----------------------------------------------------------------------------
export interface MarketCar {
  id: string;
  model: string;
  /** Den ekte skaden (vises ikke før man kjøper bilen). */
  damage: Damage;
  /** Spennet man ser for hver del (tilstand 0–1). */
  lo: number[];
  hi: number[];
  /** Diagnose er kjøpt. */
  diag: boolean;
  /** Pris (bygger på det man ser, ikke den ekte tilstanden). */
  price: number;
}

export interface DealerCar {
  id: string;
  model: string;
  damage: Damage;
  /** Hva bilen kostet. */
  paid: number;
  /** Hva som er brukt på reparasjoner. */
  repaired: number;
  /** Reparasjon som pågår: delene og når den er ferdig. */
  repair: { parts: PartId[]; end: number; start: number } | null;
  /** Til salgs i utstillingen: pris og når den blir solgt. */
  forSale: { price: number; sellAt: number } | null;
}

export interface DealerState {
  segment: SegmentId;
  segmentChange: { to: SegmentId; end: number } | null;
  service: number;
  showroom: number;
  serviceExp: { places: number; end: number } | null;
  showroomExp: { places: number; end: number } | null;
  cars: DealerCar[];
  /** Antall reparasjoner per del (ferdigheter). */
  skills: Record<PartId, number>;
  market: { hour: number; segment: SegmentId; cars: MarketCar[] } | null;
}

export function newDealer(): DealerState {
  return {
    segment: 'mass',
    segmentChange: null,
    service: START_PLACES,
    showroom: START_PLACES,
    serviceExp: null,
    showroomExp: null,
    cars: [],
    skills: { engine: 0, transmission: 0, chassis: 0, body: 0, electrics: 0, interior: 0 },
    market: null,
  };
}

export const dealerOf = (b: Business): DealerState => (b.dealer ??= newDealer());

// --- Tilstand og verdi --------------------------------------------------------------------
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const round3 = (x: number) => Math.round(x * 1000) / 1000; // hele cent når det vises
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Tilstanden til én del (0 = ødelagt, 1 = helt fin). */
export const partCondition = (damage: Damage, i: number) => 1 - damage[i] / PARTS[i].maxMin;

/** Samlet tilstand (vektet snitt av delene). */
export const condition = (damage: Damage) => PARTS.reduce((sum, p, i) => sum + p.weight * partCondition(damage, i), 0);

/** Hva bilen er verdt nå. */
export const marketValue = (modelId: string, damage: Damage) => round3(dealerModel(modelId).value * condition(damage) ** 2);

/** Pris for å reparere én del. */
export const partRepairCost = (modelId: string, damage: Damage, i: number) =>
  round3(dealerModel(modelId).value * PARTS[i].weight * (damage[i] / PARTS[i].maxMin) * REPAIR_SHARE);

export const repairCost = (c: DealerCar, parts: PartId[]) =>
  parts.reduce((sum, id) => sum + partRepairCost(c.model, c.damage, partIndex(id)), 0);
export const repairMinutes = (c: DealerCar, parts: PartId[]) => parts.reduce((sum, id) => sum + c.damage[partIndex(id)], 0);
export const partIndex = (id: PartId) => PARTS.findIndex((p) => p.id === id);

/** Treffsikkerheten for en del (ut fra hvor mange slike reparasjoner man har gjort). */
export function skillAccuracy(d: DealerState, part: PartId): number {
  return SKILL_ACCURACY[skillLevel(d, part)];
}
export function skillLevel(d: DealerState, part: PartId): number {
  const n = d.skills[part] ?? 0;
  let level = 0;
  for (let i = 0; i < SKILL_LEVELS.length; i++) if (n >= SKILL_LEVELS[i]) level = i;
  return level;
}
/** Hvor mange reparasjoner som trengs til neste nivå (null = høyeste nivå). */
export function nextLevelAt(d: DealerState, part: PartId): number | null {
  return SKILL_LEVELS[skillLevel(d, part) + 1] ?? null;
}

// --- Bruktbilmarkedet ---------------------------------------------------------------------
const hourOf = (now: number) => Math.floor(now / 3_600_000);

/** Lager spennet man ser rundt den ekte tilstanden (bredden = 1 − treffsikkerhet). */
function makeRange(trueCond: number, accuracy: number): [number, number] {
  const w = 1 - accuracy;
  let lo = trueCond - Math.random() * w;
  let hi = lo + w;
  if (lo < 0) {
    hi -= lo;
    lo = 0;
  }
  if (hi > 1) {
    lo -= hi - 1;
    hi = 1;
  }
  return [clamp01(lo), clamp01(hi)];
}

/** Tilstanden man ser (midt i spennene, vektet). */
export const apparentCondition = (m: MarketCar) => PARTS.reduce((sum, p, i) => sum + p.weight * (m.lo[i] + m.hi[i]) / 2, 0);

function setRanges(d: DealerState, m: MarketCar) {
  m.lo = [];
  m.hi = [];
  PARTS.forEach((p, i) => {
    const acc = m.diag ? Math.max(DIAG_ACCURACY, skillAccuracy(d, p.id)) : skillAccuracy(d, p.id);
    const [lo, hi] = makeRange(partCondition(m.damage, i), acc);
    m.lo.push(lo);
    m.hi.push(hi);
  });
}

function randomMarketCar(d: DealerState, segment: SegmentId): MarketCar {
  const models = modelsIn(segment);
  const model = models[Math.floor(Math.random() * models.length)];
  // Hvor slitt bilen er totalt, og litt forskjell på delene
  const base = 0.12 + Math.random() * 0.83;
  const damage = PARTS.map((p) => {
    const c = clamp01(base + (Math.random() - 0.5) * 0.7);
    return Math.round(p.maxMin * (1 - c));
  });
  const m: MarketCar = { id: uid('m'), model: model.id, damage, lo: [], hi: [], diag: false, price: 0 };
  setRanges(d, m);
  // Prisen bygger på det man ser (ikke den ekte tilstanden)
  m.price = round3(model.value * (0.15 + 0.6 * apparentCondition(m)));
  return m;
}

/** Bilene i markedet. Lista lages på nytt hver hele time (og når segmentet byttes). */
export function marketOf(b: Business, now = Date.now()): MarketCar[] {
  const d = dealerOf(b);
  const hour = hourOf(now);
  if (!d.market || d.market.hour !== hour || d.market.segment !== d.segment) {
    d.market = { hour, segment: d.segment, cars: Array.from({ length: MARKET_SIZE }, () => randomMarketCar(d, d.segment)) };
  }
  return d.market.cars;
}

/** Tid til markedet fylles med nye biler (ms). */
export const nextMarketRefresh = (now = Date.now()) => (hourOf(now) + 1) * 3_600_000 - now;

export const diagnosticsCost = (m: MarketCar) => round3(m.price * DIAG_SHARE);

// --- Verksted og utstilling ---------------------------------------------------------------
export const inService = (b: Business) => dealerOf(b).cars.filter((c) => !c.forSale);
export const forSale = (b: Business) => dealerOf(b).cars.filter((c) => c.forSale);
export const isRepairing = (c: DealerCar, now = Date.now()) => c.repair !== null && c.repair.end > now;
export const pendingCars = (b: Business) => inService(b).filter((c) => !c.repair);
export const repairingCars = (b: Business) => inService(b).filter((c) => c.repair);
export const showroomValue = (b: Business) => forSale(b).reduce((sum, c) => sum + c.forSale!.price, 0);
export const carById = (b: Business, id: string) => dealerOf(b).cars.find((c) => c.id === id);
export const netIncome = (c: DealerCar) => (c.forSale ? c.forSale.price : marketValue(c.model, c.damage)) - c.paid - c.repaired;

/** Hjelpefunksjon for business.ts: penger inn/ut skjer der (skatt osv.). */
export interface DealerPay {
  spend(amount: number, capital: boolean): boolean;
  earn(gross: number): void;
}

export type DealerResult = 'ok' | 'money' | 'full' | 'busy' | 'gone';

export function buyDiagnostics(b: Business, pay: DealerPay, carId: string): DealerResult {
  const d = dealerOf(b);
  const m = marketOf(b).find((x) => x.id === carId);
  if (!m) return 'gone';
  if (m.diag) return 'ok';
  if (!pay.spend(diagnosticsCost(m), false)) return 'money';
  m.diag = true;
  setRanges(d, m);
  return 'ok';
}

export function buyMarketCar(b: Business, pay: DealerPay, carId: string): DealerResult {
  const d = dealerOf(b);
  const cars = marketOf(b);
  const m = cars.find((x) => x.id === carId);
  if (!m) return 'gone';
  if (inService(b).length >= d.service) return 'full';
  if (!pay.spend(m.price, true)) return 'money';
  d.cars.push({ id: uid('d'), model: m.model, damage: [...m.damage], paid: m.price, repaired: 0, repair: null, forSale: null });
  // Bilen forsvinner fra lista, og én ny kommer inn i stedet
  cars.splice(cars.indexOf(m), 1, randomMarketCar(d, d.market!.segment));
  return 'ok';
}

export function startRepair(b: Business, pay: DealerPay, carId: string, parts: PartId[], now = Date.now()): DealerResult {
  const c = carById(b, carId);
  if (!c || c.forSale) return 'gone';
  if (c.repair) return 'busy';
  const todo = parts.filter((id) => c.damage[partIndex(id)] > 0);
  if (!todo.length) return 'gone';
  const cost = repairCost(c, todo);
  if (!pay.spend(cost, true)) return 'money';
  c.repaired += cost;
  c.repair = { parts: todo, start: now, end: now + repairMinutes(c, todo) * 60_000 };
  return 'ok';
}

export function putUpForSale(b: Business, carId: string, now = Date.now()): DealerResult {
  const d = dealerOf(b);
  const c = carById(b, carId);
  if (!c || c.forSale) return 'gone';
  if (c.repair) return 'busy';
  if (forSale(b).length >= d.showroom) return 'full';
  c.forSale = { price: marketValue(c.model, c.damage), sellAt: now + SELL_MIN_MS + Math.random() * (SELL_MAX_MS - SELL_MIN_MS) };
  return 'ok';
}

export function changeSegment(b: Business, to: SegmentId, now = Date.now()): boolean {
  const d = dealerOf(b);
  if (d.segmentChange || to === d.segment) return false;
  d.segmentChange = { to, end: now + SEGMENT_CHANGE_MS };
  return true;
}

export function expandDealer(b: Business, pay: DealerPay, kind: 'service' | 'showroom', index: number, now = Date.now()): DealerResult {
  const d = dealerOf(b);
  const opt = EXPANSIONS[kind][index];
  const busy = kind === 'service' ? d.serviceExp : d.showroomExp;
  if (!opt) return 'gone';
  if (busy) return 'busy';
  if (!pay.spend(opt.price, true)) return 'money';
  const exp = { places: opt.places, end: now + opt.seconds * 1000 };
  if (kind === 'service') d.serviceExp = exp;
  else d.showroomExp = exp;
  return 'ok';
}

/**
 * Kjører tiden fremover: ferdige reparasjoner, utvidelser, bytte av segment og salg.
 * Returnerer bilene som ble solgt (pris og hva de kostet), så business.ts kan betale ut.
 */
export function tickDealer(b: Business, now: number): { price: number; cost: number }[] {
  const d = dealerOf(b);
  if (d.serviceExp && d.serviceExp.end <= now) {
    d.service += d.serviceExp.places;
    d.serviceExp = null;
  }
  if (d.showroomExp && d.showroomExp.end <= now) {
    d.showroom += d.showroomExp.places;
    d.showroomExp = null;
  }
  if (d.segmentChange && d.segmentChange.end <= now) {
    d.segment = d.segmentChange.to;
    d.segmentChange = null;
  }
  for (const c of d.cars) {
    if (c.repair && c.repair.end <= now) {
      for (const id of c.repair.parts) {
        c.damage[partIndex(id)] = 0;
        d.skills[id] = (d.skills[id] ?? 0) + 1;
      }
      c.repair = null;
    }
  }
  const sold = d.cars.filter((c) => c.forSale && c.forSale.sellAt <= now);
  if (!sold.length) return [];
  d.cars = d.cars.filter((c) => !sold.includes(c));
  return sold.map((c) => ({ price: c.forSale!.price, cost: c.paid + c.repaired }));
}
