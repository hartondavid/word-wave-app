"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AmbientWavesToggle } from "@/components/ambient-waves-toggle"
import { SiteLocaleSwitch } from "@/components/site-locale-switch"
import { currentLocaleFromPathname } from "@/lib/locale-switch-paths"
import { getSiteNavLinksForLocale } from "@/lib/nav-links"
import { cn } from "@/lib/utils"

const navLinkClass =
  "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"

/**
 * Bară de navigare: logo stânga; linkuri (desktop) sau meniu burger (mobil); valuri ambient.
 */
export function SiteNavbar({ homePriorityLogo = false }: { homePriorityLogo?: boolean }) {
  const pathname = usePathname() ?? ""
  const locale = currentLocaleFromPathname(pathname)
  const links = getSiteNavLinksForLocale(locale)
  const homeHref = locale === "ro" ? "/ro" : "/"
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="home-logo-png-animate shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="WordWave home"
        >
          <Image
            src="/logo.png"
            alt="WordWave"
            width={160}
            height={160}
            sizes="(max-width: 640px) 90px, 120px"
            quality={45}
            priority={homePriorityLogo}
            fetchPriority={homePriorityLogo ? "high" : "auto"}
            className={cn(
              "w-auto object-contain rounded-xl",
              homePriorityLogo
                ? "h-[4.5rem] max-h-[4.5rem] sm:h-20 sm:max-h-20"
                : "h-11 max-h-11 sm:h-14 sm:max-h-14 md:h-16 md:max-h-16"
            )}
          />
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-x-3 text-sm font-medium lg:flex xl:gap-x-4">
            {links.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={navLinkClass}
                >
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={navLinkClass}>
                  {item.label}
                </Link>
              )
            )}
          </div>

          <SiteLocaleSwitch />
          <AmbientWavesToggle />

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex !w-[min(78vw,15rem)] max-w-[15rem] flex-col gap-0"
            >
              <SheetHeader className="border-b border-border/60 text-left">
                <SheetTitle>{locale === "ro" ? "Meniu" : "Menu"}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4 pt-2">
                {links.map((item) =>
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                      )}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                      )}
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}
