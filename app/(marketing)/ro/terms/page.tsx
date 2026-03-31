import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"
import { alternatesRoCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "Termeni și condiții",
  description: "Termenii care guvernează utilizarea WordWave la wordwave.live.",
  robots: { index: true, follow: true },
  alternates: alternatesRoCanonical("/terms", "/ro/terms"),
}

export default function TermsPageRo() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Termeni și condiții</h1>
      <p className="mb-8 text-sm text-muted-foreground">Ultima actualizare: martie 2025</p>
      <LegalProse>
        <p>
          Acești termeni („Termenii”) guvernează accesul și utilizarea WordWave la wordwave.live („Serviciul”). Folosind
          Serviciul, ești de acord cu Termenii. Dacă nu ești de acord, nu folosi Serviciul.
        </p>

        <h2>Descrierea serviciului</h2>
        <p>
          WordWave oferă un joc online de ghicit cuvinte cu multiplayer opțional. Serviciul este furnizat „ca atare” și poate
          fi schimbat, suspendat sau întrerupt în orice moment, fără răspundere decât unde legea interzice.
        </p>

        <h2>Conturi și conduită</h2>
        <p>
          Alegi un nume afișat pentru joc. Nu te da drept altcineva, nu folosi nume ofensatoare sau ilegale, nu hărțui
          jucătorii, nu trișa cu unelte automate și nu încerca să perturbi serverele, bazele de date sau sesiunile altora.
          Putem restricționa accesul sau datele asociate abuzului.
        </p>

        <h2>Conținutul utilizatorului</h2>
        <p>
          Mesajele trimise prin formulare sunt în răspunderea ta. Nu trimite conținut ilegal sau dăunător. Putem prelucra
          mesajele doar pentru suport și îmbunătățirea Serviciului.
        </p>

        <h2>Proprietate intelectuală</h2>
        <p>
          Numele WordWave, logo-ul, interfața și textele originale de pe site sunt protejate. Primești o licență limitată,
          revocabilă, pentru uz personal, necomercial de divertisment, decât dacă convenim altfel în scris.
        </p>

        <h2>Exonerare de garanții</h2>
        <p>
          În măsura permisă de lege, excludem toate garanțiile, exprese sau implicite, inclusiv comercializare, potrivire
          pentru un scop anume și neîncălcare. Nu garantăm funcționare neîntreruptă sau fără erori.
        </p>

        <h2>Limitarea răspunderii</h2>
        <p>
          În măsura permisă de lege, nu suntem răspunzători pentru daune indirecte, incidentale, speciale, consecvențiale sau
          punitive, sau pierderea profiturilor sau datelor, decurgând din utilizarea Serviciului. Răspunderea noastră
          agregată pentru orice pretenție legată de Serviciu nu depășește (a) sumele plătite nouă în cele 12 luni înainte de
          pretenție sau (b) zero dacă Serviciul este gratuit.
        </p>

        <h2>Despăgubire</h2>
        <p>
          Ești de acord să ne despăgubești și să ne exonerezi de pretenții rezultate din utilizarea abuzivă a Serviciului sau
          din încălcarea acestor Termeni, exceptând unde despăgubirea nu e aplicabilă conform legii.
        </p>

        <h2>Lege aplicabilă</h2>
        <p>
          Termenii sunt guvernați de legile aplicabile jurisdicției operatorului, fără a ține cont de regulile de conflict
          de legi. Instanțele din acea jurisdicție au competență exclusivă, sub rezerva protecțiilor obligatorii pentru
          consumatori din țara ta de reședință.
        </p>

        <h2>Contact</h2>
        <p>
          Întrebări despre Termeni: folosește pagina{" "}
          <a href="/ro/contact" className="font-medium text-primary underline underline-offset-4">
            Contact
          </a>
          .
        </p>

        <p className="text-sm text-muted-foreground">
          Versiunea în engleză (Terms of Service) este disponibilă la{" "}
          <a href="/terms" className="font-medium text-primary underline underline-offset-4">
            /terms
          </a>
          .
        </p>
      </LegalProse>
    </div>
  )
}
