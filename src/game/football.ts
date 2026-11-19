import type { Business } from './business';
import { CLUBS, LEAGUES, PLAYERS, clubById, leagueById, playerDef, type LeagueDef } from './footballData';
import { hashString, seededRandom } from './random';

/*
 * FOTBALLKLUBB
 * ------------
 * - LAGET har alltid maks 11 spillere. Man starter med 11 egne spillere (rating 50–60, grått ikon).
 *   De kan ikke selges for penger, bare slippes. Blir man tvangssolgt, kommer de tilbake.
 * - KLUBBRATING = snittet av ratingen til spillerne på laget.
 * - OVERGANGER: lista har 10 ekte spillere (rating 65–91). Pris = verdien ut fra ratingen.
 *   Er laget fullt, må man selge (eller slippe) en spiller for å kjøpe en ny.
 *   Selger man, får man verdien ut fra ratingen spilleren har NÅ (trent opp = mer verdt).
 * - KONTRAKTER: hver 7. dag skal kjøpte spillere ha en signeringssum (10 % av verdien).
 *   Man har 3 dager på å betale. Betaler man ikke, blir alle kjøpte spillere tvangssolgt
 *   for 50 % av verdien, og de opprinnelige spillerne kommer tilbake.
 * - AKTIVITETER: trening (sakte, permanent økning, maks +10 over ratingen spilleren ble kjøpt med)
 *   og kampforberedelse (ekstra styrke i neste kamp). Én aktivitet om gangen, så 3 timer pause.
 *   Trener man ikke på et døgn, går ratingen sakte ned igjen.
 * - TURNERINGER: alle ligaer spilles samtidig over 7 dager, én kamp hver dag kl. 18:00.
 *   32 lag: 8 grupper à 4 (3 kamper), så åttedelsfinale, kvartfinale, semifinale og finale
 *   (+ bronsefinale). Påmelding (gratis) er døgnet før første kamp. Ligaene krever en minste rating.
 *   Premiepenger til 1., 2. og 3. plass, og pokal til vinneren.
 * - KAMPER: 11 minutter i virkeligheten (2 × 4,5 min + 2 min pause). 10 kampminutter = 1 minutt.
 *   Resultatet bestemmes av styrken til lagene + litt flaks, så et svakere lag kan vinne.
 *
 * Tallene er 1/10 av det som vises (som resten av spillet).
 */

export const FOOTBALL_TYPE = 'football';
export const isFootballType = (typeId: string) => typeId === FOOTBALL_TYPE;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export const SQUAD_SIZE = 11;

// --- Verdi og priser ----------------------------------------------------------------------
/** Verdien til en spiller: $ 2 M ved rating 65, $ 150 M ved rating 90 (vises 10x høyere). */
export function valueOf(rating: number): number {
  return 200_000 * Math.exp(0.1727 * (rating - 65));
}
/** Signeringssum per 7 dager: 10 % av verdien. */
export const CONTRACT_SHARE = 0.1;
export const CONTRACT_DAYS = 7;
export const GRACE_DAYS = 3;
/** Tvangssalg gir 50 % av verdien. */
export const FORCED_SHARE = 0.5;

// --- Aktiviteter -----------------------------------------------------------------------------
export type ActivityId = 'train' | 'hard' | 'prep';
export interface ActivityDef {
  id: ActivityId;
  name: string;
  text: string;
  hours: number;
  /** Permanent økning i rating (før den blir mindre nær taket). */
  gain: number;
  /** Ekstra styrke i neste kamp. */
  boost: number;
  /** Pris: fast del + andel av lagets verdi. */
  costBase: number;
  costShare: number;
}
export const ACTIVITIES: ActivityDef[] = [
  { id: 'train', name: 'Trening', text: 'Alle spillerne blir litt bedre (sakte).', hours: 1, gain: 0.08, boost: 0, costBase: 50_000, costShare: 0.002 },
  { id: 'hard', name: 'Hard trening', text: 'Alle spillerne blir bedre, mer enn vanlig trening.', hours: 3, gain: 0.2, boost: 0, costBase: 125_000, costShare: 0.005 },
  { id: 'prep', name: 'Kampforberedelse', text: 'Laget får +3 i styrke i neste kamp.', hours: 2, gain: 0, boost: 3, costBase: 100_000, costShare: 0.004 },
];
export const activityById = (id: ActivityId) => ACTIVITIES.find((a) => a.id === id)!;
/** Pause etter hver aktivitet. */
export const COOLDOWN_HOURS = 3;
/** Hvor mye en spiller kan trenes opp over ratingen han ble kjøpt med. */
export const MAX_GROWTH = 10;
const RATING_CAP = 94;
/** Uten aktivitet på et døgn: ratingen synker så mye per døgn (men aldri mer enn 5 under start). */
const DECAY_PER_DAY = 0.2;
const DECAY_FLOOR = 5;

