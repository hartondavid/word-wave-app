#!/usr/bin/env node
/**
 * generate-all-categories.js
 *
 * Run ONCE locally to populate public/*.json with multilingual word definitions.
 * No extra dependencies — uses Node built-in https module.
 *
 * Each JSON entry format:
 *   { "word": "cat", "definitions": { "en": "...", "ro": "...", "es": "...", "fr": "...", "de": "..." } }
 *
 * Usage:
 *   node generate-all-categories.js
 *
 * After it finishes:
 *   git add data/categories/*.json
 *   git commit -m "feat: add multilingual category definitions"
 *   vercel --prod
 */

const fs    = require('fs')
const https = require('https')
const path  = require('path')

// Languages to translate to (besides English source)
const TARGET_LANGS = ['ro', 'es', 'fr', 'de']

// ── Word lists per category ────────────────────────────────────────────────────
const CATEGORIES = {
  animals:  ['cat','dog','bird','fish','lion','tiger','bear','wolf','horse','cow',
             'deer','fox','frog','duck','eagle','shark','whale','goat','crane','hawk',
             'mole','seal','crab','snail','toad','dove','lynx','moose','otter','bison',
             'gecko','koala','panda','llama','hyena','zebra','rhino','camel','cobra','raven'],

  food:     ['apple','bread','milk','rice','soup','cake','cheese','egg','corn','plum',
             'pear','lime','fig','grape','olive','lemon','peach','mango','onion','garlic',
             'cream','honey','flour','pasta','toast','butter','salt','sugar','coffee','tea'],

  objects:  ['house','book','chair','table','phone','lamp','door','clock','key','cup',
             'bowl','fork','knife','spoon','pen','bag','box','jar','rope','nail',
             'lock','bell','coin','pipe','wire','tape','brush','comb','mirror','pillow'],

  people:   ['doctor','teacher','artist','chef','pilot','judge','nurse','guard','monk',
             'king','queen','scout','actor','coach','diver','boxer','archer','hunter',
             'farmer','knight','butler','sailor','clerk','ranger','wizard'],

  places:   ['city','school','hospital','park','beach','mountain','river','forest','desert',
             'cave','lake','island','valley','cliff','tower','bridge','castle','temple',
             'church','farm','mine','port','yard','garden','plaza','alley','harbor'],

  nature:   ['tree','cloud','flower','grass','rock','storm','rain','snow','wind','fire',
             'ice','sand','mud','fog','leaf','bark','seed','pond','brook','dune',
             'coral','moss','fern','vine','thorn','petal','glacier','volcano','canyon','delta'],

  vehicles: ['car','bike','bus','train','plane','ship','truck','boat','rocket','cart',
             'sled','van','taxi','tram','jeep','canoe','barge','yacht','glider','scooter',
             'ferry','cable','metro','tractor','helicopter'],

  clothes:  ['shirt','pants','shoes','hat','jacket','dress','sock','scarf','coat','suit',
             'tie','belt','boot','vest','skirt','gown','robe','cap','jeans','sweater',
             'glove','apron','beret','shawl','tunic','cloak','blouse','shorts','uniform','sandal'],

  sports:   ['soccer','tennis','golf','boxing','rugby','hockey','swimming','cycling','skiing',
             'surfing','diving','rowing','climbing','archery','wrestling','bowling','fencing',
             'sailing','skating','volleyball','baseball','cricket','judo','triathlon'],

  body:     ['hand','foot','head','eye','nose','ear','mouth','arm','leg','heart',
             'back','neck','knee','hip','jaw','chin','lip','rib','heel','palm',
             'thumb','elbow','ankle','wrist','spine','skull','chest','belly','shoulder','temple'],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise(resolve => {
    const req = https.get(url, { headers: { 'User-Agent': 'wordwave-generator/1.0' } }, res => {
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => resolve({ status: res.statusCode, body: data }))
    })
    req.on('error', () => resolve(null))
    req.setTimeout(8000, () => { req.destroy(); resolve(null) })
  })
}

// Fetch English definition from dictionaryapi.dev
async function fetchEnDef(word) {
  const r = await httpsGet(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
  if (!r) return null
  try {
    const json = JSON.parse(r.body)
    if (!Array.isArray(json) || !json[0]) return null
    const entry   = json[0]
    const w       = entry.word?.toLowerCase().replace(/[^a-z]/g, '')
    const meaning = entry.meanings?.[0]
    const def     = meaning?.definitions?.[0]?.definition
    if (!w || !def) return null
    if (w.length < 3 || w.length > 9) return null
    if (w.includes(' ')) return null
    return { word: w, def: def.charAt(0).toUpperCase() + def.slice(1) }
  } catch {
    return null
  }
}

// Translate text using MyMemory free API (no key needed, ~5000 words/day)
async function translate(text, targetLang) {
  const encoded = encodeURIComponent(text)
  const r = await httpsGet(`https://api.mymemory.translated.net/get?q=${encoded}&langpair=en|${targetLang}`)
  if (!r || r.status !== 200) return null
  try {
    const json = JSON.parse(r.body)
    const t = json?.responseData?.translatedText
    if (!t || t === text || json?.responseStatus !== 200) return null
    return t.charAt(0).toUpperCase() + t.slice(1)
  } catch {
    return null
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const outDir = path.join(__dirname, 'data', 'categories')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  let totalDefs = 0

  for (const [category, words] of Object.entries(CATEGORIES)) {
    console.log(`\n📦  ${category.toUpperCase()} (${words.length} words)`)
    const defs = []

    for (const word of words) {
      process.stdout.write(`    ${word.padEnd(14)} `)

      const en = await fetchEnDef(word)
      if (!en) { console.log('❌  (skipped — no EN def)'); await sleep(700); continue }

      const definitions = { en: en.def }
      const words = { en: en.word }

      // Translate both the definition and the word to each target language
      for (const lang of TARGET_LANGS) {
        const translatedDef  = await translate(en.def,  lang)
        if (translatedDef)  definitions[lang] = translatedDef
        await sleep(300)

        const translatedWord = await translate(en.word, lang)
        // Accept only single-word translations (no spaces, reasonable length)
        if (translatedWord && !translatedWord.includes(' ') && translatedWord.length <= 20) {
          words[lang] = translatedWord.toLowerCase()
        }
        await sleep(300)
      }

      defs.push({ word: en.word, words, definitions })
      const langs = Object.keys(definitions).join(', ')
      const wordVariants = Object.entries(words).map(([l, w]) => `${l}:${w}`).join(' ')
      console.log(`✅  [${langs}] ${wordVariants} — ${en.def.substring(0, 40)}${en.def.length > 40 ? '…' : ''}`)
      await sleep(400)
    }

    const outPath = path.join(outDir, `${category}.json`)
    fs.writeFileSync(outPath, JSON.stringify(defs, null, 2))
    console.log(`    → saved ${defs.length} entries to data/categories/${category}.json`)
    totalDefs += defs.length
  }

  console.log(`\n🎉  Done! ${totalDefs} total entries across ${Object.keys(CATEGORIES).length} categories.\n`)
  console.log('Next steps:')
  console.log('  git add data/categories/*.json')
  console.log('  git commit -m "feat: add multilingual category definitions"')
  console.log('  vercel --prod\n')
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
