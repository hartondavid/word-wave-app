import type { BlogPost } from "./types"

export const BLOG_PAGE_SIZE = 10

export function parseBlogListPage(raw: string | string[] | undefined): number {
  const s = Array.isArray(raw) ? raw[0] : raw
  const n = Number(s)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

export function blogListTotalPages(postCount: number): number {
  return Math.max(1, Math.ceil(postCount / BLOG_PAGE_SIZE))
}

export function sliceBlogPostsPage(posts: BlogPost[], page: number): BlogPost[] {
  const p = Math.max(1, Math.floor(page))
  const start = (p - 1) * BLOG_PAGE_SIZE
  return posts.slice(start, start + BLOG_PAGE_SIZE)
}
