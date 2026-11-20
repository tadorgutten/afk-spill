import {
  CATEGORIES,
  categoryById,
  cheapestIn,
  closeBusiness,
  closeRefund,
  expansionCost,
  expansionSeconds,
  expectedGrowth,
  incomePerHour,
  isMaxStage,
  MAX_SLOTS,
  MAX_STAGE,
  SLOT_SECONDS,
  buySlot,
  nextSlot,
  slotPrice,
  slotsFull,
  renameBusiness,
  renameCost,
  startBusiness,
  startExpansion,
  taxPerHour,
  totalIncomePerHour,
  typeById,
  typesIn,
  isTaxi,
  engineOf,
  buyCar,
  expandCapacity,
  buyResources,
  sellProject,
  startProject,
  dealerPay,
  footballPay,
  type Business,
  type BusinessCategoryId,
} from '../game/business';
import { capacityOf, carsOf, fleetOf, modelById, type CarClass } from '../game/taxi';
import { maxCars, renderCarShop, renderFleet, renderTaxiDetail, type FleetSort } from './taxiViews';
import { buildingById, building as underConstruction, MAX_PROJECTS, emptyResources, readyForSale, readyValue, RESOURCES } from '../game/construction';
import { renderBuildNew, renderConstructionDetail, renderProcure, renderProjects, renderResources } from './constructionViews';
import {
  buyDiagnostics,
  buyMarketCar,
  carById,
  changeSegment,
  dealerModel,
  expandDealer,
  forSale,
  inService,
  marketOf,
  putUpForSale,
  showroomValue,
  startRepair,
  type PartId,
  type SegmentId,
} from '../game/dealer';
import {
  renderDealerDetail,
  renderExpand,
  renderMarket,
  renderMarketCar,
  renderOwnedCar,
  renderService,
  renderShowroom,
  renderSkills,
  renderSpec,
  type ServiceFilter,
} from './dealerViews';
import {
  autoPick,
  buyOffice,
  completed,
  dropProject,
  emptyPicks,
  employeeById,
  fire,
  hireOffer,
  inProgress,
  itOf,
  projectDef,
  quickHire,
  refreshOffers,
  roleById,
  sellItProject,
  startItProject,
  validPicks,
  wagesPerHour,
  type Picks,
  type RoleId,
  type SkillId,
} from '../game/it';
import {
  renderItDetail,
  renderItEmployee,
  renderItHire,
  renderItNew,
  renderItOffer,
  renderItOffers,
  renderItProject,
  renderItProjects,
  renderItRole,
  renderItSetup,
  renderItTeam,
  type StaffSort,
} from './itViews';
import { bankOf, DEFAULT_DEPOSIT, DEFAULT_LOAN, expandVault, setRates } from '../game/bank';
import { bindBankSliders, renderBankControl, renderBankDetail } from './bankViews';
import {
  buyPlayer,
  clubRating,
  fcOf,
  joinLeague,
  leaveLeague,
  liveRound,
  payContracts,
  refreshMarket,
  sellPlayer,
  squadValue,
  startActivity,
  type ActivityId,
} from '../game/football';
import { leagueById } from '../game/footballData';
import { buyPlatform, buyUpgrade, nextPlatform, oilOf, ownedPlatform, platformById, selectPlatform, sellOil, storageHours, upgradeStorage, UPGRADES, type OilPay } from '../game/oil';
import { renderOilDetail, renderPlatform } from './oilViews';
import {
  airlineOf,
  buyLicense,
  buyPlanes,
  continentById,
  hasLicense,
  isGrounded,
  launchFlight,
  launchedFlights,
  leaseHub,
  maxAffordable,
  nextFlight,
  performService,
  planeById,
  serviceCost,
  sellUnused,
  type AirlinePay,
} from '../game/airline';
import { ALL_FLIGHTS, type ContinentId, type PlaneId } from '../game/airlineData';
import { renderAirFleet, renderAirlineDetail, renderHubs, renderLicenses, renderPlaneShop, renderRegion } from './airlineViews';
import {
  renderBuy,
  renderFootballDetail,
  renderHistory,
  renderLeagues,
  renderMarket as renderFcMarket,
  renderMatch,
  renderPlayer,
  renderRecord,
  renderSquad,
  renderTournament,
  renderTraining,
  renderTrophies,
} from './footballViews';
import type { GameState } from '../game/state';
import { formatDuration, formatMoney, formatMoneyFull, formatMoneyRounded, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';
import { showToast } from '../ui/toast';
import { html, type Page } from './page';
import { skipBtn, useSkip, type SkipKind } from '../game/skip';

/*
 * Bedrifter-siden har flere "visninger" oppå hverandre:
 *   home       – oversikt: total inntekt, "Start en bedrift", Mine bedrifter
 *   categories – velg kategori (foreløpig bare Butikk)
 *   types      – velg type butikk (lokal / liten kjede / stor kjede)
 *   name       – skriv inn navn og start bedriften
 *   detail     – én bedrift: inntekt, trinn, utvidelse
 *   settings   – innstillinger: tall om bedriften, endre navn, legg ned
 *   rename     – endre navn
 * Tilbake-pila (og mobilens tilbakeknapp) går ett steg tilbake.
 */
type View =
  | { name: 'home' }
  | { name: 'categories' }
  | { name: 'types'; category: BusinessCategoryId }
  | { name: 'name'; type: string }
  | { name: 'detail'; id: string }
  | { name: 'settings'; id: string }
  | { name: 'rename'; id: string }
  | { name: 'carShop'; id: string; filter: CarClass | null; selected: string | null; qty: number }
  | { name: 'fleet'; id: string; sort: FleetSort; filter: CarClass | null }
  | { name: 'projects'; id: string }
  | { name: 'buildNew'; id: string; short: string | null }
  | { name: 'resources'; id: string }
  | { name: 'dService'; id: string; filter: ServiceFilter }
  | { name: 'dShowroom'; id: string }
  | { name: 'dMarket'; id: string }
  | { name: 'dMarketCar'; id: string; car: string }
  | { name: 'dCar'; id: string; car: string; sel: PartId[] }
  | { name: 'dSpec'; id: string; pick: SegmentId | null }
  | { name: 'dExpand'; id: string; kind: 'service' | 'showroom' }
  | { name: 'dSkills'; id: string }
  | { name: 'iProjects'; id: string; tab: 'progress' | 'done' }
  | { name: 'iProject'; id: string; project: string }
  | { name: 'iNew'; id: string }
  | { name: 'iSetup'; id: string; def: string; picks: Picks }
  | { name: 'iTeam'; id: string; def: string; picks: Picks; skill: SkillId }
  | { name: 'iRole'; id: string; role: RoleId; sort: StaffSort }
  | { name: 'iEmployee'; id: string; emp: string }
  | { name: 'iHire'; id: string; role: RoleId }
  | { name: 'iOffers'; id: string }
  | { name: 'iOffer'; id: string; offer: string }
  | { name: 'bControl'; id: string; deposit: number; loan: number }
  | { name: 'fLeagues'; id: string }
  | { name: 'fTournament'; id: string; all: boolean }
  | { name: 'fMatch'; id: string; round: number }
  | { name: 'fRecord'; id: string; index: number }
  | { name: 'fSquad'; id: string }
  | { name: 'fPlayer'; id: string; player: string }
  | { name: 'fMarket'; id: string }
  | { name: 'fBuy'; id: string; ref: string; replace: string | null }
  | { name: 'fTraining'; id: string }
  | { name: 'fTrophies'; id: string }
  | { name: 'fHistory'; id: string }
  | { name: 'oPlat'; id: string; plat: string }
  | { name: 'aRegion'; id: string; cont: ContinentId }
  | { name: 'aHubs'; id: string; cont: ContinentId }
  | { name: 'aFleet'; id: string }
  | { name: 'aShop'; id: string; sel: PlaneId | null; qty: number }
  | { name: 'aLicenses'; id: string };

/** Ikon for hver kategori. */
export const CATEGORY_ICON: Record<BusinessCategoryId, string> = {
  shop: icons.basket,
  taxi: icons.taxi,
  shipping: icons.truck,
  factory: icons.factory,
  construction: icons.hook,
  dealer: icons.dealer,
  it: icons.monitor,
  bank: icons.bank,
  football: icons.pitch,
  oil: icons.rig,
  airline: icons.plane,
};

/** Mynt-ikon med 1–3 mynter (billig → dyr). */
function coinStack(n: number): string {
  return `<span class="coin-stack coins-${n}">${Array.from({ length: n }, () => `<span>${icons.coin}</span>`).join('')}</span>`;
}

export function createBusinessPage(state: GameState): Page {
  const element = html(`<section class="page business"></section>`);
  let stack: View[] = [{ name: 'home' }];
  const current = () => stack[stack.length - 1];
  const find = (id: string) => state.businesses.find((b) => b.id === id);
  /** Oljeselskapet betaler på samme måte som bilforhandleren (plattformer og oppgraderinger blir en del av bedriftens verdi). */
  const oilPay = (b: Business): OilPay => dealerPay(state, b);
  /** Flyselskapet: som fotballklubben (ledige fly selges uten skatt). */
  const airPay = (b: Business): AirlinePay => footballPay(state, b);

  function go(view: View) {
    stack.push(view);
    render();
    window.scrollTo(0, 0);
  }

  function back() {
    procureFor = null;
    if (stack.length > 1) stack.pop();
    // Bedriften kan ha blitt lagt ned: hopp over visninger for den
    while (stack.length > 1 && 'id' in current() && !find((current() as { id: string }).id)) stack.pop();
    render();
    window.scrollTo(0, 0);
  }

  let lastRender = 0;
  let confirmClose = false;
  /** IT-selskap: "trykk igjen" for å avbryte et prosjekt / gi en ansatt sparken. */
  let confirmDrop = false;
  let confirmFire = false;
  /** Fotballklubb: "trykk igjen" for å selge en spiller / trekke laget fra turneringen. */
  let confirmSell = false;
  let confirmLeave = false;
  /** Oljeselskap: hvilken knapp som venter på "trykk igjen" ("buy" eller "up:pumps"). */
  let oilConfirm: string | null = null;
  /** Flyselskap: "trykk igjen" for å selge ledige fly. */
  let airSellConfirm = false;
  /** Vinduet "Kjøp plasser til bedrifter" er åpent. */
  let slotsOpen = false;
  /** Spill av åpne-animasjonen bare første gang (siden tegnes på nytt hvert sekund). */
  let slotsAnimate = false;
  /** Byggefirma: vinduet "kjøp det som mangler" for dette bygget (eller null). */
  let procureFor: string | null = null;
  let procureAnimate = false;

  /** Tegner visningen på nytt (når man bytter visning, og én gang i sekundet for tall som endres). */
  function render() {
    const chipScroll = [...element.querySelectorAll('.taxi-chips')].map((c) => c.scrollLeft);
    renderView();
    element.querySelectorAll('.taxi-chips').forEach((c, i) => (c.scrollLeft = chipScroll[i] ?? 0));
  }

  function renderView() {
    lastRender = performance.now();
    const view = current();
    element.dataset.view = view.name;
    const viewed = 'id' in view ? find(view.id) : undefined;
    if (viewed && isTaxi(viewed)) element.dataset.fleet = fleetOf(viewed);
    else delete element.dataset.fleet;
    // Fargetema for sidene til en bedrift (se empire.css)
    if (viewed) element.dataset.theme = typeById(viewed.type).category;
    else delete element.dataset.theme;
    const backBtn = `<button class="biz-back" data-action="back" aria-label="Tilbake">${icons.back}</button>`;

    switch (view.name) {
      case 'home':
        element.innerHTML = renderHome() + (slotsOpen ? renderSlots() : '');
        break;
      case 'categories':
        element.innerHTML = backBtn + renderCategories();
        break;
      case 'types':
        element.innerHTML = backBtn + renderTypes(view.category);
        break;
      case 'name':
        element.innerHTML = backBtn + renderName(view.type);
        bindNameInput();
        break;
      case 'detail': {
        const b = find(view.id);
        if (!b) element.innerHTML = '';
        else if (isTaxi(b)) element.innerHTML = renderTaxiDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'build') element.innerHTML = renderConstructionDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'dealer') element.innerHTML = renderDealerDetail(b, heroHtml(b));
        else if (engineOf(b) === 'it') element.innerHTML = renderItDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'bank') element.innerHTML = renderBankDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'football') element.innerHTML = renderFootballDetail(state, b, heroHtml(b));
        else if (engineOf(b) === 'oil') element.innerHTML = renderOilDetail(state, b, heroHtml(b), oilConfirm === 'buy');
        else if (engineOf(b) === 'airline') element.innerHTML = renderAirlineDetail(state, b, heroHtml(b));
        else element.innerHTML = renderDetail(b);
        break;
      }
      case 'carShop': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderCarShop(state, b, view.filter, view.selected, view.qty) : '';
        break;
      }
      case 'fleet': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderFleet(b, view.sort, view.filter) : '';
        break;
      }
      case 'projects': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderProjects(b) : '';
        break;
      }
      case 'buildNew': {
        const b = find(view.id);
        if (!b) {
          element.innerHTML = '';
          break;
        }
        const animate = procureAnimate;
        procureAnimate = false;
        element.innerHTML = backBtn + renderBuildNew(b, view.short) + (procureFor ? renderProcure(state, b, procureFor, animate) : '');
        break;
      }
      case 'resources': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderResources(state, b) : '';
        bindResourceInputs();
        break;
      }
      // --- Bilforhandler ---
      case 'dService': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderService(b, view.filter) : '';
        break;
      }
      case 'dShowroom': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderShowroom(b) : '';
        break;
      }
      case 'dMarket': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderMarket(state, b) : '';
        break;
      }
      case 'dMarketCar': {
        const b = find(view.id);
        const m = b && marketOf(b).find((x) => x.id === view.car);
        if (!b || !m) {
          // Lista er laget på nytt (ny time): bilen finnes ikke lenger
          stack.pop();
          showToast('Bilen er ikke lenger i markedet');
          return renderView();
        }
        element.innerHTML = backBtn + renderMarketCar(state, b, m);
        break;
      }
      case 'dCar': {
        const b = find(view.id);
        const c = b && carById(b, view.car);
        if (!b || !c) {
          stack.pop();
          showToast('Bilen er solgt');
          return renderView();
        }
        element.innerHTML = backBtn + renderOwnedCar(state, b, c, view.sel);
        break;
      }
      case 'dSpec': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderSpec(b, view.pick) : '';
        break;
      }
      case 'dExpand': {
        const b = find(view.id);
        element.dataset.kind = view.kind;
        element.innerHTML = b ? backBtn + renderExpand(state, b, view.kind) : '';
        break;
      }
      case 'dSkills': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderSkills(b) : '';
        break;
      }
      // --- Oljeselskap ---
      case 'oPlat': {
        const b = find(view.id);
        const p = b && ownedPlatform(oilOf(b), view.plat);
        if (!b || !p) {
          stack.pop();
          return renderView();
        }
        element.innerHTML = backBtn + renderPlatform(state, b, p, oilConfirm);
        break;
      }
      // --- Flyselskap ---
      case 'aRegion':
      case 'aHubs': {
        const b = find(view.id);
        if (!b) break;
        element.innerHTML = backBtn + (view.name === 'aRegion' ? renderRegion(state, b, view.cont) : renderHubs(state, b, view.cont));
        break;
      }
      case 'aFleet': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderAirFleet(state, b, airSellConfirm) : '';
        break;
      }
      case 'aShop': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderPlaneShop(state, b, view.sel, view.qty) : '';
        break;
      }
      case 'aLicenses': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderLicenses(state, b) : '';
        break;
      }

      // --- Fotballklubb ---
      case 'fLeagues':
      case 'fTournament':
      case 'fMatch':
      case 'fRecord':
      case 'fSquad':
      case 'fPlayer':
      case 'fMarket':
      case 'fBuy':
      case 'fTraining':
      case 'fTrophies':
      case 'fHistory': {
        const b = find(view.id);
        if (!b) break;
        let html = '';
        if (view.name === 'fLeagues') html = renderLeagues(b);
        else if (view.name === 'fTournament') html = renderTournament(b, confirmLeave, view.all);
        else if (view.name === 'fMatch') html = renderMatch(b, view.round);
        else if (view.name === 'fRecord') html = renderRecord(b, view.index);
        else if (view.name === 'fSquad') html = renderSquad(b);
        else if (view.name === 'fMarket') html = renderFcMarket(b);
        else if (view.name === 'fBuy') html = renderBuy(state, b, view.ref, view.replace);
        else if (view.name === 'fTraining') html = renderTraining(state, b);
        else if (view.name === 'fTrophies') html = renderTrophies(b);
        else if (view.name === 'fHistory') html = renderHistory(b);
        else if (view.name === 'fPlayer') {
          const x = fcOf(b).squad.find((p) => p.id === view.player);
          if (!x) {
            stack.pop();
            return renderView();
          }
          html = renderPlayer(b, x, confirmSell);
        }
        element.innerHTML = backBtn + html;
        break;
      }
      // --- Bank ---
      case 'bControl': {
        const b = find(view.id);
        if (!b) break;
        element.innerHTML = backBtn + renderBankControl(b, view.deposit, view.loan);
        bindBankSliders(element, b, (deposit, loan) => {
          view.deposit = deposit;
          view.loan = loan;
        });
        break;
      }
      // --- IT-selskap ---
      case 'iProjects': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItProjects(b, view.tab) : '';
        break;
      }
      case 'iProject': {
        const b = find(view.id);
        const p = b && itOf(b).projects.find((x) => x.id === view.project);
        if (!b || !p) {
          stack.pop();
          return renderView();
        }
        element.innerHTML = backBtn + renderItProject(b, p, confirmDrop);
        break;
      }
      case 'iNew': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItNew(b) : '';
        break;
      }
      case 'iSetup': {
        const b = find(view.id);
        if (!b) break;
        // Fjern valgte som ikke lenger er ledige (fått sparken eller startet et annet prosjekt)
        Object.assign(view.picks, validPicks(b, view.picks));
        element.innerHTML = backBtn + renderItSetup(b, projectDef(view.def), view.picks);
        break;
      }
      case 'iTeam': {
        const b = find(view.id);
        if (!b) break;
        Object.assign(view.picks, validPicks(b, view.picks));
        element.innerHTML = backBtn + renderItTeam(b, projectDef(view.def), view.picks, view.skill);
        break;
      }
      case 'iRole': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItRole(b, view.role, view.sort) : '';
        break;
      }
      case 'iEmployee': {
        const b = find(view.id);
        const e = b && employeeById(b, view.emp);
        if (!b || !e) {
          stack.pop();
          return renderView();
        }
        element.innerHTML = backBtn + renderItEmployee(b, e, confirmFire);
        break;
      }
      case 'iHire': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItHire(state, b, view.role) : '';
        bindHireInput();
        break;
      }
      case 'iOffers': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderItOffers(b) : '';
        break;
      }
      case 'iOffer': {
        const b = find(view.id);
        const e = b && itOf(b).offers.find((o) => o.id === view.offer);
        if (!b || !e) {
          stack.pop();
          showToast('Tilbudet er ikke lenger tilgjengelig');
          return renderView();
        }
        element.innerHTML = backBtn + renderItOffer(state, b, e);
        break;
      }
      case 'settings': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderSettings(b) : '';
        break;
      }
      case 'rename': {
        const b = find(view.id);
        element.innerHTML = b ? backBtn + renderRename(b) : '';
        bindNameInput();
        break;
      }
    }
  }

  // --- Navn-feltet: knappen er grå til man har skrevet noe -----------------------------
  function bindNameInput() {
    const input = element.querySelector<HTMLInputElement>('[data-name-input]');
    const btn = element.querySelector<HTMLButtonElement>('[data-name-submit]');
    if (!input || !btn) return;
    const refresh = () => (btn.disabled = input.value.trim().length === 0);
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !btn.disabled) btn.click();
    });
    refresh();
  }

  // --- IT-selskap: antall å ansette (intervjukostnaden regnes ut mens man skriver) ---------
  function hireQty(): number {
    const input = element.querySelector<HTMLInputElement>('[data-hire-qty]');
    return Math.max(0, Math.floor(Number(input?.value) || 0));
  }
  function bindHireInput() {
    const view = current();
    const input = element.querySelector<HTMLInputElement>('[data-hire-qty]');
    const cost = element.querySelector<HTMLElement>('[data-hire-cost]');
    const btn = element.querySelector<HTMLButtonElement>('[data-hire-btn]');
    if (!input || !cost || !btn || view.name !== 'iHire') return;
    const refresh = () => {
      const total = hireQty() * roleById(view.role).interview;
      cost.textContent = formatMoneyWhole(total);
      btn.disabled = hireQty() <= 0;
      btn.classList.toggle('poor', total > state.balance);
    };
    input.addEventListener('input', refresh);
    refresh();
  }

  // --- Byggefirma: skrivefeltene for ressurser (summen regnes ut mens man skriver) ---------
  function resourceAmounts() {
    const amounts = emptyResources();
    element.querySelectorAll<HTMLInputElement>('[data-res]').forEach((input) => {
      const r = RESOURCES.find((x) => x.id === input.dataset.res)!;
      amounts[r.id] = Math.min(1e12, Math.max(0, Math.floor(Number(input.value) || 0)));
    });
    return amounts;
  }
  function bindResourceInputs() {
    const sum = element.querySelector<HTMLElement>('[data-res-sum]');
    const btn = element.querySelector<HTMLButtonElement>('[data-res-submit]');
    if (!sum || !btn) return;
    const refresh = () => {
      const cost = RESOURCES.reduce((total, r) => total + resourceAmounts()[r.id] * r.price, 0);
      sum.textContent = formatMoneyFull(cost);
      btn.disabled = cost <= 0;
      btn.classList.toggle('poor', cost > state.balance);
    };
    element.querySelectorAll('[data-res]').forEach((i) => i.addEventListener('input', refresh));
    refresh();
  }

  // Ikke tegn på nytt midt i et trykk (da ville trykket blitt borte)
  let pressing = false;
  element.addEventListener('pointerdown', () => (pressing = true));
  window.addEventListener('pointerup', () => (pressing = false));
  window.addEventListener('pointercancel', () => (pressing = false));

  const shake = (el: HTMLElement) => {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  };

  // --- Alle trykk ------------------------------------------------------------------------
  element.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target) return;
    const { action, id = '', category, type } = target.dataset;
    const view = current();
    if (action !== 'close') confirmClose = false;
    if (action !== 'i-drop') confirmDrop = false;
    if (action !== 'i-fire') confirmFire = false;
    if (action !== 'f-sell') confirmSell = false;
    if (action !== 'f-leave') confirmLeave = false;
    if (action !== 'o-buy' && action !== 'o-up') oilConfirm = null;
    if (action !== 'a-sell') airSellConfirm = false;

    switch (action) {
      case 'back':
        return back();
      // Gullbarre: hopp over ventingen (overalt i bedriftene)
      case 'skip': {
        const result = useSkip(state, target.dataset.skip as SkipKind, id, target.dataset.key ?? '');
        if (result === 'bars') {
          shake(target);
          return showToast('Du har ingen gullbarrer. Du får én hver dag du åpner appen.', 3500);
        }
        if (result !== 'ok') return render();
        showToast('Ferdig! Du brukte 1 gullbarre.');
        return render();
      }
      case 'start':
        if (slotsFull(state)) {
          showToast('Alle plassene er i bruk – kjøp flere plasser');
          slotsOpen = true;
          slotsAnimate = true;
          return render();
        }
        return go({ name: 'categories' });

      // --- Bedriftsplasser ---
      case 'slots':
        slotsOpen = true;
        slotsAnimate = true;
        return render();
      case 'slots-close':
        // Trykk på den mørke bakgrunnen eller krysset (ikke inne i vinduet)
        if (target.classList.contains('slots-backdrop') && e.target !== target) return;
        slotsOpen = false;
        return render();
      case 'buy-slot': {
        const result = buySlot(state);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast(`Plass ${nextSlot(state)} bygges – klar om 4 timer`);
        return render();
      }
      case 'category': {
        // Kategorier med bare én type (taxi) går rett til navnet
        const types = typesIn(category as BusinessCategoryId);
        if (types.length === 1) return go({ name: 'name', type: types[0].id });
        return go({ name: 'types', category: category as BusinessCategoryId });
      }

      // --- Byggefirma ---
      case 'c-projects':
        return go({ name: 'projects', id });
      case 'c-new':
        return go({ name: 'buildNew', id, short: null });
      case 'c-refill':
        return go({ name: 'resources', id });
      case 'c-build': {
        const b = find(id);
        if (!b || view.name !== 'buildNew') return;
        const result = startProject(state, b, target.dataset.building!);
        if (result === 'full') {
          shake(target);
          return showToast(`Du kan ikke bygge flere enn ${MAX_PROJECTS} på en gang`);
        }
        if (result === 'resources') {
          view.short = target.dataset.building!;
          shake(target);
          return render();
        }
        if (result !== 'ok') return;
        view.short = null;
        showToast(`${buildingById(target.dataset.building!).name} bygges`);
        stack.pop();
        return go({ name: 'projects', id });
      }
      case 'c-procure':
        procureFor = target.dataset.building!;
        procureAnimate = true;
        return render();
      case 'c-procure-close':
        if (target.classList.contains('con-backdrop') && e.target !== target) return;
        procureFor = null;
        return render();
      case 'c-buy-build': {
        const b = find(id);
        if (!b || view.name !== 'buildNew') return;
        const result = startProject(state, b, target.dataset.building!, true);
        if (result === 'full') {
          shake(target);
          return showToast(`Du kan ikke bygge flere enn ${MAX_PROJECTS} på en gang`);
        }
        if (result !== 'ok') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        procureFor = null;
        view.short = null;
        showToast(`${buildingById(target.dataset.building!).name} bygges`);
        stack.pop();
        return go({ name: 'projects', id });
      }
      case 'c-sell': {
        const b = find(id);
        if (!b) return;
        const got = sellProject(state, b, target.dataset.project!);
        if (got > 0) showToast(`Solgt for ${formatMoney(got)}`);
        return render();
      }
      case 'c-refill-buy': {
        const b = find(id);
        if (!b) return;
        if (!buyResources(state, b, resourceAmounts())) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast('Ressursene er fylt på');
        return back();
      }

      // --- Bilforhandler ---
      case 'd-service':
        return go({ name: 'dService', id, filter: 'all' });
      case 'd-showroom':
        return go({ name: 'dShowroom', id });
      case 'd-market':
        return go({ name: 'dMarket', id });
      case 'd-mcar':
        return go({ name: 'dMarketCar', id, car: target.dataset.car! });
      case 'd-car':
        return go({ name: 'dCar', id, car: target.dataset.car!, sel: [] });
      case 'd-filter':
        if (view.name === 'dService') view.filter = target.dataset.filter as ServiceFilter;
        return render();
      case 'd-diag': {
        const b = find(id);
        if (!b) return;
        const result = buyDiagnostics(b, dealerPay(state, b), target.dataset.car!);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Diagnosen er utført');
        return render();
      }
      case 'd-buy': {
        const b = find(id);
        if (!b) return;
        const m = marketOf(b).find((x) => x.id === target.dataset.car);
        const result = buyMarketCar(b, dealerPay(state, b), target.dataset.car!);
        if (result === 'full') {
          shake(target);
          return showToast('Verkstedet er fullt');
        }
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result !== 'ok') return render();
        showToast(`Du kjøpte ${dealerModel(m!.model).name}`);
        // Tilbake til forsiden av bilforhandleren
        stack = [{ name: 'home' }, { name: 'detail', id }];
        render();
        window.scrollTo(0, 0);
        return;
      }
      case 'd-part': {
        if (view.name !== 'dCar') return;
        const part = target.dataset.part as PartId;
        view.sel = view.sel.includes(part) ? view.sel.filter((p) => p !== part) : [...view.sel, part];
        return render();
      }
      case 'd-repair': {
        const b = find(id);
        if (!b || view.name !== 'dCar') return;
        const result = startRepair(b, dealerPay(state, b), view.car, view.sel);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') {
          view.sel = [];
          showToast('Reparasjonen har startet');
        }
        return render();
      }
      case 'd-sell': {
        const b = find(id);
        if (!b) return;
        const result = putUpForSale(b, target.dataset.car!);
        if (result === 'full') {
          shake(target);
          return showToast('Utstillingen er full');
        }
        if (result !== 'ok') return render();
        showToast('Bilen står nå i utstillingen');
        return back();
      }
      case 'd-spec':
        return go({ name: 'dSpec', id, pick: null });
      case 'd-spec-pick':
        if (view.name === 'dSpec') view.pick = target.dataset.seg as SegmentId;
        return render();
      case 'd-spec-change': {
        if (view.name !== 'dSpec') return;
        const b = find(view.id);
        if (!b) return;
        if (changeSegment(b, target.dataset.seg as SegmentId)) {
          view.pick = null;
          showToast('Spesialiseringen byttes – det tar 15 minutter');
        }
        return render();
      }
      case 'd-expand':
        return go({ name: 'dExpand', id, kind: target.dataset.kind as 'service' | 'showroom' });
      case 'd-expand-buy': {
        const b = find(id);
        if (!b) return;
        const result = expandDealer(b, dealerPay(state, b), target.dataset.kind as 'service' | 'showroom', Number(target.dataset.index));
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Utvidelsen har startet');
        return render();
      }
      case 'd-skills':
        return go({ name: 'dSkills', id });

      // --- Oljeselskap ---
      case 'o-plat':
        return go({ name: 'oPlat', id, plat: target.dataset.plat! });
      case 'o-use': {
        const b = find(id);
        const plat = target.dataset.plat!;
        if (!b || selectPlatform(b, plat) !== 'ok') return;
        showToast(`${platformById(plat).name} pumper nå olje`);
        return render();
      }
      case 'o-buy': {
        const b = find(id);
        if (!b) return;
        const s = oilOf(b);
        if (s.building) {
          shake(target);
          return showToast('Vent til plattformen som bygges er ferdig');
        }
        const next = nextPlatform(s);
        if (!next) return;
        if (state.balance < next.price) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        // Trykk to ganger for å kjøpe (det er dyrt)
        if (oilConfirm !== 'buy') {
          oilConfirm = 'buy';
          return render();
        }
        oilConfirm = null;
        const result = buyPlatform(b, oilPay(b));
        if (result !== 'ok') {
          shake(target);
          return showToast(result === 'money' ? 'Du har ikke nok penger' : 'Det gikk ikke');
        }
        showToast(`${next.name} bygges! Ferdig om ${next.buildHours} timer.`, 4000);
        return render();
      }
      case 'o-up': {
        const b = find(id);
        if (!b) return;
        const plat = target.dataset.plat!;
        const up = target.dataset.up!;
        const key = `up:${up}`;
        if (oilConfirm !== key) {
          oilConfirm = key;
          return render();
        }
        oilConfirm = null;
        const result = buyUpgrade(b, oilPay(b), plat, up);
        if (result !== 'ok') {
          shake(target);
          return showToast(result === 'money' ? 'Du har ikke nok penger' : 'Det gikk ikke');
        }
        showToast(`${UPGRADES.find((u) => u.id === up)!.name}: +10 % olje på ${platformById(plat).name}`);
        return render();
      }
      case 'o-sell': {
        const b = find(id);
        if (!b) return;
        const gross = sellOil(b, oilPay(b), Number(target.dataset.share));
        if (gross <= 0) return showToast('Ingen olje på lager');
        showToast(`Solgt olje for ${formatMoney(gross)}`);
        return render();
      }
      case 'o-storage': {
        const b = find(id);
        if (!b) return;
        const hours = storageHours(oilOf(b).level);
        const result = upgradeStorage(b);
        if (result !== 'ok') {
          shake(target);
          return showToast(result === 'busy' ? 'Lageret bygges allerede ut' : 'Lageret er fullt utbygd');
        }
        showToast(`Lageret bygges ut – ferdig om ${hours} ${hours === 1 ? 'time' : 'timer'}`);
        return render();
      }

      // --- Flyselskap ---
      case 'a-region': {
        const b = find(id);
        const cont = target.dataset.cont as ContinentId;
        if (!b) return;
        // Låst: ingenting skjer (som i originalen)
        if (!hasLicense(airlineOf(b), cont)) return;
        return go({ name: 'aRegion', id, cont });
      }
      case 'a-hubs':
        return go({ name: 'aHubs', id, cont: target.dataset.cont as ContinentId });
      case 'a-fleet':
        return go({ name: 'aFleet', id });
      case 'a-licenses':
        return go({ name: 'aLicenses', id });
      case 'a-shop': {
        const plane = (target.dataset.plane as PlaneId | undefined) ?? null;
        return go({ name: 'aShop', id, sel: plane, qty: 1 });
      }
      case 'a-license': {
        const b = find(id);
        if (!b) return;
        const lic = target.dataset.lic!;
        const result = buyLicense(b, airPay(b), lic);
        if (result !== 'ok') {
          shake(target);
          return showToast(result === 'money' ? 'Du har ikke nok penger' : result === 'locked' ? 'Lanser alle innenriksflyvningene først' : 'Du har allerede lisensen');
        }
        showToast(lic === 'intl' ? 'Du kan nå lansere internasjonale flyvninger!' : `Du kan nå fly i ${continentById(lic as ContinentId).name}!`);
        return render();
      }
      case 'a-hub': {
        const b = find(id);
        if (!b) return;
        const cont = target.dataset.cont as ContinentId;
        const result = leaseHub(b, airPay(b), cont);
        if (result !== 'ok') {
          shake(target);
          return showToast(result === 'money' ? 'Du har ikke nok penger' : 'Det gikk ikke');
        }
        showToast('Hubben er leid – nye flyvninger er klare');
        return render();
      }
      case 'a-launch': {
        const b = find(id);
        if (!b) return;
        const cont = target.dataset.cont as ContinentId;
        const next = nextFlight(airlineOf(b), cont);
        const result = launchFlight(b, airPay(b), cont);
        if (result !== 'ok') {
          shake(target);
          if (result === 'planes' && next.kind === 'flight') return showToast(`Du trenger flere fly av typen ${planeById(next.flight.plane).name}`);
          return showToast(result === 'money' ? 'Du har ikke nok penger' : 'Det gikk ikke');
        }
        showToast('Flyvningen lanseres – den er i lufta om 1 time');
        return render();
      }
      case 'a-pick': {
        if (view.name !== 'aShop') return;
        const plane = target.dataset.plane as PlaneId;
        view.qty = view.sel === plane ? view.qty : 1;
        view.sel = plane;
        return render();
      }
      case 'a-unpick':
        if (view.name !== 'aShop') return;
        view.sel = null;
        return render();
      case 'a-qty': {
        if (view.name !== 'aShop' || !view.sel) return;
        const d = target.dataset.delta!;
        view.qty = d === 'max' ? Math.max(1, maxAffordable(state.balance, view.sel)) : Math.max(1, view.qty + Number(d));
        return render();
      }
      case 'a-buy': {
        const b = find(id);
        if (!b || view.name !== 'aShop' || !view.sel) return;
        const result = buyPlanes(b, airPay(b), view.sel, view.qty);
        if (result !== 'ok') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast(`Kjøpte ${view.qty} × ${planeById(view.sel).name}`);
        view.sel = null;
        view.qty = 1;
        return render();
      }
      case 'a-service': {
        const b = find(id);
        if (!b) return;
        const result = performService(b, airPay(b));
        if (result !== 'ok') {
          shake(target);
          return showToast(result === 'money' ? 'Du har ikke nok penger' : 'Ingen fly trenger service ennå');
        }
        showToast('Service utført – neste frist er om 48 timer');
        return render();
      }
      case 'a-sell': {
        const b = find(id);
        if (!b) return;
        if (!airSellConfirm) {
          airSellConfirm = true;
          return render();
        }
        airSellConfirm = false;
        const value = sellUnused(b, airPay(b));
        if (value <= 0) return showToast('Ingen ledige fly å selge');
        showToast(`Solgte ledige fly for ${formatMoney(value)}`);
        return render();
      }

      // --- Fotballklubb ---
      case 'f-leagues':
        return go({ name: 'fLeagues', id });
      case 'f-tournament':
        return go({ name: 'fTournament', id, all: false });
      case 'f-groups':
        if (view.name === 'fTournament') view.all = !view.all;
        return render();
      case 'f-match':
        return go({ name: 'fMatch', id, round: Number(target.dataset.round) });
      case 'f-record':
        return go({ name: 'fRecord', id, index: Number(target.dataset.index) });
      case 'f-history':
        return go({ name: 'fHistory', id });
      case 'f-trophies':
        return go({ name: 'fTrophies', id });
      case 'f-squad':
        return go({ name: 'fSquad', id });
      case 'f-player':
        if (view.name !== 'fSquad') return;
        return go({ name: 'fPlayer', id: view.id, player: target.dataset.player! });
      case 'f-training':
        return go({ name: 'fTraining', id });
      case 'f-news': {
        const b = find(id);
        if (b) fcOf(b).news = [];
        return render();
      }
      case 'f-market': {
        const b = find(id);
        if (!b) return;
        // Første gang (eller tom liste): lag en liste med en gang
        if (!fcOf(b).market.length) refreshMarket(fcOf(b), Date.now(), true);
        return go({ name: 'fMarket', id });
      }
      case 'f-refresh': {
        const b = find(id);
        if (b && refreshMarket(fcOf(b))) showToast('Overgangslista er oppdatert');
        return render();
      }
      case 'f-buy':
        return go({ name: 'fBuy', id, ref: target.dataset.ref!, replace: null });
      case 'f-replace':
        if (view.name === 'fBuy') view.replace = view.replace === target.dataset.player ? null : target.dataset.player!;
        return render();
      case 'f-buy-do': {
        const b = find(id);
        if (!b || view.name !== 'fBuy') return;
        const result = buyPlayer(fcOf(b), footballPay(state, b), view.ref, view.replace);
        const messages: Partial<Record<typeof result, string>> = {
          full: 'Laget er fullt – velg hvem som skal ut',
          money: 'Du har ikke nok penger',
          live: 'Kampen pågår – du kan ikke kjøpe spillere nå',
          gone: 'Spilleren er ikke lenger på lista',
        };
        if (result !== 'ok') {
          shake(target);
          return showToast(messages[result] ?? 'Det gikk ikke');
        }
        showToast('Spilleren er kjøpt!');
        stack = [{ name: 'home' }, { name: 'detail', id }, { name: 'fSquad', id }];
        render();
        window.scrollTo(0, 0);
        return;
      }
      case 'f-sell': {
        const b = find(id);
        if (!b) return;
        if (!confirmSell) {
          confirmSell = true;
          return render();
        }
        confirmSell = false;
        const result = sellPlayer(fcOf(b), footballPay(state, b), target.dataset.player!);
        if (result === 'live') return showToast('Kampen pågår – du kan ikke selge nå');
        if (result === 'ok') showToast('Spilleren har forlatt klubben');
        return back();
      }
      case 'f-pay': {
        const b = find(id);
        if (!b) return;
        if (payContracts(fcOf(b), footballPay(state, b)) === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast('Kontraktene er betalt');
        return render();
      }
      case 'f-activity': {
        const b = find(id);
        if (!b) return;
        const result = startActivity(fcOf(b), footballPay(state, b), target.dataset.activity as ActivityId);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'live') return showToast('Kampen pågår – dere kan ikke trene nå');
        if (result === 'ok') showToast('Aktiviteten har startet');
        return render();
      }
      case 'f-join': {
        const b = find(id);
        if (!b) return;
        const league = target.dataset.league!;
        const result = joinLeague(fcOf(b), league);
        const messages: Partial<Record<typeof result, string>> = {
          closed: 'Påmeldingen er stengt',
          need: 'Dere må ha 11 spillere',
          rating: `Klubben trenger rating ${leagueById(league).minRating} (har ${clubRating(fcOf(b)).toFixed(1)})`,
          joined: 'Dere er allerede med i en turnering',
        };
        if (result !== 'ok') {
          shake(target);
          return showToast(messages[result] ?? 'Det gikk ikke');
        }
        showToast(`Dere er med i ${leagueById(league).name}!`);
        stack = [{ name: 'home' }, { name: 'detail', id }, { name: 'fTournament', id, all: false }];
        render();
        window.scrollTo(0, 0);
        return;
      }
      case 'f-leave': {
        const b = find(id);
        if (!b) return;
        if (!confirmLeave) {
          confirmLeave = true;
          return render();
        }
        confirmLeave = false;
        if (liveRound(fcOf(b)) !== null) return showToast('Kampen pågår – vent til den er ferdig');
        leaveLeague(fcOf(b));
        showToast('Dere har trukket dere fra turneringen');
        return render();
      }

      // --- Bank ---
      case 'b-control': {
        const b = find(id);
        if (!b) return;
        // Skyveknappene starter på rentene som er lagret nå (endringer lagres bare med "Lagre")
        return go({ name: 'bControl', id, deposit: bankOf(b).deposit, loan: bankOf(b).loan });
      }
      case 'b-save':
      case 'b-default': {
        const b = find(id);
        if (!b || view.name !== 'bControl') return;
        if (action === 'b-save') setRates(b, view.deposit, view.loan);
        else setRates(b, DEFAULT_DEPOSIT, DEFAULT_LOAN);
        showToast(action === 'b-save' ? 'Rentene er lagret' : 'Rentene er satt til standard');
        return back();
      }
      case 'b-expand': {
        const b = find(id);
        if (!b) return;
        const result = expandVault(b, dealerPay(state, b));
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Utvidelsen av hvelvet har startet');
        return render();
      }

      // --- IT-selskap ---
      case 'i-projects':
        return go({ name: 'iProjects', id, tab: target.dataset.tab as 'progress' | 'done' });
      case 'i-project':
        return go({ name: 'iProject', id, project: target.dataset.project! });
      case 'i-sell': {
        const b = find(id);
        if (!b) return;
        const before = state.balance;
        if (sellItProject(b, dealerPay(state, b), target.dataset.project!) > 0) {
          showToast(`Solgt for ${formatMoney(state.balance - before)}`);
        }
        if (view.name === 'iProject') return back();
        return render();
      }
      case 'i-drop': {
        const b = find(id);
        if (!b) return;
        if (!confirmDrop) {
          confirmDrop = true;
          return render();
        }
        confirmDrop = false;
        dropProject(b, target.dataset.project!);
        showToast('Prosjektet er avbrutt');
        return back();
      }
      case 'i-new':
        return go({ name: 'iNew', id });
      case 'i-setup':
        return go({ name: 'iSetup', id, def: target.dataset.def!, picks: emptyPicks() });
      case 'i-team':
        if (view.name !== 'iSetup') return;
        return go({ name: 'iTeam', id, def: view.def, picks: view.picks, skill: target.dataset.skill as SkillId });
      case 'i-pick': {
        if (view.name !== 'iTeam') return;
        const emp = target.dataset.emp!;
        const list = view.picks[view.skill];
        view.picks[view.skill] = list.includes(emp) ? list.filter((x) => x !== emp) : [...list, emp];
        return render();
      }
      case 'i-auto': {
        if (view.name !== 'iTeam') return;
        const b = find(view.id);
        if (!b) return;
        view.picks[view.skill] = autoPick(b, projectDef(view.def), view.skill);
        return render();
      }
      case 'i-start': {
        const b = find(id);
        if (!b || view.name !== 'iSetup') return;
        if (startItProject(b, view.def, view.picks) !== 'ok') {
          shake(target);
          return showToast('Teamene har ikke nok skill');
        }
        showToast(`${projectDef(view.def).name} er startet`);
        // Tilbake til forsiden av IT-selskapet
        stack = [{ name: 'home' }, { name: 'detail', id }];
        render();
        window.scrollTo(0, 0);
        return;
      }
      case 'i-role':
        return go({ name: 'iRole', id, role: target.dataset.role as RoleId, sort: 'salary-desc' });
      case 'i-sort':
        if (view.name === 'iRole') view.sort = target.dataset.sort as StaffSort;
        return render();
      case 'i-emp':
        if (view.name !== 'iRole') return;
        return go({ name: 'iEmployee', id: view.id, emp: target.dataset.emp! });
      case 'i-fire': {
        const b = find(id);
        if (!b) return;
        if (!confirmFire) {
          confirmFire = true;
          return render();
        }
        confirmFire = false;
        const e = employeeById(b, target.dataset.emp!);
        const result = fire(b, target.dataset.emp!);
        if (result === 'busy') return showToast('Personen jobber på et prosjekt');
        if (result === 'ok' && e) showToast(`${e.name} har fått sparken`);
        return back();
      }
      case 'i-hire':
        return go({ name: 'iHire', id, role: target.dataset.role as RoleId });
      case 'i-hire-do': {
        const b = find(id);
        if (!b) return;
        const qty = hireQty();
        const result = quickHire(b, dealerPay(state, b), target.dataset.role as RoleId, qty);
        if (result === 'places') {
          shake(target);
          return showToast('Ikke nok ledige arbeidsplasser – kjøp et større kontor');
        }
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result !== 'ok') return;
        showToast(`Ansatte ${qty} × ${roleById(target.dataset.role as RoleId).name.toLowerCase()}`);
        return back();
      }
      case 'i-offers':
        return go({ name: 'iOffers', id });
      case 'i-refresh': {
        const b = find(id);
        if (!b) return;
        refreshOffers(b);
        return render();
      }
      case 'i-offer':
        if (view.name !== 'iOffers') return;
        return go({ name: 'iOffer', id: view.id, offer: target.dataset.offer! });
      case 'i-offer-hire': {
        const b = find(id);
        if (!b) return;
        const e = itOf(b).offers.find((o) => o.id === target.dataset.offer);
        const result = hireOffer(b, target.dataset.offer!);
        if (result === 'places') {
          shake(target);
          return showToast('Ikke nok ledige arbeidsplasser – kjøp et større kontor');
        }
        if (result === 'ok' && e) showToast(`${e.name} er ansatt`);
        return back();
      }
      case 'i-office': {
        const b = find(id);
        if (!b) return;
        const result = buyOffice(b, dealerPay(state, b), target.dataset.office!);
        if (result === 'money') {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        if (result === 'ok') showToast('Utvidelsen har startet');
        return render();
      }

      case 'expand-cap': {
        const b = find(id);
        if (!b) return;
        if (!expandCapacity(state, b, Number(target.dataset.index))) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        return render();
      }
      case 'car-shop':
        return go({ name: 'carShop', id, filter: null, selected: null, qty: 1 });
      case 'fleet':
        return go({ name: 'fleet', id, sort: 'km-desc', filter: null });
      case 'shop-filter':
      case 'fleet-filter': {
        if (view.name !== 'carShop' && view.name !== 'fleet') return;
        const c = target.dataset.class as CarClass;
        view.filter = view.filter === c ? null : c; // trykk igjen: vis alle
        return render();
      }
      case 'fleet-sort':
        if (view.name === 'fleet') view.sort = target.dataset.sort as FleetSort;
        return render();
      // --- Kjøp av biler: velg bil → velg antall i panelet nederst → Kjøp ---
      case 'select-car':
        if (view.name !== 'carShop') return;
        if (view.selected === target.dataset.model) {
          view.selected = null; // trykk på samme bil igjen: lukk panelet
        } else {
          view.selected = target.dataset.model!;
          view.qty = 1;
        }
        return render();
      case 'qty-minus':
      case 'qty-plus':
      case 'qty-max': {
        if (view.name !== 'carShop' || !view.selected) return;
        const b = find(view.id);
        if (!b) return;
        const max = Math.max(1, maxCars(state, b, view.selected));
        if (action === 'qty-minus') view.qty = Math.max(1, view.qty - 1);
        if (action === 'qty-plus') view.qty = Math.min(max, view.qty + 1);
        if (action === 'qty-max') view.qty = max;
        return render();
      }
      case 'buy-cars': {
        if (view.name !== 'carShop' || !view.selected) return;
        const b = find(view.id);
        if (!b) return;
        const m = modelById(view.selected);
        let bought = 0;
        let result: ReturnType<typeof buyCar> = 'ok';
        while (bought < view.qty && (result = buyCar(state, b, m.id)) === 'ok') bought++;
        if (bought > 0) {
          showToast(`Kjøpte ${bought} × ${m.name}`);
          view.selected = null;
          return render();
        }
        shake(target);
        return showToast(result === 'full' ? 'Ingen ledige plasser – utvid kapasiteten' : 'Du har ikke nok penger');
      }
      case 'type':
        return go({ name: 'name', type: type! });
      case 'open':
        return go({ name: 'detail', id });
      case 'settings':
        return go({ name: 'settings', id });
      case 'rename':
        return go({ name: 'rename', id });
      case 'go-taxes':
        // Bytt til Profil → Skatt (main.ts tar seg av det)
        window.dispatchEvent(new CustomEvent('open-taxes'));
        return;

      case 'create': {
        if (view.name !== 'name') return;
        const name = element.querySelector<HTMLInputElement>('[data-name-input]')!.value;
        const t = typeById(view.type);
        if (state.balance < t.openingCost) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        const b = startBusiness(state, view.type, name);
        if (!b) return;
        showToast(`${b.name} er startet!`);
        // Rett til den nye bedriften (tilbake går til oversikten)
        stack = [{ name: 'home' }, { name: 'detail', id: b.id }];
        render();
        window.scrollTo(0, 0);
        return;
      }

      case 'expand': {
        const b = find(id);
        if (!b) return;
        if (!startExpansion(state, b)) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        return render();
      }

      case 'do-rename': {
        const b = find(id);
        if (!b) return;
        const name = element.querySelector<HTMLInputElement>('[data-name-input]')!.value;
        if (!renameBusiness(state, b, name)) {
          shake(target);
          return showToast('Du har ikke nok penger');
        }
        showToast('Navnet er endret');
        return back();
      }

      case 'close': {
        const b = find(id);
        if (!b) return;
        // Trykk to ganger for å legge ned (så man ikke gjør det ved et uhell)
        if (!confirmClose) {
          confirmClose = true;
          target.textContent = 'Trykk igjen for å legge ned';
          target.classList.add('confirm');
          return;
        }
        confirmClose = false;
        const refund = closeBusiness(state, b);
        showToast(`${b.name} er lagt ned. Du fikk ${formatMoney(refund)}`);
        stack = [{ name: 'home' }];
        render();
        window.scrollTo(0, 0);
        return;
      }
    }
  });

  // =========================================================================
  // Visninger
  // =========================================================================
  function renderHome(): string {
    const list = state.businesses.length
      ? state.businesses.map(renderRow).join('')
      : `<p class="biz-empty">Du eier ingen bedrifter.</p>`;
    return `
      <div class="biz-title-row">
        <h1 class="biz-title">Bedrifter</h1>
        <button class="biz-slots-btn" data-action="slots">${icons.slots}<span>Bedriftsplasser</span></button>
      </div>
      <div class="biz-total">
        <strong>${formatMoney(totalIncomePerHour(state))}</strong>
        <span>Total inntekt per time</span>
      </div>
      <button class="biz-start" data-action="start">Start en bedrift</button>
      <div class="biz-list-head">
        <h2>Mine bedrifter</h2>
        <span>${state.businesses.length}/${state.businessSlots}</span>
      </div>
      <div class="biz-list">${list}</div>
    `;
  }

  /** Vinduet der man kjøper flere bedriftsplasser. */
  function renderSlots(): string {
    const animate = slotsAnimate;
    slotsAnimate = false;
    const building = state.slotExpansionEnd !== null;
    const slot = nextSlot(state);
    let main: string;
    if (building) {
      const left = Math.max(0, (state.slotExpansionEnd! - Date.now()) / 1000);
      const pct = Math.min(100, Math.max(0, Math.floor((1 - left / SLOT_SECONDS) * 100)));
      main = `
        <p class="slots-label">Plass ${slot} bygges</p>
        <div class="slots-card">
          <div class="slots-card-text">
            <span>Gjenstående tid</span>
            <strong class="slots-time">${formatDuration(left, false)}</strong>
          </div>
          ${slotsArt()}
          <div class="slots-progress"><span style="width:${pct}%"></span></div>
          <span class="slots-pct">${pct} %</span>
        </div>
        ${skipBtn('slot')}`;
    } else if (state.businessSlots >= MAX_SLOTS) {
      main = `
        <div class="slots-card">
          <div class="slots-card-text">
            <span class="slots-chip">Alle plasser</span>
            <strong class="slots-time">${MAX_SLOTS} av ${MAX_SLOTS}</strong>
            <span>Du har kjøpt alle plassene</span>
          </div>
          ${slotsArt()}
        </div>`;
    } else {
      const price = slotPrice(slot);
      main = `
        <div class="slots-card">
          <div class="slots-card-text">
            <span class="slots-chip">Plass ${slot}</span>
            <span>Pris:</span>
            <strong>${formatMoney(price)}</strong>
          </div>
          ${slotsArt()}
        </div>
        <button class="slots-buy ${state.balance >= price ? '' : 'poor'}" data-action="buy-slot">Kjøp</button>
        <p class="slots-note">Det tar 4 timer før plassen er klar.</p>`;
    }

    // De neste plassene etter den man kjøper nå, og den siste (låst)
    const upcoming: string[] = [];
    for (let n = slot + 1; n <= Math.min(slot + 2, MAX_SLOTS - 1); n++) {
      upcoming.push(`<div class="slots-next"><strong>Plass ${n}</strong><span>${formatMoney(slotPrice(n))}</span></div>`);
    }
    const showLast = slot < MAX_SLOTS;
    const sep = upcoming.length ? '<span class="slots-sep"></span>' : '';
    const last = showLast ? `${sep}<div class="slots-next"><strong>Plass ${MAX_SLOTS}</strong><span class="slots-lock">${icons.lock}</span></div>` : '';
    const next = upcoming.length || showLast
      ? `
        <p class="slots-label">Neste utvidelser</p>
        <div class="slots-next-row">${upcoming.join('')}${last}</div>`
      : '';

    return `
      <div class="slots-backdrop ${animate ? 'animate' : ''}" data-action="slots-close">
        <div class="slots-modal">
          <h2>Kjøp plasser til bedrifter</h2>
          <p class="slots-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>
          ${main}
          ${next}
        </div>
        <button class="slots-x" data-action="slots-close" aria-label="Lukk">${icons.close}</button>
      </div>`;
  }

  /** Den lille statistikken på en bedrift i lista (kjøretøy eller trinn). */
  function rowStat(b: Business): string {
    const t = typeById(b.type);
    if (engineOf(b) === 'fleet') return `<span>${CATEGORY_ICON[t.category]} ${carsOf(b).length}/${capacityOf(b)}</span>`;
    if (engineOf(b) === 'build') return `<span>${icons.clockDashed} ${underConstruction(b).length} under bygging · ${readyForSale(b).length} klare</span>`;
    if (engineOf(b) === 'dealer') return `<span>${icons.wrench} ${inService(b).length} på verkstedet · ${forSale(b).length} til salgs</span>`;
    if (engineOf(b) === 'oil') {
      const o = oilOf(b);
      return `<span>${icons.rig} ${platformById(o.active).name}</span>${o.building ? `<span>${icons.hourglass} Bygger</span>` : ''}`;
    }
    if (engineOf(b) === 'airline') {
      const a = airlineOf(b);
      const due = serviceCost(a) > 0 ? formatDuration(Math.max(0, a.serviceDue - Date.now()) / 1000, false) : '–';
      return `<span>${icons.plane} ${Math.floor((launchedFlights(a).length / ALL_FLIGHTS.length) * 100)} %</span><span class="${isGrounded(a) ? 'air-row-late' : ''}">${icons.wrench} ${due}</span>`;
    }
    if (engineOf(b) === 'football') {
      const t = fcOf(b).tournament;
      const league = t && !t.finished ? ` · ${leagueById(t.league).name}` : '';
      return `<span>${icons.trophy} Rating ${clubRating(fcOf(b)).toFixed(1)}${league}</span>`;
    }
    if (engineOf(b) === 'bank') return `<span>${icons.bill} ${formatMoneyWhole(bankOf(b).funds)} i hvelvet</span>`;
    if (engineOf(b) === 'it') return `<span>${icons.hourglass} ${inProgress(b).length} pågår · ${completed(b).length} ferdige · ${formatMoneyWhole(wagesPerHour(b))} lønn per time</span>`;
    return `<span>${icons.stage} Trinn ${b.stage} av ${MAX_STAGE}</span>`;
  }

  function renderRow(b: Business): string {
    const t = typeById(b.type);
    const expanding = b.expansionEnd !== null;
    return `
      <button class="biz-row" data-action="open" data-id="${b.id}">
        <span class="biz-icon cat-${categoryById(t.category).color}">${CATEGORY_ICON[t.category]}</span>
        <span class="biz-row-name"><strong>${escapeHtml(b.name)}</strong><span>${t.name}</span></span>
        <span class="round-chevron">${icons.chevronRight}</span>
        <span class="biz-row-stats">
          ${rowStat(b)}
          ${expanding ? `<span class="biz-row-timer">${icons.clock} ${formatDuration((b.expansionEnd! - Date.now()) / 1000, false)}</span>` : ''}
        </span>
        ${engineOf(b) === 'build'
          ? `<span class="biz-row-income"><b>${formatMoneyRounded(readyValue(b))}</b> klart for salg</span>`
          : engineOf(b) === 'football'
          ? `<span class="biz-row-income"><b>${formatMoneyRounded(squadValue(fcOf(b)))}</b> lagverdi</span>`
          : engineOf(b) === 'dealer'
          ? `<span class="biz-row-income"><b>${formatMoneyRounded(showroomValue(b))}</b> til salgs</span>`
          : `<span class="biz-row-income ${incomePerHour(b) < 0 || (engineOf(b) === 'airline' && isGrounded(airlineOf(b))) ? 'negative' : ''}"><b>${formatMoneyRounded(incomePerHour(b))}</b> per time</span>`}
      </button>`;
  }

  function renderCategories(): string {
    const cards = CATEGORIES.map(
      (c) => `
        <button class="biz-cat" data-action="category" data-category="${c.id}">
          <span class="biz-icon lg cat-${c.color}">${CATEGORY_ICON[c.id]}</span>
          <strong>${c.name}</strong>
          <span>Fra ${formatMoneyWhole(cheapestIn(c.id))}</span>
        </button>`,
    ).join('');
    return `
      <h1 class="biz-page-title">Velg en ny bedriftskategori</h1>
      <div class="biz-cats">${cards}</div>
    `;
  }

  function renderTypes(category: BusinessCategoryId): string {
    const rows = typesIn(category)
      .map(
        (t) => `
        <button class="biz-type" data-action="type" data-type="${t.id}">
          ${coinStack(t.coins)}
          <span><strong>${t.name}</strong><span>Åpningskostnad ${formatMoneyRounded(t.openingCost)}</span></span>
        </button>`,
      )
      .join('');
    return `
      <h1 class="biz-page-title">${categoryById(category).chooseTitle}</h1>
      <div class="biz-types">${rows}</div>
    `;
  }

  function renderName(typeId: string): string {
    const t = typeById(typeId);
    return `
      <h1 class="biz-page-title spaced">${categoryById(t.category).nameTitle}</h1>
      ${nameField('')}
      <div class="biz-price"><span>Åpningskostnad</span><strong>${formatMoneyRounded(t.openingCost)}</strong></div>
      <button class="biz-blue-btn" data-action="create" data-name-submit>Start bedriften</button>
    `;
  }

  function nameField(value: string): string {
    return `
      <label class="biz-name-field">
        <input data-name-input type="text" maxlength="24" placeholder="Navn" value="${escapeHtml(value)}" autocomplete="off" />
        ${icons.pencil}
      </label>`;
  }

  function renderDetail(b: Business): string {
    const t = typeById(b.type);
    const expanding = b.expansionEnd !== null;
    const factory = t.category === 'factory';
    const headIcon = factory ? icons.factory : icons.store;
    const text = factory
      ? { title: 'Åpning av nye verksteder', explain: 'Flere verksteder gir mer inntekt.', button: 'Åpne nye verksteder' }
      : { title: 'Åpning av nye utsalgssteder', explain: 'Flere butikker gir mer inntekt.', button: 'Åpne nye utsalgssteder' };

    let action: string;
    if (expanding) {
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${headIcon}<h2>Utvidelse pågår</h2></div>
          <strong class="biz-big">${formatDuration((b.expansionEnd! - Date.now()) / 1000)}</strong>
          <span class="biz-muted">Gjenstående tid</span>
          ${skipBtn('expand', b.id)}
        </div>`;
    } else if (isMaxStage(b)) {
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${headIcon}<h2>Fullt utbygd</h2></div>
          <span class="biz-muted">Bedriften har nådd høyeste trinn (${MAX_STAGE}).</span>
        </div>`;
    } else {
      const cost = expansionCost(b);
      action = `
        <div class="biz-outlets">
          <div class="biz-outlets-head">${headIcon}<h2>${text.title}</h2></div>
          <p class="biz-explain">${text.explain} Utvidelsen tar ${formatDuration(expansionSeconds(b), false)}, og bedriften tjener som før mens den pågår.</p>
          <strong class="biz-big">${formatMoneyRounded(cost)}</strong>
          <span class="biz-muted">Nødvendig investering</span>
          <strong class="biz-big growth">${icons.arrowUp} ${formatMoneyRounded(expectedGrowth(b))}</strong>
          <span class="biz-muted">Forventet økning i inntekt per time</span>
        </div>
        <button class="biz-green-btn ${state.balance >= cost ? '' : 'poor'}" data-action="expand" data-id="${b.id}">${text.button}</button>
        <p class="biz-balance">Saldo: <b>${formatMoney(state.balance)}</b></p>`;
    }

    return `
      ${heroHtml(b)}
      <div class="biz-income-card">
        <strong>${formatMoneyRounded(incomePerHour(b))}</strong>
        <span>Inntekt per time</span>
      </div>
      <div class="biz-tiles">
        <div class="biz-tile small">${icons.stage}<strong>${b.stage}</strong><span>Trinn</span></div>
        <div class="biz-tile">${icons.items}<strong>${t.name}</strong><span>Kategori</span></div>
      </div>
      ${action}
    `;
  }

  /** Den fargede toppen på en bedrift (tilbake, navn, innstillinger). */
  function heroHtml(b: Business): string {
    const t = typeById(b.type);
    return `
      <div class="biz-hero cat-${categoryById(t.category).color}">
        <button class="biz-hero-btn left" data-action="back" aria-label="Tilbake">${icons.back}</button>
        <button class="biz-hero-btn right" data-action="settings" data-id="${b.id}" aria-label="Innstillinger">${icons.gear}</button>
        <span class="biz-hero-icon">${CATEGORY_ICON[t.category]}</span>
        <h1>${escapeHtml(b.name)}</h1>
      </div>`;
  }

  function renderSettings(b: Business): string {
    const t = typeById(b.type);
    const cat = categoryById(t.category);
    return `
      <div class="biz-settings-head">
        <span class="biz-icon lg cat-${cat.color}">${CATEGORY_ICON[t.category]}</span>
        <div class="biz-settings-name">
          <h1>${escapeHtml(b.name)}</h1>
          <button class="biz-pencil" data-action="rename" data-id="${b.id}" aria-label="Endre navn">${icons.pencil}</button>
        </div>
      </div>
      <div class="biz-stat big">
        <span class="biz-stat-icon money">${icons.money}</span>
        <span>Inntjening totalt</span>
        <strong>${formatMoney(b.earned)}</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon money">${icons.money}</span>
        <span>Kapitalisering</span>
        <strong>${formatMoney(b.invested)}</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon up">${icons.arrowUp}</span>
        <span>Inntekt per time</span>
        <strong>${formatMoneyRounded(incomePerHour(b))}</strong>
      </div>
      <hr class="biz-divider" />
      <h2 class="biz-section-title">Skatteinformasjon</h2>
      <div class="biz-stat">
        <span class="biz-stat-icon tax">${icons.receipt}</span>
        <span>Skatteordning</span>
        <strong>Forenklet</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon up blue">${icons.arrowUp}</span>
        <span>Skatt per time (5 %)</span>
        <strong>${formatMoneyRounded(taxPerHour(b))}</strong>
      </div>
      <div class="biz-stat">
        <span class="biz-stat-icon tax">${icons.clock}</span>
        <span>Betalingsfrist</span>
        <strong>Automatisk betaling</strong>
      </div>
      <p class="biz-note">Mer informasjon finner du på Skatt-siden under Profil.</p>
      <button class="biz-blue-btn tight" data-action="go-taxes">Gå til skatt</button>
      <hr class="biz-divider" />
      <p class="biz-note">Legger du ned bedriften, får du tilbake 30 % av kapitaliseringen (${formatMoney(closeRefund(b))}).</p>
      <button class="biz-close-btn" data-action="close" data-id="${b.id}">Legg ned bedriften (+30 %)</button>
    `;
  }

  function renderRename(b: Business): string {
    return `
      <h1 class="biz-page-title spaced">Endre navn</h1>
      ${nameField('')}
      <div class="biz-price"><span>Pris</span><strong>${formatMoneyRounded(renameCost(b))}</strong></div>
      <button class="biz-blue-btn" data-action="do-rename" data-id="${b.id}" data-name-submit>Endre navnet</button>
    `;
  }

  return {
    id: 'business',
    label: 'Bedrifter',
    icon: icons.business,
    element,
    onShow() {
      stack = [{ name: 'home' }];
      confirmClose = false;
      confirmDrop = false;
      confirmFire = false;
      confirmSell = false;
      confirmLeave = false;
      oilConfirm = null;
      slotsOpen = false;
      procureFor = null;
      render();
    },
    navHidden: () => stack.length > 1 || slotsOpen, // menyen vises bare på oversikten
    onBack() {
      if (procureFor) {
        procureFor = null;
        render();
        return true;
      }
      if (slotsOpen && stack.length <= 1) {
        slotsOpen = false;
        render();
        return true;
      }
      if (stack.length <= 1) return false;
      back();
      return true;
    },
    update() {
      // Tall som endres (inntekt, nedtelling, saldo) tegnes på nytt én gang i sekundet.
      // Sider med skrivefelt tegnes ikke på nytt (da ville teksten man skriver forsvinne).
      const view = current().name;
      if (view === 'name' || view === 'rename' || view === 'categories' || view === 'types' || view === 'resources' || view === 'iHire' || view === 'bControl') return;
      // Ikke tegn på nytt mens man bekrefter (teksten "Trykk igjen" skal bli stående)
      if (confirmDrop || confirmFire || confirmSell || confirmLeave) return;
      // Kamphistorikk, trofeer og lister med bilder endrer seg ikke av seg selv
      if (view === 'fRecord' || view === 'fTrophies' || view === 'fHistory' || view === 'fSquad' || view === 'fBuy') return;
      // Bruktbilmarkedet (100 bilder) og ferdighetene endrer seg ikke av seg selv
      if (view === 'dMarket' || view === 'dMarketCar' || view === 'dSkills') return;
      if (view === 'settings' && confirmClose) return;
      if (!pressing && performance.now() - lastRender > 1000) render();
    },
  };
}

