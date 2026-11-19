import type { Business } from '../game/business';
import {
  ACTIVITIES,
  activityById,
  activityCost,
  capOf,
  clubById,
  clubRating,
  contractBill,
  CONTRACT_SHARE,
  COOLDOWN_HOURS,
  fcOf,
  groupTable,
  isOriginal,
  isRegistrationOpen,
  LEAGUES,
  leagueById,
  liveRound,
  matchClock,
  matchResult,
  myOpponent,
  playerDef,
  registrationOpens,
  replay,
  RESULT_MS,
  roundDone,
  roundKickoff,
  roundPairs,
  ROUND_NAMES,
  ROUNDS,
  saleValue,
  SQUAD_SIZE,
  squadValue,
  upcomingCycle,
  valueOf,
  type FcPlayer,
  type FootballState,
  type MatchEvent,
  type MatchResult,
  type Tournament,
} from '../game/football';
import { CLUB_LOGOS, PLAYER_PHOTOS } from '../game/footballImages';
import type { GameState } from '../game/state';
import { formatDuration, formatMoney, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';

/*
 * Sidene til fotballklubben:
 *   detail      – oversikt: turnering, klubb (rating, trofeer, spillere, trening), kontrakter, overganger, kamper
 *   fLeagues    – ligaene man kan melde seg på
 *   fTournament – turneringen: neste kamp, tabeller og sluttspill
 *   fMatch      – én kamp (live eller ferdig) med alle hendelsene
 *   fRecord     – en kamp fra kamphistorikken
 *   fSquad      – spillerne på laget
 *   fPlayer     – én spiller (selg)
 *   fMarket     – overgangslista
 *   fBuy        – kjøp en spiller (velg hvem som skal ut hvis laget er fullt)
 *   fTraining   – trening og kampforberedelse
 *   fTrophies   – trofeskapet
 *   fHistory    – kamphistorikk
 */

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const rating1 = (r: number) => r.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

// --- Logoer og bilder -------------------------------------------------------------------------
/** Klubblogo (eller forkortelse hvis logoen mangler). 'me' = din klubb. */
export function clubLogo(id: string, cls = ''): string {
  if (id === 'me') return `<span class="fc-logo me ${cls}">${icons.pitch}</span>`;
  const club = clubById(id);
  const file = CLUB_LOGOS[id];
  return `<span class="fc-logo ${cls}" data-short="${club?.short ?? '?'}">${file ? `<img src="football/clubs/${file}" alt="" loading="lazy" onerror="this.remove()" />` : ''}</span>`;
}
const clubName = (b: Business, id: string) => (id === 'me' ? esc(b.name) : clubById(id)?.name ?? id);

/** Spillerbilde. De opprinnelige spillerne (og spillere uten bilde) får et grått ikon. */
function face(ref: string | undefined, cls = ''): string {
  const file = ref ? PLAYER_PHOTOS[ref] : undefined;
  return `<span class="fc-face ${cls}">${icons.person}${file ? `<img src="football/players/${file}" alt="" loading="lazy" onerror="this.remove()" />` : ''}</span>`;
}

/** "i dag kl. 18:00" / "i morgen kl. 18:00" / "lør. 21. nov. kl. 18:00" */
function when(ms: number): string {
  const d = new Date(ms);
  const time = `kl. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const today = new Date();
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
  if (days === 0) return `i dag ${time}`;
  if (days === 1) return `i morgen ${time}`;
  return `${d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })} ${time}`;
}
const countdown = (ms: number) => formatDuration(Math.max(0, ms - Date.now()) / 1000);

// =========================================================================
// Forsiden
// =========================================================================
/** Kort status om turneringen (vises på forsiden). */
function tournamentStatus(b: Business, s: FootballState, now: number): { text: string; live: boolean } {
  const t = s.tournament;
  const cycle = upcomingCycle(now);
  if (t && !t.finished) {
    const league = leagueById(t.league).name;
    if (t.left) return { text: `Dere har trukket dere fra ${league}.`, live: false };
    const live = liveRound(s, now);
    if (live !== null) return { text: `Kampen i ${league} er i gang nå!`, live: true };
    const next = nextMyRound(t, now);
    if (next === null) return { text: `Dere er ute av ${league}. Turneringen spilles ferdig.`, live: false };
    const opp = myOpponent(t, next);
    const other = opp ? t.teams[opp.home ? opp.pair[1] : opp.pair[0]] : null;
    return { text: `${league}: ${ROUND_NAMES[next]} mot ${other ? clubName(b, other) : '?'} ${when(roundKickoff(t.cycle, next))}.`, live: false };
  }
  if (isRegistrationOpen(now) && (!t || t.cycle < cycle)) {
    return { text: `Påmeldingen er åpen! Første kamp spilles ${when(roundKickoff(cycle, 0))}.`, live: false };
  }
  return { text: `Neste påmelding åpner ${when(registrationOpens(cycle + (isRegistrationOpen(now) ? 1 : 0)))}.`, live: false };
}

/** Neste runde der laget ditt spiller (eller kampen som vises frem til kl. 18:15), eller null. */
export function nextMyRound(t: Tournament, now: number): number | null {
  for (let r = 0; r < ROUNDS; r++) {
    const k = roundKickoff(t.cycle, r);
    // Kampen (og resultatet) vises til kl. 18:15, så kommer neste
    if (now >= k + RESULT_MS) continue;
    // Runden er ikke spilt ennå: er motstanderen klar? (forrige runde må være ferdig)
    if (r > 0 && !roundDone(t, r - 1, now)) return null;
    return myOpponent(t, r) ? r : null;
  }
  return null;
}

export function renderFootballDetail(state: GameState, b: Business, hero: string): string {
  const s = fcOf(b);
  const now = Date.now();
  const status = tournamentStatus(b, s, now);
  const bought = s.squad.filter((x) => !isOriginal(x));
  const bill = contractBill(s);
  const actReady = !s.activity && now >= s.cooldownEnd;

  let contract: string;
  if (s.unpaidDeadline !== null) {
    contract = `
      <div class="fc-contract unpaid">
        <strong>Kontraktene må betales!</strong>
        <span>Frist: ${when(s.unpaidDeadline)} (${countdown(s.unpaidDeadline)}). Betaler du ikke, blir alle kjøpte spillere tvangssolgt for 50 %.</span>
        <button class="fc-btn ${state.balance >= bill ? '' : 'poor'}" data-action="f-pay" data-id="${b.id}">Betal ${formatMoneyFull(bill)}</button>
      </div>`;
  } else if (bought.length && s.contractDue !== null) {
    contract = `
      <div class="fc-contract">
        <strong>Kontrakter</strong>
        <span>Neste signeringssum for ${bought.length} kjøpte spillere: <b>${formatMoneyFull(bill)}</b> ${when(s.contractDue)}. Du har 3 dager på deg til å betale.</span>
      </div>`;
  } else {
    contract = `
      <div class="fc-contract">
        <strong>Kontrakter</strong>
        <span>Ingen kjøpte spillere. Kjøpte spillere skal ha en signeringssum (${Math.round(CONTRACT_SHARE * 100)} % av verdien) hver 7. dag.</span>
      </div>`;
  }

  return `
    ${hero}
    <div class="biz-income-card con-values">
      <strong>${formatMoney(squadValue(s))}</strong>
      <span>Lagets verdi</span>
      <i class="con-divider"></i>
      <strong>${formatMoney(s.prizeTotal)}</strong>
      <span>Premiepenger totalt</span>
    </div>
    ${s.news.length ? `<div class="fc-news">${s.news.map((n) => `<p>${esc(n)}</p>`).join('')}<button data-action="f-news" data-id="${b.id}">OK</button></div>` : ''}

    <button class="fc-champ" data-action="${s.tournament && !s.tournament.finished ? 'f-tournament' : 'f-leagues'}" data-id="${b.id}">
      ${status.live ? '<span class="fc-live">LIVE</span>' : ''}
      <div class="fc-champ-head">${icons.trophy}<h2>Turneringer</h2></div>
      <p>Spill turneringer i ulike ligaer for å vinne pokaler og premiepenger. Jo bedre lag, jo større ligaer.</p>
      <p class="fc-champ-status">${status.text}</p>
      <span class="fc-link">${s.tournament && !s.tournament.finished ? 'Se turneringen' : 'Se ligaene'}</span>
    </button>
    ${s.tournament && !s.tournament.finished ? `<button class="fc-link small" data-action="f-leagues" data-id="${b.id}">Se alle ligaene</button>` : ''}

    <section class="fc-band">
      <h2 class="fc-title">Klubb</h2>
      <div class="fc-grid top">
        <div class="fc-tile rating"><strong>${rating1(clubRating(s))}</strong><span>Rating</span></div>
        <button class="fc-tile trophies" data-action="f-trophies" data-id="${b.id}">${icons.trophy}<strong>Trofeer</strong></button>
        </div>
      <div class="fc-grid two">
        <button class="fc-tile" data-action="f-squad" data-id="${b.id}">${icons.kick}<strong>Spillere</strong><span>${s.squad.length}/${SQUAD_SIZE}</span></button>
        <button class="fc-tile" data-action="f-training" data-id="${b.id}">${actReady ? '<i class="fc-dot"></i>' : ''}${icons.dumbbell}<strong>Trening</strong><span>${s.activity ? 'Pågår' : actReady ? 'Klar' : 'Pause'}</span></button>
      </div>
      ${contract}
    </section>

    <section class="fc-plain">
      <h2 class="fc-title">Overganger</h2>
      <p>Gjør klubben sterkere ved å kjøpe nye spillere til laget.</p>
      <button class="fc-link" data-action="f-market" data-id="${b.id}">Åpne overgangslista</button>
    </section>

    <section class="fc-band">
      <h2 class="fc-title">Kamper</h2>
      <button class="fc-history-btn" data-action="f-history" data-id="${b.id}">${icons.history}<strong>Kamphistorikk</strong></button>
    </section>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
  `;
}

// =========================================================================
// Ligaer og turnering
// =========================================================================
export function renderLeagues(b: Business): string {
  const s = fcOf(b);
  const now = Date.now();
  const open = isRegistrationOpen(now);
  const cycle = upcomingCycle(now);
  const joined = s.tournament && s.tournament.cycle >= cycle && !s.tournament.finished ? s.tournament : null;
  const busy = s.tournament && !s.tournament.finished && s.tournament.cycle < cycle;
  const rating = clubRating(s);
  let info: string;
  if (busy) info = `Dere er med i ${leagueById(s.tournament!.league).name}. Du kan bli med i en ny liga når den er ferdig.`;
  else if (joined) info = `Dere er påmeldt ${leagueById(joined.league).name}. Første kamp ${when(roundKickoff(cycle, 0))}.`;
  else if (open) info = `Påmeldingen er åpen til ${when(roundKickoff(cycle, 0))} (${countdown(roundKickoff(cycle, 0))}). Det er gratis å være med.`;
  else info = `Påmeldingen er stengt. Neste påmelding åpner ${when(registrationOpens(cycle))}.`;

  const cards = LEAGUES.map((l) => {
    const okRating = rating >= l.minRating;
    const canJoin = open && !joined && !busy && okRating && s.squad.length >= SQUAD_SIZE;
    const isMine = (joined ?? (busy ? s.tournament : null))?.league === l.id;
    return `
      <div class="fc-league ${isMine ? 'mine' : ''}">
        <span class="fc-cup" style="color:${l.color}">${icons.trophy}</span>
        <div class="fc-league-text">
          <strong>${l.name}</strong>
          <span class="${okRating ? '' : 'fc-bad'}">Krever rating ${l.minRating || 'ingen'}</span>
          <span>1. ${formatMoneyWhole(l.prizes[0])} · 2. ${formatMoneyWhole(l.prizes[1])} · 3. ${formatMoneyWhole(l.prizes[2])}</span>
        </div>
        ${isMine ? '<b class="fc-joined">Påmeldt</b>' : `<button class="fc-join" data-action="f-join" data-id="${b.id}" data-league="${l.id}" ${canJoin ? '' : 'disabled'}>Bli med</button>`}
      </div>`;
  }).join('');
  return `
    <h1 class="con-page-title">Ligaer</h1>
    <p class="fc-info">${info}</p>
    <p class="fc-info small">Klubbens rating: <b>${rating1(rating)}</b> · Spillere: <b>${s.squad.length}/${SQUAD_SIZE}</b>${s.squad.length < SQUAD_SIZE ? ' (du må ha 11 spillere for å bli med)' : ''}</p>
    <div class="fc-leagues">${cards}</div>
    <p class="fc-note">Alle ligaene spilles samtidig over 7 dager, med én kamp hver dag kl. 18:00. 32 lag: 8 grupper med 4 lag (3 kamper, de 2 beste går videre), så åttedelsfinale, kvartfinale, semifinale og finale. Seier gir 3 poeng, uavgjort 1. Ved likt antall poeng går laget med flest mål videre. Bare vinneren får pokalen, men 2. og 3. plass får også premiepenger.</p>`;
}

/** Linje med to lag og resultat (eller klokkeslett). */
function pairRow(b: Business, t: Tournament, round: number, a: number, c: number, now: number): string {
  const done = roundDone(t, round, now);
  const res = done ? matchResult(t, round, a, c) : null;
  const mine = a === 0 || c === 0;
  const score = res ? `${res.ga}–${res.gb}${res.pens ? ` <small>(${res.pens[0]}–${res.pens[1]} str.)</small>` : ''}` : `<small>${when(roundKickoff(t.cycle, round)).replace('kl. ', '')}</small>`;
  return `
    <${mine ? `button data-action="f-match" data-id="${b.id}" data-round="${round}"` : 'div'} class="fc-pair ${mine ? 'mine' : ''}">
      <span class="fc-pair-team">${clubLogo(t.teams[a], 'sm')}<span>${clubName(b, t.teams[a])}</span></span>
      <b>${score}</b>
      <span class="fc-pair-team right"><span>${clubName(b, t.teams[c])}</span>${clubLogo(t.teams[c], 'sm')}</span>
    </${mine ? 'button' : 'div'}>`;
}

function groupHtml(b: Business, t: Tournament, g: number, now: number): string {
  const doneRounds = [0, 1, 2].filter((r) => roundDone(t, r, now)).length;
  const rows = groupTable(t, t.groups[g], doneRounds)
    .map(
      (row, i) => `
      <tr class="${row.team === 0 ? 'me' : ''} ${i < 2 && doneRounds === 3 ? 'through' : ''}">
        <td>${i + 1}</td>
        <td class="fc-td-team">${clubLogo(t.teams[row.team], 'xs')}<span>${clubName(b, t.teams[row.team])}</span></td>
        <td>${row.played}</td><td>${row.won}</td><td>${row.drawn}</td><td>${row.lost}</td>
        <td>${row.gf}–${row.ga}</td><td><b>${row.points}</b></td>
      </tr>`,
    )
    .join('');
  return `
    <div class="fc-group">
      <h3>Gruppe ${'ABCDEFGH'[g]}</h3>
      <table class="fc-table">
        <thead><tr><th></th><th>Lag</th><th>K</th><th>V</th><th>U</th><th>T</th><th>Mål</th><th>P</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function renderTournament(b: Business, confirmLeave: boolean, showAll: boolean): string {
  const s = fcOf(b);
  const t = s.tournament;
  if (!t) return `<h1 class="con-page-title">Turnering</h1><p class="fc-info">Dere er ikke med i noen turnering.</p>`;
  const now = Date.now();
  const league = leagueById(t.league);
  const next = nextMyRound(t, now);

  // Neste kamp / kamp som pågår / resultat
  let top: string;
  if (t.finished) {
    top = `<div class="fc-next done"><strong>${t.place && t.place <= 3 ? (t.place === 1 ? 'Dere vant turneringen!' : `Dere kom på ${t.place}. plass`) : 'Turneringen er ferdig'}</strong></div>`;
  } else if (t.left) {
    top = `<div class="fc-next done"><strong>Dere har trukket dere fra turneringen.</strong><span>Kampene som er igjen regnes som tap 0–3.</span></div>`;
  } else if (next === null) {
    top = `<div class="fc-next done"><strong>Dere er ute av turneringen.</strong><span>Følg resten av turneringen her.</span></div>`;
  } else {
    const opp = myOpponent(t, next)!;
    const k = roundKickoff(t.cycle, next);
    const clock = matchClock(k, now);
    const [a, c] = opp.pair;
    let middle: string;
    if (clock.phase === 'before') middle = `<b class="fc-vs">VS</b><span>${when(k)}</span><span class="fc-count">${countdown(k)}</span>`;
    else {
      const res = matchResult(t, next, a, c);
      const shown = visibleScore(res, clock.minute, clock.phase === 'done');
      middle = `<b class="fc-score">${shown[0]}–${shown[1]}</b><span class="${clock.phase === 'done' ? '' : 'fc-live-text'}">${phaseText(clock)}</span>`;
    }
    top = `
      <button class="fc-next" data-action="f-match" data-id="${b.id}" data-round="${next}">
        <span class="fc-next-round">${ROUND_NAMES[next]}</span>
        <div class="fc-next-teams">
          <div>${clubLogo(t.teams[a], 'lg')}<strong>${clubName(b, t.teams[a])}</strong></div>
          <div class="fc-next-mid">${middle}</div>
          <div>${clubLogo(t.teams[c], 'lg')}<strong>${clubName(b, t.teams[c])}</strong></div>
        </div>
        <span class="fc-link">${clock.phase === 'before' ? 'Se kampen' : clock.phase === 'done' ? 'Se kampen' : 'Følg kampen live'}</span>
      </button>`;
  }

  // Sluttspill (rundene der lagene er klare)
  let knockout = '';
  for (let r = 3; r < ROUNDS; r++) {
    if (!roundDone(t, r - 1, now)) break;
    const pairs = roundPairs(t, r);
    knockout += `<h3 class="fc-sub">${ROUND_NAMES[r]}</h3>`;
    knockout += pairs.map(([a, c], i) => (r === 6 && i === 1 ? `<p class="fc-mini-title">Bronsefinale</p>` : '') + pairRow(b, t, r, a, c, now)).join('');
  }

  // Gruppespillet: din gruppe (og de andre hvis man vil)
  const myGroupMatches = [0, 1, 2].map((r) => {
    const [pair] = roundPairs(t, r).filter(([a, c]) => a === 0 || c === 0);
    return pair ? pairRow(b, t, r, pair[0], pair[1], now) : '';
  });
  const groups = (showAll ? [0, 1, 2, 3, 4, 5, 6, 7] : [0]).map((g) => groupHtml(b, t, g, now)).join('');

  return `
    <h1 class="con-page-title">${league.name}</h1>
    <p class="fc-info small">${when(roundKickoff(t.cycle, 0))} – ${when(roundKickoff(t.cycle, ROUNDS - 1))}</p>
    ${top}
    ${knockout ? `<h2 class="fc-title">Sluttspill</h2>${knockout}` : ''}
    <h2 class="fc-title">Gruppespill</h2>
    ${groups}
    <button class="fc-link small" data-action="f-groups" data-id="${b.id}">${showAll ? 'Vis bare gruppe A' : 'Vis alle gruppene'}</button>
    <h3 class="fc-sub">Kampene deres i gruppen</h3>
    ${myGroupMatches.join('')}
    ${!t.finished && !t.left ? `<button class="fc-leave ${confirmLeave ? 'confirm' : ''}" data-action="f-leave" data-id="${b.id}">${confirmLeave ? 'Trykk igjen for å trekke dere' : 'Trekk dere fra turneringen'}</button>` : ''}`;
}