// --- Kamper og turneringer -------------------------------------------------------------------
/** Første kampdag (lokal tid kl. 18:00). Alle ligaer følger samme 7-dagers syklus. */
const EPOCH = { y: 2026, m: 10, d: 19 };
export const ROUNDS = 7;
export const ROUND_NAMES = ['Gruppespill 1', 'Gruppespill 2', 'Gruppespill 3', 'Åttedelsfinale', 'Kvartfinale', 'Semifinale', 'Finale'];
/** Kampen varer 11 min i virkeligheten: 4,5 min + 2 min pause + 4,5 min. */
const HALF_MS = 270_000;
const BREAK_MS = 120_000;
export const MATCH_MS = HALF_MS * 2 + BREAK_MS;
/** Resultatet vises til kl. 18:15. */
export const RESULT_MS = 15 * 60_000;

// --- Tilstand --------------------------------------------------------------------------------
export interface FcPlayer {
  id: string;
  /** Spiller fra databasen (ekte spiller), eller tom for de opprinnelige spillerne. */
  ref?: string;
  name: string;
  /** Ratingen da han kom til klubben (taket er +10). */
  base: number;
  rating: number;
  /** Hva man betalte. */
  paid: number;
}

export interface MySnap {
  strength: number;
  names: string[];
  forfeit?: boolean;
}

export interface Tournament {
  league: string;
  cycle: number;
  /** 32 lag: 'me' (deg) + klubb-id-er. */
  teams: string[];
  /** 8 grupper à 4 (indekser i teams). Du er alltid i gruppe A. */
  groups: number[][];
  /** Din styrke og dine spillere i hver runde (tas ved avspark). */
  snaps: Record<number, MySnap>;
  /** Kamper som er lagt i kamphistorikken. */
  recorded: number[];
  left?: boolean;
  finished?: boolean;
  place?: number;
}

export interface MatchRecord {
  league: string;
  cycle: number;
  round: number;
  /** Motstanderens klubb-id. */
  opp: string;
  home: boolean;
  at: number;
  my: number;
  their: number;
  pens?: [number, number];
  snap: MySnap;
}

export interface FootballState {
  squad: FcPlayer[];
  /** De 11 opprinnelige spillerne (kommer tilbake ved tvangssalg). */
  originals: FcPlayer[];
  market: string[];
  /** Når lista kan oppdateres igjen. */
  marketNext: number;
  activity: { id: ActivityId; end: number } | null;
  cooldownEnd: number;
  lastActive: number;
  lastDecay: number;
  /** Ekstra styrke i neste kamp, og når den ble klar. */
  boost: number;
  contractDue: number | null;
  unpaidDeadline: number | null;
  tournament: Tournament | null;
  trophies: Record<string, number>;
  history: MatchRecord[];
  prizeTotal: number;
  /** Melding om noe som skjedde mens man var borte (tvangssalg, premie ...). */
  news: string[];
}

// --- Navn til de opprinnelige spillerne (ikke ekte fotballspillere) ------------------------------
const FIRST = ['Ola', 'Kari', 'Lars', 'Ingrid', 'Erik', 'Silje', 'Jonas', 'Mari', 'Henrik', 'Thea', 'Magnus', 'Nora', 'Sindre', 'Ida', 'Eirik', 'Live', 'Petter', 'Vilde', 'Kristoffer', 'Tuva', 'Anders', 'Maja'];
const LAST = ['Nordmann', 'Bakke', 'Lunde', 'Haugen', 'Strand', 'Moen', 'Dahl', 'Lie', 'Solberg', 'Brekke', 'Aune', 'Tveit', 'Fjeld', 'Myhre', 'Vik', 'Sæther', 'Kvam', 'Rønning', 'Hovland', 'Grønli'];

const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const pick = <T>(list: T[], rand = Math.random) => list[Math.floor(rand() * list.length)];

