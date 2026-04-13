import Link from "next/link"
import { cn } from "@/lib/utils"

type BlogPaginationProps = {
  locale: "en" | "ro"
  page: number
  totalPages: number
  basePath: "/en/blog" | "/ro/blog"
}

function hrefForPage(basePath: BlogPaginationProps["basePath"], p: number): string {
  if (p <= 1) return basePath
  return `${basePath}?page=${p}`
}

export function BlogPagination({ locale, page, totalPages, basePath }: BlogPaginationProps) {
  if (totalPages <= 1) return null

  const prevLabel = locale === "en" ? "Previous" : "Înapoi"
  const nextLabel = locale === "en" ? "Next" : "Înainte"
  const summary =
    locale === "en"
      ? `Page ${page} of ${totalPages}`
      : `Pagina ${page} din ${totalPages}`

  return (
    <nav
      className="mt-10 flex flex-col items-stretch gap-3 border-t border-border/70 pt-8 sm:flex-row sm:items-center sm:justify-between"
      aria-label={locale === "en" ? "Blog pages" : "Pagini blog"}
    >
      <p className="text-center text-sm text-muted-foreground sm:text-left">{summary}</p>
      <div className="flex justify-center gap-2 sm:justify-end">
        <Link
          href={hrefForPage(basePath, page - 1)}
          className={cn(
            "inline-flex min-h-9 min-w-[5.5rem] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors",
            page <= 1
              ? "pointer-events-none opacity-40"
              : "hover:bg-muted/60"
          )}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
        >
          {prevLabel}
        </Link>
        <Link
          href={hrefForPage(basePath, page + 1)}
          className={cn(
            "inline-flex min-h-9 min-w-[5.5rem] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors",
            page >= totalPages
              ? "pointer-events-none opacity-40"
              : "hover:bg-muted/60"
          )}
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
        >
          {nextLabel}
        </Link>
      </div>
    </nav>
  )
}
