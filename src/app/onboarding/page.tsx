import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSettings } from "@/lib/settings";
import { needsOnboarding } from "@/lib/onboarding";
import { OnboardingForm } from "@/components/onboarding-form";

export const metadata = { title: "Configurazione iniziale" };
export const dynamic = "force-dynamic";

// Pagina del primo avvio: al posto di default personali (citta, brand),
// l'app chiede i dati dell'utente e li salva nelle impostazioni.
export default async function OnboardingPage() {
  const s = await getSettings();
  if (!needsOnboarding(s)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Benvenuto in Lead Machine</CardTitle>
          <CardDescription>
            Prima di iniziare servono i tuoi dati: niente impostazioni predefinite di altri, la configurazione e la tua.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm
            initial={{
              brandName: s.brand_name ?? "",
              owner: s.brand_owner ?? "",
              searchCity: s.search_city ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
