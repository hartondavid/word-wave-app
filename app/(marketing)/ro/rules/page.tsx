import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"

export const metadata: Metadata = {
  title: "Cum se joacă — Reguli",
  description:
    "Regulile WordWave: runde, scor, gata în lobby, tastatură și microfon, fair play în camere multiplayer.",
}

export default function RulesPageRo() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">Cum se joacă</h1>
      <LegalProse>
        <h2>Scop</h2>
        <p>
          În fiecare rundă apare o definiție. Răspunsul este un cuvânt de lungime fixă, afișat ca spații goale. Fiecare literă
          corect plasată îți aduce 10 puncte. Completează cuvântul primul pentru a câștiga runda. Meciul se încheie când
          cineva atinge ținta de puncte sau după numărul de runde convenit — cel mai mare scor câștigă.
        </p>
        <h2>Creare sau intrare în cameră</h2>
        <p>
          Gazda introduce un nume afișat, alege categoria și limba definițiilor, setează numărul de runde și câți jucători
          (2–4) suportă camera. Se generează un cod de cameră; distribuie-l sau folosește linkul de invitație ca prietenii să
          intre de pe pagina principală. Oaspeții introduc același cod și propriile pseudonime. Numele ar trebui să fie unice
          în cameră ca scorurile să rămână clare.
        </p>
        <h2>Lobby și verificare „gata”</h2>
        <p>
          În așteptare, lobby-ul listează cine s-a alăturat. Când camera e plină, fiecare jucător comută „gata”. Orice
          jucător poate porni următoarea rundă după ce toți sunt gata la finalul unei runde — nu e nevoie de un singur
          buton de „admin” pentru continuare după primul start.
        </p>
        <h2>În timpul rundei</h2>
        <p>
          Folosește tastele cu litere pentru a umple spațiile în ordine. Literele greșite sunt evidențiate ca să le poți
          revizui. În browsere suportate poți folosi microfonul să spui întregul cuvânt; vorbire parțială care nu se
          potrivește cu răspunsul poate să te blocheze din rundă pentru echitate. Când timpul expiră, runda se încheie fără
          câștigător pentru acea rundă.
        </p>
        <h2>Mod practică</h2>
        <p>
          Practică e single-player. Primești același tip de definiție și cronometru fără alți oameni. E cel mai bun mod să
          înveți controalele înainte să fii gazdă la un grup.
        </p>
        <h2>Fair play</h2>
        <p>
          Nu folosi unelte externe care dezvăluie răspunsul altor jucători în timp real. Dacă transmiți live, pune delay ca
          să nu strici cuvântul pentru public. Dacă cineva pleacă din meci, camera se poate încheia sau continua în funcție
          de jucătorii rămași — vezi mesajele din joc pentru cazul concret.
        </p>
      </LegalProse>
    </div>
  )
}
