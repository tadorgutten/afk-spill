import type { Business } from './business';

/*
 * TAXISELSKAP
 * -----------
 * - Selskapet har en KAPASITET: hvor mange biler det er plass til (starter på 5).
 *   Kapasiteten kan utvides (+5 / +10 / +20 plasser). Det koster penger og tar litt tid.
 * - Du kjøper BILER. Hver bil tjener en fast sum per time.
 * - Hver bil kan kjøre et visst antall km (rekkevidde). Bilene kjører 100 km i minuttet
 *   (6 000 km i timen), også mens appen er lukket. Når en bil har kjørt ferdig, forsvinner den.
 *
 * FRAKTSELSKAP, FLYSELSKAP og REDERI fungerer helt likt, bare med andre kjøretøy:
 *   - Fraktselskap: lastebiler som kjører km (klassene By og Langtransport)
 *   - Flyselskap: fly som har et visst antall flytimer før de må pensjoneres
 *   - Rederi: skip som seiler et visst antall nautiske mil
 * Hver flåte har egne priser for å utvide kapasiteten.
 */

/** Hvilken "flåte" en bedrift har. Samme id som bedriftstypen i BUSINESS_TYPES. */
export type FleetKind = 'taxi' | 'shipping' | 'airline' | 'ships';

/** Bedrifts-typen (id i BUSINESS_TYPES) for fraktselskap. */
export const SHIPPING_TYPE = 'shipping';
const FLEET_KINDS: FleetKind[] = ['taxi', 'shipping', 'airline', 'ships'];
export const isFleetType = (typeId: string) => (FLEET_KINDS as string[]).includes(typeId);
export const fleetOf = (b: Business): FleetKind => (isFleetType(b.type) ? (b.type as FleetKind) : 'taxi');

/**
 * Hvordan kjøretøyene "slites": hvor mye av rekkevidden de bruker per time,
 * og hva enheten heter (km, flytimer, nautiske mil).
 */
export const FLEET_USAGE: Record<FleetKind, { perHour: number; unit: string; rangeLabel: string }> = {
  taxi: { perHour: 6000, unit: 'km', rangeLabel: 'Rekkevidde' },
  shipping: { perHour: 6000, unit: 'km', rangeLabel: 'Rekkevidde' },
  airline: { perHour: 1, unit: 'flytimer', rangeLabel: 'Levetid' },
  ships: { perHour: 20, unit: 'nm', rangeLabel: 'Rekkevidde' },
};

/** Kapasiteten man starter med. */
export const START_CAPACITY_BY: Record<FleetKind, number> = { taxi: 5, shipping: 5, airline: 3, ships: 3 };

/** Tekstene som er forskjellige for hver flåte. */
export const FLEET_TEXT: Record<
  FleetKind,
  { fleet: string; count: string; buy: string; choose: string; empty: string; emptyClass: string; hint: string; noun: string }
> = {
  taxi: {
    fleet: 'Bilpark',
    count: 'Biler',
    buy: 'Kjøp en ny bil',
    choose: 'Velg en bil',
    empty: 'Bilparken er tom',
    emptyClass: 'Ingen biler i denne klassen',
    hint: 'Kjøp en bil for å begynne å tjene penger',
    noun: 'bil',
  },
  shipping: {
    fleet: 'Flåte',
    count: 'Kjøretøy',
    buy: 'Kjøp et nytt kjøretøy',
    choose: 'Velg et kjøretøy',
    empty: 'Flåten er tom',
    emptyClass: 'Ingen kjøretøy i denne klassen',
    hint: 'Kjøp et kjøretøy for å begynne å tjene penger',
    noun: 'kjøretøy',
  },
  airline: {
    fleet: 'Flyflåte',
    count: 'Fly',
    buy: 'Kjøp et nytt fly',
    choose: 'Velg et fly',
    empty: 'Flyflåten er tom',
    emptyClass: 'Ingen fly i denne klassen',
    hint: 'Kjøp et fly for å begynne å tjene penger',
    noun: 'fly',
  },
  ships: {
    fleet: 'Flåte',
    count: 'Skip',
    buy: 'Kjøp et nytt skip',
    choose: 'Velg et skip',
    empty: 'Flåten er tom',
    emptyClass: 'Ingen skip i denne klassen',
    hint: 'Kjøp et skip for å begynne å tjene penger',
    noun: 'skip',
  },
};

