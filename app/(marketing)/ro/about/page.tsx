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

        <h2>Caracteristici Cheie</h2>
        <ul>
          <li><strong>Joc Sincronizat în Timp Real:</strong> Fiecare jucător primește același indiciu în același moment.</li>
          <li><strong>Categorii Diverse:</strong> De la obiecte cotidiene la concepte filosofice complexe.</li>
          <li><strong>Suport Multilingv:</strong> Joacă în engleză sau română pentru a-ți testa abilitățile lingvistice.</li>
          <li><strong>Introducere Vocală:</strong> Unde este suportat, folosește microfonul pentru o experiență hands-free.</li>
          <li><strong>Fără Instalare:</strong> Funcționează direct în browserul tău, pe desktop sau mobil.</li>
        </ul>

        <h2>Misiunea Noastră</h2>
        <p>
          Credem că învățarea și distracția ar trebui să meargă mână în mână. WordWave este conceput să-ți provoace memoria
          și să-ți extindă vocabularul într-un mediu competitiv, dar prietenos. Păstrând interfața curată și rundele scurte,
          ne asigurăm că oricine poate participa, indiferent de experiența în jocuri.
        </p>

        <h2>Cum Funcționează</h2>
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

        <h2>Angajamentul pentru Confidențialitate</h2>
        <p>
          WordWave este un proiect independent. Ne pasă de fair play, de tipografie lizibilă pe telefon și de o experiență
          fără pop-up-uri intruzive. Nu vindem datele tale personale; colectăm doar ceea ce este strict necesar pentru a
          rula jocul și a menține serviciul.
        </p>

        <p className="mt-8">
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
