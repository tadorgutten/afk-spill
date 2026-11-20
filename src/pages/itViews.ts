import type { Business } from '../game/business';
import {
  completed,
  freeFor,
  freePlaces,
  freeSkills,
  inProgress,
  isDone,
  isRoleUnlocked,
  itOf,
  leadSeconds,
  MAX_QUICK_HIRE,
  canBuyOffice,
  OFFICES,
  pickedSkill,
  PROJECTS,
  projectDef,
  projectsValue,
  roleById,
  ROLES,
  SKILLS,
  staffOf,
  teamsReady,
  wagesPerHour,
  type Employee,
  type ItProject,
  type Picks,
  type ProjectDef,
  type RoleDef,
  type RoleId,
  type SkillId,
} from '../game/it';
import type { GameState } from '../game/state';
import { formatDuration, formatInt, formatMoney, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';
import { skipBtn } from '../game/skip';

/*
 * Sidene til IT-selskapet:
 *   detail     – oversikt: prosjekter, ansatte, kontor og forbedringer
 *   iProjects  – prosjekter som pågår / er ferdige (ferdige selges med et trykk)
 *   iProject   – ett prosjekt som pågår (kan avbrytes)
 *   iNew       – velg et nytt prosjekt
 *   iSetup     – velg team og start prosjektet
 *   iTeam      – velg ansatte til ett team
 *   iRole      – alle ansatte i én rolle (sortering + Ansett)
 *   iEmployee  – én ansatt (gi sparken)
 *   iHire      – rask ansettelse (eller "ikke tilgjengelig" for låste roller)
 *   iOffers    – tilbud fra rekrutterere
 *   iOffer     – ett tilbud (ansett)
 */

export type StaffSort = 'salary-desc' | 'salary-asc' | 'skill-desc' | 'skill-asc';

const SORTS: { id: StaffSort; label: string }[] = [
  { id: 'salary-desc', label: 'Høyest lønn' },
  { id: 'salary-asc', label: 'Lavest lønn' },
  { id: 'skill-desc', label: 'Høyest skill' },
  { id: 'skill-asc', label: 'Lavest skill' },
];

export const SKILL_ICON: Record<SkillId, string> = {
  dev: icons.code,
  design: icons.mug,
  lead: icons.team,
  test: icons.gearWrench,
};

export const ROLE_ICON: Record<RoleId, string> = {
  junior: icons.laptopCode,
  middle: icons.laptopCode,
  senior: icons.laurel,
  designer: icons.mug,
  lead: icons.team,
  tester: icons.gearWrench,
};

const roleIcon = (role: RoleId) => `<span class="it-role-icon role-${role}">${ROLE_ICON[role]}</span>`;
const projectIcon = (def: ProjectDef) => (def.kind === 'web' ? icons.web : icons.app);
const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Kort nedtelling: "7 min." eller "1 t. 4 min.". */
function shortTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s} sek.`;
  if (s < 3600) return `${Math.ceil(s / 60)} min.`;
  return formatDuration(s, false);
}

/** De fire kravene (eller ledig skill) på en rad. */
function skillRow(values: Record<SkillId, number>, cls = ''): string {
  return `<div class="it-skills ${cls}">${SKILLS.map(
    (s) => `<span class="skill-${s.id}">${SKILL_ICON[s.id]}<b>${formatInt(values[s.id])}</b></span>`,
  ).join('')}</div>`;
}

// =========================================================================
// Forsiden
// =========================================================================
export function renderItDetail(state: GameState, b: Business, hero: string): string {
  const it = itOf(b);
  const running = inProgress(b);
  const done = completed(b);
  const now = Date.now();

  const roles = ROLES.map((r) => {
    const list = staffOf(b, r.id);
    const wages = list.reduce((sum, e) => sum + e.salary, 0);
    return `
      <button class="it-role" data-action="i-role" data-id="${b.id}" data-role="${r.id}">
        ${roleIcon(r.id)}
        <span class="it-role-text"><strong>${r.plural}</strong><span>${formatMoneyWhole(wages)} / time</span></span>
        <span class="it-role-count">${list.length}</span>
      </button>`;
  }).join('');

  const offices = OFFICES.map((o) => {
    const bought = it.offices.includes(o.id);
    const building = it.building?.office === o.id;
    const isNext = canBuyOffice(b, o.id);
    if (building) {
      return `
        <div class="it-office building">
          <span class="it-office-icon">${icons.office}</span>
          <div><strong>${o.name}</strong><span>Utvidelse pågår · + ${formatInt(o.places)} arbeidsplasser</span>
          <b class="it-office-time">${icons.clock}${formatDuration((it.building!.end - now) / 1000)}</b></div>
          ${skipBtn('office', b.id, '', true)}
        </div>`;
    }
    const body = `
      <span class="it-office-icon">${icons.office}</span>
      <div><strong>${o.name}</strong><span>+ ${formatInt(o.places)} arbeidsplasser</span>
      ${bought ? `<b class="it-office-done">${icons.check} Kjøpt</b>` : `<b class="it-office-price">${formatMoneyWhole(o.price)}</b>`}</div>`;
    if (isNext) {
      return `<button class="it-office ${state.balance >= o.price ? '' : 'poor'}" data-action="i-office" data-id="${b.id}" data-office="${o.id}">${body}</button>`;
    }
    return `<div class="it-office ${bought ? 'bought' : 'locked'}">${body}</div>`;
  }).join('');

  const offerCount = it.offers.length;
  return `
    ${hero}
    <div class="biz-income-card con-values">
      <strong>${formatMoney(projectsValue(running) + projectsValue(done))}</strong>
      <span>Venter på betaling</span>
      <i class="con-divider"></i>
      <strong>${formatMoney(wagesPerHour(b))}</strong>
      <span>Lønnskostnad per time</span>
    </div>

    <h2 class="it-title">Prosjekter</h2>
    <div class="it-tiles">
      <button class="it-tile" data-action="i-projects" data-id="${b.id}" data-tab="progress">
        <span class="it-tile-icon progress">${icons.hourglass}</span>
        <strong>${running.length}</strong>
        <span class="it-tile-money">${formatMoney(projectsValue(running))}</span>
        <span class="it-tile-label">Pågår</span>
      </button>
      <button class="it-tile done" data-action="i-projects" data-id="${b.id}" data-tab="done">
        <span class="it-tile-icon ready">${icons.checkCircle}</span>
        <strong>${done.length}</strong>
        <span class="it-tile-money">${formatMoney(projectsValue(done))}</span>
        <span class="it-tile-label">Ferdige</span>
      </button>
    </div>
    <button class="it-link" data-action="i-new" data-id="${b.id}">Start nytt prosjekt</button>

    <h2 class="it-title">Ansatte</h2>
    <div class="it-roles">${roles}</div>

    <h2 class="it-title">Kontor</h2>
    <div class="it-staff-tile">
      <div class="it-staff-head">${icons.person}<span>Ansatte</span></div>
      <p><strong>${it.staff.length}</strong> / ${formatInt(it.places)}</p>
    </div>
    <button class="it-offers-row" data-action="i-offers" data-id="${b.id}">
      ${icons.personPlus}<span>Tilbud fra rekrutterere</span>
      ${offerCount ? `<b class="it-badge">${offerCount}</b>` : ''}
    </button>

    <h2 class="it-title">Forbedringer</h2>
    <div class="it-offices">${offices}</div>
    <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
  `;
}

// =========================================================================
// Prosjekter
// =========================================================================
function emptyState(title: string, text: string): string {
  return `
    <div class="con-empty it-empty">
      <svg class="con-empty-art" viewBox="0 0 80 80" aria-hidden="true">
        <path d="M40 10a30 30 0 1 0 30 30" fill="none" stroke="#7b6be0" stroke-width="5" stroke-linecap="round"/>
        <path d="M44 18h26" stroke="#e5e7eb" stroke-width="4" stroke-linecap="round"/>
      </svg>
      <h2>${title}</h2>
      <p>${text}</p>
    </div>`;
}

export function renderItProjects(b: Business, tab: 'progress' | 'done'): string {
  const now = Date.now();
  const list = (tab === 'progress' ? inProgress(b, now) : completed(b, now)).sort((x, y) => x.end - y.end);
  const title = tab === 'progress' ? 'Pågår' : 'Ferdige';
  if (!list.length) {
    return `<h1 class="con-page-title">${title}</h1>${emptyState('Ingen prosjekter', 'Ansett folk og start et nytt prosjekt')}`;
  }
  const cards = list.map((p) => {
    const def = projectDef(p.def);
    if (tab === 'progress') {
      return `
        <button class="it-pcard" data-action="i-project" data-id="${b.id}" data-project="${p.id}">
          <div class="it-pcard-head">${projectIcon(def)}<strong>${def.name}</strong></div>
          <div class="it-pcard-body">
            <span>${icons.clock}${formatDuration((p.end - now) / 1000, false)}</span>
            <span>${icons.tag}${formatMoneyWhole(def.pay)}</span>
          </div>
        </button>`;
    }
    return `
      <button class="it-pcard ready" data-action="i-sell" data-id="${b.id}" data-project="${p.id}">
        <div class="it-pcard-head">${projectIcon(def)}<strong>${def.name}</strong></div>
        <div class="it-pcard-body">
          <span class="con-sell-label">Klar for salg</span>
          <span>${icons.tag}${formatMoneyWhole(def.pay)}</span>
          <span class="con-sell">${icons.dollar}</span>
        </div>
      </button>`;
  });
  return `
    <h1 class="con-page-title">${title}</h1>
    ${tab === 'done' ? '<p class="con-hint">Trykk på et ferdig prosjekt for å selge det.</p>' : ''}
    <div class="it-pcards">${cards.join('')}</div>`;
}

/** Ett prosjekt som pågår. */
export function renderItProject(b: Business, p: ItProject, confirmDrop: boolean): string {
  const def = projectDef(p.def);
  const now = Date.now();
  const done = isDone(p, now);
  return `
    <div class="it-phead">
      <span class="it-phead-icon">${projectIcon(def)}</span>
      <h1>${def.name}</h1>
      <strong class="it-phead-pay">${formatMoneyWhole(def.pay)}</strong>
      <span class="it-muted">Betaling når prosjektet er ferdig</span>
    </div>
    ${done
      ? `<p class="it-label">Prosjektet er ferdig</p>
         <button class="it-main-btn green" data-action="i-sell" data-id="${b.id}" data-project="${p.id}">Selg prosjektet</button>`
      : `<p class="it-label">Gjenstående tid</p>
         <strong class="it-big">${formatDuration((p.end - now) / 1000, false)}</strong>
         ${skipBtn('itproject', b.id, p.id)}
         <button class="it-main-btn ${confirmDrop ? 'confirm' : ''}" data-action="i-drop" data-id="${b.id}" data-project="${p.id}">${confirmDrop ? 'Trykk igjen for å avbryte' : 'Avbryt prosjektet'}</button>
         <p class="it-note">Er prosjektet ulønnsomt, kan du avbryte det når som helst. Avbryter du, får du ingen betaling for arbeidet som er gjort, og de ansatte blir ledige igjen.</p>`}`;
}

/** Velg et nytt prosjekt. */
export function renderItNew(b: Business): string {
  const free = freeSkills(b);
  const cards = PROJECTS.map((def) => {
    const enough = SKILLS.every((s) => free[s.id] >= def.need[s.id]);
    return `
      <button class="it-ncard ${enough ? '' : 'short'}" data-action="i-setup" data-id="${b.id}" data-def="${def.id}">
        <div class="it-pcard-head">${projectIcon(def)}<strong>${def.name}</strong></div>
        <div class="it-ncard-body">
          ${skillRow(def.need)}
          <span class="it-ncard-pay">${icons.tag}${formatMoneyWhole(def.pay)}</span>
        </div>
      </button>`;
  }).join('');
  return `
    <h1 class="con-page-title">Nytt prosjekt</h1>
    <p class="it-sub">Ledig skill hos de ansatte:</p>
    ${skillRow(free, 'free')}
    <div class="it-pcards">${cards}</div>`;
}

/** Velg team og start prosjektet. */
export function renderItSetup(b: Business, def: ProjectDef, picks: Picks): string {
  const rows = SKILLS.map((s) => {
    const needed = def.need[s.id];
    const ids = picks[s.id];
    const sum = pickedSkill(b, ids);
    let status: string;
    if (needed === 0 && !ids.length) status = '<span class="it-muted">Trengs ikke</span>';
    else if (!ids.length) status = '<span class="it-muted">Ikke valgt</span>';
    else status = `<span class="${sum >= needed ? 'it-ok' : 'it-short'}">${ids.length} valgt · ${formatInt(sum)} / ${formatInt(needed)} skill</span>`;
    return `
      <button class="it-team skill-${s.id}" data-action="i-team" data-id="${b.id}" data-skill="${s.id}">
        <span class="it-team-icon">${SKILL_ICON[s.id]}</span>
        <span class="it-team-text"><strong>${s.team}</strong>${status}</span>
        ${icons.chevronRight}
      </button>`;
  }).join('');
  const seconds = leadSeconds(b, def, picks.dev);
  const ready = teamsReady(b, def, picks);
  return `
    <div class="it-phead">
      <span class="it-phead-icon">${projectIcon(def)}</span>
      <h1>${def.name}</h1>
      ${skillRow(def.need)}
      <strong class="it-phead-pay">${formatMoneyWhole(def.pay)}</strong>
      <span class="it-muted">Betaling når prosjektet er ferdig</span>
    </div>
    <div class="it-teams">${rows}</div>
    <p class="it-label">Ledetid:</p>
    <strong class="it-big">${seconds === null ? '--' : formatDuration(seconds, false)}</strong>
    <button class="it-main-btn" data-action="i-start" data-id="${b.id}" ${ready ? '' : 'disabled'}>Start prosjektet</button>
    <p class="it-note">Ledetiden avhenger av utviklerteamet. Juniorutviklere er tregere enn erfarne utviklere og seniorutviklere. Seniorutviklere er de mest erfarne og blir ferdige på kortest tid. Har teamet mer skill enn kravet, går det også litt fortere.</p>`;
}

/** Velg ansatte til ett team. */
export function renderItTeam(b: Business, def: ProjectDef, picks: Picks, skill: SkillId): string {
  const s = SKILLS.find((x) => x.id === skill)!;
  const list = [...freeFor(b, skill)].sort((x, y) => y.skill - x.skill);
  const chosen = picks[skill];
  const sum = pickedSkill(b, chosen);
  const needed = def.need[skill];
  const cards = list.map((e) => {
    const on = chosen.includes(e.id);
    return `
      <button class="it-pick ${on ? 'on' : ''}" data-action="i-pick" data-emp="${e.id}">
        ${roleIcon(e.role)}
        <span class="it-pick-text"><strong>${esc(e.name)}</strong><span>${roleById(e.role).name} · ${formatMoneyWhole(e.salary)} / time</span></span>
        <span class="it-pick-skill">${formatInt(e.skill)}</span>
        <span class="it-check">${on ? icons.check : ''}</span>
      </button>`;
  }).join('');
  return `
    <h1 class="con-page-title">${s.team}</h1>
    <div class="it-pick-sum skill-${skill}">
      ${SKILL_ICON[skill]}
      <span>Valgt skill</span>
      <strong class="${sum >= needed ? 'it-ok' : 'it-short'}">${formatInt(sum)} / ${formatInt(needed)}</strong>
    </div>
    ${list.length
      ? `<button class="it-auto" data-action="i-auto" data-skill="${skill}">Velg automatisk (billigst)</button>
         <div class="it-picks">${cards}</div>`
      : `<p class="it-empty-text">Du har ingen ledige ${s.empty}. Ansatte som jobber på et annet prosjekt, er opptatt.</p>`}
    <button class="it-float-btn" data-action="back">Ferdig</button>`;
}

// =========================================================================
// Ansatte
// =========================================================================
function sortStaff(list: Employee[], sort: StaffSort): Employee[] {
  const by: Record<StaffSort, (x: Employee, y: Employee) => number> = {
    'salary-desc': (x, y) => y.salary - x.salary,
    'salary-asc': (x, y) => x.salary - y.salary,
    'skill-desc': (x, y) => y.skill - x.skill,
    'skill-asc': (x, y) => x.skill - y.skill,
  };
  return [...list].sort(by[sort]);
}

/** Kort for én person (ansatt eller tilbud). */
function personCard(e: Employee, action: string, data: string): string {
  return `
    <button class="it-ecard ${e.project ? 'busy' : ''}" data-action="${action}" ${data}>
      <div class="it-ecard-left">${roleIcon(e.role)}<strong>${esc(e.name)}</strong></div>
      <div class="it-ecard-right">
        <span>Lønn</span><strong>${formatMoneyWhole(e.salary)}</strong>
        <span>Skill</span><strong>${formatInt(e.skill)}</strong>
        ${e.project ? '<em>På prosjekt</em>' : ''}
      </div>
    </button>`;
}

export function renderItRole(b: Business, roleId: RoleId, sort: StaffSort): string {
  const role = roleById(roleId);
  const list = sortStaff(staffOf(b, roleId), sort);
  return `
    <h1 class="con-page-title">${role.name}</h1>
    <div class="taxi-chips it-chips">${SORTS.map(
      (s) => `<button class="taxi-chip big ${s.id === sort ? 'active' : ''}" data-action="i-sort" data-sort="${s.id}">${s.label}</button>`,
    ).join('')}</div>
    ${list.length
      ? `<div class="it-ecards">${list.map((e) => personCard(e, 'i-emp', `data-emp="${e.id}"`)).join('')}</div>`
      : '<p class="it-empty-text center">Lista er tom</p>'}
    <button class="it-float-btn left" data-action="i-hire" data-id="${b.id}" data-role="${roleId}">Ansett</button>`;
}

export function renderItEmployee(b: Business, e: Employee, confirmFire: boolean): string {
  const role = roleById(e.role);
  return `
    <h1 class="it-person-name">${esc(e.name)}</h1>
    <div class="it-person-role">${roleIcon(e.role)}<strong>${role.name}</strong></div>
    <div class="it-person-tiles">
      <div class="it-person-tile">${icons.bill}<span>Lønn per time</span><strong>${formatMoneyWhole(e.salary)}</strong></div>
      <div class="it-person-tile">${icons.levels}<span>Skill</span><strong>${formatInt(e.skill)}</strong></div>
    </div>
    ${e.project
      ? `<p class="it-note">${esc(e.name)} jobber på et prosjekt og kan ikke få sparken før prosjektet er ferdig.</p>`
      : `<button class="it-main-btn ${confirmFire ? 'confirm' : ''}" data-action="i-fire" data-id="${b.id}" data-emp="${e.id}">${confirmFire ? 'Trykk igjen for å gi sparken' : 'Gi sparken'}</button>`}`;
}

/** Rask ansettelse, eller "ikke tilgjengelig" for låste roller. */
export function renderItHire(state: GameState, b: Business, roleId: RoleId): string {
  const role = roleById(roleId);
  if (!isRoleUnlocked(b, role)) return renderLocked(b, role);
  const free = freePlaces(b);
  return `
    <h1 class="con-page-title">Rask ansettelse</h1>
    <label class="it-qty">
      <span>Antall:</span>
      <input type="number" inputmode="numeric" min="0" max="${Math.min(MAX_QUICK_HIRE, free)}" step="1" placeholder="0" data-hire-qty />
    </label>
    <p class="it-muted">Ledige arbeidsplasser: ${formatInt(free)}</p>
    <p class="it-label">Stilling:</p>
    <div class="it-person-role">${roleIcon(roleId)}<strong>${role.name}</strong></div>
    <p class="it-label">Intervjukostnad:</p>
    <strong class="it-big" data-hire-cost>${formatMoneyWhole(0)}</strong>
    <button class="it-main-btn" data-action="i-hire-do" data-id="${b.id}" data-role="${roleId}" data-hire-btn disabled>Ansett</button>
    <p class="it-balance">Saldo: <b>${formatMoneyFull(state.balance)}</b></p>
    <div class="it-info">
      ${icons.info}
      <p>Rekrutterere tar et raskt intervju og ansetter så mange du ber om. Du kan ikke påvirke hvem som blir valgt – kandidatene velges av intervjuleder. Skill og lønn er tilfeldig (høyere skill gir høyere lønn).</p>
      <p>Rekrutterere kan ansette maks ${MAX_QUICK_HIRE} personer per intervju.</p>
    </div>`;
}

function renderLocked(b: Business, role: RoleDef): string {
  const goal = role.unlockEarned ?? 0;
  const pct = Math.max(0, Math.min(100, (b.earned / goal) * 100));
  return `
    <div class="it-locked">
      ${roleIcon(role.id)}
      <h1>${role.name}</h1>
      <hr />
      <h2>Ansettelse ikke tilgjengelig</h2>
      <div class="it-locked-row"><span>Inntjening totalt</span><b>${formatMoney(b.earned)} / ${formatMoneyWhole(goal)}</b></div>
      <div class="it-locked-bar"><span style="width:${pct}%"></span></div>
      <p>Tjen ${formatMoneyWhole(goal)} i selskapet for å kunne ansette en ${role.name.toLowerCase()}. Inntjeningen er salg av prosjekter minus lønn.</p>
    </div>`;
}

// =========================================================================
// Tilbud fra rekrutterere
// =========================================================================
export function renderItOffers(b: Business): string {
  const it = itOf(b);
  const active = it.offersUntil !== null && it.offersUntil > Date.now();
  const left = active ? (it.offersUntil! - Date.now()) / 1000 : 0;
  const list = it.offers;
  return `
    <h1 class="con-page-title">Tilbud</h1>
    ${active ? `<p class="it-sub">Tilbudene forsvinner om <b>${shortTime(left)}</b>. Ingen intervjukostnad.</p>` : ''}
    ${list.length
      ? `<div class="it-ecards">${list.map((e) => personCard(e, 'i-offer', `data-offer="${e.id}"`)).join('')}</div>`
      : active
        ? '<p class="it-empty-text center">Du har ansatt alle tilbudene. Nye tilbud kommer når tiden er ute.</p>'
        : '<p class="it-empty-text center">Ingen tilbud. Trykk Oppdater for å få 5 nye tilbud fra rekrutterere.</p>'}
    <button class="it-float-btn left" data-action="i-refresh" data-id="${b.id}" ${active ? 'disabled' : ''}>${active ? `Oppdater (${shortTime(left)})` : 'Oppdater'}</button>`;
}

export function renderItOffer(state: GameState, b: Business, e: Employee): string {
  const role = roleById(e.role);
  const free = freePlaces(b);
  return `
    <h1 class="it-person-name">${esc(e.name)}</h1>
    <div class="it-person-role">${roleIcon(e.role)}<strong>${role.name}</strong></div>
    <div class="it-person-tiles">
      <div class="it-person-tile">${icons.bill}<span>Lønn per time</span><strong>${formatMoneyWhole(e.salary)}</strong></div>
      <div class="it-person-tile">${icons.levels}<span>Skill</span><strong>${formatInt(e.skill)}</strong></div>
    </div>
    <button class="it-main-btn ${free > 0 ? '' : 'poor'}" data-action="i-offer-hire" data-id="${b.id}" data-offer="${e.id}">Ansett</button>
    <p class="it-note">Ingen intervjukostnad. Ledige arbeidsplasser: ${formatInt(free)}. Saldo: ${formatMoney(state.balance)}</p>`;
}
