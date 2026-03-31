import { notFound, permanentRedirect } from "next/navigation"
import { getAllBlogSlugs, getBlogPost, getPostLocale } from "@/lib/blog"
import { EN_TO_RO_SLUG, RO_TO_EN_SLUG } from "@/lib/blog/en-ro-slugs"

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }))
}

/** Redirect 308 de la /blog/[slug] către /en/blog/... sau /ro/blog/... (slug RO pentru ghidurile EN). */
export default async function BlogLegacySlugRedirect({ params }: Props) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()
  if (RO_TO_EN_SLUG[slug]) {
    permanentRedirect(`/ro/blog/${slug}`)
  }
  if (getPostLocale(post) === "ro") {
    permanentRedirect(`/ro/blog/${post.slug}`)
  }
  permanentRedirect(`/en/blog/${post.slug}`)
}
