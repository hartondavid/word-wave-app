import type { Metadata } from "next"
import Link from "next/link"
import { allBlogPosts } from "@/lib/blog"

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides and articles about WordWave: multiplayer tips, typing strategy, voice input, categories, game nights, and fair play.",
}

export default function BlogIndexPage() {
  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">WordWave blog</h1>
      <p className="mb-10 text-muted-foreground leading-relaxed">
        Original guides for hosts and players: how rooms work, how to improve at timed rounds, and how to run a smooth game night.
      </p>
      <ul className="space-y-8">
        {allBlogPosts.map((post) => (
          <li key={post.slug} className="border-b border-border/70 pb-8 last:border-0">
            <Link href={`/blog/${post.slug}`} className="group block">
              <h2 className="text-xl font-semibold text-foreground group-hover:underline group-hover:underline-offset-4">
                {post.title}
              </h2>
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
