// Test dell'arricchimento contatti (src/lib/contact-extract.ts).
// Runner: node:test (nessuna dipendenza aggiuntiva) via `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";

import { extractContactsFromHtml, extractEmailFromHtml, socialProfileUrl } from "./contact-extract";

// --- Email ---

test("extractEmailFromHtml: trova l'email in un link mailto", () => {
  const html = `<a href="mailto:info@trattoriarossi.it">Scrivici</a>`;
  assert.equal(extractEmailFromHtml(html), "info@trattoriarossi.it");
});

test("extractEmailFromHtml: trova l'email scritta nel testo e normalizza il maiuscolo", () => {
  const html = "<p>Scrivici a Info@PizzeriaDaMario.IT per prenotare</p>";
  assert.equal(extractEmailFromHtml(html), "info@pizzeriadamario.it");
});

test("extractEmailFromHtml: scarta caselle automatiche e domini di esempio", () => {
  const html = `
    <a href="mailto:noreply@wixpress.com">x</a>
    <span>esempio@example.com</span>
    <span>privacy@noreply.sito.it</span>
    <a href="mailto:contatti@sarto.it">Reale</a>
  `;
  assert.equal(extractEmailFromHtml(html), "contatti@sarto.it");
});

test("extractEmailFromHtml: nessuna email -> null (non inventa nulla)", () => {
  assert.equal(extractEmailFromHtml("<p>Solo testo, nessun contatto.</p>"), null);
  assert.equal(extractEmailFromHtml(""), null);
});

test("extractEmailFromHtml: non scambia i nomi dei file per email", () => {
  const html = `<img src="/assets/logo@2x.png"><p>info@studiolegale.it</p>`;
  assert.equal(extractEmailFromHtml(html), "info@studiolegale.it");
});

// --- Instagram ---

test("socialProfileUrl: profilo Instagram -> url pulito senza parametri", () => {
  assert.equal(
    socialProfileUrl("https://www.instagram.com/trattoria.rossi/?hl=it", "instagram"),
    "https://www.instagram.com/trattoria.rossi"
  );
  assert.equal(
    socialProfileUrl("//instagram.com/rossi_parrucchieri", "instagram"),
    "https://www.instagram.com/rossi_parrucchieri"
  );
});

test("socialProfileUrl: non accetta post, explore, widget o altri domini", () => {
  assert.equal(socialProfileUrl("https://www.instagram.com/p/Cabc123/", "instagram"), null);
  assert.equal(socialProfileUrl("https://www.instagram.com/explore/tags/pizza/", "instagram"), null);
  assert.equal(socialProfileUrl("https://example.com/instagram", "instagram"), null);
  assert.equal(socialProfileUrl("https://www.instagram.com/", "instagram"), null);
});

test("socialProfileUrl: pagina Facebook, inclusi /pages e profile.php", () => {
  assert.equal(
    socialProfileUrl("https://facebook.com/OsteriaDaMario?ref=page", "facebook"),
    "https://www.facebook.com/OsteriaDaMario"
  );
  assert.equal(
    socialProfileUrl("https://www.facebook.com/pages/Bar-Central/123456", "facebook"),
    "https://www.facebook.com/pages/Bar-Central"
  );
  assert.equal(
    socialProfileUrl("https://www.facebook.com/profile.php?id=100012345", "facebook"),
    "https://www.facebook.com/profile.php?id=100012345"
  );
});

test("socialProfileUrl: scarta i pulsanti di condivisione Facebook", () => {
  assert.equal(socialProfileUrl("https://www.facebook.com/sharer/sharer.php?u=x", "facebook"), null);
  assert.equal(socialProfileUrl("https://www.facebook.com/plugins/like.php?href=x", "facebook"), null);
  assert.equal(socialProfileUrl("https://www.facebook.com/dialog/share?app_id=1", "facebook"), null);
});

// --- Estrazione completa ---

test("extractContactsFromHtml: estrae email, Instagram e Facebook insieme", () => {
  const html = `
    <html><body>
      <a href="mailto:ordini@fornoantico.it">Ordini</a>
      <a href="https://www.instagram.com/fornoantico/reels/">Instagram</a>
      <a href="https://www.facebook.com/fornoantico">Facebook</a>
    </body></html>
  `;
  assert.deepEqual(extractContactsFromHtml(html), {
    email: "ordini@fornoantico.it",
    instagram: "https://www.instagram.com/fornoantico",
    facebook: "https://www.facebook.com/fornoantico",
  });
});

test("extractContactsFromHtml: pagina senza contatti -> tutti null", () => {
  assert.deepEqual(extractContactsFromHtml("<html><body>Niente contatti</body></html>"), {
    email: null,
    instagram: null,
    facebook: null,
  });
});
