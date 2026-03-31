import type { BlogBlock } from "./types"

/** Traduceri românești pentru ghidurile din posts-1 / posts-2 (aceeași structură h2/p). */
export const blocksRoByEnSlug: Record<string, BlogBlock[]> = {
  "how-multiplayer-wordwave-works": [
    {
      type: "p",
      text: "WordWave se bazează pe runde scurte și intense. Gazda începe de pe pagina principală, își alege pseudonimul, numărul de jucători permis în cameră (doi, trei sau patru), categoria de cuvinte și limba definițiilor, și setează câte runde durează meciul. După crearea camerei, jocul generează un cod din patru caractere. Acest cod este „adresa” sesiunii tale în baza de date partajată de toți.",
    },
    { type: "h2", text: "Intrarea de pe un al doilea dispozitiv" },
    {
      type: "p",
      text: "Prietenii deschid același site, trec la „Join”, introduc codul cu majuscule sau minuscule — se normalizează — și își aleg pseudonimul. Lobby-ul arată locuri colorate ca să vezi cine ocupă ce poziție. Invitații umplu de obicei locurile 2–4 primii; interfața încearcă să păstreze gazda pe locul 1. Dacă cineva se deconectează, poate apărea un mesaj; în funcție de starea jocului, meciul poate continua sau se poate încheia.",
    },
    { type: "h2", text: "De ce toți văd aceeași definiție" },
    {
      type: "p",
      text: "Echitatea cere informații identice. Serverul stochează o definiție și un cuvânt-răspuns per rundă. Fiecare client primește actualizări pentru rândul acelei camere. Când runda trece în modul „playing”, fiecare browser afișează același indiciu și același șablon de litere. Progresul fiecărui jucător este tot central, astfel că liniile colorate ale adversarilor rămân sincronizate fără să ne bazăm pe un singur dispozitiv ca sursă a adevărului.",
    },
    { type: "h2", text: "Gata-urile păstrează starturi curate" },
    {
      type: "p",
      text: "După ce se conectează, WordWave nu te aruncă direct într-o rundă cu cronometru cât timp cineva încă citește regulile. Fiecare participant comută „Gata”. Doar când toți sunt gata se deblochează pasul următor. Același model se repetă între runde: scorurile se actualizează, cuvântul din runda încheiată poate fi afișat, apoi din nou „Gata” înainte de următoarea definiție. Această frecare mică reduce starturile accidentale și oferă streamerilor un moment pentru chat.",
    },
    { type: "h2", text: "Linkuri de invitație versus cod brut" },
    {
      type: "p",
      text: "Distribuirea a doar patru litere e rapidă în voce, dar ușor de confundat. Lobby-ul poate expune un link HTTPS complet care deschide pagina principală cu fila Join deja completată. Vizitatorii își aleg tot local pseudonimul; nimic din link nu ocolește pasul numelui. Astfel, pseudonimele personale nu ajung în URL-urile pe care le lipești în Discord-uri publice.",
    },
    { type: "h2", text: "Latență și corectitudine" },
    {
      type: "p",
      text: "WordWave e un joc de reflexe: latența de rețea mică ajută. LTE pe mobil e jucabil pentru mulți, dar Wi-Fi aglomerat poate adăuga zeci de milisecunde care contează la ultima literă. Clientul îți actualizează optimist propria mască ca tastarea să pară instantanee, apoi se realiniază cu serverul. Trișatul prin inspectarea traficului e posibil pentru cine e foarte motivat; produsul se adresează prietenilor care joacă corect. Pentru transmisiuni competitive, folosiți reguli de onoare sau întârzieri.",
    },
    { type: "h2", text: "Ce să încerci în continuare" },
    {
      type: "p",
      text: "Fă o sesiune liniștită în modul Practice ca să înțelegi cronometrul, apoi găzduiește un duel doi jucători înainte de un meci cu patru persoane. Rotește gazdele ca mai mulți să încerce selectarea categoriei. Dacă predai la clasă, începe cu definiții în engleză și o categorie largă, apoi introdu liste tematice după ce elevii înțeleg fluxul.",
    },
  ],

  "typing-strategies-fast-rounds": [
    {
      type: "p",
      text: "Șaizeci de secunde par mult până când definiția se poate potrivi cu mai multe cuvinte. Jucătorii puternici tratează fiecare rundă ca un sprint: decodează indiciul, mapează sunetele la ortografie și evită să piardă timp pe litere speculative. Acest articol rămâne pe tastatură; altele acoperă vocea și vocabularul pe categorii.",
    },
    { type: "h2", text: "Citește definiția o dată, apoi structureaz-o" },
    {
      type: "p",
      text: "La prima citire, observă partea de vorbire dacă reiese din indiciu — verbe versus substantive schimbă presupunerile despre sufixe. Numără spațiile din mască; lungimea elimină singură multe variante. Dacă răspunsul are opt litere iar mintea îți propune un sinonim de șase, renunță imediat. Recitirea aceleiași fraze de trei ori rareori bate o singură trecere atentă plus încercări pe tastatură.",
    },
    { type: "h2", text: "Frecvența literelor și limba aleasă" },
    {
      type: "p",
      text: "În engleză vocalele apar des; româna și alte limbi au propriul ritm. Dacă ești nesigur între două vocale la început, tastează varianta care apare mai des în tulpinile comune din acea categorie. WordWave penalizează ghicirile greșite — două erori consecutive pot declanșa o scurtă blocare — deci „împușcarea” alfabetului e mai rea decât o pauză de o jumătate de secundă.",
    },
    { type: "h2", text: "Folosește liniile adversarilor ca indiciu slab" },
    {
      type: "p",
      text: "Barele colorate arată cât de departe au ajuns ceilalți, nu ce taste au apăsat. Totuși, dacă doi adversari se blochează pe aceeași poziție, definiția poate cere un diftong acolo. Combină acest semnal social cu propria ipoteză, fără a-i copia orb.",
    },
    { type: "h2", text: "Dispozitiv și postură" },
    {
      type: "p",
      text: "Tastaturile mecanice ajută unii jucători; alții preferă tastele plate de laptop. Contează mai mult o postură stabilă ca să nu pierzi rândul de bază sub stres. Pe telefon, modul focalizare ascunde notificările care acoperă câmpul. Dezactivează corectarea automată dacă îți schimbă limba față de definiție.",
    },
    { type: "h2", text: "Mindset după o greșeală" },
    {
      type: "p",
      text: "După o literă greșită, respiră o dată înainte de următoarea apăsare. Lanțurile de panică aduc mai multe erori decât reluarea calmă. Butonul de istoric listează caracterele greșite — verifică-l dacă ai uitat ce ai exclus deja.",
    },
    { type: "h2", text: "Exercițiu de închidere" },
    {
      type: "p",
      text: "Alege zece runde de antrenament și notează timpul mediu până la prima literă. Încearcă să scazi puțin în fiecare zi citind dinainte categoriile care îți sunt cele mai grele. Viteza fără acuratețe pierde runde; curba ideală le îmbunătățește pe amândouă.",
    },
  ],

  "voice-input-wordwave-best-practices": [
    {
      type: "p",
      text: "Calea microfonului din WordWave e gândită pentru recunoaștere pe cuvânt întreg, nu pentru dictare literă cu literă. Motorul compară transcrierile cu răspunsul ascuns, cu toleranță la accente, mici greșeli și o distanță fuzzy. Designul recompensează enunțul clar al soluției, nu „spelling bee” la microfon.",
    },
    { type: "h2", text: "Suportul browserelor e inegal" },
    {
      type: "p",
      text: "Browserele desktop pe Chromium expun în general Web Speech API în mod fiabil. Safari și Firefox variază după versiune și politică OS. Pe iOS poate fi nevoie să apeși microfonul direct ca răspuns la gestul utilizatorului; dacă nu se întâmplă nimic, revino la tastare fără să consideri că e neapărat o eroare de joc.",
    },
    { type: "h2", text: "Mediul contează" },
    {
      type: "p",
      text: "Muzica de fundal, ecoul camerei și ventilatoarele laptopului încurcă modelele. O cască ieftină îmbunătățește mult acuratețea față de difuzoare deschise într-o bucătărie zgomotoasă. Mută temporar televizorul; adversarii apreciază și social, și acustic.",
    },
    { type: "h2", text: "Pronunție versus ortografie" },
    {
      type: "p",
      text: "Dacă răspunsul are literă mută, vocea poate tot potrivi pentru că modelul mapează sunetele la cuvântul stocat. Invers, omonimele pot încurca motorul — contextul din definiție e frâna de mână. După două eșecuri vocale, treci la tastatură în acea rundă.",
    },
    { type: "h2", text: "Eliminare echitabilă" },
    {
      type: "p",
      text: "În multiplayer poți fi marcat ca eliminat vocal dacă transcrierea e clar greșită, ca să previi spamul hibrid (vorbești și tastezi stringuri contradictorii). Citește mesajul pe ecran dacă pierzi dreptul la microfon; e intenționat ca rundele să rămână finite.",
    },
    { type: "h2", text: "Antrenament în perechi" },
    {
      type: "p",
      text: "Încălzește-te în Practice doar cu voce, apoi doar tastatură, apoi ambele. Vezi ce mod ți se potrivește pe categorie. Unele liste tematice favorizează compuși lungi, mai potriviți tastaturii; substantive scurte comune merg adesea bine pe voce.",
    },
    { type: "h2", text: "Notă de confidențialitate" },
    {
      type: "p",
      text: "Procesarea vorbirii are loc în lanțul browserului, nu pe serverele WordWave. Evită totuși să spui date personale cu microfonul pornit. Închide fila după sesiuni pe calculatoare partajate.",
    },
  ],

  "practice-mode-before-hosting-friends": [
    {
      type: "p",
      text: "Să fii gazdă la o seară WordWave înseamnă să răspunzi la întrebări despre cronometru, scor și microfoane. Dacă nu ai terminat niciodată o rundă singur, aceste întrebări devin stresante. Modul Practice prăbușește curba de învățare într-o sesiune privată unde doar tu vezi greșelile.",
    },
    { type: "h2", text: "Același flux, zero spectatori" },
    {
      type: "p",
      text: "Practice extrage cuvinte din aceeași categorie și configurație lingvistică ca pe pagina principală. Diferența e socială: fără coduri de cameră, fără bare de adversari, fără lobby de așteptare. Paritatea contează — nu te antrenezi pe date „de jucărie”.",
    },
    { type: "h2", text: "Construiește memorie musculară" },
    {
      type: "p",
      text: "Rulează zece runde consecutive concentrându-te doar pe ritmul tastelor. Repetă accentuând vocea. Urmărește cât de des ajungi la timeout la 45 de secunde — dacă e des, definițiile din acea categorie sunt poate mai grele decât credeai. Ajustează limba sau tema înainte să inviți pe alții.",
    },
    { type: "h2", text: "Listă de verificare dispozitiv" },
    {
      type: "p",
      text: "Testează portret și landscape pe telefonul pe care îl vei folosi. Asigură-te că estomparea automată a luminii nu ascunde masca în mijlocul rundei. Pune căști dacă plănuiești să te bazezi pe indicii sonore.",
    },
    { type: "h2", text: "Predare către alții" },
    {
      type: "p",
      text: "După ce ești confortabil, înregistrează ecranul unei runde de practice (fără să arăți literele dacă distribui public). Un clip de treizeci de secunde bate un paragraf de reguli.",
    },
    { type: "h2", text: "Când poți sări peste Practice" },
    {
      type: "p",
      text: "Veteranii jocurilor de tastare pot intra direct în multiplayer, dar chiar ei profită dintr-o rundă de practice după pauze lungi sau actualizări de browser care resetează permisiuni.",
    },
    { type: "h2", text: "Rotește categoriile cu intenție" },
    {
      type: "p",
      text: "E tentant să repeți doar listele preferate. Impune-ți o categorie nefamiliară per sesiune ca să nu fii surprins când un prieten o alege live. Varietatea păstrează și capturile de ecran proaspete.",
    },
  ],

  "word-categories-change-the-game": [
    {
      type: "p",
      text: "WordWave oferă mai multe liste tematice — emoții, corp, valori, societate și altele. Fiecare categorie înclină distribuția răspunsurilor. Temele abstracte produc leme mai lungi și rare; cele concrete grupează substantive cotidiene. Gazdele ar trebui să aleagă cu intenție pentru public, nu la întâmplare.",
    },
    { type: "h2", text: "Potrivire cu publicul" },
    {
      type: "p",
      text: "Camerele de familie cu vârste amestecate beneficiază de categorii largi, concrete, unde definițiile seamănă cu glosarul. Listele de nișă filozofică îi încântă pe pasionați de cuvinte dar îi frustrează pe cei care vor energie de petrecere. Cereți grupului înainte să blocați alegerea.",
    },
    { type: "h2", text: "Asocierea limbii" },
    {
      type: "p",
      text: "Definițiile pot fi în română în timp ce gândești în engleză, sau invers, după setările gazdei. Camerele cu alfabetizare mixtă ar trebui să alinieze limba cu cel mai lent cititor, apoi să crească dificultatea la următorul meci dacă toți termină devreme.",
    },
    { type: "h2", text: "Metajoc" },
    {
      type: "p",
      text: "După mai multe runde, jucătorii atenți internalizează tiparele categoriei. Rotește gazde sau categorii ca să previi predictibilitatea. Dacă proiectezi liste proprii offline pentru clasă, etichetează-le clar ca importurile să nu se calce cu cele integrate.",
    },
    { type: "h2", text: "Optica pentru streaming" },
    {
      type: "p",
      text: "Emoji-urile colorate ale categoriilor apar în capturi. Alege teme care se citesc bine la dimensiune de miniatură. Evită subiecte ultra-înguste dacă chat-ul nu poate ghici alături.",
    },
    { type: "h2", text: "Program echilibrat de rotație" },
    {
      type: "p",
      text: "Un format simplu: runda 1 categorie ușoară, runda 2 mai grea, runda 3 wildcard ales de cel mai mic scor. Menține moralul ridicat testând totuși skill-ul.",
    },
    { type: "h2", text: "Gând de încheiere" },
    {
      type: "p",
      text: "Categoriile sunt cel mai apropiat lucru de WordWave față de setări de dificultate. Tratează-le ca pe parte din matchmaking, nu decor.",
    },
  ],

  "game-night-checklist-wordwave": [
    {
      type: "p",
      text: "Lobby-urile spontane sunt distractive, serile planificate merg mai lin. Această listă e pentru gazde care vor timp minim între „toți au sosit” și „prima rundă live”.",
    },
    { type: "h2", text: "Cu treizeci de minute înainte" },
    {
      type: "p",
      text: "Actualizează browserele, încarcă dispozitivele și deschide site-ul o dată în Practice ca să confirmi cookie-uri și permisiuni audio. Notează codul camerei pe un sticky înainte să vină oaspeții ca să nu dictezi litere peste zgomot de pachete.",
    },
    { type: "h2", text: "Audio și acustică" },
    {
      type: "p",
      text: "Dacă cineva folosește voce, liniștește camera sau folosiți căști. Pentru sesiuni doar pe tastatură, un playlist de fundal e în regulă — păstrează volum moderat ca apelurile Discord să rămână clare.",
    },
    { type: "h2", text: "Fluxul invitațiilor" },
    {
      type: "p",
      text: "Trimite linkul HTTPS de invitație în grup plus codul brut ca rezervă. Spune dacă jucătorii ar trebui să intre de pe telefon sau laptop; mixul e ok, dar recomandă landscape pentru degete mari.",
    },
    { type: "h2", text: "Reguli ale casei" },
    {
      type: "p",
      text: "Decideți cu voce tare: dicționare permise? pauze la toaletă între runde? rematch la deconectare? Claritatea previne certurile în joc.",
    },
    { type: "h2", text: "În timpul jocului" },
    {
      type: "p",
      text: "Desemnează pe cineva să urmărească vocea cronometrului pentru sync cu streamul. Rotește cine citește cu voce tare definițiile pentru cine vede greu textul mic.",
    },
    { type: "h2", text: "După meci" },
    {
      type: "p",
      text: "Fă captură la scoruri, mulțumește jucătorilor și notează ce categorie a depășit timpul — ajustează săptămâna viitoare. Arhivează ghicirile amuzante dacă comunitatea iubește highlight-urile.",
    },
    { type: "h2", text: "Plan B de urgență" },
    {
      type: "p",
      text: "Dacă site-ul dă eroare, ai un joc secundar ușor pregătit ca seara să nu se strice. Rar, dar gazdele pregătite par legendare.",
    },
  ],

  "fair-play-etiquette-multiplayer-word-games": [
    {
      type: "p",
      text: "WordWave recompensează viteza, dar comunitățile durabile recompensează corectitudinea. Aceste norme ajută Discord-uri publice și grupuri de prieteni să rămână primitoare după zeci de meciuri.",
    },
    { type: "h2", text: "Fără „sniping” cu dicționarul" },
    {
      type: "p",
      text: "Căutarea răspunsului în timpul rundei rupe contractul social. Dacă cineva vrea mod de învățare, stabiliți dinainte și puneți pauză la cronometru — sau folosiți un alt joc de trivia gândit pentru cercetare deschisă.",
    },
    { type: "h2", text: "Întârziere la stream" },
    {
      type: "p",
      text: "Transmițătorii ar trebui să adauge delay ca chat-ul să nu poată trimite spoilere pe Discord mai repede decât le vede gazda. Menționează durata întârzierii în titlu.",
    },
    { type: "h2", text: "Deconectări" },
    {
      type: "p",
      text: "Dacă cineva pică, nu-l batjocori. Oferă rapid un cod de rematch. Viața se întâmplă — copii, routere, baterii.",
    },
    { type: "h2", text: "Limite la glume" },
    {
      type: "p",
      text: "Șotii ușoare despre viteză sunt ok între prieteni care sunt de acord. Evită remarci despre tastat legate de dizabilitate, limbă sau școală. Când nu ești sigur, sărbătorește indiciile bune în loc să râzi de ratări.",
    },
    { type: "h2", text: "Copiii în cameră" },
    {
      type: "p",
      text: "Alege categorii de familie și păstrează voice chat-ul curat. Gazda poate aminti că pseudonimele sunt vizibile tuturor.",
    },
    { type: "h2", text: "Când să pui pauză" },
    {
      type: "p",
      text: "Dacă cineva cere clarificări despre un bug — nu despre ghicitoare — puneți pauză verbal, rezolvați tehnica, apoi reluați runda corect.",
    },
    { type: "h2", text: "Încredere pe termen lung" },
    {
      type: "p",
      text: "Comunitățile cu etichetă atrag adversari mai buni. Fii jucătorul care modelează răbdarea; victoriile oricum sunt mai satisfăcătoare.",
    },
    { type: "h2", text: "Înregistrări și clipuri" },
    {
      type: "p",
      text: "Clipuri scurte cu momente amuzante ajută creșterea, dar cereți participanților vocali acordul unde legea sau platforma o cere. Estompează codurile de cameră în lobby ca sesiunile expirate să nu fie hărțuite.",
    },
    { type: "h2", text: "Mentorat pentru începători" },
    {
      type: "p",
      text: "Puneți începătorii cu un „buddy” care explică masca și cronometrul fără grabă. Un meci ghidat convertește vizitatorii curioși mai repede decât un zid de text.",
    },
  ],

  "timer-rounds-scoring-wordwave": [
    {
      type: "p",
      text: "Ritmul WordWave pare simplu la suprafață: un minut în faza de joc, număr de runde ales de gazdă, primul care completează cuvântul câștigă runda. Sub suprafață, cazurile-limită merită explicații pentru gazde competitive.",
    },
    { type: "h2", text: "Cronometrul rundei" },
    {
      type: "p",
      text: "Cronometrul vizibil numără în jos în timpul jocului. Dacă nimeni nu termină cuvântul, runda se încheie cu timeout; jucătorii văd de obicei soluția sau o revelare parțială după configurația serverului.",
    },
    { type: "h2", text: "Finalizări simultane" },
    {
      type: "p",
      text: "Serverul ordonă actualizările; finaluri extrem de apropiate se rezolvă la un singur câștigător per rundă. Egalitate la scor total după toate rundele poate apărea; stabiliți o rundă de departajare sau împărțiți victoria.",
    },
    { type: "h2", text: "Gata între runde" },
    {
      type: "p",
      text: "Să sari peste „gata” nu încetinește pe nimeni dacă un jucător e AFK — comunicați în voce. Interfața blochează progresul până confirmă toți, ca jumătate din grup să nu ia avans.",
    },
    { type: "h2", text: "Eliminare vocală" },
    {
      type: "p",
      text: "Ghicirile vocale greșite pot scoate privilegiul microfonului în acea rundă, păstrând tastatura, după steaguri. Citește banner-ul cu atenție.",
    },
    { type: "h2", text: "Totaluri configurabile" },
    {
      type: "p",
      text: "Gazda alege număr întreg de runde. Meciuri scurte pentru pauza de prânz; turnee mai lungi. Nu există ELO integrat — țineți clasamente externe pentru ligi.",
    },
    { type: "h2", text: "Analitică pentru progres" },
    {
      type: "p",
      text: "Notează informal câte runde câștigi în medie pe seară. Tendințele contează mai mult decât vârfurile dintr-un singur meci.",
    },
    { type: "h2", text: "Override-uri ale gazdei" },
    {
      type: "p",
      text: "Dacă grupul e de acord, gazda poate declara verbal pauză la toaletă chiar dacă UI-ul încă numără — declarați pauza înainte ca cineva să înceapă să tasteze ca runda să rămână pe încredere.",
    },
    { type: "h2", text: "Evenimente sezoniere" },
    {
      type: "p",
      text: "Categorii tematice de sărbători folosesc același motor de scor; spuneți în lobby că indiciile pot face referințe culturale pe care unii le ratează, și schimbați lista dacă oaspeții se pierd.",
    },
  ],

  "brief-history-word-guessing-games": [
    {
      type: "p",
      text: "Ghicitul cuvintelor are rădăcini în puzzle-uri cu creion și emisiuni TV. Spânzurătoarea a învățat ortografia; Roata norocului a popularizat revelările competitive. Web-ul a adus joc asincron — email, forumuri — înainte ca WebSocket-urile să facă simultaneitatea ieftină.",
    },
    { type: "h2", text: "Primele experimente multiplayer" },
    {
      type: "p",
      text: "Camerele din era Flash lăsau utilizatorii să concureze, dar plugin-ul a dispărut. Aplicațiile mobile au umplut golul în silozuri izolate. Jocurile din browser au revenit pe măsură ce JavaScript-ul s-a maturizat și găzduirea a devenit accesibilă.",
    },
    { type: "h2", text: "De ce contează sincronitatea" },
    {
      type: "p",
      text: "Jocurile în ture gen Wordle au explodat în popularitate, dar energia de petrecere cere adesea ca toți să privească aceeași secundă pe ceas. WordWave țintește această nișă: configurare ușoară, fără instalare.",
    },
    { type: "h2", text: "Legătura cu educația" },
    {
      type: "p",
      text: "Profesorii au folosit tastarea sincronă pentru vocabular în școala la distanță. ADN similar apare în sistemul de categorii WordWave — distracție pe primul loc, învățarea ca efect secundar.",
    },
    { type: "h2", text: "Tehnologie viitoare" },
    {
      type: "p",
      text: "Vocea mai bună pe dispozitiv și baze edge mai ieftine vor continua să micșoreze latența. Proiectarea rămâne umană: indicii corecte, limbaj incluziv, camere respectuoase.",
    },
    { type: "h2", text: "Păstrare" },
    {
      type: "p",
      text: "Fă captură la recorduri; jocurile indie evoluează. Bloguri ca acesta documentează intenția pentru jucătorii care vin peste ani.",
    },
  ],

  "invite-links-room-codes-safety": [
    {
      type: "p",
      text: "Un cod de cameră WordWave e un șir scurt care indică un rând temporar în baza de date. Nu e parola la email, dar e bilet de intrare cât timp camera există.",
    },
    { type: "h2", text: "Riscuri la postare publică" },
    {
      type: "p",
      text: "Dacă lipești codul într-un server cu o mie de persoane, străinii pot intra. Decide dacă asta vrei — grozav pentru meetup-uri, haotic pentru cupluri private. Creează cameră nouă dacă apar trolli.",
    },
    { type: "h2", text: "URL-uri de invitație" },
    {
      type: "p",
      text: "Linkurile pre-completează câmpurile dar tot cer pseudonim. Nu scot la iveală emailuri anterioare. Tratează-le ca pe coduri: distribuie responsabil.",
    },
    { type: "h2", text: "Igienă la pseudonim" },
    {
      type: "p",
      text: "Evită numele legal complet dacă te îngrijorează doxxing-ul; pseudonimele sunt normale. Gazda poate cere redenumirea pe înțelegere chiar dacă UI-ul nu forțează.",
    },
    { type: "h2", text: "După joc" },
    {
      type: "p",
      text: "Camerele se curăță în cele din urmă pe server. Nu te baza pe coduri ca arhivă permanentă a scorurilor — exportă amintiri manual.",
    },
    { type: "h2", text: "Copii" },
    {
      type: "p",
      text: "Supervizează minorii care distribuie linkuri; lobby-urile publice pot include adulți necunoscuți.",
    },
  ],

  "mobile-performance-low-latency-tips": [
    {
      type: "p",
      text: "Telefoanele rulează WordWave bine, dar multitasking-ul OS introduce micșorări de performanță. Aceste ajustări ajută pe cei care concurează pe degete.",
    },
    { type: "h2", text: "Închide filele de fundal" },
    {
      type: "p",
      text: "Fiecare filă grea concurează pentru CPU. Safari și Chrome limitează cronometrele din fundal; o fereastră curată păstrează requestAnimationFrame lin.",
    },
    { type: "h2", text: "Dezactivează economisirea agresivă a bateriei" },
    {
      type: "p",
      text: "Modurile extreme de baterie limitează cronometrele JS și polling-ul de rețea. Conectează la priză pentru finale de turneu.",
    },
    { type: "h2", text: "Tastatură externă" },
    {
      type: "p",
      text: "Tastaturile Bluetooth transformă telefonul într-un mini-laptop. Perechează înainte să se umple lobby-ul ca să eviți setup Bluetooth la verificarea „gata”.",
    },
    { type: "h2", text: "Alegerea rețelei" },
    {
      type: "p",
      text: "Wi-Fi 5 GHz sau tether cu fir bate adesea 2.4 GHz aglomerat. Rulează un test de viteză separat de joc; dacă încărcările în cloud fac lag, pune-le pauză.",
    },
    { type: "h2", text: "Zoom ecran" },
    {
      type: "p",
      text: "Asigură-te că zoom-ul browserului e 100% ca masca să se alinieze la ținte. Scalări extreme de font de sistem pot strica layout-ul.",
    },
    { type: "h2", text: "Răcire" },
    {
      type: "p",
      text: "Sesiuni lungi încălzesc telefoanele subțiri; throttling-ul termic încetinește inputul. Un ventilator de birou ajută mai mult decât crezi.",
    },
  ],

  "definition-language-english-romanian-tips": [
    {
      type: "p",
      text: "WordWave separă limba definițiilor de particularitățile alfabetului răspunsului prin normalizare, dar oamenii tot citesc indiciul într-o limbă principală per rundă. Alegerea înțeleaptă reduce frustrarea.",
    },
    { type: "h2", text: "Potrivește-te cu cel mai lent cititor" },
    {
      type: "p",
      text: "Dacă trei jucători vorbesc fluent română și unul învață, rulează definiții în engleză până cere schimbarea. Stăpânirea bate mândria.",
    },
    { type: "h2", text: "Utilizare la clasă" },
    {
      type: "p",
      text: "Profesorii de limbă pot folosi definiții în limba țintă pentru a forța înțelegerea, apoi debrief de vocabular după revelare. Ține rundele cu mize mici pentru începători.",
    },
    { type: "h2", text: "Familii mixte" },
    {
      type: "p",
      text: "Familii în diaspora aleg uneori definiții în limba moștenită ca să expună copiii. Rotește seara între limbi ca ambii părinți să rămână implicați.",
    },
    { type: "h2", text: "Diacritice și tastaturi" },
    {
      type: "p",
      text: "Răspunsurile pot include diacritice în timp ce tastarea acceptă comparații normalizate — totuși, amintește jucătorilor cum să țină apăsat pe mobil pentru litere speciale dacă vor ortografie exactă.",
    },
    { type: "h2", text: "Liste viitoare" },
    {
      type: "p",
      text: "Pot apărea mai multe limbi pe măsură ce categoriile cresc. Urmărește note de versiune sau acest blog la locale noi.",
    },
    { type: "h2", text: "Accesibilitate" },
    {
      type: "p",
      text: "Cititoarele de ecran anunță definițiile; alege setări de limbă concise pe care software-ul grupului le gestionează bine.",
    },
  ],

  "wordwave-in-classrooms-and-clubs": [
    {
      type: "p",
      text: "WordWave poate întări vocabularul când e folosit cu intenție. Spre deosebire de căutări de cuvinte solitare, cronometrul adaugă urgență onestă pe care unii elevi o plac și alții o găsesc stresantă — echilibrează ambele grupuri.",
    },
    { type: "h2", text: "Începe cooperativ, apoi competitiv" },
    {
      type: "p",
      text: "Prima sesiune: proiectează definiția și rezolvați ca clasă verbal înainte să tasteze cineva. A doua: perechi pe un dispozitiv ca negocierea să facă parte din învățare. Abia apoi camere mici free-for-all.",
    },
    { type: "h2", text: "Diferențiere pe categorie" },
    {
      type: "p",
      text: "Elevii avansați primesc categorii abstracte; cititorii emergenți rămân la substantive concrete cu cuvinte mai scurte. Rotează rolurile ca nimeni să nu fie etichetat permanent „încet”.",
    },
    { type: "h2", text: "Limite la evaluare" },
    {
      type: "p",
      text: "Jocurile cu cronometru măsoară viteza plus cunoaștere anterioară, nu înțelegere profundă singură. Folosește WordWave ca practică formativă, nu examene cu mize mari, decât dacă predai explicit fluența la tastatură ca obiectiv.",
    },
    { type: "h2", text: "Managementul zgomotului" },
    {
      type: "p",
      text: "Rundele vocale devin gălăgioase. Stabilește norma cu mâna ridicată sau mută vocea în curte. Căștile reduc scurgerile între birouri în laboratoare.",
    },
    { type: "h2", text: "Confidențialitate" },
    {
      type: "p",
      text: "Urmează politica școlii pentru pseudonime; evită nume legale complete pe ecran. Explică faptul că codurile de cameră sunt permise temporare, nu intrări în catalog.",
    },
    { type: "h2", text: "Șablon de debrief" },
    {
      type: "p",
      text: "După trei runde, întreabă care indiciu a părut cel mai corect și care ambiguu. Elevii învață critica metalingvistică alături de ortografie.",
    },
  ],

  "colour-progress-bars-and-accessibility": [
    {
      type: "p",
      text: "WordWave arată fiecare jucător activ cu un indicator colorat și o reprezentare a progresului. Culoarea e un canal vizual rapid, dar nu singurul; poziția în lista jucătorilor mapează și ea sloturile.",
    },
    { type: "h2", text: "Nu te baza doar pe nuanță" },
    {
      type: "p",
      text: "Dacă transmiți, descrie liniile verbal: „jucătorul albastru e cu două litere înainte” în loc de „bară azurie”. Obiceiul ajută spectatorii daltoniști și pe cei care ascultă doar audio.",
    },
    { type: "h2", text: "Zoom în browser" },
    {
      type: "p",
      text: "Creșterea fontului poate îngroșa ușor liniile, îmbunătățind separarea. Testează la 125% zoom înainte de turnee dacă un coechipier raportează confuzie.",
    },
    { type: "h2", text: "Filtre de sistem" },
    {
      type: "p",
      text: "macOS și Windows oferă filtre de culoare care schimbă paleta; unii jucători le preferă global. WordWave nu poate suprascrie setările OS, dar gazda poate pune pauză dacă cineva se ajustează în timpul meciului.",
    },
    { type: "h2", text: "Îmbunătățiri viitoare" },
    {
      type: "p",
      text: "Modele sau etichete numerice lângă culori sunt câștiguri comune de accesibilitate; urmărește note de lansare dacă UI-ul le adaugă.",
    },
    { type: "h2", text: "Normă în comunitate" },
    {
      type: "p",
      text: "Întreabă o dată per grup nou dacă cineva are nevoie de descrieri verbale. Normalizarea întrebării reduce stigma.",
    },
  ],
}
