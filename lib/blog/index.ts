import type { BlogPost, BlogPostFromBlocks } from "./types"
import { blocksRoByEnSlug } from "./blocksRo"
import { EN_TO_RO_SLUG, RO_TO_EN_SLUG, blogUrlSegment } from "./en-ro-slugs"
import { loadMarkdownBlogPosts } from "./load-md-posts"
import type { BlogLocale } from "./locale-utils"
import { getPostLocale } from "./locale-utils"
import { blogPostsPart1 } from "./posts-1"
import { blogPostsPart2 } from "./posts-2"

export type {
  BlogBlock,
  BlogPost,
  BlogPostFromBlocks,
  BlogPostFromMarkdown,
  StaticBlogPost,
} from "./types"
export type { BlogLocale } from "./locale-utils"
export { getPostLocale } from "./locale-utils"
export {
  EN_TO_RO_SLUG,
  RO_TO_EN_SLUG,
  blogPostPath,
  blogUrlSegment,
  urlSegmentForBlogPost,
} from "./en-ro-slugs"
export { formatBlogDateForDisplay, stripBlogTitleDateSuffix } from "./format-blog-date"

const byDateDesc = (a: BlogPost, b: BlogPost) =>
  new Date(b.date).getTime() - new Date(a.date).getTime()

function tsToBlogPosts(): BlogPostFromBlocks[] {
  return [...blogPostsPart1, ...blogPostsPart2].map((p) => ({
    ...p,
    source: "blocks",
    blocksRo: blocksRoByEnSlug[p.slug],
  }))
}

/** Articole TS + articole din `posts/*.md` (SEO). La același slug, markdown suprascrie. */
const mergedBySlug = (): Map<string, BlogPost> => {
  const map = new Map<string, BlogPost>()
  for (const p of tsToBlogPosts()) map.set(p.slug, p)
  for (const p of loadMarkdownBlogPosts()) map.set(p.slug, p)
  return map
}

export const allBlogPosts: BlogPost[] = Array.from(mergedBySlug().values()).sort(byDateDesc)

export function blogPostsForLocale(locale: BlogLocale): BlogPost[] {
  return allBlogPosts.filter((p) => {
    const loc = getPostLocale(p)
    if (loc === "both") return true
    return loc === locale
  })
}

export function getBlogSlugsForLocale(locale: BlogLocale): string[] {
  if (locale === "ro") {
    const mdSlugs = blogPostsForLocale("ro").map((p) =>
      p.source === "markdown" ? blogUrlSegment(p, "ro") : p.slug
    )
    const roSlugsForEnGuides = allBlogPosts
      .filter((p) => p.source === "blocks")
      .map((p) => EN_TO_RO_SLUG[p.slug])
      .filter((s): s is string => Boolean(s))
    return [...mdSlugs, ...roSlugsForEnGuides]
  }
  /** EN: segment din `path_en` sau `slug` pentru fiecare articol. */
  return allBlogPosts.map((p) => blogUrlSegment(p, "en"))
}

/** Rezolvă segment URL (EN/RO) sau alias ghid RO → articol. */
export function getBlogPost(urlSlug: string): BlogPost | undefined {
  const enSlug = RO_TO_EN_SLUG[urlSlug]
  if (enSlug) {
    return allBlogPosts.find((p) => p.slug === enSlug)
  }
  const bySlug = allBlogPosts.find((p) => p.slug === urlSlug)
  if (bySlug) return bySlug
  return allBlogPosts.find(
    (p) =>
      p.source === "markdown" &&
      (blogUrlSegment(p, "en") === urlSlug || blogUrlSegment(p, "ro") === urlSlug)
  )
}

/**
 * Articol pentru URL /en/blog/[slug] sau /ro/blog/[slug].
 * Pe /ro, ghidurile EN folosesc doar slug-ul românesc (nu și slug-ul EN).
 */
export function getBlogPostForLocale(
  urlSlug: string,
  locale: BlogLocale
): BlogPost | undefined {
  const post = getBlogPost(urlSlug)
  if (!post) return undefined

  if (locale === "en") {
    if (post.source === "markdown") {
      return blogUrlSegment(post, "en") === urlSlug ? post : undefined
    }
    if (post.slug !== urlSlug) return undefined
    return post.source === "blocks" ? post : undefined
  }

  const loc = getPostLocale(post)
  if (post.source === "markdown") {
    if (loc === "both" || loc === "ro") {
      return blogUrlSegment(post, "ro") === urlSlug ? post : undefined
    }
  }

  if (loc === "ro") {
    return post.slug === urlSlug ? post : undefined
  }

  if (post.source === "blocks") {
    const roSlug = EN_TO_RO_SLUG[post.slug]
    return roSlug === urlSlug ? post : undefined
  }

  return undefined
}

/** Slug-uri pentru redirect /blog/[slug] și sitemap (EN + RO + MD). */
export function getAllBlogSlugs(): string[] {
  const out = new Set<string>()
  for (const p of allBlogPosts) {
    out.add(blogUrlSegment(p, "en"))
    out.add(blogUrlSegment(p, "ro"))
    if (p.source === "blocks") {
      const ro = EN_TO_RO_SLUG[p.slug]
      if (ro) out.add(ro)
    }
  }
  return Array.from(out)
}
