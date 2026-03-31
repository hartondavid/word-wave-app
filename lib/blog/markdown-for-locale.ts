import type { BlogPostFromMarkdown } from "./types"

/** Corp markdown pentru pagina /en sau /ro (articole pereche sau legacy din `posts/`). */
export function markdownBodyForLocale(
  post: BlogPostFromMarkdown,
  locale: "en" | "ro"
): string {
  const en = post.markdownEn?.trim()
  const ro = post.markdownRo?.trim()
  if (en && ro) return locale === "en" ? post.markdownEn! : post.markdownRo!
  if (en) return post.markdownEn!
  return post.markdown
}
