import { html, type Page, type PageId } from './page';

/** Midlertidig side for menyvalg som ikke er laget ennå. */
export function createPlaceholderPage(id: PageId, label: string, icon: string): Page {
  const element = html(`
    <section class="page placeholder">
      <h1>${label}</h1>
      <div class="placeholder-box">
        <div class="placeholder-icon">${icon}</div>
        <strong>Kommer snart</strong>
      </div>
    </section>
  `);
  return { id, label, icon, element, update() {} };
}