export const START_CAPACITY = 5;
/** Kilometer hver bil kjører per time (100 km i minuttet). */
export const KM_PER_HOUR = 6000;

export type CarClass =
  | 'economy'
  | 'comfort'
  | 'comfortplus'
  | 'business'
  | 'premier'
  | 'elite'
  | 'city'
  | 'long'
  | 'smallplane'
  | 'shorthaul'
  | 'longhaul'
  | 'passenger'
  | 'cargo';

export const CAR_CLASSES: { id: CarClass; label: string; fleet: FleetKind }[] = [
  { id: 'economy', label: 'Økonomi', fleet: 'taxi' },
  { id: 'comfort', label: 'Komfort', fleet: 'taxi' },
  { id: 'comfortplus', label: 'Komfort+', fleet: 'taxi' },
  { id: 'business', label: 'Business', fleet: 'taxi' },
  { id: 'premier', label: 'Premier', fleet: 'taxi' },
  { id: 'elite', label: 'Elite', fleet: 'taxi' },
  { id: 'city', label: 'By', fleet: 'shipping' },
  { id: 'long', label: 'Langtransport', fleet: 'shipping' },
  { id: 'smallplane', label: 'Småfly', fleet: 'airline' },
  { id: 'shorthaul', label: 'Kortdistanse', fleet: 'airline' },
  { id: 'longhaul', label: 'Langdistanse', fleet: 'airline' },
  { id: 'passenger', label: 'Passasjer', fleet: 'ships' },
  { id: 'cargo', label: 'Frakt', fleet: 'ships' },
];

export const classesFor = (fleet: FleetKind) => CAR_CLASSES.filter((c) => c.fleet === fleet);

export interface CarModel {
  id: string;
  name: string;
  carClass: CarClass;
  price: number;
  /** Hvor langt bilen kan kjøre før den er utslitt (km). */
  range: number;
  /** Inntekt per time (kr). */
  income: number;
  /** Farge på bilen i tegningen (brukes hvis bildet mangler). */
  color: string;
  /** Bildet peker mot høyre og må speilvendes (fronten skal peke mot venstre). */
  flip?: boolean;
  /** Gjør bildet større (over 1) eller mindre (under 1), så alle bilene ser like store ut. */
  scale?: number;
  /** Bildet ligger et annet sted enn public/cars/<id>.png (f.eks. lastebilene). */
  image?: string;
}

/** Bilde av bilen: public/cars/<id>.png (lastebilene: public/trucks/<id>.png) */
export const carImageUrl = (m: CarModel) => m.image ?? `cars/${m.id}.png`;