function newOriginals(): FcPlayer[] {
  return Array.from({ length: SQUAD_SIZE }, () => {
    const rating = 50 + Math.round(Math.random() * 100) / 10;
    return { id: uid('o'), name: `${pick(FIRST)} ${pick(LAST)}`, base: rating, rating, paid: 0 };
  });
}

export function newFootball(now = Date.now()): FootballState {
  const originals = newOriginals();
  return {
    squad: originals.map((x) => ({ ...x })),
    originals,
    market: [],
    marketNext: 0,
    activity: null,
    cooldownEnd: 0,
    lastActive: now,
    lastDecay: now,
    boost: 0,
    contractDue: null,
    unpaidDeadline: null,
    tournament: null,
    trophies: {},
    history: [],
    prizeTotal: 0,
    news: [],
  };
}

export function fcOf(b: Business): FootballState {
  b.football ??= newFootball();
  return b.football;
}

// --- Laget ----------------------------------------------------------------------------------
export const isOriginal = (x: FcPlayer) => !x.ref;
export const capOf = (x: FcPlayer) => Math.min(RATING_CAP, x.base + MAX_GROWTH);
/** Hva spilleren kan selges for nå (de opprinnelige er ikke verdt noe). */
export const saleValue = (x: FcPlayer) => (isOriginal(x) ? 0 : valueOf(x.rating));
export function clubRating(s: FootballState): number {
  if (!s.squad.length) return 0;
  return s.squad.reduce((sum, x) => sum + x.rating, 0) / s.squad.length;
}
export const squadValue = (s: FootballState) => s.squad.reduce((sum, x) => sum + saleValue(x), 0);
/** Signeringssummen for de kjøpte spillerne på laget nå. */
export const contractBill = (s: FootballState) => s.squad.filter((x) => !isOriginal(x)).reduce((sum, x) => sum + valueOf(x.rating) * CONTRACT_SHARE, 0);

// --- Tid og syklus --------------------------------------------------------------------------
/** Avspark (kl. 18:00 lokal tid) for kampdag nr. `day` (0 = første dag). */
export const kickoffAt = (day: number) => new Date(EPOCH.y, EPOCH.m, EPOCH.d + day, 18, 0, 0, 0).getTime();
/** Avspark for runde `round` i syklus `cycle`. */
export const roundKickoff = (cycle: number, round: number) => kickoffAt(cycle * ROUNDS + round);

/** Syklusen man kan melde seg på nå (eller den neste som starter). */
export function upcomingCycle(now: number): number {
  let c = Math.floor((now - kickoffAt(0)) / (ROUNDS * DAY));
  while (roundKickoff(c, 0) <= now) c++;
  while (c > 0 && roundKickoff(c - 1, 0) > now) c--;
  return c;
}
/** Påmeldingen åpner når forrige finale er ferdig (kl. 18:15) og stenger ved første avspark. */
export const registrationOpens = (cycle: number) => roundKickoff(cycle - 1, ROUNDS - 1) + RESULT_MS;
export const isRegistrationOpen = (now: number) => now >= registrationOpens(upcomingCycle(now));

// --- Markedet ----------------------------------------------------------------------------------
export const MARKET_SIZE = 10;
export function refreshMarket(s: FootballState, now = Date.now(), force = false): boolean {
  if (!force && s.market.length && now < s.marketNext) return false;
  const owned = new Set(s.squad.map((x) => x.ref).filter(Boolean));
  const pool = PLAYERS.filter((x) => !owned.has(x.id));
  const list: string[] = [];
  while (list.length < MARKET_SIZE && pool.length) list.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
  s.market = list.sort((a, b) => playerDef(b)!.rating - playerDef(a)!.rating);
  s.marketNext = now + HOUR;
  return true;
}

// --- Betaling --------------------------------------------------------------------------------
export interface FcPay {
  /** Bruk penger (false hvis man ikke har råd). `capital` = blir en del av bedriftens verdi. */
  spend(amount: number, capital: boolean): boolean;
  /** Premiepenger (inntekt, med skatt). */
  earn(gross: number): void;
  /** Salg av spillere: pengene rett tilbake (ingen skatt). `paid` = hva spilleren kostet. */
  receive(amount: number, paid: number): void;
}

export type FcResult = 'ok' | 'money' | 'full' | 'busy' | 'live' | 'gone' | 'need' | 'closed' | 'rating' | 'joined';

