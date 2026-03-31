import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BlogPostFull } from "@/components/blog-post-full"
import { getBlogPostForLocale, getBlogSlugsForLocale } from "@/lib/blog"
import { buildBlogArticleMetadata } from "@/lib/blog/seo-metadata"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getBlogSlugsForLocale("ro").map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostForLocale(slug, "ro")
  if (!post) return { title: "Post" }
  return buildBlogArticleMetadata(post, "ro")
}

export default async function RoBlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getBlogPostForLocale(slug, "ro")
  if (!post) notFound()
  return <BlogPostFull post={post} locale="ro" />
}