// =========================================================================
// Kampen
// =========================================================================
function phaseText(clock: ReturnType<typeof matchClock>): string {
  if (clock.phase === 'before') return 'Ikke startet';
  if (clock.phase === 'break') return 'Pause';
  if (clock.phase === 'done') return 'Slutt';
  return `${clock.minute}'`;
}

/** Stillingen frem til et kampminutt. */
function visibleScore(res: MatchResult, minute: number, done: boolean): [number, number] {
  if (done) return [res.ga, res.gb];
  const goals = res.events.filter((e) => (e.type === 'goal' || e.type === 'pen-goal') && e.min <= minute);
  return [goals.filter((e) => e.side === 0).length, goals.filter((e) => e.side === 1).length];
}

const EVENT_ICON: Record<MatchEvent['type'], string> = {
  goal: icons.ball,
  'pen-goal': icons.ball,
  'pen-miss': icons.close,
  yellow: icons.card,
  red: icons.card,
  corner: icons.flag,
  freekick: icons.whistle,
  save: icons.glove,
  offside: icons.flag,
  shootout: icons.ball,
};

function eventText(e: MatchEvent, team: string): string {
  const who = e.player ? esc(e.player) : team;
  switch (e.type) {
    case 'goal':
      return `<b>MÅL!</b> ${who}${e.player ? ` (${team})` : ''}`;
    case 'pen-goal':
      return `<b>MÅL på straffe!</b> ${who}${e.player ? ` (${team})` : ''}`;
    case 'pen-miss':
      return `Straffe – <b>bom!</b> ${who}`;
    case 'yellow':
      return `Gult kort: ${who}`;
    case 'red':
      return `<b>Rødt kort!</b> ${who}`;
    case 'corner':
      return `Corner til ${team}`;
    case 'freekick':
      return `Frispark til ${team}`;
    case 'save':
      return `Stor redning av keeperen til ${team}`;
    case 'offside':
      return `Offside: ${who}`;
    case 'shootout':
      return `Straffekonk: ${who} ${e.ok ? '<b>scorer</b>' : '<b>bommer</b>'}`;
  }
}

