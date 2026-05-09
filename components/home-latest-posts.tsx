import Link from "next/link"
import { blogPostsForLocale, blogPostPath, formatBlogDateForDisplay, romanianListingForPost } from "@/lib/blog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"

interface HomeLatestPostsProps {
  locale: "en" | "ro"
}

const STRINGS = {
  en: {
    title: "Latest from the Blog",
    viewAll: "View all posts",
    readMore: "Read more",
  },
  ro: {
    title: "Ultimele articole de pe Blog",
    viewAll: "Vezi toate articolele",
    readMore: "Citește mai mult",
  },
}

export function HomeLatestPosts({ locale }: HomeLatestPostsProps) {
  const posts = blogPostsForLocale(locale).slice(0, 3)
  const t = STRINGS[locale]

  if (posts.length === 0) return null

  return (
    <section className="mx-auto mt-12 w-full max-w-6xl pb-12">
      <div className="mb-8 text-center px-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t.title}
        </h2>
        <Link
          href={locale === "ro" ? "/ro/blog" : "/en/blog"}
          className="group mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t.viewAll}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const display = locale === "ro" ? romanianListingForPost(post) : { title: post.title, description: post.description }
          return (
            <Card key={post.slug} className="group relative flex flex-col border-border/50 bg-background transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {formatBlogDateForDisplay(post.date)}
                </p>
                <CardTitle className="line-clamp-2 text-xl leading-tight group-hover:text-primary">
                  <Link href={blogPostPath(post, locale)}>
                    <span className="absolute inset-0" aria-hidden="true" />
                    {display.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {display.description}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-primary">
                  {t.readMore} →
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