/** Er det en kamp med laget ditt på gang akkurat nå? (da kan man ikke endre noe) */
export function liveRound(s: FootballState, now = Date.now()): number | null {
  const t = s.tournament;
  if (!t || t.left) return null;
  for (let r = 0; r < ROUNDS; r++) {
    const k = roundKickoff(t.cycle, r);
    if (now >= k && now < k + MATCH_MS && myOpponent(t, r) !== null) return r;
  }
  return null;
}

/** Kjøper en spiller. Er laget fullt, må `replaceId` (spilleren som selges) være satt. */
export function buyPlayer(s: FootballState, pay: FcPay, refId: string, replaceId: string | null, now = Date.now()): FcResult {
  const def = playerDef(refId);
  if (!def || !s.market.includes(refId)) return 'gone';
  if (liveRound(s, now) !== null) return 'live';
  const replace = replaceId ? s.squad.find((x) => x.id === replaceId) : undefined;
  if (s.squad.length >= SQUAD_SIZE && !replace) return 'full';
  const price = valueOf(def.rating);
  if (!pay.spend(price, true)) return 'money';
  if (replace) sellPlayer(s, pay, replace.id, now);
  s.squad.push({ id: uid('p'), ref: def.id, name: def.name, base: def.rating, rating: def.rating, paid: price });
  s.market = s.market.filter((x) => x !== refId);
  // Første kjøp: kontraktsperioden på 7 dager starter
  s.contractDue ??= now + CONTRACT_DAYS * DAY;
  return 'ok';
}

/** Selger (eller slipper) en spiller fra laget. */
export function sellPlayer(s: FootballState, pay: FcPay, id: string, now = Date.now()): FcResult {
  const x = s.squad.find((p) => p.id === id);
  if (!x) return 'gone';
  if (liveRound(s, now) !== null) return 'live';
  s.squad = s.squad.filter((p) => p !== x);
  if (!isOriginal(x)) pay.receive(saleValue(x), x.paid);
  else {
    // De opprinnelige huskes med ratingen de har nå
    const o = s.originals.find((p) => p.id === x.id);
    if (o) o.rating = x.rating;
  }
  if (contractBill(s) <= 0) s.unpaidDeadline = null;
  return 'ok';
}

/** Betaler signeringssummen for de kjøpte spillerne. */
export function payContracts(s: FootballState, pay: FcPay): FcResult {
  if (s.unpaidDeadline === null) return 'gone';
  if (!pay.spend(contractBill(s), false)) return 'money';
  s.unpaidDeadline = null;
  return 'ok';
}

/** Tvangssalg: alle kjøpte spillere selges for 50 %, de opprinnelige kommer tilbake. */
function forceSell(s: FootballState, pay: FcPay) {
  for (const x of s.squad) {
    if (isOriginal(x)) {
      const o = s.originals.find((p) => p.id === x.id);
      if (o) o.rating = x.rating;
      continue;
    }
    const amount = saleValue(x) * FORCED_SHARE;
    pay.receive(amount, x.paid);
  }
  s.squad = s.originals.map((x) => ({ ...x }));
  s.unpaidDeadline = null;
  s.contractDue = null;
  s.news.push('Kontraktene ble ikke betalt. Alle kjøpte spillere ble tvangssolgt for 50 % av verdien, og de opprinnelige spillerne er tilbake.');
}

// --- Aktiviteter -----------------------------------------------------------------------------
export const activityCost = (s: FootballState, a: ActivityDef) => a.costBase + squadValue(s) * a.costShare;

export function startActivity(s: FootballState, pay: FcPay, id: ActivityId, now = Date.now()): FcResult {
  if (s.activity || now < s.cooldownEnd) return 'busy';
  if (liveRound(s, now) !== null) return 'live';
  if (!s.squad.length) return 'need';
  const a = activityById(id);
  if (!pay.spend(activityCost(s, a), false)) return 'money';
  s.activity = { id, end: now + a.hours * HOUR };
  return 'ok';
}

function finishActivity(s: FootballState) {
  const act = s.activity!;
  const a = activityById(act.id);
  for (const x of s.squad) {
    const cap = capOf(x);
    // Jo nærmere taket, jo saktere går det
    const m = Math.max(0.15, Math.min(1, (cap - x.rating) / MAX_GROWTH));
    x.rating = Math.min(cap, x.rating + a.gain * m);
  }
  if (a.boost) s.boost = a.boost;
  s.lastActive = act.end;
  s.lastDecay = Math.max(s.lastDecay, act.end);
  s.cooldownEnd = act.end + COOLDOWN_HOURS * HOUR;
  s.activity = null;
}

