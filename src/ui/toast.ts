/** Viser en kort melding nederst på skjermen som forsvinner av seg selv. */
let hideTimer: number | undefined;

export function showToast(message: string, durationMs = 3000): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => el.classList.remove('visible'), durationMs);
}
