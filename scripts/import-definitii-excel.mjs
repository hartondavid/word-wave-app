/**
 * Import din Excel (Downloads): definitii.xlsx … definitii 5.xlsx
 * - Coloane: Cuvânt, Definiție reformulată (originală)
 * - Același cuvânt în mai multe fișiere: câștigă ultimul din listă (definitii 5.xlsx).
 * - Înlocuiește câmpul `definition` în JSON-urile de categorie când cuvântul există în Excel.
 * - Cuvinte noi: clasificare automată în categorii (game-types).
 * - Dacă există data/categories/definitions/definition.json: intrările sunt împărțite în categorii, apoi fișierul e șters.
 * - Dedupe per fișier (același cuvânt normalizat → o singură intrare; definiția din Excel are prioritate).
 *
 * Usage:
 *   node scripts/import-definitii-excel.mjs
 *   node scripts/import-definitii-excel.mjs --prune-not-in-excel
 *     → șterge intrările al căror cuvânt nu e în Excel (rămân doar definițiile reformulate din fișierele xlsx).
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const CAT_DEF = path.join(ROOT, "data", "categories", "definitions")
const DOWNLOADS = "C:/Users/hdavi/Downloads"

const EXCEL_FILES = [
  "definitii.xlsx",
  "definitii 2.xlsx",
  "definitii 3.xlsx",
  "definitii 4.xlsx",
  "definitii 5.xlsx",
]

const COL_WORD = "Cuvânt"
const COL_DEF = "Definiție reformulată (originală)"

/** Aliniat cu lib/game-types.ts (fără general). */
const STANDARD_CATS = [
  "emotii",
  "relatii",
  "timp",
  "succes",
  "valori",
  "caracter",
  "minte",
  "corp",
  "munca",
  "familie",
  "prietenie",
  "iubire",
  "libertate",
  "credinta",
  "sanatate",
  "educatie",
  "natura",
  "societate",
  "filosofie",
  "persoana",
]

/** Fișier temporar: data/categories/definitions/definition.json (intrări de clasificat). */
const definitionJsonBasename = "definition"

