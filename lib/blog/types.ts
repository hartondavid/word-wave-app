export type BlogBlock = { type: "h2" | "p"; text: string }

export type BlogPost = {
  slug: string
  title: string
  date: string
  description: string
  blocks: BlogBlock[]
}
