import type { Business } from './business';
import type { DealerPay } from './dealer';

/*
 * IT-SELSKAP
 * ----------
 * Selskapet lager PROSJEKTER (nettsider, programmer, spill …) for kunder.
 *
 * - Hvert prosjekt krever en viss mengde SKILL innen fire områder:
 *     </>  utvikling  (juniorutviklere, erfarne utviklere og seniorutviklere)
 *     kopp design     (designere)
 *     hånd ledelse    (teamledere)
 *     verktøy testing (testere)
 *   Man velger ansatte til hvert team. Summen av skillen deres må nå kravet.
 * - Ansatte som jobber på et prosjekt er opptatt til prosjektet er ferdig.
 * - Tiden prosjektet tar avhenger av utviklerne: juniorer er tregest, seniorer raskest.
 *   Har man mer utvikler-skill enn kravet, går det også litt fortere (maks dobbelt så fort).
 * - Når prosjektet er ferdig, står det under "Ferdige" og selges med et trykk (minus 5 % skatt).
 * - Alle ansatte har LØNN per time – den betales hele tiden, også når de ikke jobber
 *   og mens appen er lukket. Har man for mange ansatte og for få prosjekter, går man i minus.
 * - ANSETTE: "Ansett" lar rekrutterere velge tilfeldige kandidater (koster et intervju per person).
 *   "Tilbud fra rekrutterere" gir 5 kandidater (ofte bedre) som varer i 10 minutter, uten intervjukostnad.
 * - ARBEIDSPLASSER: man kan ikke ha flere ansatte enn plassene. Kontorene gir flere plasser.
 * - Seniorutviklere og teamledere låses opp når selskapet har tjent nok totalt (etter lønn).
 *
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const IT_TYPE = 'it-company';
export const isItType = (typeId: string) => typeId === IT_TYPE;

// --- Roller ---------------------------------------------------------------------------
export type SkillId = 'dev' | 'design' | 'lead' | 'test';
export type RoleId = 'junior' | 'middle' | 'senior' | 'designer' | 'lead' | 'tester';

export interface RoleDef {
  id: RoleId;
  /** Navn i flertall (lista over ansatte). */
  plural: string;
  /** Navn på én ansatt. */
  name: string;
  skill: SkillId;
  /** Skill en kandidat fra "Ansett" kan ha. */
  skillRange: [number, number];
  /** Lønn per time = base + perSkill × skill (± litt). */
  base: number;
  perSkill: number;
  /** Intervjukostnad per ansatt ("Ansett"). */
  interview: number;
  /** Selskapet må ha tjent så mye totalt før rollen kan ansettes. */
  unlockEarned?: number;
  /** Hvor lang tid prosjektet tar med bare denne typen utviklere (1 = vanlig). */
  speed?: number;
}

// Vises 10x høyere: juniorutvikler med 15 skill = $ 3 750/t, designer med 20 skill = $ 30 000/t
export const ROLES: RoleDef[] = [
  { id: 'junior', plural: 'Juniorutviklere', name: 'Juniorutvikler', skill: 'dev', skillRange: [10, 25], base: 0, perSkill: 25, interview: 120, speed: 1 },
  { id: 'middle', plural: 'Erfarne utviklere', name: 'Erfaren utvikler', skill: 'dev', skillRange: [35, 70], base: 0, perSkill: 50, interview: 1_600, speed: 0.75 },
  { id: 'senior', plural: 'Seniorutviklere', name: 'Seniorutvikler', skill: 'dev', skillRange: [90, 200], base: 6_000, perSkill: 80, interview: 6_000, unlockEarned: 100_000, speed: 0.5 },
  { id: 'designer', plural: 'Designere', name: 'Designer', skill: 'design', skillRange: [15, 35], base: 0, perSkill: 150, interview: 1_000 },
  { id: 'lead', plural: 'Teamledere', name: 'Teamleder', skill: 'lead', skillRange: [40, 100], base: 0, perSkill: 120, interview: 4_000, unlockEarned: 40_000 },
  { id: 'tester', plural: 'Testere', name: 'Tester', skill: 'test', skillRange: [20, 50], base: 0, perSkill: 60, interview: 4_500 },
];
export const roleById = (id: RoleId) => ROLES.find((r) => r.id === id) ?? ROLES[0];