// --- Turnering ----------------------------------------------------------------------------------
/** Melder laget på en liga (gratis). Motstanderne og gruppene trekkes med en gang. */
export function joinLeague(s: FootballState, leagueId: string, now = Date.now()): FcResult {
  const league = leagueById(leagueId);
  if (!isRegistrationOpen(now)) return 'closed';
  const cycle = upcomingCycle(now);
  if (s.tournament && s.tournament.cycle >= cycle) return 'joined';
  if (s.squad.length < SQUAD_SIZE) return 'need';
  if (clubRating(s) < league.minRating) return 'rating';
  const rand = seededRandom(hashString(`${leagueId}:${cycle}:${now}`));
  const opponents = [...CLUBS]
    .map((c) => ({ c, score: Math.abs(c.rating - league.level) + rand() * 4 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 31)
    .map((x) => x.c.id);
  // Stokk motstanderne og lag 8 grupper. Du er alltid i gruppe A.
  for (let i = opponents.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [opponents[i], opponents[j]] = [opponents[j], opponents[i]];
  }
  const teams = ['me', ...opponents];
  const groups = Array.from({ length: 8 }, (_, g) => [0, 1, 2, 3].map((i) => g * 4 + i));
  s.tournament = { league: league.id, cycle, teams, groups, snaps: {}, recorded: [] };
  return 'ok';
}

export function leaveLeague(s: FootballState): FcResult {
  if (!s.tournament || s.tournament.finished) return 'gone';
  s.tournament.left = true;
  return 'ok';
}

// --- Kampsimulering --------------------------------------------------------------------------------
export type EventType = 'goal' | 'pen-goal' | 'pen-miss' | 'yellow' | 'red' | 'corner' | 'freekick' | 'save' | 'offside' | 'shootout';
export interface MatchEvent {
  min: number;
  /** 0 = laget til venstre (hjemme), 1 = laget til høyre. */
  side: 0 | 1;
  type: EventType;
  player?: string;
  /** Straffekonk: scoret eller bom. */
  ok?: boolean;
}
export interface MatchResult {
  ga: number;
  gb: number;
  pens?: [number, number];
  events: MatchEvent[];
}

function poisson(rand: () => number, lambda: number): number {
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l && k < 20);
  return k - 1;
}

/**
 * Spiller en kamp. Samme frø gir alltid samme kamp (så den kan vises "live" og i historikken).
 * Styrken avgjør hvor mange mål lagene forventes å score, men det er alltid litt flaks.
 */
export function simulate(seed: string, sa: number, sb: number, knockout: boolean, namesA: string[], namesB: string[]): MatchResult {
  const rand = seededRandom(hashString(seed));
  const formA = sa + (rand() - 0.5) * 4;
  const formB = sb + (rand() - 0.5) * 4;
  const diff = (formA - formB) / 11;
  const la = 1.35 * Math.exp(diff);
  const lb = 1.35 * Math.exp(-diff);
  const share = la / (la + lb);
  const events: MatchEvent[] = [];
  const who = (side: 0 | 1) => {
    const list = side === 0 ? namesA : namesB;
    return list.length ? pick(list, rand) : undefined;
  };
  const minute = () => 1 + Math.floor(rand() * 90);
  const add = (side: 0 | 1, type: EventType, count: number) => {
    for (let i = 0; i < count; i++) events.push({ min: minute(), side, type, player: who(side) });
  };
  const ga = poisson(rand, la);
  const gb = poisson(rand, lb);
  // Mål: noen av dem er straffer
  for (const [side, goals] of [[0, ga], [1, gb]] as [0 | 1, number][]) {
    for (let i = 0; i < goals; i++) events.push({ min: minute(), side, type: rand() < 0.15 ? 'pen-goal' : 'goal', player: who(side) });
  }
  if (rand() < 0.12) add(rand() < share ? 0 : 1, 'pen-miss', 1);
  add(0, 'corner', poisson(rand, 9 * share));
  add(1, 'corner', poisson(rand, 9 * (1 - share)));
  add(0, 'save', poisson(rand, 5 * share));
  add(1, 'save', poisson(rand, 5 * (1 - share)));
  add(0, 'freekick', poisson(rand, 2));
  add(1, 'freekick', poisson(rand, 2));
  add(0, 'offside', poisson(rand, 1.2));
  add(1, 'offside', poisson(rand, 1.2));
  add(0, 'yellow', poisson(rand, 1.6));
  add(1, 'yellow', poisson(rand, 1.6));
  if (rand() < 0.04) add(0, 'red', 1);
  if (rand() < 0.04) add(1, 'red', 1);
  events.sort((a, b) => a.min - b.min);

  let pens: [number, number] | undefined;
  if (knockout && ga === gb) {
    // Straffekonkurranse: 5 hver, så sudden death
    pens = [0, 0];
    for (let i = 0; i < 20; i++) {
      for (const side of [0, 1] as const) {
        const ok = rand() < 0.75 + (side === 0 ? diff : -diff) * 0.05;
        if (ok) pens[side]++;
        events.push({ min: 120 + i, side, type: 'shootout', player: who(side), ok });
      }
      const left = Math.max(0, 4 - i);
      if (i >= 4 && pens[0] !== pens[1]) break;
      if (i < 4 && Math.abs(pens[0] - pens[1]) > left) break;
    }
  }
  return { ga, gb, pens, events };
}

/** Navn på spillere (fra databasen) som spiller for en klubb – brukes i kampmeldinger. */
const clubPlayers = (clubId: string) => PLAYERS.filter((x) => x.club === clubId).map((x) => x.name);
const teamStrength = (t: Tournament, team: number, round: number) =>
  t.teams[team] === 'me' ? (t.snaps[round]?.strength ?? 0) : (clubById(t.teams[team])?.rating ?? 60);

const resultCache = new Map<string, MatchResult>();

/** Resultatet av en kamp i turneringen (a er hjemmelag). */
export function matchResult(t: Tournament, round: number, a: number, b: number): MatchResult {
  const key = `${t.league}:${t.cycle}:${round}:${a}:${b}:${t.snaps[round]?.strength ?? ''}:${t.left ? 1 : 0}`;
  const cached = resultCache.get(key);
  if (cached) return cached;
  const meA = t.teams[a] === 'me';
  const meB = t.teams[b] === 'me';
  const snap = t.snaps[round];
  let r: MatchResult;
  // Ikke 11 spillere (eller trukket seg): tapt 0–3
  if ((meA || meB) && (!snap || snap.forfeit)) {
    r = meA ? { ga: 0, gb: 3, events: [] } : { ga: 3, gb: 0, events: [] };
  } else {
    const names = (i: number) => (t.teams[i] === 'me' ? snap?.names ?? [] : clubPlayers(t.teams[i]));
    r = simulate(`${t.league}:${t.cycle}:${round}:${t.teams[a]}:${t.teams[b]}`, teamStrength(t, a, round), teamStrength(t, b, round), round >= 3, names(a), names(b));
  }
  resultCache.set(key, r);
  return r;
}

/** Hvem vant (indeks), eller null ved uavgjort. */
export function winnerOf(r: MatchResult, a: number, b: number): number | null {
  if (r.ga !== r.gb) return r.ga > r.gb ? a : b;
  if (r.pens) return r.pens[0] > r.pens[1] ? a : b;
  return null;
}

export interface TableRow {
  team: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  points: number;
}

/** Gruppekampene: runde 0: 1–2 og 3–4, runde 1: 1–3 og 2–4, runde 2: 1–4 og 2–3. */
export function groupPairs(group: number[], round: number): [number, number][] {
  const [a, b, c, d] = group;
  if (round === 0) return [[a, b], [c, d]];
  if (round === 1) return [[a, c], [b, d]];
  return [[d, a], [b, c]];
}

/** Tabellen i en gruppe etter kampene som er ferdige (før runde `upTo`). */
export function groupTable(t: Tournament, group: number[], upTo: number): TableRow[] {
  const rows = new Map<number, TableRow>(group.map((team) => [team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }]));
  for (let r = 0; r < Math.min(3, upTo); r++) {
    for (const [a, b] of groupPairs(group, r)) {
      const res = matchResult(t, r, a, b);
      const ra = rows.get(a)!;
      const rb = rows.get(b)!;
      ra.played++;
      rb.played++;
      ra.gf += res.ga;
      ra.ga += res.gb;
      rb.gf += res.gb;
      rb.ga += res.ga;
      if (res.ga > res.gb) {
        ra.won++;
        rb.lost++;
        ra.points += 3;
      } else if (res.ga < res.gb) {
        rb.won++;
        ra.lost++;
        rb.points += 3;
      } else {
        ra.drawn++;
        rb.drawn++;
        ra.points++;
        rb.points++;
      }
    }
  }
  // Poeng, så flest mål, så målforskjell, så rating
  return [...rows.values()].sort(
    (x, y) =>
      y.points - x.points ||
      y.gf - x.gf ||
      y.gf - y.ga - (x.gf - x.ga) ||
      teamStrength(t, y.team, 2) - teamStrength(t, x.team, 2) ||
      x.team - y.team,
  );
}