/** @typedef {{ w: number, keys: string[] }} Rule */
/** @type {Record<string, Rule[]>} */
const RULES = {
  sanatate: [
    { w: 3, keys: ["boală", "boli", "medic", "medical", "tratament", "terapeutic", "simptom", "vindecare", "virus", "bacterie", "infecț", "sănătate", "clinic", "spital", "pacient", "diagnostic", "vaccin", "durere fizică", "organismului biologic"] },
    { w: 2, keys: ["hidratare", "nutriț", "metabolism", "imunitar", "fiziolog"] },
  ],
  corp: [
    { w: 3, keys: ["ochi", "ochilor", "clipi", "vedere", "auz", "pielea", "piele", "mușchi", "sânge", "inimă", "stomac", "intestinal", "respira", "dentar", "părul", "unghie", "deget", "gât", "umeri", "șold", "genunchi", "talie", "piept", "anatomic", "fizic", "corpului", "corpurilor", "vegetativ", "somn", "treaz", "postură"] },
    { w: 2, keys: ["tactil", "senzație la nivelul pielii", "mirosul", "gustul", "sunet intestinal", "foame intensă"] },
  ],
  emotii: [
    { w: 3, keys: ["emoție", "emoțional", "sentiment", "afectiv", "suflet", "compătimi", "empatie", "compasiune", "teamă", "frică", "anxiet", "tristeț", "bucurie", "fericire", "mâhnire", "furie", "mânie", "invidie", "gelozie", "mândrie", "rușine", "vinovăț", "nostalg", "entuziasm", "panică", "relaxare emoțională", "stres", "plân", "lacrim", "jale", "îndurerat"] },
    { w: 2, keys: ["captiva", "atenția cuiva", "entuziasmat", "demoral"] },
  ],
  iubire: [
    { w: 3, keys: ["iubire", "dragoste", "romantic", "cuplu", "partener iubit", "atrație erotică", "intimitate amoroasă", "inimă îndrăgostit"] },
    { w: 2, keys: ["seducție", "flirt"] },
  ],
  familie: [
    { w: 3, keys: ["familie", "părinte", "mamă", "tată", "copil", "fiu", "fiică", "rudă", "moștenire", "strămoș", "nuntă", "căsătorie", "soț", "soție", "înmormântare", "bunic", "nepot", "cumnat"] },
    { w: 2, keys: ["domestic", "gospodărie familială"] },
  ],
  prietenie: [
    { w: 3, keys: ["prieten", "prietenie", "camaraderie", "tovarăș", "confident"] },
    { w: 2, keys: ["loialitate față de o persoană apropiată"] },
  ],
  relatii: [
    { w: 2, keys: ["relație interpersonală", "interpersonal", "conviețuire", "vecin", "coleg de", "încredere reciprocă", "reconciliere", "ruptură relațională"] },
    { w: 1, keys: ["colaborare strânsă între persoane", "comunicare directă între indivizi"] },
  ],
  munca: [
    { w: 3, keys: ["muncă", "serviciu", "salariu", "angajare", "concediere", "promovare profesională", "birou", "ședință de lucru", "proiect profesional", "carieră", "întreprindere", "patron", "angajat", "sindicat", "productivitate la locul de"] },
    { w: 2, keys: ["obiectiv profesional", "deadline", "delegare sarcini", "organigramă"] },
  ],
  succes: [
    { w: 3, keys: ["reușită", "performanță", "victorie", "triumf", "obiectiv atins", "record", "medalie", "clasament superior"] },
    { w: 2, keys: ["depășirea propriilor limite", "succes măsurabil"] },
  ],
  educatie: [
    { w: 3, keys: ["învățare", "școală", "universitate", "student", "profesor", "lecție", "curriculum", "examen", "diplomă", "curs academic", "pedagogic", "alfabetizare"] },
    { w: 2, keys: ["cunoștințe transmise", "formare intelectuală", "deprindere prin exercițiu"] },
  ],
  minte: [
    { w: 2, keys: ["gândire", "raționament", "logică", "memorie", "imaginație", "percepție", "atenție", "concentrare", "concept", "idee abstractă", "intelect", "cognitiv", "reflecție", "analiză mentală", "sinestezie"] },
    { w: 1, keys: ["argumenta", "interpreta semantic", "înțeles", "mesaj", "comunicare verbală", "metaforă", "cuvinte cheie dintr-un mesaj"] },
  ],
  filosofie: [
    { w: 3, keys: ["existență", "esență", "ființă", "absolut", "metafizic", "ontologic", "sensul vieții", "nihilism", "dialectică", "paradox filosofic"] },
    { w: 2, keys: ["adevăr universal", "contemplație profundă asupra realității"] },
  ],
  credinta: [
    { w: 3, keys: ["dumnezeu", "divin", "religie", "credință", "ritual religios", "biserică", "preot", "rugăciune", "sufletul în sens teologic", "purgatoriu", "rai", "iad", "mitologie"] },
    { w: 2, keys: ["spirite", "supranatural", "ocult", "vrajă", "farmec magic"] },
  ],
  libertate: [
    { w: 3, keys: ["libertate", "independență", "autonomie", "constrângere", "opresiune", "cenzură", "drepturi civile", "alegere liberă"] },
    { w: 2, keys: ["eliberare din", "fără constrângeri exterioare"] },
  ],
  valori: [
    { w: 3, keys: ["moral", "etică", "dreptate", "corectitudine", "onestitate", "integritate", "principiu moral", "virtute", "vinovăție morală"] },
    { w: 2, keys: ["demnitate", "respect reciproc ca valoare"] },
  ],
  caracter: [
    { w: 2, keys: ["personalitate", "temperament", "caracterizat prin", "atitudine inflexibilă", "severitate morală a persoanei", "altruism", "egoism", "modestie", "aroganță", "perseverență", "lene", "harnic", "minuțios", "neglijent"] },
    { w: 1, keys: ["comportament obișnuit", "obiceiuri personale", "îndrăzneț", "timiditate"] },
  ],
  persoana: [
    { w: 2, keys: ["identitate", "sinele", "autoestima", "conștiință de sine", "individualitate", "autocunoaștere"] },
    { w: 1, keys: ["propria persoană", "imagine de sine"] },
  ],
  timp: [
    { w: 3, keys: ["timp", "durată", "cronologic", "moment temporal", "temporal", "amânare", "urgent", "întârziere", "punctualitate", "viitor", "trecut", "prezent", "sezon", "orar"] },
    { w: 2, keys: ["reporta pentru un moment ulterior", "planificare temporală"] },
  ],
  societate: [
    { w: 3, keys: ["lege", "judecată", "tribunal", "instanță", "stat", "guvern", "politic", "alegeri", "democrație", "impozit", "justiție", "infracțiune", "pedeapsă", "poliție", "cetățean", "instituție publică", "demografie", "urbanism"] },
    { w: 2, keys: ["achita", "acuzat", "vinovăție judiciară", "contract legal", "normă socială", "conviețuire în societate"] },
  ],
  natura: [
    { w: 3, keys: ["animal", "plantă", "copac", "pădure", "râu", "mare", "munți", "vreme", "climat", "ecosistem", "specie", "insectă", "pasăre", "pește", "floră", "faună"] },
    { w: 2, keys: ["curs de apă", "baraj hidrotehnic", "solstițiu", "fenomen natural"] },
  ],
}

