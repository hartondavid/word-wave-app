import type { Metadata } from "next"
import Link from "next/link"
import {
  blogPostPath,
  blogPostsForLocale,
  blogListTotalPages,
  formatBlogDateForDisplay,
  parseBlogListPage,
  sliceBlogPostsPage,
} from "@/lib/blog"
import { BlogPagination } from "@/components/blog-pagination"
import { buildBlogIndexMetadata } from "@/lib/blog/seo-metadata"

type Props = { searchParams?: Promise<{ page?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const allPosts = blogPostsForLocale("en")
  const totalPages = blogListTotalPages(allPosts.length)
  const requested = parseBlogListPage(sp?.page)
  const page = Math.min(requested, totalPages)
  return buildBlogIndexMetadata("en", { page })
}

export default async function EnBlogIndexPage({ searchParams }: Props) {
  const sp = await searchParams
  const allPosts = blogPostsForLocale("en")
  const totalPages = blogListTotalPages(allPosts.length)
  const requested = parseBlogListPage(sp?.page)
  const page = Math.min(requested, totalPages)
  const posts = sliceBlogPostsPage(allPosts, page)

  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">WordWave blog</h1>
      <ul className="space-y-8">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-border/70 pb-8 last:border-0">
            <Link href={blogPostPath(post, "en")} className="group block">
              <h2 className="text-xl font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                {post.title}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{formatBlogDateForDisplay(post.date)}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
              <span className="mt-2 inline-block text-sm font-medium text-primary">Read more →</span>
            </Link>
          </li>
        ))}
      </ul>
      <BlogPagination locale="en" page={page} totalPages={totalPages} basePath="/en/blog" />
    </div>
  )
}
