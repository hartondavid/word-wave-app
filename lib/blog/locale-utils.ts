import type { BlogPost } from "./types"

export type BlogLocale = "en" | "ro" | "both"

export function getPostLocale(post: BlogPost): BlogLocale {
  if (post.source !== "markdown") return "en"
  const en = post.markdownEn?.trim()
  const ro = post.markdownRo?.trim()
  const legacy = post.markdown?.trim()
  if (en && ro) return "both"
  if (en && !legacy && !ro) return "en"
  return "ro"
}
