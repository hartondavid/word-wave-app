import fs from "fs"
import path from "path"
import cloudinary from "cloudinary"

export function loadEnvLocal(rootDir) {
  const p = path.join(rootDir, ".env.local")
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

function apiResourcesPage(prefix, extra = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.v2.api.resources(
      {
        resource_type: "image",
        type: "upload",
        prefix,
        max_results: 500,
        ...extra,
      },
      (a, b) => {
        if (b !== undefined) resolve(b)
        else reject(a || new Error("Cloudinary API failed"))
      }
    )
  })
}

/** @returns {Promise<Map<string, string>>} public_id -> secure_url */
export async function listAllResourcesByPrefix(prefix) {
  const byPublicId = new Map()
  let next_cursor
  do {
    const page = await apiResourcesPage(prefix, next_cursor ? { next_cursor } : {})
    for (const r of page.resources || []) {
      if (r.public_id) byPublicId.set(r.public_id, r.secure_url)
    }
    next_cursor = page.next_cursor
  } while (next_cursor)
  return byPublicId
}

/**
 * Same listing as listAllResourcesByPrefix but includes context.custom (e.g. word / word_en from upload).
 * @returns {Promise<Array<{ public_id: string, secure_url: string, context: Record<string, string> }>>}
 */
export async function listAllImageResourcesDetailed(prefix) {
  const out = []
  let next_cursor
  do {
    const page = await apiResourcesPage(prefix, {
      context: true,
      ...(next_cursor ? { next_cursor } : {}),
    })
    for (const r of page.resources || []) {
      if (!r.public_id || !r.secure_url) continue
      const custom = r.context?.custom
      const context =
        custom && typeof custom === "object"
          ? Object.fromEntries(
              Object.entries(custom).map(([k, v]) => [k, v != null ? String(v) : ""])
            )
          : {}
      out.push({ public_id: r.public_id, secure_url: r.secure_url, context })
    }
    next_cursor = page.next_cursor
  } while (next_cursor)
  return out
}

function apiCreateFolder(folderPath) {
  return new Promise((resolve, reject) => {
    cloudinary.v2.api.create_folder(folderPath, (a, b) => {
      if (b !== undefined) resolve(b)
      else reject(a || new Error("create_folder failed"))
    })
  })
}

/** @returns {Promise<{ folders?: unknown[] }>} */
export function apiSubFolders(parentPath) {
  const p = String(parentPath || "").replace(/\/+$/, "")
  return new Promise((resolve, reject) => {
    cloudinary.v2.api.sub_folders(p, (a, b) => {
      if (b !== undefined) resolve(b)
      else reject(a || new Error("sub_folders failed"))
    })
  })
}

export function folderNamesFromSubFoldersResult(result) {
  const folders = result?.folders
  if (!Array.isArray(folders)) return []
  return folders
    .map((f) => (typeof f === "string" ? f : f?.name || f?.path || ""))
    .map((s) => String(s).trim())
    .filter(Boolean)
}

export async function ensureCloudinaryFolder(folderPath) {
  try {
    await apiCreateFolder(folderPath)
  } catch (e) {
    const msg = String(e?.message || e || "")
    if (/already exists|Folder already exists/i.test(msg)) return
    throw e
  }
}

export function uploaderRename(fromPublicId, toPublicId, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.v2.uploader.rename(
      fromPublicId,
      toPublicId,
      { invalidate: true, resource_type: "image", ...options },
      (a, b) => {
        if (b !== undefined) resolve(b)
        else reject(a || new Error("rename failed"))
      }
    )
  })
}
