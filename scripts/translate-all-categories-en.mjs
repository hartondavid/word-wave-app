/**
 * Adds word_en + definition_en to every entry in data/categories/definitions/*.json
 * and data/categories/images/*.json
 *
 * 1) OPENAI_API_KEY — one batch per file (recommended).
 * 2) Otherwise MyMemory (ro→en), per entry; optional MYMEMORY_EMAIL for higher limits.
 *
 * Usage:
 *   node scripts/translate-all-categories-en.mjs
 *   node scripts/translate-all-categories-en.mjs --force   # overwrite existing EN fields
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const CAT_DEF = path.join(ROOT, "data", "categories", "definitions")
const CAT_IMG = path.join(ROOT, "data", "categories", "images")

function listCategoryJsonPaths() {
  const out = []
  for (const dir of [CAT_DEF, CAT_IMG]) {
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".json")) continue
      out.push(path.join(dir, f))
    }
  }
  return out.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))
}

const FORCE = process.argv.includes("--force")
const DELAY_MS = Number(process.env.TRANSLATE_DELAY_MS || "320")

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local")
  if (!fs.existsSync(p)) return
  const text = fs.readFileSync(p, "utf8")
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function myMemoryTranslate(text, email) {
  const q = String(text).slice(0, 480)
  const params = new URLSearchParams()
  params.set("q", q)
  params.set("langpair", "ro|en")
  if (email) params.set("de", email)

  const url = "https://api.mymemory.translated.net/get?" + params.toString()
  let lastErr
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url)
    const j = await res.json()
    if (j.quotaFinished) {
      throw new Error("MyMemory daily quota finished. Set MYMEMORY_EMAIL or try tomorrow, or use OPENAI_API_KEY.")
    }
    if (j.responseStatus === 200 && j.responseData?.translatedText) {
      const out = String(j.responseData.translatedText).trim()
      if (/MYMEMORY WARNING/i.test(out)) {
        throw new Error("MyMemory free quota exhausted. Add OPENAI_API_KEY to .env.local or wait and retry with MYMEMORY_EMAIL.")
      }
      return out
    }
    lastErr = j
    await sleep(1500 * (attempt + 1))
  }
  throw new Error("MyMemory failed: " + JSON.stringify(lastErr).slice(0, 300))
}

async function openaiTranslateFile(entries, apiKey) {
  const input = entries.map((e) => ({ word: e.word, definition: e.definition }))
  const body = {
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You translate Romanian word+definition pairs into English for a word-matching game. " +
          "Return strict JSON only.",
      },
      {
        role: "user",
        content:
          `Translate each item to English. Output JSON: {"items":[...]} with exactly ${input.length} objects.\n` +
          `Each object: {"word_en":"...","definition_en":"..."} in the SAME order as input.\n` +
          `Rules:\n` +
          `- word_en: natural English headword; use lowercase for common nouns; keep proper names (people, places) in normal English form (e.g. Socrates, Jesus).\n` +
          `- definition_en: one short, clear gloss.\n` +
          `Input:\n` +
          JSON.stringify(input),
      },
    ],
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const raw = await res.text()
  if (!res.ok) throw new Error("OpenAI HTTP " + res.status + ": " + raw.slice(0, 500))

  const data = JSON.parse(raw)
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("OpenAI: no content")
  const parsed = JSON.parse(content)
  const items = parsed.items
  if (!Array.isArray(items) || items.length !== entries.length) {
    throw new Error("OpenAI: expected items length " + entries.length + ", got " + (items?.length ?? "null"))
  }
  return items
}

function needsTranslate(entry) {
  if (!entry || typeof entry !== "object") return false
  if (!String(entry.word || "").trim() || !String(entry.definition || "").trim()) return false
  if (FORCE) return true
  return !String(entry.word_en || "").trim() || !String(entry.definition_en || "").trim()
}

async function main() {
  loadEnvLocal()
  const openaiKey = process.env.OPENAI_API_KEY
  const mmEmail = process.env.MYMEMORY_EMAIL || ""

  const files = listCategoryJsonPaths()

  for (const fp of files) {
    const file = path.basename(fp)
    let data
    try {
      data = JSON.parse(fs.readFileSync(fp, "utf8"))
    } catch {
      console.warn("Skip (invalid JSON):", file)
      continue
    }
    if (!Array.isArray(data)) {
      console.warn("Skip (not array):", file)
      continue
    }

    const idxNeed = data.map((e, i) => (needsTranslate(e) ? i : -1)).filter((i) => i >= 0)
    if (idxNeed.length === 0) {
      console.log("OK (complete):", file)
      continue
    }

    if (openaiKey) {
      console.log("OpenAI batch:", file, "(" + data.length + " entries)")
      const items = await openaiTranslateFile(data, openaiKey)
      for (let i = 0; i < data.length; i++) {
        const w = String(items[i].word_en || "").trim()
        const d = String(items[i].definition_en || "").trim()
        if (!w || !d) throw new Error("OpenAI: empty translation at index " + i)
        data[i] = { ...data[i], word_en: w, definition_en: d }
      }
      fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8")
      console.log("Wrote:", file)
      await sleep(400)
      continue
    }

    console.log("MyMemory:", file, "—", idxNeed.length, "entries need EN")
    for (const i of idxNeed) {
      const e = data[i]
      try {
        if (FORCE || !String(e.word_en || "").trim()) {
          const tw = await myMemoryTranslate(e.word, mmEmail)
          e.word_en = tw.toLowerCase()
          await sleep(DELAY_MS)
        }
        if (FORCE || !String(e.definition_en || "").trim()) {
          e.definition_en = await myMemoryTranslate(e.definition, mmEmail)
          await sleep(DELAY_MS)
        }
        data[i] = e
        fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8")
      } catch (err) {
        fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8")
        console.error("Stopped at", file, "index", i, err.message || err)
        process.exit(1)
      }
    }
    fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8")
    console.log("Wrote:", file)
  }

  console.log("Done.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
