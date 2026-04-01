"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  alternatePathForLocale,
  currentLocaleFromPathname,
} from "@/lib/locale-switch-paths"
import { cn } from "@/lib/utils"

/**
 * EN / RO: aceeași pagină logică (marketing, blog, practice, cameră).
 * Randare după mount → evită hydration mismatch cu Radix în navbar.
 */
export function SiteLocaleSwitch() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const pathname = usePathname() ?? ""

  if (!mounted) {
    return (
      <div
        className="flex h-8 min-w-[2.5rem] shrink-0 items-center justify-center rounded-lg border border-transparent"
        aria-hidden
      />
    )
  }

  const locale = currentLocaleFromPathname(pathname)
  const enHref = alternatePathForLocale(pathname, "en")
  const roHref = alternatePathForLocale(pathname, "ro")

  const triggerLabel =
    locale === "ro"
      ? "Limba site-ului. Deschide meniul pentru a alege limba."
      : "Site language. Open menu to choose language."

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2 py-0.5",
          "text-foreground outline-none transition-colors",
          "hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "data-[state=open]:bg-muted/70"
        )}
        aria-label={triggerLabel}
      >
        <span className="text-[11px] font-semibold tabular-nums leading-none">
          {locale === "en" ? "EN" : "RO"}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={6}
        className="w-max min-w-0 p-0 py-px"
      >
        <DropdownMenuItem
          asChild
          className="h-auto min-h-0 cursor-pointer rounded-none py-1.5 pl-2 pr-2"
        >
          <Link
            href={enHref}
            className="flex w-full items-center gap-1"
            aria-current={locale === "en" ? "page" : undefined}
          >
            <span className="text-sm">English</span>
            {locale === "en" ? (
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
            ) : null}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="h-auto min-h-0 cursor-pointer rounded-none py-1.5 pl-2 pr-2"
        >
          <Link
            href={roHref}
            className="flex w-full items-center gap-1"
            aria-current={locale === "ro" ? "page" : undefined}
          >
            <span className="text-sm">Română</span>
            {locale === "ro" ? (
              <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
            ) : null}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