/** Kampene i en runde (hjemmelag, bortelag). Bronsefinalen er med i siste runde. */
export function roundPairs(t: Tournament, round: number): [number, number][] {
  if (round < 3) return t.groups.flatMap((g) => groupPairs(g, round));
  if (round === 3) {
    const tables = t.groups.map((g) => groupTable(t, g, 3));
    const pairs: [number, number][] = [];
    for (let g = 0; g < 8; g += 2) {
      pairs.push([tables[g][0].team, tables[g + 1][1].team]);
      pairs.push([tables[g + 1][0].team, tables[g][1].team]);
    }
    return pairs;
  }
  const prev = roundPairs(t, round - 1);
  const winners = prev.slice(0, round === 6 ? 2 : prev.length).map(([a, b]) => winnerOf(matchResult(t, round - 1, a, b), a, b)!);
  if (round < 6) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < winners.length; i += 2) pairs.push([winners[i], winners[i + 1]]);
    return pairs;
  }
  // Finale + bronsefinale (taperne av semifinalene)
  const semis = roundPairs(t, 5);
  const losers = semis.map(([a, b]) => {
    const w = winnerOf(matchResult(t, 5, a, b), a, b);
    return w === a ? b : a;
  });
  return [[winners[0], winners[1]], [losers[0], losers[1]]];
}