/** Egen tegning: plattform med blokker og en gullmynt. */
function slotsArt(): string {
  return `<svg class="slots-art" viewBox="0 0 160 120" aria-hidden="true">
    <path d="M80 112 10 78l70-34 70 34Z" fill="#eef4ff" stroke="#c9dafc" stroke-width="1.5"/>
    <path d="M80 104 22 76l58-28 58 28Z" fill="none" stroke="#9db9f5" stroke-width="1.5" stroke-dasharray="2 5"/>
    <path d="M48 78V64l22 11v14Z" fill="#dfe6ee"/><path d="M70 89V75l20-10v14Z" fill="#f5f7fa"/><path d="M48 64l20-10 22 11-20 10Z" fill="#fff" stroke="#dfe6ee"/>
    <path d="M78 70V44l20 10v26Z" fill="#5fae9c"/><path d="M98 80V54l18-9v26Z" fill="#8fd1bf"/><path d="M78 44l18-9 20 10-18 9Z" fill="#b8e6d9"/>
    <path d="M96 54V30l16 8v24Z" fill="#cfe9e3" opacity=".8"/><path d="M112 62V38l14-7v24Z" fill="#e8f6f2" opacity=".8"/><path d="M96 30l14-7 16 8-14 7Z" fill="#f1fbf8"/>
    <ellipse cx="116" cy="20" rx="15" ry="16" fill="#e2a42a"/><ellipse cx="114" cy="19" rx="14" ry="15" fill="#f7c948"/>
    <ellipse cx="114" cy="19" rx="10" ry="11" fill="none" stroke="#e2a42a" stroke-width="2"/>
    <text x="114" y="25" text-anchor="middle" font-size="16" font-weight="800" font-family="system-ui, sans-serif" fill="#c9861a">$</text>
  </svg>`;
}

/** Navn skrevet av spilleren vises som tekst, aldri som HTML. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
