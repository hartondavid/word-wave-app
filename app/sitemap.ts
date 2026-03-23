import type { MetadataRoute } from "next"
import { getAllBlogSlugs } from "@/lib/blog"

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")

const staticPaths = [
  "",
  "/about",
  "/rules",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
  "/practice",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const last = new Date()
  const base = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: last,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/blog" ? 0.9 : 0.7,
  }))

  const posts = getAllBlogSlugs().map((slug) => ({
    url: `${siteUrl}/blog/${slug}`,
    lastModified: last,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }))

  return [...base, ...posts]
}