/** Motstanderen din i en runde (indeks), eller null hvis du ikke spiller (ute / ikke kommet videre). */
export function myOpponent(t: Tournament, round: number): { pair: [number, number]; home: boolean } | null {
  // Til og med forrige runde må være spilt for å vite hvem som møtes
  const pairs = roundPairs(t, round);
  const pair = pairs.find(([a, b]) => a === 0 || b === 0);
  if (!pair) return null;
  return { pair, home: pair[0] === 0 };
}

/** Kan resultatene i runden vises? (kampen er ferdig) */
export const roundDone = (t: Tournament, round: number, now = Date.now()) => now >= roundKickoff(t.cycle, round) + MATCH_MS;

/** Plassering når turneringen er ferdig: 1–4, eller null hvis man røk ut før. */
export function finalPlace(t: Tournament): number | null {
  const [final, bronze] = roundPairs(t, 6);
  for (const [i, [a, b]] of [final, bronze].entries()) {
    if (a !== 0 && b !== 0) continue;
    const w = winnerOf(matchResult(t, 6, a, b), a, b);
    return i * 2 + (w === 0 ? 1 : 2);
  }
  return null;
}

// --- Tiden går ------------------------------------------------------------------------------------
/**
 * Kjøres hele tiden: aktiviteter blir ferdige, ratingen synker uten trening, kontrakter forfaller,
 * og kampene spilles (styrken tas ved avspark). Premiepenger betales når turneringen er ferdig.
 */
