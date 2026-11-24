// Next 16 (Turbopack) non accetta la ri-esportazione del route segment config:
// `dynamic` e `maxDuration` vanno dichiarati qui come valori letterali.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export { OPTIONS, POST } from "./generate/route";
