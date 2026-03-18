#!/usr/bin/env node
/**
 * add-translations.js
 *
 * Reads existing public/*.json files and adds missing language translations
 * using Google Translate (no API key needed).
 *
 * Usage:
 *   node add-translations.js ro          (Romanian only)
 *   node add-translations.js ro es fr de (multiple languages)
 *   node add-translations.js             (all: ro, es, fr, de)
 *
 * After it finishes:
 *   git add public/*.json
 *   git commit -m "feat: add translations"
 *   vercel --prod
 */

const fs    = require('fs')
const https = require('https')
const path  = require('path')

const ALL_LANGS    = ['ro', 'es', 'fr', 'de']
const TARGET_LANGS = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ALL_LANGS
const CATEGORIES   = ['animals','food','objects','people','places','nature','vehicles','clothes','sports','body']

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms))

function httpsGet(url) {
  return new Promise(resolve => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; wordwave/1.0)' }
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', () => resolve(null))
    req.setTimeout(10000, () => { req.destroy(); resolve(null) })
  })
}

// Truncate to first sentence (max 130 chars) so the GET URL stays short
function firstSentence(text) {
  const m = text.match(/^[^.!?;:]{5,130}/)
  return m ? m[0].trim() : text.substring(0, 130)
}

// Google Translate unofficial endpoint — no API key, no daily quota
// allowSame=true: accept translation even if identical to source (e.g. "cobra"→"cobră")
async function translateGoogle(text, targetLang, allowSame = false) {
  const q       = firstSentence(text)
  const encoded = encodeURIComponent(q)
  const url     = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encoded}`
  const r       = await httpsGet(url)
  if (!r || r.status !== 200) return null
  try {
    const json     = JSON.parse(r.body)
    const segments = (json?.[0] ?? []).map(s => s?.[0]).filter(Boolean)
    const t        = segments.join('').trim()
    if (!t) return null
    if (!allowSame && t.toLowerCase() === q.toLowerCase()) return null
    return t.charAt(0).toUpperCase() + t.slice(1)
  } catch {
    return null
  }
}

async function translate(text, targetLang) {
  return translateGoogle(text, targetLang, false)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  const publicDir = path.join(__dirname, 'public')
  console.log(`\n🌍  Adding translations for: [${TARGET_LANGS.join(', ')}]  (Google Translate)\n`)

  let totalAdded = 0

  for (const category of CATEGORIES) {
    const filePath = path.join(publicDir, `${category}.json`)
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️   ${category}.json not found — skipping`)
      continue
    }

    const entries = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    console.log(`\n📦  ${category.toUpperCase()} (${entries.length} entries)`)
    let categoryAdded = 0

    for (let i = 0; i < entries.length; i++) {
      const entry  = entries[i]
      const enDef  = entry.definitions?.en || entry.definition
      const enWord = entry.words?.en        || entry.word

      if (!enDef || !enWord) continue

      if (!entry.definitions) entry.definitions = { en: enDef }
      if (!entry.words)       entry.words       = { en: enWord }

      for (const lang of TARGET_LANGS) {
        const needsDef  = !entry.definitions[lang]
        const needsWord = !entry.words[lang]
        if (!needsDef && !needsWord) continue

        process.stdout.write(`    [${String(i+1).padStart(2)}/${entries.length}] ${enWord.padEnd(14)} ${lang}  `)

        if (needsDef) {
          const tr = await translate(enDef, lang)
          if (tr) {
            entry.definitions[lang] = tr
            categoryAdded++
            process.stdout.write(`def:"${tr.substring(0,35)}…"  `)
          } else {
            process.stdout.write(`def:✗  `)
          }
          await sleep(250)
        }

        if (needsWord) {
          const tr = await translateGoogle(enWord, lang, true)
          if (tr) {
            // If multi-word, keep only the first word
            const w = tr.split(/\s+/)[0].toLowerCase().replace(/[^a-záéíóúăâîșțàèìòùäöüñç]/gi, '')
            if (w.length >= 2 && w.length <= 20) {
              entry.words[lang] = w
              categoryAdded++
              process.stdout.write(`word:"${w}"`)
            } else {
              // Fall back to the English word if translation is unusable
              entry.words[lang] = enWord
              process.stdout.write(`word:"${enWord}"(en)`)
            }
          } else {
            entry.words[lang] = enWord
            process.stdout.write(`word:"${enWord}"(en)`)
          }
          await sleep(250)
        }

        console.log()
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2))
    console.log(`    → saved ${category}.json  (+${categoryAdded} translations)`)
    totalAdded += categoryAdded
  }

  console.log(`\n✅  Done! ${totalAdded} translations added.\n`)
  console.log('Next steps:')
  console.log('  git add public/*.json')
  console.log('  git commit -m "feat: add Romanian translations"')
  console.log('  vercel --prod\n')
}

run().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