const CATEGORY_ORDER = Object.keys(RULES)

function norm(w) {
  return String(w ?? "")
    .trim()
    .toLowerCase()
}

function mergeExcels() {
  /** @type {Map<string, { definition: string, displayWord: string }>} */
  const merged = new Map()
  for (const name of EXCEL_FILES) {
    const fp = path.join(DOWNLOADS, name)
    if (!fs.existsSync(fp)) {
      console.warn("Lipsește:", fp)
      continue
    }
    const wb = XLSX.readFile(fp)
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" })
    for (const r of rows) {
      const rawWord = String(r[COL_WORD] ?? "").trim()
      const def = String(r[COL_DEF] ?? "").trim()
      const k = norm(rawWord)
      if (!k || !def) continue
      merged.set(k, { definition: def, displayWord: rawWord || k })
    }
  }
  return merged
}

function scoreText(text) {
  /** @type {Record<string, number>} */
  const scores = {}
  for (const cat of CATEGORY_ORDER) scores[cat] = 0
  for (const cat of CATEGORY_ORDER) {
    for (const rule of RULES[cat]) {
      for (const k of rule.keys) {
        if (text.includes(k.toLowerCase())) scores[cat] += rule.w
      }
    }
  }
  return scores
}

function bestCategory(word, definition) {
  const text = norm(word + " " + definition)
  const scores = scoreText(text)
  let best = "minte"
  let max = -1
  for (const cat of CATEGORY_ORDER) {
    if (scores[cat] > max) {
      max = scores[cat]
      best = cat
    }
  }
  if (max <= 0) {
    if (/\b(obiec|proiect|forță|mișcare|spațiu|recipient|suprafață)\b/.test(text)) return "corp"
    if (/\b(persoană|oameni|grup|autoritate|public)\b/.test(text)) return "societate"
    return "minte"
  }
  return best
}

function loadCategory(cat) {
  const p = path.join(CAT_DEF, `${cat}.json`)
  if (!fs.existsSync(p)) return []
  const data = JSON.parse(fs.readFileSync(p, "utf8"))
  return Array.isArray(data) ? data : []
}

function saveCategory(cat, arr) {
  const p = path.join(CAT_DEF, `${cat}.json`)
  fs.writeFileSync(p, JSON.stringify(arr, null, 2) + "\n", "utf8")
}

function collectWordSet(dataMap) {
  const s = new Set()
  for (const arr of dataMap.values()) {
    for (const e of arr) {
      const k = norm(e.word)
      if (k) s.add(k)
    }
  }
  return s
}

function hasWord(arr, k) {
  return arr.some((e) => norm(e.word) === k)
}

/**
 * O intrare per cuvânt; la conflict folosește definiția din Excel dacă există.
 */
function dedupeCategory(arr, merged) {
  /** @type {Map<string, object>} */
  const m = new Map()
  for (const e of arr) {
    const k = norm(e.word)
    if (!k) continue
    const fromExcel = merged.get(k)?.definition
    const def = fromExcel ?? String(e.definition ?? "").trim()
    const display = String(e.word ?? "").trim() || merged.get(k)?.displayWord || k
    if (!m.has(k)) {
      m.set(k, { ...e, word: display, definition: def })
      continue
    }
    const cur = m.get(k)
    const pickDef = fromExcel ?? cur.definition
    const pickWord = cur.word.length >= display.length ? cur.word : display
    m.set(k, { ...cur, word: pickWord, definition: pickDef })
  }
  return [...m.values()].sort((a, b) => norm(a.word).localeCompare(norm(b.word), "ro"))
}

