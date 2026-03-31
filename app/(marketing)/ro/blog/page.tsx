import type { Metadata } from "next"
import Link from "next/link"
import { allBlogPosts, blogPostPath, getPostLocale } from "@/lib/blog"
import { romanianListingForPost } from "@/lib/blog/ro-blog-listing"
import { buildBlogIndexMetadata } from "@/lib/blog/seo-metadata"

export const metadata: Metadata = buildBlogIndexMetadata("ro")

export default function RoBlogIndexPage() {
  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">Blog WordWave</h1>
      <ul className="space-y-8">
        {allBlogPosts.map((post) => {
          const loc = getPostLocale(post)
          const href = blogPostPath(post, "ro")
          const { title, description } = romanianListingForPost(post)
          return (
            <li key={post.slug} className="border-b border-border/70 pb-8 last:border-0">
              <Link href={href} className="group block">
                <div className="flex flex-wrap items-baseline gap-2 gap-y-0">
                  <h2 className="text-xl font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                    {title}
                  </h2>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {loc === "both" ? "EN · RO" : loc === "ro" ? "RO" : "EN"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{post.date}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                <span className="mt-2 inline-block text-sm font-medium text-primary">Citește mai mult →</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
