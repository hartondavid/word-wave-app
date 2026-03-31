import type { Metadata } from "next"
import Link from "next/link"
import { allBlogPosts, blogPostPath, getPostLocale } from "@/lib/blog"
import { buildBlogIndexMetadata } from "@/lib/blog/seo-metadata"

export const metadata: Metadata = buildBlogIndexMetadata("en")

export default function EnBlogIndexPage() {
  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">WordWave blog</h1>
      <p className="mb-10 text-muted-foreground leading-relaxed">
        Guides in English, plus Romanian articles (same content at /en/blog/… and /ro/blog/…). Host tips, rounds, voice
        input, and vocabulary.
      </p>
      <ul className="space-y-8">
        {allBlogPosts.map((post) => (
          <li key={post.slug} className="border-b border-border/70 pb-8 last:border-0">
            <Link href={blogPostPath(post, "en")} className="group block">
              <div className="flex flex-wrap items-baseline gap-2 gap-y-0">
                <h2 className="text-xl font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                  {post.title}
                </h2>
                {getPostLocale(post) === "ro" ? (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    RO
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{post.date}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
              <span className="mt-2 inline-block text-sm font-medium text-primary">Read more →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
