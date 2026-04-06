/**
 * Pexels → Cloudinary: searches one landscape image per English word and uploads by URL.
 * Folder layout: word-wave/<category>/<slug>.
 *
 * Env (see also .env.local via repo helper):
 *   PEXELS_API_KEY
 *   Either CLOUDINARY_URL  OR  CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET
 *
 * Usage:
 *   node scripts/word-wave-pexels/import.mjs
 *   IMAGES_PER_CATEGORY=30 CONCURRENT_UPLOADS=5 node scripts/word-wave-pexels/import.mjs
 *   (fără IMAGES_PER_CATEGORY: se procesează toate cuvintele din fiecare categorie)
 *
 * Pentru fiecare cuvânt, dacă există deja în Cloudinary `word-wave/<category>/<slug>` (același slug
 * ca la upload), se sare peste Pexels și upload (re-rulări rapide).
 */
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import axios from "axios"
import chalk from "chalk"
import cliProgress from "cli-progress"
import cloudinary from "cloudinary"
import { categories } from "./categories.mjs"
import { loadEnvLocal, listAllResourcesByPrefix } from "../lib/cloudinary-helpers.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..", "..")

const PEXELS_BASE_URL = "https://api.pexels.com/v1"
/** Dacă lipsește env-ul: toate cuvintele din categorie (nu doar primele N). */
const IMAGES_PER_CATEGORY_RAW = process.env.IMAGES_PER_CATEGORY?.trim()
const IMAGES_PER_CATEGORY_LIMIT = (() => {
  if (IMAGES_PER_CATEGORY_RAW === undefined || IMAGES_PER_CATEGORY_RAW === "") return Infinity
  const n = Number(IMAGES_PER_CATEGORY_RAW)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : Infinity
})()
const CONCURRENT_UPLOADS = Number(process.env.CONCURRENT_UPLOADS || "3")

function wordsForCategory(categoryKey) {
  const all = categories[categoryKey]
  if (!Number.isFinite(IMAGES_PER_CATEGORY_LIMIT)) return all
  return all.slice(0, IMAGES_PER_CATEGORY_LIMIT)
}

function slugFromWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image"
}

function cloudinaryPublicId(word, category) {
  return `word-wave/${category}/${slugFromWord(word)}`.replace(/\/+/g, "/")
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
    chalk.red(
      "Missing Cloudinary config: set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET"
    )
  )
  process.exit(1)
}

async function fetchPexelsImage(word) {
  try {
    const response = await axios.get(`${PEXELS_BASE_URL}/search`, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      params: {
        query: word,
        per_page: 1,
        orientation: "landscape",
      },
    })

    const photos = response.data.photos
    if (!photos || photos.length === 0) return null

    const photo = photos[0]
    return photo.src.large2x || photo.src.large || photo.src.original
  } catch (err) {
    if (err.response?.status === 429) {
      await sleep(10_000)
      return fetchPexelsImage(word)
    }
    console.error(chalk.red(`  ✗ Pexels error pentru "${word}": ${err.message}`))
    return null
  }
}

async function uploadToCloudinary(imageUrl, word, category) {
  const slug = slugFromWord(word)
  const folder = `word-wave/${category}`

  const result = await cloudinary.v2.uploader.upload(imageUrl, {
    public_id: slug,
    folder,
    overwrite: true,
    resource_type: "image",
    tags: [category, "word-wave", slug],
    context: { word: String(word), category: String(category) },
  })

  return result.secure_url
}

