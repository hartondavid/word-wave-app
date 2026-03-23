import type { BlogPost } from "./types"
import { blogPostsPart1 } from "./posts-1"
import { blogPostsPart2 } from "./posts-2"

export type { BlogPost, BlogBlock } from "./types"

const byDateDesc = (a: BlogPost, b: BlogPost) =>
  new Date(b.date).getTime() - new Date(a.date).getTime()

export const allBlogPosts: BlogPost[] = [...blogPostsPart1, ...blogPostsPart2].sort(byDateDesc)

export function getBlogPost(slug: string): BlogPost | undefined {
  return allBlogPosts.find((p) => p.slug === slug)
}

export function getAllBlogSlugs(): string[] {
  return allBlogPosts.map((p) => p.slug)
}
