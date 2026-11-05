import { redirect } from "next/navigation";

// La home e' la dashboard dell'app: nessuna landing separata da mantenere.
export default function Home() {
  redirect("/dashboard");
}