async function runInBatches(tasks, size) {
  const results = []
  for (let i = 0; i < tasks.length; i += size) {
    const batch = tasks.slice(i, i + size).map((fn) => fn())
    const batchResults = await Promise.allSettled(batch)
    results.push(...batchResults)
  }
  return results
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadRootEnv() {
  const quiet = { quiet: true }
  dotenv.config({ path: path.join(ROOT, ".env"), ...quiet })
  dotenv.config({ path: path.join(ROOT, ".env.local"), override: true, ...quiet })
  loadEnvLocal(ROOT)
}

async function main() {
  loadRootEnv()

  if (!process.env.PEXELS_API_KEY?.trim()) {
    console.error(
      chalk.red(
        "\n✗ Lipsește PEXELS_API_KEY. Adaugă în `.env` sau `.env.local` la rădăcina proiectului:\n" +
          "  PEXELS_API_KEY=your_key  (https://www.pexels.com/api/)"
      )
    )
    process.exit(1)
  }

  configureCloudinary()

  const categoryNames = Object.keys(categories)
  const totalImages = categoryNames.reduce((sum, c) => sum + wordsForCategory(c).length, 0)
  const limitLabel = Number.isFinite(IMAGES_PER_CATEGORY_LIMIT)
    ? `${IMAGES_PER_CATEGORY_LIMIT} max / categorie`
    : "toate cuvintele / categorie"

  console.log(chalk.bold.cyan("\n╔══════════════════════════════════════╗"))
  console.log(chalk.bold.cyan("║   Pexels → Cloudinary (word-wave)    ║"))
  console.log(chalk.bold.cyan("╚══════════════════════════════════════╝\n"))
  console.log(chalk.white(`  Categorii : ${categoryNames.join(", ")}`))
  console.log(chalk.white(`  Imagini   : ${limitLabel}  (${totalImages} sloturi)`))
  console.log(chalk.white(`  Folder    : word-wave/<category>\n`))

  const stats = { success: 0, skipped: 0, skippedExisting: 0, failed: 0 }

  const bar = new cliProgress.SingleBar(
    {
      format:
        chalk.cyan(" {bar}") +
        " {percentage}% | {value}/{total} | {category} › {word}",
      barCompleteChar: "█",
      barIncompleteChar: "░",
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  )
  bar.start(totalImages, 0, { category: "—", word: "—" })

  let completed = 0

  for (const category of categoryNames) {
    const words = wordsForCategory(category)
    const prefix = `word-wave/${category}`
    let existingPublicIds = new Set()
    try {
      const byId = await listAllResourcesByPrefix(prefix)
      existingPublicIds = new Set(byId.keys())
    } catch (e) {
      console.warn(chalk.yellow(`\n  ⚠ Nu pot lista Cloudinary pentru "${prefix}": ${e.message || e}`))
    }

    const tasks = words.map((word) => async () => {
      bar.update(completed, { category, word })

      try {
        const pid = cloudinaryPublicId(word, category)
        if (existingPublicIds.has(pid)) {
          stats.skippedExisting++
          completed++
          bar.update(completed)
          return { status: "skipped_existing", word, category }
        }

        const imageUrl = await fetchPexelsImage(word)
        if (!imageUrl) {
          stats.skipped++
          completed++
          bar.update(completed)
          return { status: "skipped", word, category }
        }

        await uploadToCloudinary(imageUrl, word, category)
        stats.success++
        completed++
        bar.update(completed)
        return { status: "success", word, category }
      } catch (err) {
        stats.failed++
        completed++
        bar.update(completed)
        console.error(chalk.red(`\n  ✗ ${category}/${word}: ${err.message}`))
        return { status: "failed", word, category, error: err.message }
      }
    })

    await runInBatches(tasks, CONCURRENT_UPLOADS)
    await sleep(500)
  }

  bar.stop()

  console.log(chalk.bold("\n────────────────────────────────────────"))
  console.log(chalk.bold("  RAPORT FINAL"))
  console.log(chalk.bold("────────────────────────────────────────"))
  console.log(chalk.green(`  ✓ Încărcate cu succes : ${stats.success}`))
  console.log(chalk.gray(`  ○ Deja în Cloudinary  : ${stats.skippedExisting}`))
  console.log(chalk.yellow(`  ⚠ Sărite (fără foto)  : ${stats.skipped}`))
  console.log(chalk.red(`  ✗ Erori               : ${stats.failed}`))
  console.log(chalk.bold("────────────────────────────────────────\n"))

  if (stats.success > 0) {
    console.log(
      chalk.cyan(
        `  Imaginile sunt în Cloudinary sub:\n` +
          categoryNames.map((c) => `    ▸ word-wave/${c}/`).join("\n")
      )
    )
  }
  console.log()
}

main().catch((err) => {
  console.error(chalk.red("\n✗ Eroare fatală:"), err.message)
  process.exit(1)
})
