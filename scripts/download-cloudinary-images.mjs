/**
 * Cloudinary → proiect:
 * 1) Actualizează / creează `data/categories/images/<category>.json` — array `{ word, word_en, image }`.
 *    Implicit **fuzionează** cu fișierul existent: păstrează cuvintele care nu sunt în Cloudinary,
 *    adaugă cele noi, actualizează `image` (și `word_en` doar dacă lipsea). Categorie nouă → fișier nou.
 *    `--replace` rescrie doar din Cloudinary (șterge din JSON intrările care nu mai sunt în cont).
 * 2) Opțional: `--save-files` descarcă binarele în `public/images/cloudinary/...`.
 *
 * Mai multe fișiere JSON într-o rulare:
 *   - repetă `--prefix` sau env `CLOUDINARY_DOWNLOAD_PREFIXES=animals,word-wave/food,word-wave/nature`
 *   - sau `--discover word-wave` → pentru fiecare subfolder din Cloudinary scrie `<mapat>.json`
 *
 * `word_en`: păstrat din JSON existent la același `word`; altfel din context Cloudinary; altfel "".
 *
 * Mapare folder Cloudinary (ultimul segment din prefix, ex. `word-wave/food`) → `data/categories/images/<cheie>.json`
 * (vezi `CLOUDINARY_IMAGE_FOLDER_TO_JSON_KEY`). Ex.: `food` → `foods.json`, `nature` → `natura.json`.
 * Cu un singur prefix poți forța numele: `--json foods`.
 *
 * Env: CLOUDINARY_*; `CLOUDINARY_DOWNLOAD_PREFIXES`; `CLOUDINARY_DOWNLOAD_DISCOVER`; `CLOUDINARY_DOWNLOAD_AUTO_DISCOVER=0` dezactivează auto-descoperirea.
 *
 * Implicit (fără `--prefix` / env de prefix): se listează subfolderele din `word-wave` și se creează/actualizează
 * câte un JSON per categorie găsită în Cloudinary (inclusiv `[]` dacă folderul e gol).
 *
 * Usage:
 *   node scripts/download-cloudinary-images.mjs
 *   node scripts/download-cloudinary-images.mjs --prefix animals --prefix word-wave/food
 *   node scripts/download-cloudinary-images.mjs --discover word-wave
 *   CLOUDINARY_DOWNLOAD_PREFIXES=animals,word-wave/nature node scripts/download-cloudinary-images.mjs
 *   node scripts/download-cloudinary-images.mjs --replace   # doar intrări din Cloudinary
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import cloudinary from "cloudinary"
import {
  loadEnvLocal,
  listAllImageResourcesDetailed,
  apiSubFolders,
  folderNamesFromSubFoldersResult,
} from "./lib/cloudinary-helpers.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")

/**
 * Folder imediat sub `word-wave/` în Cloudinary (sau ultimul segment din prefix) → cheie fișier
 * `data/categories/images/<cheie>.json`, aliniată cu CategoryKey din app.
 *
 * word-wave/animals | animals    → animals.json
 * word-wave/food    | food       → foods.json
 * word-wave/architecture        → architecture.json
 * word-wave/nature              → natura.json  (folder EN „nature”)
 * word-wave/technology        → technology.json
 */
const DEFAULT_AUTO_DISCOVER_ROOT = "word-wave"

const CLOUDINARY_IMAGE_FOLDER_TO_JSON_KEY = {
  animals: "animals",
  animal: "animals",
  food: "foods",
  foods: "foods",
  hobby: "hobbies",
  hobbies: "hobbies",
  architecture: "architecture",
  nature: "natura",
  technology: "technology",
}

const IMAGES_DATA_DIR = path.join(ROOT, "data", "categories", "images")

function loadRootEnv() {
  const quiet = { quiet: true }
  dotenv.config({ path: path.join(ROOT, ".env"), ...quiet })
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: true, ...quiet })
  loadEnvLocal(ROOT)
}

function configureCloudinary() {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.v2.config(true)
    return
  }
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    cloudinary.v2.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    })
    return
  }
  console.error(
    "Missing Cloudinary config: CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET"
  )
  process.exit(1)
}