// Inntekt per time er 1/10 av Business Empire sine tall.
export const CAR_MODELS: CarModel[] = [
  // Økonomi – 56 kr/t
  { id: 'logan', name: 'Renault Logan', carClass: 'economy', price: 1080, range: 520_000, income: 56, color: '#2f5fb3', flip: true },
  { id: 'solaris', name: 'Hyundai Solaris', carClass: 'economy', price: 1260, range: 480_000, income: 56, color: '#eceef1' },
  { id: 'granta', name: 'Lada Granta', carClass: 'economy', price: 780, range: 300_000, income: 56, color: '#f4f4f4' },
  // Komfort – 95,40 kr/t
  { id: 'octavia', name: 'Škoda Octavia', carClass: 'comfort', price: 2200, range: 420_000, income: 95.4, color: '#cfd3d8', flip: true },
  { id: 'elantra', name: 'Hyundai Elantra', carClass: 'comfort', price: 2000, range: 390_000, income: 95.4, color: '#d9dbde' },
  { id: 'jetta', name: 'Volkswagen Jetta', carClass: 'comfort', price: 2150, range: 400_000, income: 95.4, color: '#8a1f2a' },
  // Komfort+ – 118 kr/t
  { id: 'camry', name: 'Toyota Camry', carClass: 'comfortplus', price: 2950, range: 415_000, income: 118, color: '#3b2a24', flip: true, scale: 0.93 },
  { id: 'sonata', name: 'Hyundai Sonata', carClass: 'comfortplus', price: 2875, range: 410_000, income: 118, color: '#3d4249' },
  { id: 'passat', name: 'Volkswagen Passat', carClass: 'comfortplus', price: 3240, range: 430_000, income: 118, color: '#1f3a5f', scale: 0.93 },
  // Business – 242 kr/t
  { id: 'eclass', name: 'Mercedes-Benz E-klasse', carClass: 'business', price: 6600, range: 460_000, income: 242, color: '#f2f2f2' },
  { id: 'bmw5', name: 'BMW 5-serie', carClass: 'business', price: 6200, range: 450_000, income: 242, color: '#6d7278' },
  { id: 'a6', name: 'Audi A6', carClass: 'business', price: 5835, range: 440_000, income: 242, color: '#5c6168', scale: 0.9 },
  // Premier – 504 kr/t
  { id: 'sclass', name: 'Mercedes-Benz S-klasse', carClass: 'premier', price: 13750, range: 305_000, income: 504, color: '#f6f6f6', scale: 0.92 },
  { id: 'bmw7', name: 'BMW 7-serie', carClass: 'premier', price: 12400, range: 300_000, income: 504, color: '#5b5d5f', scale: 1.05 },
  { id: 'a8', name: 'Audi A8', carClass: 'premier', price: 12150, range: 298_000, income: 504, color: '#1d1f22', scale: 1.08 },
  // Elite – 1 305 kr/t
  { id: 'maybach', name: 'Mercedes-Maybach S-klasse', carClass: 'elite', price: 28000, range: 600_000, income: 1305, color: '#6b1a24' },

  // --- Fraktselskap: 3 kassebiler (By) og 2 lastebiler (Langtransport). Tallene er som i originalen.
  // By – 175 (vises som $ 1 750) per time
  { id: 'trafic', name: 'Renault Trafic', carClass: 'city', price: 2955.6, range: 750_000, income: 175, color: '#e9eaec', image: 'trucks/trafic.png' },
  { id: 'master', name: 'Renault Master', carClass: 'city', price: 3700, range: 1_280_000, income: 175, color: '#f2f2f2', image: 'trucks/master.png' },
  { id: 'isuzu', name: 'Isuzu N-serie', carClass: 'city', price: 4133.5, range: 1_340_000, income: 175, color: '#f2f2f2', image: 'trucks/isuzu.png', flip: true },
  // Langtransport – 380 (vises som $ 3 800) per time
  { id: 'daf-cf', name: 'DAF CF', carClass: 'long', price: 10861.7, range: 1_940_000, income: 380, color: '#f2c200', image: 'trucks/daf-cf.png' },
  { id: 'scania', name: 'Scania R-serie', carClass: 'long', price: 11240.2, range: 2_100_000, income: 380, color: '#f2f2f2', image: 'trucks/scania.png' },

  // --- Flyselskap: rekkevidden er flytimer (1 i timen). Vises 10x høyere ($ 2 000 000 osv.). ---
  { id: 'cessna', name: 'Cessna 208 Caravan', carClass: 'smallplane', price: 200_000, range: 160, income: 9_500, color: '#fff', image: 'planes/cessna.png', flip: true },
  { id: 'a320', name: 'Airbus A320', carClass: 'shorthaul', price: 900_000, range: 150, income: 40_000, color: '#fff', image: 'planes/a320.png' },
  { id: 'b737', name: 'Boeing 737', carClass: 'shorthaul', price: 950_000, range: 165, income: 40_000, color: '#fff', image: 'planes/b737.png' },
  { id: 'b747', name: 'Boeing 747', carClass: 'longhaul', price: 3_600_000, range: 170, income: 145_000, color: '#fff', image: 'planes/b747.png' },
  { id: 'a380', name: 'Airbus A380', carClass: 'longhaul', price: 4_500_000, range: 180, income: 180_000, color: '#fff', image: 'planes/a380.png', flip: true },

  // --- Rederi: rekkevidden er nautiske mil (20 i timen). ---
  { id: 'ferry', name: 'Passasjerferje', carClass: 'passenger', price: 400_000, range: 4_000, income: 18_000, color: '#fff', image: 'ships/ferry.png' },
  { id: 'cruise', name: 'Cruiseskip', carClass: 'passenger', price: 6_000_000, range: 3_600, income: 260_000, color: '#fff', image: 'ships/cruise.png' },
  { id: 'megacruise', name: 'Megacruiseskip', carClass: 'passenger', price: 25_000_000, range: 3_400, income: 1_050_000, color: '#fff', image: 'ships/megacruise.png' },
  { id: 'bulk', name: 'Bulkskip', carClass: 'cargo', price: 3_000_000, range: 4_400, income: 135_000, color: '#fff', image: 'ships/bulk.png' },
  { id: 'container', name: 'Containerskip', carClass: 'cargo', price: 12_000_000, range: 4_600, income: 520_000, color: '#fff', image: 'ships/container.png' },
];

