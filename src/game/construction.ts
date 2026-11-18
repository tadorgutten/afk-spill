import type { Business } from './business';

/*
 * BYGGEFIRMA
 * ----------
 * - Firmaet har et LAGER med fire ressurser: byggere, metall, treverk og betong.
 *   Ressursene kjøpes (Fyll på ressurser) og brukes opp når et bygg startes.
 * - Et BYGG (prosjekt) tar en viss tid. Når det er ferdig, står det "Klart for salg",
 *   og man trykker på det for å selge det (minus 5 % skatt, som de andre bedriftene).
 * - Byggene låses opp etter hvert: f.eks. må man bygge 2 eneboliger før man kan bygge kontorbygg.
 *
 * Tallene er 1/10 av originalen (vises 10x høyere), som resten av spillet.
 */

export const CONSTRUCTION_TYPE = 'construction';

export type ResourceId = 'men' | 'metal' | 'wood' | 'concrete';
export type Resources = Record<ResourceId, number>;

export interface ResourceDef {
  id: ResourceId;
  name: string;
  /** Enheten bak tallet ("mann", "t", "m³"). */
  unit: string;
  /** Pris per enhet (vises 10x høyere: byggere $ 2 650, metall $ 1 171, treverk $ 324, betong $ 47). */
  price: number;
}

export const RESOURCES: ResourceDef[] = [
  { id: 'men', name: 'Byggere', unit: 'mann', price: 265 },
  { id: 'metal', name: 'Metall', unit: 't', price: 117.1 },
  { id: 'wood', name: 'Treverk', unit: 'm³', price: 32.4 },
  { id: 'concrete', name: 'Betong', unit: 'm³', price: 4.7 },
];

/** Flest bygg man kan ha under bygging samtidig. */
export const MAX_PROJECTS = 15;

/** Gebyr når man kjøper akkurat det som mangler for et bygg ("Fyll på og bygg"). */
export const QUICK_FEE = 0.07;

export interface BuildingDef {
  id: string;
  name: string;
  image: string;
  need: Resources;
  hours: number;
  /** Salgspris når bygget er ferdig. */
  price: number;
  /** Må ha bygget så mange av et annet bygg først. */
  unlock?: { building: string; count: number };
}

const res = (metal: number, wood: number, men: number, concrete: number): Resources => ({ men, metal, wood, concrete });

export const BUILDINGS: BuildingDef[] = [
  { id: 'house', name: 'Enebolig', image: 'buildings/house.png', need: res(4, 50, 4, 170), hours: 3, price: 5_920 },
  {
    id: 'office',
    name: 'Kontorbygg',
    image: 'buildings/office.png',
    need: res(12, 400, 13, 1_500),
    hours: 10,
    price: 38_530,
    unlock: { building: 'house', count: 2 },
  },
  {
    id: 'tradecenter',
    name: 'Handelssenter',
    image: 'buildings/tradecenter.png',
    need: res(25, 300, 90, 3_800),
    hours: 12,
    price: 64_413,
    unlock: { building: 'office', count: 3 },
  },
  {
    id: 'apartments',
    name: 'Boligblokk',
    image: 'buildings/apartments.png',
    need: res(660, 2_200, 150, 30_200),
    hours: 20,
    price: 416_122.5,
    unlock: { building: 'tradecenter', count: 3 },
  },
  {
    id: 'skyscraper',
    name: 'Skyskraper',
    image: 'buildings/skyscraper.png',
    need: res(1_450, 2_800, 800, 190_000),
    hours: 35,
    price: 2_048_200,
    unlock: { building: 'apartments', count: 3 },
  },
];

export interface Project {
  id: string;
  building: string;
  start: number;
  end: number;
}

export const isConstructionType = (typeId: string) => typeId === CONSTRUCTION_TYPE;
export const buildingById = (id: string) => BUILDINGS.find((x) => x.id === id) ?? BUILDINGS[0];

export const emptyResources = (): Resources => ({ men: 0, metal: 0, wood: 0, concrete: 0 });
export const resourcesOf = (b: Business): Resources => (b.resources ??= emptyResources());
export const projectsOf = (b: Business): Project[] => (b.projects ??= []);

export const isReady = (p: Project, now = Date.now()) => p.end <= now;
export const building = (b: Business, now = Date.now()) => projectsOf(b).filter((p) => !isReady(p, now));
export const readyForSale = (b: Business, now = Date.now()) => projectsOf(b).filter((p) => isReady(p, now));
const sumPrice = (list: Project[]) => list.reduce((sum, p) => sum + buildingById(p.building).price, 0);
export const buildingValue = (b: Business, now = Date.now()) => sumPrice(building(b, now));
export const readyValue = (b: Business, now = Date.now()) => sumPrice(readyForSale(b, now));

/** Hvor mange av et bygg som er ferdige (solgte + de som står klare for salg). */
export function builtCount(b: Business, buildingId: string, now = Date.now()): number {
  const sold = b.built?.[buildingId] ?? 0;
  return sold + readyForSale(b, now).filter((p) => p.building === buildingId).length;
}

export function isUnlocked(b: Business, def: BuildingDef, now = Date.now()): boolean {
  return !def.unlock || builtCount(b, def.unlock.building, now) >= def.unlock.count;
}

/** Det som mangler på lageret for å starte et bygg. */
export function missingFor(b: Business, def: BuildingDef): Resources {
  const have = resourcesOf(b);
  const out = emptyResources();
  for (const r of RESOURCES) out[r.id] = Math.max(0, def.need[r.id] - have[r.id]);
  return out;
}

export const hasResources = (b: Business, def: BuildingDef) => RESOURCES.every((r) => missingFor(b, def)[r.id] === 0);

/** Prisen for en mengde ressurser (uten gebyr). */
export const resourcesCost = (amounts: Resources) => RESOURCES.reduce((sum, r) => sum + amounts[r.id] * r.price, 0);

/** Største antall man har råd til av én ressurs. */
export const maxAffordable = (balance: number, r: ResourceDef) => Math.max(0, Math.floor(balance / r.price + 1e-9));
