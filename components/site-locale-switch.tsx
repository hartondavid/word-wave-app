"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  alternatePathForLocale,
  currentLocaleFromPathname,
} from "@/lib/locale-switch-paths"
import { cn } from "@/lib/utils"

/**
 * EN / RO: aceeași pagină logică (marketing, blog, practice, cameră).
 * Randare după mount → evită hydration mismatch cu Radix (Sheet) în navbar.
 */
export function SiteLocaleSwitch() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pathname = usePathname() ?? ""

  if (!mounted) {
    return (
      <div
        className="flex h-[1.875rem] min-w-[4.75rem] shrink-0 items-center rounded-lg border border-transparent p-0.5"
        aria-hidden
      />
    )
  }

  const locale = currentLocaleFromPathname(pathname)
  const enHref = alternatePathForLocale(pathname, "en")
  const roHref = alternatePathForLocale(pathname, "ro")

  const pill =
    "inline-flex min-w-[2.25rem] items-center justify-center rounded-md px-2 py-1 text-xs font-semibold transition-colors"

  return (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-0.5"
      role="group"
      aria-label="Limba site-ului: English / Română"
    >
      <Link
        href={enHref}
        className={cn(
          pill,
          locale === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="English"
      >
        EN
      </Link>
      <Link
        href={roHref}
        className={cn(
          pill,
          locale === "ro"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Română"
      >
        RO
      </Link>
    </div>
  )
}