function parseArgs() {
  const argv = process.argv.slice(2)
  const prefixList = []
  let discoverRoot = ""
  let outDir = process.env.CLOUDINARY_DOWNLOAD_OUT?.trim() || path.join("public", "images", "cloudinary")
  let jsonBasename = ""
  let dryRun = false
  let saveFiles = false
  let writeJson = true
  let replaceJson =
    /^(1|true|yes)$/i.test(String(process.env.CLOUDINARY_DOWNLOAD_REPLACE || "").trim())
  let concurrency = Math.max(1, Number(process.env.CLOUDINARY_DOWNLOAD_CONCURRENCY || "5"))

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--dry-run") dryRun = true
    else if (a === "--save-files") saveFiles = true
    else if (a === "--no-json") writeJson = false
    else if (a === "--replace") replaceJson = true
    else if (a === "--prefix" || a === "-p") {
      const p = String(argv[++i] || "").replace(/\/+$/, "")
      if (p) prefixList.push(p)
    } else if (a.startsWith("--prefix=")) {
      const p = a.split("=")[1].replace(/\/+$/, "")
      if (p) prefixList.push(p)
    } else if (a === "--discover" || a === "-d") {
      discoverRoot = String(argv[++i] || "").replace(/\/+$/, "")
    } else if (a.startsWith("--discover=")) {
      discoverRoot = a.split("=")[1].replace(/\/+$/, "")
    } else if (a === "--json" || a === "-j") jsonBasename = String(argv[++i] || "").replace(/\.json$/i, "")
    else if (a.startsWith("--json=")) jsonBasename = a.split("=")[1].replace(/\.json$/i, "")
    else if (a === "--out" || a === "-o") outDir = String(argv[++i] || outDir)
    else if (a.startsWith("--out=")) outDir = a.split("=")[1]
    else if (a === "--concurrency" || a === "-c") concurrency = Math.max(1, Number(argv[++i] || concurrency))
    else if (a.startsWith("--concurrency=")) concurrency = Math.max(1, Number(a.split("=")[1]))
  }

  if (!discoverRoot) discoverRoot = process.env.CLOUDINARY_DOWNLOAD_DISCOVER?.trim().replace(/\/+$/, "") || ""

  let prefixes = [...prefixList]
  if (prefixes.length === 0 && process.env.CLOUDINARY_DOWNLOAD_PREFIXES?.trim()) {
    prefixes = process.env.CLOUDINARY_DOWNLOAD_PREFIXES.split(/[,;]+/).map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean)
  }

  /** Fără prefixe explicite: încearcă word-wave/*; dezactivare cu CLOUDINARY_DOWNLOAD_AUTO_DISCOVER=0 */
  let autoDiscoverDefault = false
  if (prefixes.length === 0 && !discoverRoot) {
    const explicitSingle = process.env.CLOUDINARY_DOWNLOAD_PREFIX?.trim()
    const autoOff = /^(0|false|no)$/i.test(String(process.env.CLOUDINARY_DOWNLOAD_AUTO_DISCOVER ?? "").trim())
    if (explicitSingle) {
      prefixes = [explicitSingle.replace(/\/+$/, "")]
    } else if (!autoOff) {
      autoDiscoverDefault = true
    } else {
      const one = process.env.CLOUDINARY_ANIMALS_FOLDER?.trim() || "animals"
      prefixes = [one.replace(/\/+$/, "")]
    }
  }

  return {
    prefixes,
    discoverRoot,
    autoDiscoverDefault,
    outDir: path.isAbsolute(outDir) ? outDir : path.join(ROOT, outDir),
    jsonBasename,
    dryRun,
    saveFiles,
    writeJson,
    replaceJson,
    concurrency,
  }
}

function lastSegment(prefix) {
  const parts = prefix.split("/").filter(Boolean)
  return parts.length ? parts[parts.length - 1] : prefix
}

function resolveJsonBasename(prefix, explicit) {
  if (explicit) return explicit
  const seg = lastSegment(prefix)
  return CLOUDINARY_IMAGE_FOLDER_TO_JSON_KEY[seg] || seg
}

