#!/usr/bin/env node
/**
 * generate-all-categories.js
 *
 * Run ONCE locally to populate public/*.json with word definitions.
 * No extra dependencies — uses Node built-in https module.
 *
 * Usage:
 *   node generate-all-categories.js
 *
 * After it finishes:
 *   git add public/*.json
 *   git commit -m "Add category definitions"
 *   vercel --prod
 */

const fs   = require('fs')
const https = require('https')
const path  = require('path')

// ── Word lists per category ───────────────────────────────────────────────────
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

function fetchDef(word) {
  return new Promise(resolve => {
    const req = https.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { headers: { 'User-Agent': 'wordwave-generator/1.0' } },
      res => {
        let data = ''
        res.on('data', c => { data += c })
        res.on('end', () => {
          try {
            const json = JSON.parse(data)
            if (!Array.isArray(json) || !json[0]) return resolve(null)

            const entry   = json[0]
            const w       = entry.word?.toLowerCase().replace(/[^a-z]/g, '')
            const meaning = entry.meanings?.[0]
            const def     = meaning?.definitions?.[0]?.definition

            if (!w || !def) return resolve(null)
            if (w.length < 3 || w.length > 9) return resolve(null)
            if (w.includes(' ')) return resolve(null)

            resolve({ word: w, definition: def.charAt(0).toUpperCase() + def.slice(1) })
          } catch {
            resolve(null)
          }
        })
      }
    )
    req.on('error', () => resolve(null))
    req.setTimeout(6000, () => { req.destroy(); resolve(null) })
  })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const publicDir = path.join(__dirname, 'public')
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir)

  let totalDefs = 0

  for (const [category, words] of Object.entries(CATEGORIES)) {
    console.log(`\n📦  ${category.toUpperCase()} (${words.length} words)`)
    const defs = []

    for (const word of words) {
      process.stdout.write(`    ${word.padEnd(14)} `)
      const result = await fetchDef(word)
      if (result) {
        defs.push(result)
        console.log(`✅  ${result.definition.substring(0, 60)}${result.definition.length > 60 ? '…' : ''}`)
      } else {
        console.log('❌  (skipped)')
      }
      await sleep(700) // respect rate limit
    }

    const outPath = path.join(publicDir, `${category}.json`)
    fs.writeFileSync(outPath, JSON.stringify(defs, null, 2))
    console.log(`    → saved ${defs.length} definitions to public/${category}.json`)
    totalDefs += defs.length
  }

  console.log(`\n🎉  Done! ${totalDefs} total definitions across ${Object.keys(CATEGORIES).length} categories.\n`)
  console.log('Next steps:')
  console.log('  git add public/*.json')
  console.log('  git commit -m "feat: add category word definitions"')
  console.log('  vercel --prod\n')
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
