import Link from "next/link"
import { BlogMarkdownBody } from "@/components/blog-markdown-body"
import { LegalProse } from "@/components/legal-prose"
import { allBlogPosts, blogPostPath } from "@/lib/blog"
import type { BlogLocale } from "@/lib/blog/locale-utils"
import { romanianListingForPost } from "@/lib/blog/ro-blog-listing"
import { markdownBodyForLocale } from "@/lib/blog/markdown-for-locale"
import { blogPostingJsonLd } from "@/lib/blog/seo-metadata"
import type { BlogPost } from "@/lib/blog/types"
import { getSiteUrl } from "@/lib/site-url"

type Props = {
  post: BlogPost
  /** Pagina articolului este întotdeauna /en sau /ro (nu „both”). */
  locale: Extract<BlogLocale, "en" | "ro">
}

export function BlogPostFull({ post, locale }: Props) {
  const canonicalUrl = `${getSiteUrl()}${blogPostPath(post, locale)}`
  const listing =
    locale === "ro" ? romanianListingForPost(post) : { title: post.title, description: post.description }
  const jsonLd = blogPostingJsonLd(post, canonicalUrl, {
    headline: listing.title,
    description: listing.description,
    inLanguage: locale === "ro" ? "ro" : "en",
  })
  const more = allBlogPosts.filter((p) => p.slug !== post.slug).slice(0, 5)
  const blogHref = `/${locale}/blog`
  const moreLabel = locale === "ro" ? "Alte articole" : "More posts"

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="mb-2 text-xs text-muted-foreground">
        <Link href={blogHref} className="font-medium text-primary underline underline-offset-4">
          ← Blog
        </Link>
        <span className="mx-2">·</span>
        {post.date}
      </p>
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-balance text-foreground">{listing.title}</h1>
      {locale === "en" && post.source === "markdown" && !post.markdownEn ? (
        <p className="mb-6 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Acest articol este în română.{" "}
          <Link href={`/ro/blog/${post.slug}`} className="font-medium text-primary underline underline-offset-4">
            Deschide în blogul RO
          </Link>
        </p>
      ) : null}
      {post.source === "markdown" ? (
        <LegalProse
          className="[&_h1]:mt-0 [&_h1]:mb-4 [&_h1]:scroll-mt-24 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_img]:max-w-full [&_img]:rounded-md [&_hr]:my-8 [&_hr]:border-border [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-foreground [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-sm"
        >
          <BlogMarkdownBody markdown={markdownBodyForLocale(post, locale)} />
        </LegalProse>
      ) : (
        <LegalProse>
          {(locale === "ro" && post.blocksRo && post.blocksRo.length > 0 ? post.blocksRo : post.blocks).map(
            (b, i) =>
              b.type === "h2" ? (
                <h2 key={i}>{b.text}</h2>
              ) : (
                <p key={i}>{b.text}</p>
              )
          )}
        </LegalProse>
      )}
      <div className="mt-12 border-t border-border/70 pt-8">
        <p className="text-sm font-medium text-foreground">{moreLabel}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {more.map((p) => (
            <li key={p.slug}>
              <Link href={blogPostPath(p, locale)} className="text-primary underline underline-offset-4">
                {locale === "ro" ? romanianListingForPost(p).title : p.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
