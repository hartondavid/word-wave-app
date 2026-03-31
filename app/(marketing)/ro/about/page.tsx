import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"
import { alternatesRoCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "Despre WordWave",
  description:
    "WordWave este un joc multiplayer în timp real de ghicit cuvinte: definiții comune, coduri de cameră, mod practică și voce opțională.",
  alternates: alternatesRoCanonical("/about", "/ro/about"),
}

export default function AboutPageRo() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">Despre WordWave</h1>
      <LegalProse>
        <p>
          WordWave este un joc de ghicit cuvinte în browser, pentru sesiuni rapide cu prietenii sau familia. Toți văd aceeași
          definiție scurtă; sarcina ta este să descoperi cuvântul ascuns înaintea celorlalți. Meciurile suportă doi până la
          patru jucători într-o singură cameră, cu un gazdă care alege categoria, limba definițiilor și câte runde vreți să
          jucați.
        </p>
        <p>
          Jocul e gândit pentru fricțiune minimă: alegi un pseudonim, creezi sau intri într-o cameră cu un cod de patru
          caractere, și ești în lobby. Când toate locurile sunt ocupate și jucătorii se marchează gata, încep rundele. Fiecare
          rundă îți oferă un interval limitat să tastezi litere (sau, unde e suportat, să spui cuvântul la microfon).
          Barele colorate de progres arată cum stau adversarii fără a dezvălui direct răspunsul.
        </p>
        <p>
          Modul practică există ca să te încălzești singur. Folosește același flux de cuvinte ca în multiplayer, dar fără
          presiunea scorului cu alți oameni — util pentru a învăța categorii sau a testa latența pe un dispozitiv nou.
        </p>
        <p>
          WordWave este un proiect independent. Ne pasă de fair play, de tipografie lizibilă pe telefon și de o experiență
          fără pop-up-uri intruzive. Dacă folosești jocul la clasă, pe stream sau la o seară relaxată, ne dorim ca rundele
          scurte și regulile simple să facă ușoară rotirea jucătorilor.
        </p>
        <p>
          Pentru detalii de joc, vezi{" "}
          <a href="/ro/rules" className="font-medium text-primary underline underline-offset-4">
            Regulile
          </a>
          . Pentru date personale, vezi{" "}
          <a href="/ro/privacy" className="font-medium text-primary underline underline-offset-4">
            Confidențialitatea
          </a>
          . Pentru a ne scrie, folosește{" "}
          <a href="/ro/contact" className="font-medium text-primary underline underline-offset-4">
            Contact
          </a>
          .
        </p>
      </LegalProse>
    </div>
  )
}