export const SKILLS: { id: SkillId; team: string; empty: string }[] = [
  { id: 'dev', team: 'Utviklerteam', empty: 'utviklere' },
  { id: 'design', team: 'Designteam', empty: 'designere' },
  { id: 'lead', team: 'Teamleder', empty: 'teamledere' },
  { id: 'test', team: 'Testteam', empty: 'testere' },
];

// --- Prosjekter -----------------------------------------------------------------------
export type Skills = Record<SkillId, number>;

export interface ProjectDef {
  id: string;
  name: string;
  /** Ikon: nettside eller program. */
  kind: 'web' | 'app';
  need: Skills;
  /** Betaling når prosjektet er ferdig (vises 10x høyere). */
  pay: number;
  /** Hvor lang tid prosjektet tar med bare juniorutviklere (minutter). */
  minutes: number;
}

const need = (dev: number, design: number, lead: number, test: number): Skills => ({ dev, design, lead, test });

export const PROJECTS: ProjectDef[] = [
  { id: 'layout', name: 'Grensesnittdesign', kind: 'web', need: need(30, 20, 0, 0), pay: 3_000, minutes: 30 },
  { id: 'corporate', name: 'Bedriftsnettside', kind: 'web', need: need(60, 60, 0, 0), pay: 26_670, minutes: 108 },
  { id: 'store', name: 'Nettbutikk', kind: 'web', need: need(150, 90, 0, 75), pay: 101_980, minutes: 84 },
  { id: 'warehouse', name: 'Program for lagerstyring', kind: 'app', need: need(300, 90, 100, 150), pay: 829_280, minutes: 180 },
  { id: 'face', name: 'Program for ansiktsgjenkjenning', kind: 'app', need: need(750, 120, 280, 375), pay: 2_857_470, minutes: 240 },
  { id: 'engineering', name: 'Program for ingeniørberegninger', kind: 'app', need: need(1125, 150, 275, 750), pay: 5_576_000, minutes: 300 },
  { id: 'flight', name: 'Program for flystyring', kind: 'app', need: need(1500, 150, 280, 1125), pay: 7_548_000, minutes: 360 },
  { id: 'aaa', name: 'AAA-spill', kind: 'app', need: need(1800, 300, 260, 1875), pay: 11_647_125, minutes: 420 },
  { id: 'ecosystem', name: 'Digitalt økosystem', kind: 'app', need: need(2250, 450, 250, 3750), pay: 385_807_500, minutes: 480 },
  { id: 'os', name: 'Operativsystem', kind: 'app', need: need(3000, 750, 295, 5625), pay: 1_465_000_000, minutes: 600 },
];
export const projectDef = (id: string) => PROJECTS.find((p) => p.id === id) ?? PROJECTS[0];

// --- Kontor ---------------------------------------------------------------------------
/** Arbeidsplasser fra start. */
export const START_PLACES = 5;

export interface OfficeDef {
  id: string;
  name: string;
  places: number;
  price: number;
  seconds: number;
}

/** Kjøpes i rekkefølge, én gang hver. */
export const OFFICES: OfficeDef[] = [
  { id: 'small', name: 'Lite kontorlokale', places: 15, price: 1_500, seconds: 15 * 60 },
  { id: 'standard', name: 'Standard kontor', places: 70, price: 35_000, seconds: 3600 },
  { id: 'center', name: 'Forretningssenter', places: 250, price: 375_000, seconds: 2 * 3600 },
];

// --- Rekrutterere ---------------------------------------------------------------------
/** Flest som kan ansettes på én gang med "Ansett". */
export const MAX_QUICK_HIRE = 100;
/** Antall tilbud fra rekrutterere. */
export const OFFER_COUNT = 5;
/** Hvor lenge tilbudene varer. */
export const OFFER_SECONDS = 10 * 60;

// --- Tilstand -------------------------------------------------------------------------
export interface Employee {
  id: string;
  name: string;
  role: RoleId;
  skill: number;
  /** Lønn per time. */
  salary: number;
  /** Prosjektet personen jobber på nå. */
  project?: string;
}

export interface ItProject {
  id: string;
  def: string;
  start: number;
  end: number;
}

