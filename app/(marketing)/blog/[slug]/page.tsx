import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getAllBlogSlugs, getBlogPost, allBlogPosts } from "@/lib/blog"
import { LegalProse } from "@/components/legal-prose"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: "Post" }
  return {
    title: post.title,
    description: post.description,
    openGraph: { title: post.title, description: post.description, type: "article" },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        <Link href="/blog" className="font-medium text-primary underline underline-offset-4">
          ← Blog
        </Link>
        <span className="mx-2">·</span>
        {post.date}
      </p>
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-balance text-foreground">{post.title}</h1>
      <LegalProse>
        {post.blocks.map((b, i) =>
          b.type === "h2" ? (
            <h2 key={i}>{b.text}</h2>
          ) : (
            <p key={i}>{b.text}</p>
          )
        )}
      </LegalProse>
      <div className="mt-12 border-t border-border/70 pt-8">
        <p className="text-sm font-medium text-foreground">More posts</p>
        <ul className="mt-3 space-y-2 text-sm">
          {allBlogPosts
            .filter((p) => p.slug !== post.slug)
            .slice(0, 5)
            .map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`} className="text-primary underline underline-offset-4">
                  {p.title}
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
