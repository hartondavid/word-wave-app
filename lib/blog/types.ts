export type BlogBlock = { type: "h2" | "p"; text: string }

/** Articole definite în `posts-1.ts` / `posts-2.ts` (fără câmp `source`). */
export type StaticBlogPost = {
  slug: string
  title: string
  date: string
  description: string
  blocks: BlogBlock[]
}

export type BlogPostFromBlocks = StaticBlogPost & {
  source: "blocks"
  /** Corp articol în română (afișat pe /ro/blog/…); lipsă → se folosește `blocks` (EN). */
  blocksRo?: BlogBlock[]
}

export type BlogPostFromMarkdown = {
  source: "markdown"
  slug: string
  title: string
  date: string
  description: string
  /** Corp din `posts/` (articole vechi, în general RO). Lipsă dacă e doar pereche EN/RO în `content/`. */
  markdown: string
  /** Din `content/en` — articole pereche (același slug ca RO). */
  markdownEn?: string
  /** Din `content/ro` — articole pereche. */
  markdownRo?: string
  titleRo?: string
  descriptionRo?: string
  /** Cale publică explicită, ex. `/en/blog/meu-slug` (din frontmatter `path_en`). */
  pathEn?: string
  /** Cale publică explicită, ex. `/ro/blog/meu-slug` (din frontmatter `path_ro`). */
  pathRo?: string
}

export type BlogPost = BlogPostFromBlocks | BlogPostFromMarkdown
