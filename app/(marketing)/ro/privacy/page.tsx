import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"
import { alternatesRoCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "Politica de confidențialitate",
  description:
    "Cum prelucrează WordWave datele; cookie-uri; analitice; drepturile tale conform GDPR.",
  robots: { index: true, follow: true },
  alternates: alternatesRoCanonical("/privacy", "/ro/privacy"),
}

export default function PrivacyPageRo() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
        Politica de confidențialitate
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">Ultima actualizare: martie 2025</p>
      <LegalProse>
        <p>
          Această politică descrie cum WordWave („noi”) tratează informațiile când folosești wordwave.live și serviciile
          conexe. Jucând sau navigând, accepți această politică. Dacă nu ești de acord, te rugăm să nu mai folosești site-ul.
        </p>

        <h2>Cine suntem</h2>
        <p>
          WordWave este un joc web independent. Pentru solicitări legate de date (acces, ștergere, întrebări), folosește
          formularul{" "}
          <a href="/ro/contact" className="font-medium text-primary underline underline-offset-4">
            Contact
          </a>{" "}
          și include adresa ta de e-mail ca să putem răspunde.
        </p>

        <h2>Date pe care le prelucrăm</h2>
        <ul>
          <li>
            <strong>Joc și multiplayer.</strong> Pentru camere live stocăm date legate de meci: coduri de cameră,
            pseudonime, scoruri, starea rundelor și marcaje de timp, astfel încât toți jucătorii să vadă același joc în
            timp real. Datele sunt păstrate doar cât e necesar pentru sesiuni active și curățare operațională rezonabilă.
          </li>
          <li>
            <strong>Jurnale tehnice.</strong> Furnizorii de găzduire (de ex. Vercel) pot înregistra adrese IP, user agent și
            diagnostice de erori pentru securitate și fiabilitate. Nu folosim aceste jurnale ca să construim profiluri
            publicitare de partea noastră.
          </li>
          <li>
            <strong>Formular de contact.</strong> Dacă ne scrii prin formular, primim câmpurile trimise (nume, e-mail,
            mesaj) doar ca să îți răspundem.
          </li>
        </ul>

        <h2>Cookie-uri și tehnologii similare</h2>
        <p>
          Folosim stocare strict necesară unde e cerută pentru joc (de ex. pseudonimul în browser între pagini). Dacă
          activăm analitică opțională, acele unelte pot seta cookie-uri conform politicilor lor. Poți bloca cookie-urile
          neesențiale din setările browserului; unele funcții se pot degradea.
        </p>

        <h2>Baze legale (SEE/UK)</h2>
        <p>
          Unde se aplică GDPR, ne bazăm pe: (1) executarea contractului / pași la cererea ta (rularea jocului la care te-ai
          alăturat); (2) interese legitime (securitate, prevenire abuz, îmbunătățire produs), echilibrate cu drepturile tale;
          și (3) consimțământ unde e necesar (de ex. cookie-uri de marketing opționale, dacă le adăugăm).
        </p>

        <h2>Procesatori și transferuri</h2>
        <p>
          Folosim infrastructură și baze de date (inclusiv Supabase și Vercel) care pot prelucra date în UE, SUA sau alte
          regiuni, cu garanții adecvate precum Clauze Contractuale Standard. O listă a subprocessatorilor principali poate fi
          furnizată la cerere.
        </p>

        <h2>Copii</h2>
        <p>
          WordWave nu se adresează copiilor sub 13 ani (sau vârsta digitală de consimțământ din țara ta). Dacă crezi că un
          copil a furnizat date personale, contactează-ne și le vom șterge unde legea o cere.
        </p>

        <h2>Drepturile tale</h2>
        <p>
          În funcție de locație poți avea drepturi de acces, rectificare, ștergere, restricționare sau opoziție la
          prelucrare, și plângere la o autoritate de supraveghere. Scrie-ne pentru a le exercita; putem avea nevoie să
          verificăm solicitarea.
        </p>

        <h2>Publicitate</h2>
        <p>
          Dacă activăm publicitate terță (de ex. Google AdSense), partenerii pot colecta date conform politicilor lor. Vom
          actualiza această pagină și, unde e necesar, vom cere consimțământ înainte de a încărca tag-uri publicitare
          neesențiale.
        </p>

        <h2>Modificări</h2>
        <p>
          Putem actualiza această politică când produsul sau legea se schimbă. Data „Ultima actualizare” de sus se va
          modifica; utilizarea continuă după actualizări înseamnă că accepți politica revizuită.
        </p>

        <p className="text-sm text-muted-foreground">
          Versiunea în engleză (Privacy Policy) este disponibilă la{" "}
          <a href="/privacy" className="font-medium text-primary underline underline-offset-4">
            /privacy
          </a>
          .
        </p>
      </LegalProse>
    </div>
  )
}