export interface ItState {
  staff: Employee[];
  /** Arbeidsplasser. */
  places: number;
  /** Kontorer som er kjøpt (id). */
  offices: string[];
  /** Kontoret som bygges nå. */
  building: { office: string; end: number } | null;
  /** Prosjekter som pågår eller er ferdige (ikke solgt). */
  projects: ItProject[];
  /** Tilbud fra rekrutterere. */
  offers: Employee[];
  /** Når tilbudene forsvinner (ms). */
  offersUntil: number | null;
}

// --- Navn ------------------------------------------------------------------------------
const FIRST_NAMES = [
  'Andrew', 'Thomas', 'Emery', 'Sophie', 'Reese', 'Mohamed', 'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Lucas',
  'Mia', 'Ethan', 'Isabella', 'Oliver', 'Amelia', 'James', 'Charlotte', 'Daniel', 'Harper', 'Henry', 'Ella', 'Jack',
  'Grace', 'Samuel', 'Chloe', 'David', 'Lily', 'Leo', 'Zoe', 'Adam', 'Nora', 'Ali', 'Sara', 'Jonas', 'Ingrid', 'Emil',
  'Hanna', 'Kevin', 'Maya', 'Ryan', 'Aisha', 'Victor', 'Julia', 'Felix', 'Elena', 'Omar', 'Leah', 'Hugo', 'Freya',
  'Mateo', 'Yuki', 'Ivan', 'Priya', 'Chen', 'Fatima', 'Marcus', 'Nina', 'Oscar', 'Alice', 'Sebastian', 'Ida',
];
const LAST_NAMES = [
  'Hopkins', 'Chang', 'Roberts', 'Taylor', 'Kelly', 'Goodman', 'Smith', 'Johnson', 'Brown', 'Miller', 'Davis', 'Wilson',
  'Anderson', 'Moore', 'Martin', 'Lee', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams',
  'Nelson', 'Carter', 'Mitchell', 'Perez', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins',
  'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Berg', 'Nguyen', 'Kim', 'Patel', 'Singh', 'Garcia', 'Lopez', 'Novak',
  'Fischer', 'Weber', 'Rossi', 'Silva', 'Costa', 'Tanaka', 'Ito', 'Khan', 'Hughes', 'Price', 'Foster', 'Reed',
];

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + (max - min) * Math.random();
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

/** Lønn for en ansatt med en viss skill (± 6 %). Rundes til hele dollar (som vises). */
export function salaryFor(role: RoleDef, skill: number, exact = false): number {
  const salary = (role.base + role.perSkill * skill) * (exact ? 1 : between(0.94, 1.06));
  return Math.round(salary * 10) / 10;
}