/** Un cuvânt = o singură intrare în tot setul de categorii (categoria = bestCategory). */
function dedupeAcrossCategories(data, merged) {
  /** @type {Map<string, object[]>} */
  const byWord = new Map()
  for (const cat of STANDARD_CATS) {
    for (const e of data.get(cat)) {
      const k = norm(e.word)
      if (!k) continue
      if (!byWord.has(k)) byWord.set(k, [])
      byWord.get(k).push(e)
    }
  }
  let removed = 0
  for (const [k, entries] of byWord) {
    if (entries.length <= 1) continue
    const def =
      merged.get(k)?.definition ??
      entries.map((e) => String(e.definition ?? "").trim()).find((d) => d.length > 0) ??
      ""
    if (!def.trim()) continue
    removed += entries.length - 1
    const display =
      merged.get(k)?.displayWord ?? (String(entries[0].word ?? "").trim() || k)
    const keepCat = bestCategory(display, def)
    for (const cat of STANDARD_CATS) {
      data.set(
        cat,
        data.get(cat).filter((e) => norm(e.word) !== k)
      )
    }
    const target = data.get(keepCat)
    target.push({
      word: display.trim(),
      definition: def.trim(),
    })
  }
  return removed
}

function main() {
  const pruneNotInExcel = process.argv.includes("--prune-not-in-excel")

  const merged = mergeExcels()
  console.log("Excel: intrări unice (cuvânt):", merged.size)

  /** @type {Map<string, object[]>} */
  const data = new Map()
  for (const cat of STANDARD_CATS) {
    data.set(cat, loadCategory(cat))
  }

  if (pruneNotInExcel) {
    let pruned = 0
    for (const cat of STANDARD_CATS) {
      const arr = data.get(cat)
      const before = arr.length
      const next = arr.filter((e) => merged.has(norm(e.word)))
      pruned += before - next.length
      data.set(cat, next)
    }
    console.log("Eliminate intrări (cuvânt absent din Excel / definiție veche):", pruned)
  }

  let updates = 0
  for (const cat of STANDARD_CATS) {
    const arr = data.get(cat)
    for (const e of arr) {
      const k = norm(e.word)
      if (!k || !merged.has(k)) continue
      const { definition } = merged.get(k)
      if (e.definition !== definition) {
        e.definition = definition
        updates++
      }
    }
  }
  console.log("Definiții actualizate din Excel (în categorii existente):", updates)

  let placed = collectWordSet(data)

  const definitionPoolPath = path.join(CAT_DEF, `${definitionJsonBasename}.json`)
  if (fs.existsSync(definitionPoolPath)) {
    const pool = JSON.parse(fs.readFileSync(definitionPoolPath, "utf8"))
    if (Array.isArray(pool)) {
      let moved = 0
      for (const row of pool) {
        const raw = String(row.word ?? "").trim()
        const k = norm(raw)
        if (!k) continue
        const def = merged.get(k)?.definition ?? String(row.definition ?? "").trim()
        if (!def) continue
        const cat = bestCategory(raw, def)
        const arr = data.get(cat)
        if (hasWord(arr, k)) continue
        arr.push({
          word: merged.get(k)?.displayWord ?? raw,
          definition: def,
          ...(row.word_en ? { word_en: row.word_en } : {}),
          ...(row.definition_en ? { definition_en: row.definition_en } : {}),
        })
        placed.add(k)
        moved++
      }
      console.log("Migrate din definition.json:", moved, "intrări noi în categorii")
    }
    fs.unlinkSync(definitionPoolPath)
    console.log("Șters: definition.json")
  }

  let added = 0
  for (const [k, { definition, displayWord }] of merged) {
    if (placed.has(k)) continue
    const cat = bestCategory(displayWord, definition)
    const arr = data.get(cat)
    if (hasWord(arr, k)) {
      placed.add(k)
      continue
    }
    arr.push({ word: displayWord, definition })
    placed.add(k)
    added++
  }
  console.log("Adăugate (cuvinte noi, clasificate):", added)

  const crossRemoved = dedupeAcrossCategories(data, merged)
  if (crossRemoved > 0) {
    console.log("Eliminate duplicate între categorii (păstrată o intrare):", crossRemoved)
  }

  let dupRemoved = 0
  for (const cat of STANDARD_CATS) {
    const before = data.get(cat).length
    const afterArr = dedupeCategory(data.get(cat), merged)
    dupRemoved += before - afterArr.length
    saveCategory(cat, afterArr)
  }
  console.log("Intrări eliminate la deduplicare în fișier (total):", dupRemoved)
  console.log("Gata.")
}

main()
