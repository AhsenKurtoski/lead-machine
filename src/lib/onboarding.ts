// ============================================================
// Onboarding (primo avvio).
//
// L'app non ha piu citta o brand "personali" scritti nel codice:
// al primo avvio chiede all'utente i propri dati e li salva nelle
// impostazioni. Qui c'e' solo logica pura, testabile senza DB.
// ============================================================

export type SettingsMap = Record<string, string | undefined>;

/**
 * Vero se l'utente non ha ancora completato (o saltato) l'onboarding:
 * manca il flag `onboarding_done` e non c'e' una citta di ricerca.
 * Qualsiasi valore impostato su `onboarding_done` ("true", "skipped", ...)
 * indica che la scelta e' gia stata fatta: non si insiste.
 * Se la citta e' gia stata impostata a mano dalle impostazioni,
 * non serve piu il primo avvio guidato.
 */
export function needsOnboarding(s: SettingsMap): boolean {
  if ((s.onboarding_done ?? "").trim()) return false;
  return !(s.search_city ?? "").trim();
}

export type OnboardingInput = {
  brandName?: string | null;
  owner?: string | null;
  searchCity?: string | null;
};

export type OnboardingValidation = {
  ok: boolean;
  errors: Record<string, string>;
};

/** Valida i campi del form di onboarding (obbligatoria solo la citta). */
export function validateOnboarding(input: OnboardingInput): OnboardingValidation {
  const errors: Record<string, string> = {};

  const city = (input.searchCity ?? "").trim();
  if (!city) errors.searchCity = "Inserisci la citta in cui cerchi i clienti";
  else if (city.length > 100) errors.searchCity = "Nome citta troppo lungo";

  const brand = (input.brandName ?? "").trim();
  if (brand.length > 120) errors.brandName = "Nome troppo lungo (max 120 caratteri)";

  const owner = (input.owner ?? "").trim();
  if (owner.length > 120) errors.owner = "Nome troppo lungo (max 120 caratteri)";

  return { ok: Object.keys(errors).length === 0, errors };
}