export const modelsFor = (fleet: FleetKind) => {
  const classes = new Set(classesFor(fleet).map((c) => c.id));
  return CAR_MODELS.filter((m) => classes.has(m.carClass));
};

/** Utvidelse av kapasiteten: flere plasser, pris og hvor lang tid det tar. */
export const CAPACITY_OPTIONS: Record<FleetKind, { places: number; price: number; seconds: number }[]> = {
  taxi: [
    { places: 5, price: 1750, seconds: 10 * 60 },
    { places: 10, price: 5000, seconds: 20 * 60 },
    { places: 20, price: 14000, seconds: 35 * 60 },
  ],
  // Vises som $ 30 000 / $ 80 000 / $ 200 000
  shipping: [
    { places: 5, price: 3000, seconds: 10 * 60 },
    { places: 10, price: 8000, seconds: 20 * 60 },
    { places: 20, price: 20000, seconds: 35 * 60 },
  ],
  // Flere gater på flyplassen: $ 25 M / $ 70 M / $ 180 M
  airline: [
    { places: 5, price: 2_500_000, seconds: 60 * 60 },
    { places: 10, price: 7_000_000, seconds: 2 * 3600 },
    { places: 20, price: 18_000_000, seconds: 4 * 3600 },
  ],
  // Flere kaiplasser: $ 300 M / $ 800 M / $ 2 B
  ships: [
    { places: 5, price: 30_000_000, seconds: 2 * 3600 },
    { places: 10, price: 80_000_000, seconds: 4 * 3600 },
    { places: 20, price: 200_000_000, seconds: 8 * 3600 },
  ],
};

export const capacityOptions = (b: Business) => CAPACITY_OPTIONS[fleetOf(b)];

export interface TaxiCar {
  id: string;
  model: string;
  /** Kilometer kjørt. */
  km: number;
}

/** Kjøretøy som er tatt ut av lista, byttes med et tilsvarende (gamle lagringer). */
const RENAMED: Record<string, string> = { 'man-tgm': 'isuzu', 'volvo-fh': 'scania', actros: 'scania' };
export const modelById = (id: string): CarModel => {
  const real = RENAMED[id] ?? id;
  return CAR_MODELS.find((m) => m.id === real) ?? CAR_MODELS[0];
};
export const classLabel = (c: CarClass) => CAR_CLASSES.find((x) => x.id === c)!.label;

export const carsOf = (b: Business): TaxiCar[] => (b.cars ??= []);
export const capacityOf = (b: Business) => b.capacity ?? START_CAPACITY_BY[fleetOf(b)];

/** Inntekt per time fra alle bilene. */
export function fleetIncome(b: Business): number {
  return carsOf(b).reduce((sum, c) => sum + modelById(c.model).income, 0);
}

/**
 * Lar bilene kjøre i `hours` timer. Returnerer hvor mye de tjente.
 * Biler som når rekkevidden sin, tjener bare frem til da og fjernes.
 */
export function driveCars(b: Business, hours: number): number {
  let earned = 0;
  const cars = carsOf(b);
  // Hvor mye av rekkevidden som brukes per time (km, flytimer eller nautiske mil)
  const perHour = FLEET_USAGE[fleetOf(b)].perHour;
  for (const car of cars) {
    const m = modelById(car.model);
    const hoursLeft = (m.range - car.km) / perHour;
    const driven = Math.max(0, Math.min(hours, hoursLeft));
    earned += driven * m.income;
    car.km += driven * perHour;
  }
  b.cars = cars.filter((c) => c.km < modelById(c.model).range - 1e-6);
  return earned;
}