function newEmployee(roleId: RoleId, skill: number, exact = false): Employee {
  const role = roleById(roleId);
  return { id: uid('e'), name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`, role: roleId, skill, salary: salaryFor(role, skill, exact) };
}

/** En tilfeldig kandidat fra "Ansett". */
function randomCandidate(roleId: RoleId): Employee {
  const [min, max] = roleById(roleId).skillRange;
  return newEmployee(roleId, Math.round(between(min, max)));
}

/** Et tilbud fra rekrutterere: ofte bedre enn vanlige kandidater. */
function randomOffer(): Employee {
  const role = pick<RoleId>(['junior', 'middle', 'middle', 'senior', 'senior', 'designer', 'lead', 'tester']);
  const [min, max] = roleById(role).skillRange;
  return newEmployee(role, Math.round(between(min + (max - min) * 0.4, max * 1.15)));
}

export function newIt(): ItState {
  return {
    // Fra start: 2 juniorutviklere (15 skill) og 1 designer (20 skill)
    staff: [newEmployee('junior', 15, true), newEmployee('junior', 15, true), newEmployee('designer', 20, true)],
    places: START_PLACES,
    offices: [],
    building: null,
    projects: [],
    offers: [],
    offersUntil: null,
  };
}

export function itOf(b: Business): ItState {
  b.it ??= newIt();
  return b.it;
}

// --- Tall som vises ---------------------------------------------------------------------
export const wagesPerHour = (b: Business) => itOf(b).staff.reduce((sum, e) => sum + e.salary, 0);
export const staffOf = (b: Business, role: RoleId) => itOf(b).staff.filter((e) => e.role === role);
export const freePlaces = (b: Business) => Math.max(0, itOf(b).places - itOf(b).staff.length);
export const employeeById = (b: Business, id: string) => itOf(b).staff.find((e) => e.id === id);

export const isDone = (p: ItProject, now = Date.now()) => p.end <= now;
export const inProgress = (b: Business, now = Date.now()) => itOf(b).projects.filter((p) => !isDone(p, now));
export const completed = (b: Business, now = Date.now()) => itOf(b).projects.filter((p) => isDone(p, now));
export const projectsValue = (list: ItProject[]) => list.reduce((sum, p) => sum + projectDef(p.def).pay, 0);

/** Er rollen låst opp? (seniorutviklere og teamledere krever at selskapet har tjent nok) */
export const isRoleUnlocked = (b: Business, role: RoleDef) => !role.unlockEarned || b.earned >= role.unlockEarned;

/** Ledig skill (ansatte som ikke jobber på et prosjekt) per område. */
export function freeSkills(b: Business): Skills {
  const sum: Skills = { dev: 0, design: 0, lead: 0, test: 0 };
  for (const e of itOf(b).staff) if (!e.project) sum[roleById(e.role).skill] += e.skill;
  return sum;
}

/** Ansatte som kan velges til et team (ikke opptatt). */
export const freeFor = (b: Business, skill: SkillId) =>
  itOf(b).staff.filter((e) => !e.project && roleById(e.role).skill === skill);

// --- Team og prosjekttid -----------------------------------------------------------------
export type Picks = Record<SkillId, string[]>;
export const emptyPicks = (): Picks => ({ dev: [], design: [], lead: [], test: [] });

/** De valgte som fortsatt er ledige (noen kan ha fått sparken eller startet et annet prosjekt). */
export function validPicks(b: Business, picks: Picks): Picks {
  const out = emptyPicks();
  for (const s of SKILLS) out[s.id] = picks[s.id].filter((id) => freeFor(b, s.id).some((e) => e.id === id));
  return out;
}

export function pickedSkill(b: Business, ids: string[]): number {
  return ids.reduce((sum, id) => sum + (employeeById(b, id)?.skill ?? 0), 0);
}

/** Har teamene nok skill til prosjektet? */
export function teamsReady(b: Business, def: ProjectDef, picks: Picks): boolean {
  return SKILLS.every((s) => pickedSkill(b, picks[s.id]) >= def.need[s.id]);
}

/** Hvor lang tid prosjektet tar med de valgte utviklerne (sekunder), eller null uten utviklere. */
export function leadSeconds(b: Business, def: ProjectDef, devIds: string[]): number | null {
  const devs = devIds.map((id) => employeeById(b, id)).filter((e): e is Employee => !!e);
  const total = devs.reduce((sum, e) => sum + e.skill, 0);
  if (total <= 0) return null;
  // Snittfarten, vektet etter hvor mye skill hver utvikler bidrar med
  const speed = devs.reduce((sum, e) => sum + e.skill * (roleById(e.role).speed ?? 1), 0) / total;
  // Mer skill enn kravet: litt raskere (maks dobbelt så fort)
  const extra = Math.max(0.5, Math.min(1, def.need.dev / total));
  return Math.round(def.minutes * 60 * speed * extra);
}

/** Velg automatisk de billigste (lavest lønn per skill) til kravet er nådd. */
export function autoPick(b: Business, def: ProjectDef, skill: SkillId): string[] {
  const list = [...freeFor(b, skill)].sort((x, y) => x.salary / x.skill - y.salary / y.skill);
  const out: string[] = [];
  let sum = 0;
  for (const e of list) {
    if (sum >= def.need[skill]) break;
    out.push(e.id);
    sum += e.skill;
  }
  return out;
}

// --- Handlinger --------------------------------------------------------------------------
export type ItResult = 'ok' | 'money' | 'places' | 'locked' | 'busy' | 'need' | 'gone' | 'max';

/** "Ansett": rekrutterere velger `count` tilfeldige kandidater. */
export function quickHire(b: Business, pay: DealerPay, roleId: RoleId, count: number): ItResult {
  const role = roleById(roleId);
  const n = Math.floor(count);
  if (!isRoleUnlocked(b, role)) return 'locked';
  if (n <= 0) return 'need';
  if (n > freePlaces(b)) return 'places';
  if (!pay.spend(role.interview * n, false)) return 'money';
  for (let i = 0; i < n; i++) itOf(b).staff.push(randomCandidate(roleId));
  return 'ok';
}

/** Lager 5 nye tilbud fra rekrutterere (varer i 10 minutter). */
export function refreshOffers(b: Business, now = Date.now()): ItResult {
  const it = itOf(b);
  if (it.offersUntil !== null && it.offersUntil > now) return 'busy';
  it.offers = Array.from({ length: OFFER_COUNT }, randomOffer);
  it.offersUntil = now + OFFER_SECONDS * 1000;
  return 'ok';
}

/** Ansetter et tilbud (ingen intervjukostnad). */
export function hireOffer(b: Business, offerId: string): ItResult {
  const it = itOf(b);
  const offer = it.offers.find((o) => o.id === offerId);
  if (!offer) return 'gone';
  if (freePlaces(b) < 1) return 'places';
  it.offers = it.offers.filter((o) => o !== offer);
  it.staff.push(offer);
  return 'ok';
}

export function fire(b: Business, employeeId: string): ItResult {
  const it = itOf(b);
  const e = employeeById(b, employeeId);
  if (!e) return 'gone';
  if (e.project) return 'busy';
  it.staff = it.staff.filter((x) => x !== e);
  return 'ok';
}

/** Neste kontor som kan kjøpes (eller null når alle er kjøpt). */
export const nextOffice = (b: Business) => OFFICES.find((o) => !itOf(b).offices.includes(o.id)) ?? null;

export function buyOffice(b: Business, pay: DealerPay, officeId: string, now = Date.now()): ItResult {
  const it = itOf(b);
  const office = OFFICES.find((o) => o.id === officeId);
  if (!office || nextOffice(b)?.id !== officeId) return 'locked';
  if (it.building) return 'busy';
  if (!pay.spend(office.price, true)) return 'money';
  it.building = { office: office.id, end: now + office.seconds * 1000 };
  return 'ok';
}

export function startItProject(b: Business, defId: string, picks: Picks, now = Date.now()): ItResult {
  const def = projectDef(defId);
  const valid = validPicks(b, picks);
  if (!teamsReady(b, def, valid)) return 'need';
  const seconds = leadSeconds(b, def, valid.dev);
  if (seconds === null) return 'need';
  const project: ItProject = { id: uid('p'), def: def.id, start: now, end: now + seconds * 1000 };
  for (const s of SKILLS) for (const id of valid[s.id]) employeeById(b, id)!.project = project.id;
  itOf(b).projects.push(project);
  return 'ok';
}

/** Avbryt et prosjekt: de ansatte blir ledige, og man får ingen betaling. */
export function dropProject(b: Business, projectId: string): ItResult {
  const it = itOf(b);
  const p = it.projects.find((x) => x.id === projectId);
  if (!p) return 'gone';
  for (const e of it.staff) if (e.project === p.id) delete e.project;
  it.projects = it.projects.filter((x) => x !== p);
  return 'ok';
}

/** Selger et ferdig prosjekt. */
export function sellItProject(b: Business, pay: DealerPay, projectId: string, now = Date.now()): number {
  const it = itOf(b);
  const p = it.projects.find((x) => x.id === projectId);
  if (!p || !isDone(p, now)) return 0;
  it.projects = it.projects.filter((x) => x !== p);
  const price = projectDef(p.def).pay;
  pay.earn(price);
  return price;
}

/**
 * Tiden går: ferdige prosjekter frigjør de ansatte, kontorer blir ferdige og tilbud går ut.
 * Returnerer lønnen for perioden (betales av bedrifts-motoren).
 */
export function tickIt(b: Business, from: number, now: number): number {
  const it = itOf(b);
  const wages = wagesPerHour(b) * Math.max(0, (now - from) / 3_600_000);
  for (const p of it.projects) {
    if (!isDone(p, now)) continue;
    for (const e of it.staff) if (e.project === p.id) delete e.project;
  }
  if (it.building && it.building.end <= now) {
    const office = OFFICES.find((o) => o.id === it.building!.office);
    if (office) {
      it.places += office.places;
      it.offices.push(office.id);
    }
    it.building = null;
  }
  if (it.offersUntil !== null && it.offersUntil <= now) {
    it.offers = [];
    it.offersUntil = null;
  }
  return wages;
}
