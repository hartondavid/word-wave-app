import fs from "fs"
import path from "path"

import matter from "gray-matter"

import type { BlogPostFromMarkdown } from "./types"

const POSTS_DIR = path.join(process.cwd(), "posts")
const CONTENT_EN = path.join(process.cwd(), "content", "en")
const CONTENT_RO = path.join(process.cwd(), "content", "ro")

type ParsedMd = {
  slug: string
  title: string
  description: string
  date: string
  body: string
  pathEnRaw?: string
  pathRoRaw?: string
}

/** Căi publice canonice; segmentul din path trebuie să coincidă cu `slug`. */
function publicPathsForSlug(
  slug: string,
  pathEn: unknown,
  pathRo: unknown
): { pathEn: string; pathRo: string } {
  const defE = `/en/blog/${slug}`
  const defR = `/ro/blog/${slug}`
  const seg = (p: string) => {
    const m = p.trim().match(/^\/(?:en|ro)\/blog\/([^/]+)\/?$/i)
    return m ? m[1] : undefined
  }
  let pe = typeof pathEn === "string" && pathEn.startsWith("/") ? pathEn.replace(/\/$/, "") : defE
  let pr = typeof pathRo === "string" && pathRo.startsWith("/") ? pathRo.replace(/\/$/, "") : defR
  if (seg(pe) !== slug) pe = defE
  if (seg(pr) !== slug) pr = defR
  return { pathEn: pe, pathRo: pr }
}

function parseMarkdownFile(fullPath: string, fallbackSlug: string): ParsedMd {
  const raw = fs.readFileSync(fullPath, "utf-8")
  const { data, content } = matter(raw)
  const base = fallbackSlug
  const slug = typeof data.slug === "string" && data.slug.length > 0 ? data.slug : base
  const pathEnRaw = typeof data.path_en === "string" ? data.path_en : undefined
  const pathRoRaw = typeof data.path_ro === "string" ? data.path_ro : undefined
  return {
    slug,
    title: typeof data.title === "string" ? data.title : base,
    description: typeof data.description === "string" ? data.description : "",
    date: typeof data.date === "string" ? data.date : "",
    body: content.trim(),
    pathEnRaw,
    pathRoRaw,
  }
}

function readDirMap(dir: string): Map<string, ParsedMd> {
  const map = new Map<string, ParsedMd>()
  if (!fs.existsSync(dir)) return map
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md")) continue
    const full = path.join(dir, file)
    const fallback = file.replace(/\.md$/i, "")
    const parsed = parseMarkdownFile(full, fallback)
    map.set(parsed.slug, parsed)
  }
  return map
}

function loadLegacyPosts(): BlogPostFromMarkdown[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"))
  const posts: BlogPostFromMarkdown[] = []
  for (const file of files) {
    const full = path.join(POSTS_DIR, file)
    const fallback = file.replace(/\.md$/i, "")
    const p = parseMarkdownFile(full, fallback)
    const paths = publicPathsForSlug(p.slug, p.pathEnRaw, p.pathRoRaw)
    posts.push({
      source: "markdown",
      slug: p.slug,
      title: p.title,
      description: p.description,
      date: p.date,
      markdown: p.body,
      pathEn: paths.pathEn,
      pathRo: paths.pathRo,
    })
  }
  return posts
}

/** Articole din content/en + content/ro cu același slug → un singur post cu două corpuri. */
function loadPairedContentPosts(): BlogPostFromMarkdown[] {
  const enMap = readDirMap(CONTENT_EN)
  const roMap = readDirMap(CONTENT_RO)
  const slugs = new Set([...enMap.keys(), ...roMap.keys()])
  const out: BlogPostFromMarkdown[] = []
  for (const slug of slugs) {
    const en = enMap.get(slug)
    const ro = roMap.get(slug)
    if (en && ro) {
      const paths = publicPathsForSlug(slug, en.pathEnRaw, ro.pathRoRaw)
      out.push({
        source: "markdown",
        slug,
        title: en.title,
        description: en.description,
        date: en.date || ro.date,
        markdown: "",
        markdownEn: en.body,
        markdownRo: ro.body,
        titleRo: ro.title,
        descriptionRo: ro.description,
        pathEn: paths.pathEn,
        pathRo: paths.pathRo,
      })
    } else if (en) {
      const paths = publicPathsForSlug(slug, en.pathEnRaw, en.pathRoRaw)
      out.push({
        source: "markdown",
        slug,
        title: en.title,
        description: en.description,
        date: en.date,
        markdown: "",
        markdownEn: en.body,
        pathEn: paths.pathEn,
        pathRo: paths.pathRo,
      })
    } else if (ro) {
      const paths = publicPathsForSlug(slug, ro.pathEnRaw, ro.pathRoRaw)
      out.push({
        source: "markdown",
        slug,
        title: ro.title,
        description: ro.description,
        date: ro.date,
        markdown: ro.body,
        pathEn: paths.pathEn,
        pathRo: paths.pathRo,
      })
    }
  }
  return out
}

/**
 * O intrare per slug: `content/en` + `content/ro` (aceeași pereche) înlocuiește eventualul fișier din `posts/`.
 */
export function loadMarkdownBlogPosts(): BlogPostFromMarkdown[] {
  const bySlug = new Map<string, BlogPostFromMarkdown>()
  for (const p of loadLegacyPosts()) {
    bySlug.set(p.slug, p)
  }
  for (const p of loadPairedContentPosts()) {
    bySlug.set(p.slug, p)
  }
  return Array.from(bySlug.values())
}
