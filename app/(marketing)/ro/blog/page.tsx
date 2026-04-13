import type { Metadata } from "next"
import Link from "next/link"
import {
  blogPostPath,
  blogPostsForRomanianBlogIndex,
  blogListTotalPages,
  formatBlogDateForDisplay,
  parseBlogListPage,
  sliceBlogPostsPage,
} from "@/lib/blog"
import { BlogPagination } from "@/components/blog-pagination"
import { romanianListingForPost } from "@/lib/blog/ro-blog-listing"
import { buildBlogIndexMetadata } from "@/lib/blog/seo-metadata"

type Props = { searchParams?: Promise<{ page?: string }> }

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams
  const allPosts = blogPostsForRomanianBlogIndex()
  const totalPages = blogListTotalPages(allPosts.length)
  const requested = parseBlogListPage(sp?.page)
  const page = Math.min(requested, totalPages)
  return buildBlogIndexMetadata("ro", { page })
}

export default async function RoBlogIndexPage({ searchParams }: Props) {
  const sp = await searchParams
  const allPosts = blogPostsForRomanianBlogIndex()
  const totalPages = blogListTotalPages(allPosts.length)
  const requested = parseBlogListPage(sp?.page)
  const page = Math.min(requested, totalPages)
  const posts = sliceBlogPostsPage(allPosts, page)

  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">Blog WordWave</h1>
      <ul className="space-y-8">
        {posts.map((post) => {
          const href = blogPostPath(post, "ro")
          const { title, description } = romanianListingForPost(post)
          return (
            <li key={post.slug} className="border-b border-border/70 pb-8 last:border-0">
              <Link href={href} className="group block">
                <h2 className="text-xl font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                  {title}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{formatBlogDateForDisplay(post.date)}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                <span className="mt-2 inline-block text-sm font-medium text-primary">Citește mai mult →</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <BlogPagination locale="ro" page={page} totalPages={totalPages} basePath="/ro/blog" />
    </div>
  )
}
