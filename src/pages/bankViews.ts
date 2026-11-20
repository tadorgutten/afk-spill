import type { Business } from '../game/business';
import {
  bankOf,
  DEFAULT_DEPOSIT,
  DEFAULT_LOAN,
  DEPOSIT_RANGE,
  flows,
  isMaxVault,
  LOAN_RANGE,
  nextCapacity,
  vaultCost,
  vaultSeconds,
} from '../game/bank';
import type { GameState } from '../game/state';
import { formatDuration, formatMoneyFull, formatMoneyWhole } from '../ui/format';
import { icons } from '../ui/icons';
import { skipBtn } from '../game/skip';

/*
 * Sidene til banken:
 *   detail   – oversikt: inntekt, renter, hvelvet, utvidelse og pengestrømmer
 *   bControl – kontrollpanelet der man velger rentene (lagres først når man trykker "Lagre")
 */

/** "7,04 %" */
export const formatRate = (v: number) => `${v.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

export function renderBankDetail(state: GameState, b: Business, hero: string): string {
  const s = bankOf(b);
  const f = flows(s);
  const now = Date.now();

  let vault: string;
  if (s.expansionEnd !== null) {
    vault = `
      <div class="bank-expand">
        <div class="bank-expand-head">${icons.vault}<h2>Utvidelse pågår</h2></div>
        <strong>${formatDuration((s.expansionEnd - now) / 1000)}</strong>
        <span>Gjenstående tid</span>
        ${skipBtn('bank', b.id)}
      </div>`;
  } else if (isMaxVault(b)) {
    vault = `
      <div class="bank-expand">
        <div class="bank-expand-head">${icons.vault}<h2>Fullt utbygd</h2></div>
        <span>Hvelvet kan ikke bli større.</span>
      </div>`;
  } else {
    const cost = vaultCost(b);
    vault = `
      <div class="bank-expand">
        <div class="bank-expand-head">${icons.vault}<h2>Utvide hvelvet</h2></div>
        <strong>${formatMoneyFull(cost)}</strong>
        <span>Nødvendig investering</span>
        <strong>${formatMoneyFull(nextCapacity(b))}</strong>
        <span>Ny kapasitet · tar ${formatDuration(vaultSeconds(b), false)}</span>
      </div>
      <button class="bank-btn ${state.balance >= cost ? '' : 'poor'}" data-action="b-expand" data-id="${b.id}">Utvid hvelvet</button>
      <p class="biz-balance">Saldo: <b>${formatMoneyFull(state.balance)}</b></p>`;
  }

  return `
    ${hero}
    <div class="biz-income-card">
      <strong class="${f.income < 0 ? 'bank-negative' : ''}">${formatMoneyFull(f.income)}</strong>
      <span>Inntekt per time</span>
    </div>

    <h2 class="bank-title">Renter</h2>
    <div class="bank-rates">
      <div class="bank-rate">${icons.percentTicket}<strong>${formatRate(s.deposit)}</strong><span>Innskudd</span></div>
      <div class="bank-rate">${icons.percentCircle}<strong>${formatRate(s.loan)}</strong><span>Utlån</span></div>
      <button class="bank-control-btn" data-action="b-control" data-id="${b.id}" aria-label="Endre rentene">${icons.sliders}</button>
    </div>

    <h2 class="bank-title">Hvelvet</h2>
    <div class="bank-box bank-funds">
      ${icons.bill}
      <p><strong>${formatMoneyFull(s.funds)}</strong> <span>/ ${formatMoneyWhole(s.capacity)}</span></p>
      <span>Penger i hvelvet</span>
    </div>
    ${vault}

    <h2 class="bank-title">Per time akkurat nå</h2>
    <div class="bank-box bank-flow">${icons.percentTicket}<div><span>Nye innskudd fra kunder</span><strong>${formatMoneyFull(f.attracted)}</strong></div></div>
    <div class="bank-box bank-flow">${icons.arrowUpBox}<div><span>Inntekt fra lån</span><strong>${formatMoneyFull(f.proceeds)}</strong></div></div>
    <div class="bank-box bank-flow">${icons.arrowDownBox}<div><span>Utbetaling til innskytere</span><strong>${formatMoneyFull(f.payments)}</strong></div></div>
  `;
}

/** Kontrollpanelet. `deposit`/`loan` er verdiene på skyveknappene (ikke lagret ennå). */
export function renderBankControl(b: Business, deposit: number, loan: number): string {
  const slider = (key: 'deposit' | 'loan', [min, max]: [number, number], value: number) =>
    `<input class="bank-slider" type="range" min="${min}" max="${max}" step="0.01" value="${value}" data-rate="${key}" />`;
  return `
    <h1 class="bank-page-title">Kontrollpanel</h1>
    <div class="bank-slider-head">${icons.percentTicket}<span>Innskuddsrente</span></div>
    ${slider('deposit', DEPOSIT_RANGE, deposit)}
    <p class="bank-value">Verdi: <b data-rate-value="deposit">${formatRate(deposit)}</b></p>
    <div class="bank-slider-head">${icons.percentCircle}<span>Utlånsrente</span></div>
    ${slider('loan', LOAN_RANGE, loan)}
    <p class="bank-value">Verdi: <b data-rate-value="loan">${formatRate(loan)}</b></p>
    <p class="bank-preview">Inntekt per time med disse rentene: <b data-rate-income>${formatMoneyFull(flows(bankOf(b), deposit, loan).income)}</b></p>
    <button class="bank-btn" data-action="b-save" data-id="${b.id}">Lagre verdiene</button>
    <button class="bank-btn soft" data-action="b-default" data-id="${b.id}">Standardverdier (${formatRate(DEFAULT_DEPOSIT)} og ${formatRate(DEFAULT_LOAN)})</button>
    <div class="bank-tip">
      ${icons.bulb}
      <p>Utbetalinger til innskyterne er en stor utgift for banken. Men jo høyere innskuddsrenten er, jo raskere vokser pengene i hvelvet, fordi flere vil sette inn penger i banken din (bare når renten er over ${formatRate(DEFAULT_DEPOSIT)}).</p>
      <p>Lån er bankens inntekt. Banken tjener på forskjellen mellom utlånsrenten og innskuddsrenten. Samtidig gir en lavere utlånsrente flere som vil låne.</p>
      <p>Finn den beste kombinasjonen av renter for å tjene mest og få hvelvet til å vokse raskest.</p>
      <p>Husk: blir utbetalingene til innskyterne større enn inntekten fra lån, går banken i minus!</p>
    </div>`;
}

/** Oppdaterer tallene mens man drar i skyveknappene (uten å tegne siden på nytt). */
export function bindBankSliders(root: HTMLElement, b: Business, onChange: (deposit: number, loan: number) => void) {
  const inputs = root.querySelectorAll<HTMLInputElement>('[data-rate]');
  const read = (key: string) => Number(root.querySelector<HTMLInputElement>(`[data-rate="${key}"]`)!.value);
  const refresh = () => {
    const deposit = read('deposit');
    const loan = read('loan');
    root.querySelector('[data-rate-value="deposit"]')!.textContent = formatRate(deposit);
    root.querySelector('[data-rate-value="loan"]')!.textContent = formatRate(loan);
    const income = flows(bankOf(b), deposit, loan).income;
    const el = root.querySelector<HTMLElement>('[data-rate-income]')!;
    el.textContent = formatMoneyFull(income);
    el.classList.toggle('bank-negative', income < 0);
    for (const input of inputs) {
      const pct = ((Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100;
      input.style.setProperty('--fill', `${pct}%`);
    }
    onChange(deposit, loan);
  };
  inputs.forEach((i) => i.addEventListener('input', refresh));
  refresh();
}
