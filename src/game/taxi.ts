import type { Business } from './business';

/*
 * TAXISELSKAP
 * -----------
 * - Selskapet har en KAPASITET: hvor mange biler det er plass til (starter på 5).
 *   Kapasiteten kan utvides (+5 / +10 / +20 plasser). Det koster penger og tar litt tid.
 * - Du kjøper BILER. Hver bil tjener en fast sum per time.
 * - Hver bil kan kjøre et visst antall km (rekkevidde). Bilene kjører 100 km i minuttet
 *   (6 000 km i timen), også mens appen er lukket. Når en bil har kjørt ferdig, forsvinner den.
 */

export const START_CAPACITY = 5;
/** Kilometer hver bil kjører per time (100 km i minuttet). */
export const KM_PER_HOUR = 6000;

export type CarClass = 'economy' | 'comfort' | 'comfortplus' | 'business' | 'premier' | 'elite';

export const CAR_CLASSES: { id: CarClass; label: string }[] = [
  { id: 'economy', label: 'Økonomi' },
  { id: 'comfort', label: 'Komfort' },
  { id: 'comfortplus', label: 'Komfort+' },
  { id: 'business', label: 'Business' },
  { id: 'premier', label: 'Premier' },
  { id: 'elite', label: 'Elite' },
];

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
}

/** Bilde av bilen: public/cars/<id>.png */
export const carImageUrl = (m: CarModel) => `cars/${m.id}.png`;

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
];

/** Utvidelse av kapasiteten: flere plasser, pris og hvor lang tid det tar. */
export const CAPACITY_OPTIONS = [
  { places: 5, price: 1750, seconds: 10 * 60 },
  { places: 10, price: 5000, seconds: 20 * 60 },
  { places: 20, price: 14000, seconds: 35 * 60 },
];

export interface TaxiCar {
  id: string;
  model: string;
  /** Kilometer kjørt. */
  km: number;
}

export const modelById = (id: string): CarModel => CAR_MODELS.find((m) => m.id === id) ?? CAR_MODELS[0];
export const classLabel = (c: CarClass) => CAR_CLASSES.find((x) => x.id === c)!.label;

export const carsOf = (b: Business): TaxiCar[] => (b.cars ??= []);
export const capacityOf = (b: Business) => b.capacity ?? START_CAPACITY;

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
  for (const car of cars) {
    const m = modelById(car.model);
    const hoursLeft = (m.range - car.km) / KM_PER_HOUR;
    const driven = Math.max(0, Math.min(hours, hoursLeft));
    earned += driven * m.income;
    car.km += driven * KM_PER_HOUR;
  }
  b.cars = cars.filter((c) => c.km < modelById(c.model).range - 1e-6);
  return earned;
}