function wordFromPublicId(publicId, prefix) {
  const pre = prefix.replace(/\/$/, "")
  if (!publicId.startsWith(pre + "/") && publicId !== pre) return null
  const rest = publicId.slice(pre.length).replace(/^\//, "")
  const parts = rest.split("/").filter(Boolean)
  return parts.length ? parts[parts.length - 1] : null
}

function extFromUrl(url) {
  try {
    const u = new URL(url)
    const m = u.pathname.match(/\.([a-z0-9]+)$/i)
    return m ? "." + m[1].toLowerCase() : ".jpg"
  } catch {
    return ".jpg"
  }
}

function targetPath(outDir, publicId, imageUrl) {
  const ext = extFromUrl(imageUrl)
  const parts = String(publicId).split("/").filter(Boolean)
  if (parts.length === 0) return null
  const base = parts.pop()
  const subDir = path.join(outDir, ...parts)
  return path.join(subDir, base + ext)
}

function loadExistingEntries(jsonPath) {
  if (!fs.existsSync(jsonPath)) return []
  const raw = fs.readFileSync(jsonPath, "utf8").trim()
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function normalizeImageEntry(e) {
  const w = typeof e.word === "string" ? e.word.trim() : ""
  if (!w) return null
  return {
    word: w,
    word_en: typeof e.word_en === "string" ? e.word_en.trim() : "",
    image: typeof e.image === "string" ? e.image.trim() : "",
  }
}

/** Ultimul segment din path-ul URL-ului imaginii (fără extensie), pentru potrivire la duplicate cu același word_en. */
function slugFromImageUrl(url) {
  try {
    const last = url.split("/").pop() || ""
    return decodeURIComponent(last.replace(/\.[^.]+$/i, "")).toLowerCase()
  } catch {
    return ""
  }
}

/** Cheie engleză pentru potrivire cu contextul Cloudinary: word_en dacă există, altfel word. */
function englishMatchKey(n) {
  const en = n.word_en?.trim()
  if (en) return en.toLowerCase()
  return n.word.toLowerCase()
}

function findExistingForCloud(normalizedExisting, cloudEnLower, cloudSlugLower) {
  const bySlugGlobal = normalizedExisting.filter((n) => slugFromImageUrl(n.image) === cloudSlugLower)
  if (bySlugGlobal.length === 1) return bySlugGlobal[0]

  const sameEn = normalizedExisting.filter((n) => englishMatchKey(n) === cloudEnLower)
  if (sameEn.length === 0) return bySlugGlobal[0]
  if (sameEn.length === 1) return sameEn[0]
  const bySlug = sameEn.filter((n) => slugFromImageUrl(n.image) === cloudSlugLower)
  if (bySlug.length === 1) return bySlug[0]
  return sameEn[0]
}

/**
 * @returns {{ rows: { word: string, word_en: string, image: string }[], stats: { added: number, updated: number, keptLocal: number } }}
 */
function buildRowsFromCloudinary(existingList, detailed, prefix, replaceJson) {
  const normalized = existingList.map(normalizeImageEntry).filter(Boolean)

  const cloudRows = []
  for (const r of detailed) {
    const fromId = wordFromPublicId(r.public_id, prefix)
    const ctxWord = (r.context.word || "").trim()
    const enWord = ctxWord || fromId
    if (!enWord) {
      console.warn(`   Skip (no word): ${r.public_id}`)
      continue
    }
    const enLower = enWord.toLowerCase()
    const slugLower = (fromId || enWord).toLowerCase()
    const prev = findExistingForCloud(normalized, enLower, slugLower)
    const ctxEn = (r.context.word_en || r.context.wordEn || "").trim()
    const word_en = (prev?.word_en && prev.word_en.trim()) || ctxEn || enWord
    const word = (prev?.word && prev.word.trim()) || enWord

    cloudRows.push({
      word,
      word_en,
      image: r.secure_url,
      _enKey: enLower,
      _slug: slugLower,
    })
  }

  const added = cloudRows.filter((row) => !findExistingForCloud(normalized, row._enKey, row._slug)).length
  const updated = cloudRows.length - added

  if (replaceJson) {
    const byKey = new Map()
    for (const row of cloudRows) {
      byKey.set(`${row._enKey}|${row._slug}`, { word: row.word, word_en: row.word_en, image: row.image })
    }
    const fromCloud = [...byKey.values()].sort((a, b) =>
      a.word.localeCompare(b.word, undefined, { sensitivity: "base" })
    )
    return {
      rows: fromCloud,
      stats: { added: fromCloud.length, updated: 0, keptLocal: 0 },
    }
  }

  const merged = new Map()
  for (const n of normalized) {
    const k = `${englishMatchKey(n)}|${slugFromImageUrl(n.image)}`
    merged.set(k, { word: n.word, word_en: n.word_en, image: n.image })
  }

  for (const row of cloudRows) {
    const prev = findExistingForCloud(normalized, row._enKey, row._slug)
    const key = prev
      ? `${englishMatchKey(prev)}|${slugFromImageUrl(prev.image)}`
      : `${row._enKey}|${row._slug}`
    merged.set(key, { word: row.word, word_en: row.word_en, image: row.image })
  }

  const matchedLocalKeys = new Set()
  for (const row of cloudRows) {
    const prev = findExistingForCloud(normalized, row._enKey, row._slug)
    if (prev) matchedLocalKeys.add(`${englishMatchKey(prev)}|${slugFromImageUrl(prev.image)}`)
  }
  const keptLocal = normalized.filter(
    (n) => !matchedLocalKeys.has(`${englishMatchKey(n)}|${slugFromImageUrl(n.image)}`)
  ).length

  const rows = [...merged.values()].sort((a, b) =>
    a.word.localeCompare(b.word, undefined, { sensitivity: "base" })
  )

  return { rows, stats: { added, updated, keptLocal } }
}

async function downloadOne(secureUrl, destPath) {
  const res = await fetch(secureUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${secureUrl.slice(0, 80)}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const dir = path.dirname(destPath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(destPath, buf)
}

async function runPool(items, concurrency, worker) {
  const results = []
  let i = 0
  async function run() {
    while (i < items.length) {
      const idx = i++
      const item = items[idx]
      try {
        results[idx] = await worker(item, idx)
      } catch (e) {
        results[idx] = { error: e }
      }
    }
  }
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => run())
  await Promise.all(runners)
  return results
}

async function syncOnePrefix({
  prefix,
  jsonArg,
  outDir,
  dryRun,
  saveFiles,
  writeJson,
  replaceJson,
  concurrency,
  ensureCategoryJson,
}) {
  const jsonBasename = resolveJsonBasename(prefix, jsonArg)
  const jsonPath = path.join(IMAGES_DATA_DIR, `${jsonBasename}.json`)

  console.log(`\n── Prefix: ${prefix}/`)
  if (writeJson) console.log(`   JSON: ${jsonPath}${replaceJson ? " (replace)" : " (merge)"}`)
  if (saveFiles) console.log(`   Files → ${outDir}${dryRun ? " (dry-run)" : ""}`)

  const detailed = await listAllImageResourcesDetailed(prefix)
  const existing = writeJson ? loadExistingEntries(jsonPath) : []
  const fileExists = fs.existsSync(jsonPath)

  const { rows, stats } = buildRowsFromCloudinary(existing, detailed, prefix, replaceJson)
  const noCloudImages = detailed.length === 0

  if (dryRun) {
    if (writeJson) {
      if (noCloudImages && !ensureCategoryJson && !fileExists) {
        console.log("   (dry-run: fără imagini Cloudinary — nu s-ar crea fișier)")
      } else {
        console.log(
          `   Would write ${rows.length} entries → ${path.basename(jsonPath)} (+${stats.added} noi, ~${stats.updated} din Cloudinary${!replaceJson ? `, ${stats.keptLocal} doar locale` : ""})`
        )
        rows.slice(0, 3).forEach((e) => console.log(`     • ${e.word}`))
        if (rows.length > 3) console.log(`     … +${rows.length - 3}`)
      }
    }
    if (saveFiles && detailed.length > 0) {
      for (const r of detailed) {
        const dest = targetPath(outDir, r.public_id, r.secure_url)
        console.log(`   [file] ${r.public_id} → ${dest}`)
      }
    }
    return { skipped: false, jsonPath, count: rows.length, dryRun: true }
  }

  if (writeJson) {
    const shouldWrite =
      ensureCategoryJson || detailed.length > 0 || (fileExists && noCloudImages && rows.length > 0)
    if (!shouldWrite && noCloudImages && !fileExists) {
      console.log("   (fără imagini Cloudinary — niciun fișier JSON)")
    } else if (shouldWrite) {
      fs.mkdirSync(IMAGES_DATA_DIR, { recursive: true })
      fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2) + "\n", "utf8")
      if (noCloudImages && rows.length === 0) {
        console.log(`   Creat / actualizat gol ${jsonPath} []`)
      } else {
        console.log(
          `   Wrote ${jsonPath} (${rows.length} intrări: +${stats.added} noi, ${stats.updated} din Cloudinary${!replaceJson ? `, ${stats.keptLocal} doar locale` : ""})`
        )
      }
    } else if (noCloudImages && fileExists) {
      console.log("   (fără imagini Cloudinary — JSON neschimbat, intrări locale păstrate)")
    }
  }

  if (saveFiles) {
    const jobs = detailed.map((r) => ({
      publicId: r.public_id,
      secureUrl: r.secure_url,
      dest: targetPath(outDir, r.public_id, r.secure_url),
    }))

    const results = await runPool(jobs, concurrency, async (j) => {
      await downloadOne(j.secureUrl, j.dest)
      console.log(`   OK file ${j.publicId}`)
      return { ok: true }
    })

    let ok = 0
    let fail = 0
    for (let i = 0; i < results.length; i++) {
      if (results[i]?.error) {
        fail++
        console.error(`   FAIL ${jobs[i].publicId}:`, results[i].error.message || results[i].error)
      } else ok++
    }
    console.log(`   Files: ${ok} ok, ${fail} failed`)
    if (fail > 0) process.exitCode = 1
  }

  return { skipped: false, jsonPath, count: rows.length }
}

async function main() {
  loadRootEnv()
  let {
    prefixes,
    discoverRoot,
    autoDiscoverDefault,
    outDir,
    jsonBasename: jsonArg,
    dryRun,
    saveFiles,
    writeJson,
    replaceJson,
    concurrency,
  } = parseArgs()

  if (!writeJson && !saveFiles) {
    console.error("Nothing to do: enable JSON (default) or pass --save-files")
    process.exit(1)
  }

  configureCloudinary()

  let ensureCategoryJson = false

  if (discoverRoot) {
    try {
      const res = await apiSubFolders(discoverRoot)
      const names = folderNamesFromSubFoldersResult(res)
      prefixes = names.map((n) => `${discoverRoot}/${n}`.replace(/\/+/g, "/"))
      ensureCategoryJson = true
      console.log(`Discover: ${discoverRoot}/ → ${prefixes.length} subfolder(s): ${prefixes.join(", ")}`)
    } catch (e) {
      console.error(`--discover failed for "${discoverRoot}":`, e.message || e)
      process.exit(1)
    }
  } else if (autoDiscoverDefault) {
    const root =
      process.env.CLOUDINARY_DOWNLOAD_AUTO_DISCOVER_ROOT?.trim().replace(/\/+$/, "") ||
      DEFAULT_AUTO_DISCOVER_ROOT
    try {
      const res = await apiSubFolders(root)
      const names = folderNamesFromSubFoldersResult(res)
      if (names.length > 0) {
        prefixes = names.map((n) => `${root}/${n}`.replace(/\/+/g, "/"))
        ensureCategoryJson = true
        console.log(`Auto-discover: ${root}/ → ${prefixes.length} categorii: ${prefixes.join(", ")}`)
      } else {
        const fb = process.env.CLOUDINARY_ANIMALS_FOLDER?.trim() || "animals"
        prefixes = [fb.replace(/\/+$/, "")]
        console.warn(`Niciun subfolder sub "${root}", folosesc prefix: ${fb}`)
      }
    } catch (e) {
      const fb = process.env.CLOUDINARY_ANIMALS_FOLDER?.trim() || "animals"
      prefixes = [fb.replace(/\/+$/, "")]
      console.warn(`Auto-discover "${root}" a eșuat (${e.message}), folosesc prefix: ${fb}`)
    }
  }

  if (prefixes.length === 0) {
    console.error("No prefixes to process (use --prefix, CLOUDINARY_DOWNLOAD_PREFIXES, or --discover).")
    process.exit(1)
  }

  if (jsonArg && prefixes.length > 1) {
    console.warn("Warning: --json applies only with a single prefix; ignored for batch run.\n")
  }

  console.log(`Concurrency: ${concurrency}`)
  console.log(`Processing ${prefixes.length} prefix(es)`)

  for (const prefix of prefixes) {
    const singleJson = prefixes.length === 1 ? jsonArg : ""
    await syncOnePrefix({
      prefix,
      jsonArg: singleJson,
      outDir,
      dryRun,
      saveFiles,
      writeJson,
      replaceJson,
      concurrency,
      ensureCategoryJson,
    })
  }

  console.log("\nDone.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