export function tickFootball(b: Business, pay: FcPay, now: number) {
  const s = fcOf(b);
  if (s.activity && s.activity.end <= now) finishActivity(s);

  // Ingen aktivitet på et døgn: ratingen synker sakte
  const decayFrom = Math.max(s.lastDecay, s.lastActive + DAY);
  if (now > decayFrom) {
    const drop = (DECAY_PER_DAY * (now - decayFrom)) / DAY;
    for (const x of s.squad) {
      const floor = Math.max(40, x.base - DECAY_FLOOR);
      x.rating = Math.max(Math.min(x.rating, floor), x.rating - drop);
    }
    s.lastDecay = now;
  }

  // Kontrakter: hver 7. dag skal de kjøpte spillerne betales, 3 dager frist
  while (s.contractDue !== null && now >= s.contractDue) {
    if (contractBill(s) > 0 && s.unpaidDeadline === null) s.unpaidDeadline = s.contractDue + GRACE_DAYS * DAY;
    s.contractDue += CONTRACT_DAYS * DAY;
  }
  if (s.unpaidDeadline !== null && now >= s.unpaidDeadline) {
    if (contractBill(s) > 0) forceSell(s, pay);
    else s.unpaidDeadline = null;
  }

  const t = s.tournament;
  if (!t || t.finished) return;
  for (let r = 0; r < ROUNDS; r++) {
    const k = roundKickoff(t.cycle, r);
    if (now < k) break;
    // Avspark: ta et "bilde" av laget ditt (styrke og navn)
    if (!t.snaps[r] && myOpponent(t, r)) {
      const full = s.squad.length >= SQUAD_SIZE && !t.left;
      t.snaps[r] = {
        strength: clubRating(s) + (s.boost || 0),
        names: s.squad.map((x) => x.name),
        forfeit: !full,
      };
      s.boost = 0;
    }
    // Ferdig kamp: legg den i kamphistorikken
    if (now >= k + MATCH_MS && !t.recorded.includes(r)) {
      t.recorded.push(r);
      const opp = myOpponent(t, r);
      if (opp && t.snaps[r]) {
        const res = matchResult(t, r, opp.pair[0], opp.pair[1]);
        const other = opp.home ? opp.pair[1] : opp.pair[0];
        s.history.unshift({
          league: t.league,
          cycle: t.cycle,
          round: r,
          opp: t.teams[other],
          home: opp.home,
          at: k,
          my: opp.home ? res.ga : res.gb,
          their: opp.home ? res.gb : res.ga,
          pens: res.pens ? (opp.home ? res.pens : [res.pens[1], res.pens[0]]) : undefined,
          snap: t.snaps[r],
        });
        if (s.history.length > 60) s.history.length = 60;
      }
    }
  }
  // Turneringen er ferdig: premie og pokal
  if (now >= roundKickoff(t.cycle, ROUNDS - 1) + MATCH_MS) {
    t.finished = true;
    const place = t.left ? null : finalPlace(t);
    t.place = place ?? undefined;
    const league = leagueById(t.league);
    if (place && place <= 3) {
      const prize = league.prizes[place - 1];
      pay.earn(prize);
      s.prizeTotal += prize;
      if (place === 1) s.trophies[league.id] = (s.trophies[league.id] ?? 0) + 1;
      s.news.push(place === 1 ? `Dere vant ${league.name}!` : `Dere kom på ${place}. plass i ${league.name}.`);
    }
  }
}

/** Kampminuttet akkurat nå (0–90), eller pause / ferdig. */
export function matchClock(kickoff: number, now = Date.now()): { phase: 'before' | 'first' | 'break' | 'second' | 'done'; minute: number } {
  const e = now - kickoff;
  if (e < 0) return { phase: 'before', minute: 0 };
  if (e < HALF_MS) return { phase: 'first', minute: Math.min(45, Math.floor(e / 6000) + 1) };
  if (e < HALF_MS + BREAK_MS) return { phase: 'break', minute: 45 };
  if (e < MATCH_MS) return { phase: 'second', minute: Math.min(90, 46 + Math.floor((e - HALF_MS - BREAK_MS) / 6000)) };
  return { phase: 'done', minute: 90 };
}

/** Spiller av en kamp fra kamphistorikken på nytt (samme frø = samme kamp). Venstre side = deg. */
export function replay(rec: MatchRecord): MatchResult {
  if (rec.snap.forfeit) return { ga: 0, gb: 3, events: [] };
  const opp = clubById(rec.opp);
  const [home, away] = rec.home ? ['me', rec.opp] : [rec.opp, 'me'];
  const r = simulate(
    `${rec.league}:${rec.cycle}:${rec.round}:${home}:${away}`,
    rec.home ? rec.snap.strength : opp?.rating ?? 60,
    rec.home ? opp?.rating ?? 60 : rec.snap.strength,
    rec.round >= 3,
    rec.home ? rec.snap.names : clubPlayers(rec.opp),
    rec.home ? clubPlayers(rec.opp) : rec.snap.names,
  );
  if (rec.home) return r;
  // Snu kampen så laget ditt alltid er til venstre
  return {
    ga: r.gb,
    gb: r.ga,
    pens: r.pens ? [r.pens[1], r.pens[0]] : undefined,
    events: r.events.map((e) => ({ ...e, side: (1 - e.side) as 0 | 1 })),
  };
}

export { CLUBS, LEAGUES, PLAYERS, clubById, leagueById, playerDef, type LeagueDef };