/** Kampsiden: lagene, stillingen og hendelsene (live: bare frem til nåværende minutt). */
function matchHtml(b: Business, left: string, right: string, res: MatchResult, clock: ReturnType<typeof matchClock>, title: string): string {
  const done = clock.phase === 'done';
  const score = clock.phase === 'before' ? null : visibleScore(res, clock.minute, done);
  const events = res.events.filter((e) => done || (clock.phase !== 'before' && e.min <= clock.minute && e.type !== 'shootout'));
  const names = [clubName(b, left), clubName(b, right)];
  const ids = [left, right];
  const list = [...events]
    .reverse()
    .map(
      (e) => `
      <div class="fc-event side-${e.side} ev-${e.type}">
        <span class="fc-event-min">${e.type === 'shootout' ? 'Str.' : `${e.min}'`}</span>
        ${clubLogo(ids[e.side], 'xs')}
        <span class="fc-event-icon">${EVENT_ICON[e.type]}</span>
        <span class="fc-event-text">${eventText(e, names[e.side])}</span>
      </div>`,
    )
    .join('');
  return `
    <div class="fc-match-head">
      <span class="fc-next-round">${title}</span>
      <div class="fc-next-teams">
        <div>${clubLogo(left, 'lg')}<strong>${names[0]}</strong></div>
        <div class="fc-next-mid">
          <b class="fc-score">${score ? `${score[0]}–${score[1]}` : 'VS'}</b>
          <span class="${done || clock.phase === 'before' ? '' : 'fc-live-text'}">${phaseText(clock)}</span>
          ${done && res.pens ? `<span>Straffer: ${res.pens[0]}–${res.pens[1]}</span>` : ''}
        </div>
        <div>${clubLogo(right, 'lg')}<strong>${names[1]}</strong></div>
      </div>
    </div>
    ${clock.phase !== 'before' && !done ? '<p class="fc-info small">Kampen er i gang. Du kan ikke gjøre endringer nå – bare følge med.</p>' : ''}
    <div class="fc-events">${list || `<p class="fc-info">${clock.phase === 'before' ? 'Kampen har ikke startet.' : 'Ingen hendelser ennå.'}</p>`}</div>`;
}

export function renderMatch(b: Business, round: number): string {
  const t = fcOf(b).tournament;
  if (!t) return '';
  const opp = myOpponent(t, round);
  if (!opp) return `<p class="fc-info">Kampen finnes ikke.</p>`;
  const [a, c] = opp.pair;
  const k = roundKickoff(t.cycle, round);
  const clock = matchClock(k);
  const res = clock.phase === 'before' ? { ga: 0, gb: 0, events: [] } : matchResult(t, round, a, c);
  return matchHtml(b, t.teams[a], t.teams[c], res, clock, `${leagueById(t.league).name} · ${ROUND_NAMES[round]}`);
}

export function renderRecord(b: Business, index: number): string {
  const rec = fcOf(b).history[index];
  if (!rec) return '';
  const res = replay(rec);
  return matchHtml(b, 'me', rec.opp, res, { phase: 'done', minute: 90 }, `${leagueById(rec.league).name} · ${ROUND_NAMES[rec.round]}`);
}

export function renderHistory(b: Business): string {
  const list = fcOf(b).history;
  if (!list.length) return `<h1 class="con-page-title">Kamphistorikk</h1><p class="fc-info">Dere har ikke spilt noen kamper ennå.</p>`;
  return `
    <h1 class="con-page-title">Kamphistorikk</h1>
    <div class="fc-history">${list
      .map((rec, i) => {
        const res = rec.my > rec.their || (rec.my === rec.their && rec.pens && rec.pens[0] > rec.pens[1]) ? 'win' : rec.my < rec.their || rec.pens ? 'loss' : 'draw';
        return `
        <button class="fc-hist ${res}" data-action="f-record" data-id="${b.id}" data-index="${i}">
          <span class="fc-hist-meta">${new Date(rec.at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} · ${leagueById(rec.league).name} · ${ROUND_NAMES[rec.round]}</span>
          <span class="fc-hist-row">${clubLogo('me', 'sm')}<b>${rec.my}–${rec.their}${rec.pens ? ` <small>(${rec.pens[0]}–${rec.pens[1]})</small>` : ''}</b>${clubLogo(rec.opp, 'sm')}<span>${clubName(b, rec.opp)}</span><i>${res === 'win' ? 'S' : res === 'loss' ? 'T' : 'U'}</i></span>
        </button>`;
      })
      .join('')}</div>`;
}

// =========================================================================
// Spillere og overganger
// =========================================================================
function playerRow(x: FcPlayer, action: string, data: string): string {
  const def = x.ref ? playerDef(x.ref) : undefined;
  const club = def ? clubById(def.club) : undefined;
  return `
    <button class="fc-player" data-action="${action}" ${data}>
      ${face(x.ref)}
      <span class="fc-player-text">
        <strong>${esc(x.name)}</strong>
        <span>${isOriginal(x) ? 'Opprinnelig spiller' : `${club?.name ?? ''} · verdi ${formatMoney(saleValue(x))}`}</span>
      </span>
      <span class="fc-rating">${rating1(x.rating)}</span>
    </button>`;
}

export function renderSquad(b: Business): string {
  const s = fcOf(b);
  const list = [...s.squad].sort((x, y) => y.rating - x.rating);
  return `
    <h1 class="con-page-title">Spillere</h1>
    <p class="fc-info small">${s.squad.length}/${SQUAD_SIZE} spillere · Klubbens rating <b>${rating1(clubRating(s))}</b> · Verdi <b>${formatMoney(squadValue(s))}</b></p>
    ${s.squad.length < SQUAD_SIZE ? `<p class="fc-warn">Dere har bare ${s.squad.length} spillere. Dere må ha 11 for å spille i en liga – kjøp flere på overgangslista.</p>` : ''}
    <div class="fc-players">${list.map((x) => playerRow(x, 'f-player', `data-player="${x.id}"`)).join('')}</div>`;
}

export function renderPlayer(b: Business, x: FcPlayer, confirmSell: boolean): string {
  const def = x.ref ? playerDef(x.ref) : undefined;
  const club = def ? clubById(def.club) : undefined;
  const live = liveRound(fcOf(b)) !== null;
  return `
    <div class="fc-profile">
      ${face(x.ref, 'xl')}
      <h1>${esc(x.name)}</h1>
      ${club ? `<span class="fc-profile-club">${clubLogo(club.id, 'xs')}${club.name}</span>` : '<span class="fc-profile-club">Opprinnelig spiller</span>'}
    </div>
    <div class="fc-stats">
      <div><span>Rating</span><strong>${rating1(x.rating)}</strong></div>
      <div><span>Maks med trening</span><strong>${rating1(capOf(x))}</strong></div>
      <div><span>Kjøpt med rating</span><strong>${rating1(x.base)}</strong></div>
      <div><span>Verdi nå</span><strong>${formatMoney(saleValue(x))}</strong></div>
      ${isOriginal(x) ? '' : `<div><span>Betalt</span><strong>${formatMoney(x.paid)}</strong></div><div><span>Signeringssum / 7 dager</span><strong>${formatMoney(valueOf(x.rating) * CONTRACT_SHARE)}</strong></div>`}
    </div>
    ${live
      ? '<p class="fc-note">Kampen pågår. Du kan ikke selge spillere nå.</p>'
      : `<button class="fc-btn ${confirmSell ? 'confirm' : ''}" data-action="f-sell" data-id="${b.id}" data-player="${x.id}">${
          confirmSell ? 'Trykk igjen for å bekrefte' : isOriginal(x) ? 'Slipp spilleren (ingen penger)' : `Selg for ${formatMoneyFull(saleValue(x))}`
        }</button>`}
    <p class="fc-note">${isOriginal(x) ? 'De opprinnelige spillerne kan ikke selges for penger. Slipper du dem, kommer de bare tilbake hvis de kjøpte spillerne blir tvangssolgt.' : 'Du får verdien ut fra ratingen spilleren har nå. Kjøper du ham tilbake senere, har han ratingen han hadde fra start igjen.'}</p>`;
}

export function renderMarket(b: Business): string {
  const s = fcOf(b);
  const now = Date.now();
  const cards = s.market
    .map((id) => {
      const def = playerDef(id)!;
      const club = clubById(def.club);
      return `
      <button class="fc-player market" data-action="f-buy" data-id="${b.id}" data-ref="${id}">
        ${face(id)}
        <span class="fc-player-text">
          <strong>${esc(def.name)}</strong>
          <span class="fc-club-line">${clubLogo(def.club, 'xs')}${club?.name ?? ''}</span>
          <span class="fc-price">${formatMoneyWhole(valueOf(def.rating))}</span>
        </span>
        <span class="fc-rating">${def.rating}</span>
      </button>`;
    })
    .join('');
  const ready = now >= s.marketNext;
  return `
    <h1 class="con-page-title">Overganger</h1>
    <p class="fc-info small">Lista kan oppdateres én gang i timen. Laget har ${s.squad.length}/${SQUAD_SIZE} spillere.</p>
    <div class="fc-players pad">${cards || '<p class="fc-info">Lista er tom.</p>'}</div>
    <button class="fc-float" data-action="f-refresh" data-id="${b.id}" ${ready ? '' : 'disabled'}>${ready ? 'Oppdater' : `Oppdater (${formatDuration((s.marketNext - now) / 1000)})`}</button>`;
}

export function renderBuy(state: GameState, b: Business, ref: string, replace: string | null): string {
  const s = fcOf(b);
  const def = playerDef(ref);
  if (!def) return '';
  const club = clubById(def.club);
  const price = valueOf(def.rating);
  const full = s.squad.length >= SQUAD_SIZE;
  const out = replace ? s.squad.find((x) => x.id === replace) : undefined;
  const list = [...s.squad].sort((x, y) => x.rating - y.rating);
  return `
    <div class="fc-profile">
      ${face(ref, 'xl')}
      <h1>${esc(def.name)}</h1>
      <span class="fc-profile-club">${clubLogo(def.club, 'xs')}${club?.name ?? ''}</span>
    </div>
    <div class="fc-stats">
      <div><span>Rating</span><strong>${def.rating}</strong></div>
      <div><span>Maks med trening</span><strong>${Math.min(94, def.rating + 10)}</strong></div>
      <div><span>Pris</span><strong>${formatMoney(price)}</strong></div>
      <div><span>Signeringssum / 7 dager</span><strong>${formatMoney(price * CONTRACT_SHARE)}</strong></div>
    </div>
    ${full
      ? `<h3 class="fc-sub">Laget er fullt – velg hvem som skal ut</h3>
         <div class="fc-players">${list
           .map(
             (x) => `
          <button class="fc-player pick ${x.id === replace ? 'on' : ''}" data-action="f-replace" data-player="${x.id}">
            ${face(x.ref)}
            <span class="fc-player-text"><strong>${esc(x.name)}</strong><span>${isOriginal(x) ? 'Slippes (ingen penger)' : `Selges for ${formatMoney(saleValue(x))}`}</span></span>
            <span class="fc-rating">${rating1(x.rating)}</span>
          </button>`,
           )
           .join('')}</div>`
      : ''}
    <div class="fc-buy-bar">
      <button class="fc-btn ${state.balance >= price && (!full || out) ? '' : 'poor'}" data-action="f-buy-do" data-id="${b.id}" data-ref="${ref}">${
        full && !out ? 'Velg hvem som skal ut' : `Kjøp for ${formatMoneyFull(price)}`
      }</button>
      <p class="fc-note">${out ? `${esc(out.name)} ${isOriginal(out) ? 'slippes' : `selges for ${formatMoneyFull(saleValue(out))}`}. ` : ''}Saldo: ${formatMoney(state.balance)}</p>
    </div>`;
}

// =========================================================================
// Trening
// =========================================================================
export function renderTraining(state: GameState, b: Business): string {
  const s = fcOf(b);
  const now = Date.now();
  const live = liveRound(s, now) !== null;
  let status: string;
  if (s.activity) status = `<div class="fc-act-status busy"><strong>${activityById(s.activity.id).name} pågår</strong><span>Ferdig om ${formatDuration((s.activity.end - now) / 1000)}</span></div>`;
  else if (now < s.cooldownEnd) status = `<div class="fc-act-status pause"><strong>Pause</strong><span>Spillerne hviler. Neste aktivitet om ${formatDuration((s.cooldownEnd - now) / 1000)}</span></div>`;
  else status = `<div class="fc-act-status ready"><strong>Klar</strong><span>Velg hva laget skal gjøre.</span></div>`;
  const free = !s.activity && now >= s.cooldownEnd && !live;
  const cards = ACTIVITIES.map((a) => {
    const cost = activityCost(s, a);
    return `
      <div class="fc-act">
        <div class="fc-act-head">${a.id === 'prep' ? icons.whistle : icons.dumbbell}<strong>${a.name}</strong><span>${a.hours} t</span></div>
        <p>${a.text}</p>
        <button class="fc-btn ${state.balance >= cost ? '' : 'poor'}" data-action="f-activity" data-id="${b.id}" data-activity="${a.id}" ${free ? '' : 'disabled'}>Start · ${formatMoneyFull(cost)}</button>
      </div>`;
  }).join('');
  return `
    <h1 class="con-page-title">Trening</h1>
    ${status}
    ${s.boost ? `<p class="fc-info small">Laget har <b>+${s.boost}</b> i styrke i neste kamp.</p>` : ''}
    ${live ? '<p class="fc-warn">Kampen pågår – dere kan ikke trene nå.</p>' : ''}
    ${cards}
    <p class="fc-note">Trening går sakte: det tar lang tid å bygge et godt lag. En spiller kan trenes opp til ${10} over ratingen han ble kjøpt med, og jo nærmere taket, jo saktere går det. Etter hver aktivitet må spillerne hvile i ${COOLDOWN_HOURS} timer. Trener dere ikke på et døgn, går ratingen sakte ned igjen.</p>`;
}

// =========================================================================
// Trofeer
// =========================================================================
export function renderTrophies(b: Business): string {
  const s = fcOf(b);
  const cards = LEAGUES.map((l) => {
    const n = s.trophies[l.id] ?? 0;
    return `
      <div class="fc-trophy ${n ? '' : 'empty'}">
        <span class="fc-cup big" style="color:${n ? l.color : '#c3c6cf'}">${icons.trophy}</span>
        <strong>${l.name}</strong>
        <span>${n ? `×${n}` : 'Ikke vunnet'}</span>
      </div>`;
  }).join('');
  return `
    <h1 class="con-page-title">Trofeer</h1>
    <div class="fc-trophies">${cards}</div>`;
}
