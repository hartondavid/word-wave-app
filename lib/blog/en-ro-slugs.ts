import type { BlogLocale } from "./locale-utils"
import type { BlogPost, BlogPostFromMarkdown } from "./types"

const BLOG_PATH = /^\/(en|ro)\/blog\/([^/]+)\/?$/i

function segmentFromBlogPath(pathname: string | undefined): string | undefined {
  if (!pathname?.trim()) return undefined
  const m = pathname.trim().match(BLOG_PATH)
  return m ? m[2] : undefined
}

function isMd(post: BlogPost): post is BlogPostFromMarkdown {
  return post.source === "markdown"
}

/**
 * Slug-uri românești pentru URL-uri /ro/blog/... (conținutul ghidurilor rămâne în engleză).
 * Cheie = slug EN din posts-1 / posts-2.
 */
export const EN_TO_RO_SLUG: Record<string, string> = {
  "how-multiplayer-wordwave-works": "cum-functioneaza-multiplayer-wordwave",
  "typing-strategies-fast-rounds": "strategii-tastare-runde-rapide",
  "voice-input-wordwave-best-practices": "microfon-wordwave-sfaturi",
  "practice-mode-before-hosting-friends": "mod-practicare-inainte-de-gazda",
  "word-categories-change-the-game": "categorii-cuvinte-dificultate",
  "game-night-checklist-wordwave": "lista-seara-joc-wordwave",
  "fair-play-etiquette-multiplayer-word-games": "fair-play-jocuri-cuvinte",
  "timer-rounds-scoring-wordwave": "cronometru-runde-scor",
  "brief-history-word-guessing-games": "istoric-jocuri-ghicit-cuvinte",
  "invite-links-room-codes-safety": "linkuri-invitatie-cod-camera",
  "mobile-performance-low-latency-tips": "mobil-latenta-redusa-wordwave",
  "definition-language-english-romanian-tips": "limba-definitii-en-ro",
  "wordwave-in-classrooms-and-clubs": "wordwave-clasa-cluburi",
  "colour-progress-bars-and-accessibility": "culori-accesibilitate-progres",
}

export const RO_TO_EN_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_RO_SLUG).map(([en, ro]) => [ro, en])
)

type BlogRouteLocale = Extract<BlogLocale, "en" | "ro">

/** Segment `[slug]` din URL; respectă `path_en` / `path_ro` din frontmatter pentru markdown. */
export function urlSegmentForBlogPost(post: BlogPost, locale: BlogLocale): string {
  if (locale !== "en" && locale !== "ro") {
    if (post.source === "markdown") return post.slug
    return EN_TO_RO_SLUG[post.slug] ?? post.slug
  }
  return blogUrlSegment(post, locale)
}

/** Segment URL pentru limbă (markdown: din calea explicită sau din `slug`). */
export function blogUrlSegment(post: BlogPost, locale: BlogRouteLocale): string {
  if (!isMd(post)) {
    if (locale === "en") return post.slug
    return EN_TO_RO_SLUG[post.slug] ?? post.slug
  }
  const raw = locale === "en" ? post.pathEn : post.pathRo
  const fromPath = segmentFromBlogPath(raw)
  if (fromPath) return fromPath
  return post.slug
}

/**
 * Path public (pathname) pentru linkuri, canonical, hreflang — folosește `path_en` / `path_ro` dacă există.
 */
export function blogPostPath(post: BlogPost, locale: BlogLocale): string {
  if (locale !== "en" && locale !== "ro") {
    return `/en/blog/${post.slug}`
  }
  if (isMd(post)) {
    const explicit = locale === "en" ? post.pathEn : post.pathRo
    if (explicit?.startsWith("/")) {
      const t = explicit.replace(/\/$/, "")
      return t || explicit
    }
  }
  return `/${locale}/blog/${blogUrlSegment(post, locale)}`
}
