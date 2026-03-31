import type { MetadataRoute } from "next"
import { allBlogPosts, getPostLocale } from "@/lib/blog"
import { EN_TO_RO_SLUG, blogPostPath } from "@/lib/blog/en-ro-slugs"
import type { BlogPostFromMarkdown } from "@/lib/blog/types"
import { getSiteUrl } from "@/lib/site-url"

function markdownSitemapBodies(post: BlogPostFromMarkdown): { en: boolean; ro: boolean } {
  const en = post.markdownEn?.trim()
  const ro = post.markdownRo?.trim()
  const legacy = post.markdown?.trim()
  if (en && ro) return { en: true, ro: true }
  if (en) return { en: true, ro: false }
  if (ro) return { en: false, ro: true }
  if (legacy) return { en: true, ro: true }
  return { en: false, ro: false }
}

const siteUrl = getSiteUrl()

const staticPaths = [
  "",
  "/about",
  "/rules",
  "/en/blog",
  "/ro/blog",
  "/contact",
  "/privacy",
  "/terms",
  "/practice",
  "/ro",
  "/ro/about",
  "/ro/rules",
  "/ro/contact",
  "/ro/privacy",
  "/ro/terms",
  "/ro/practice",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const last = new Date()
  const base = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: last,
    changeFrequency: "weekly" as const,
    priority:
      path === "" || path === "/ro"
        ? 1
        : path === "/en/blog" || path === "/ro/blog"
          ? 0.9
          : 0.7,
  }))

  const posts: MetadataRoute.Sitemap = []
  for (const post of allBlogPosts) {
    const parsed = Date.parse(post.date)
    const lm = Number.isFinite(parsed) ? new Date(parsed) : last
    const pri = post.source === "markdown" ? 0.72 : 0.65

    if (post.source === "markdown") {
      const { en: hasEn, ro: hasRo } = markdownSitemapBodies(post)
      if (hasEn) {
        posts.push({
          url: `${siteUrl}${blogPostPath(post, "en")}`,
          lastModified: lm,
          changeFrequency: "monthly" as const,
          priority: pri,
        })
      }
      if (hasRo) {
        posts.push({
          url: `${siteUrl}${blogPostPath(post, "ro")}`,
          lastModified: lm,
          changeFrequency: "monthly" as const,
          priority: pri,
        })
      }
      continue
    }

    const loc = getPostLocale(post)
    posts.push({
      url: `${siteUrl}/${loc}/blog/${post.slug}`,
      lastModified: lm,
      changeFrequency: "monthly" as const,
      priority: pri,
    })
    if (post.source === "blocks") {
      const roS = EN_TO_RO_SLUG[post.slug]
      if (roS) {
        posts.push({
          url: `${siteUrl}/ro/blog/${roS}`,
          lastModified: lm,
          changeFrequency: "monthly" as const,
          priority: pri + 0.02,
        })
      }
    }
  }

  return [...base, ...posts]
}
