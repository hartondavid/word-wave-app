import Link from "next/link"
import { SITE_NAV_LINKS } from "@/lib/nav-links"

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border/80 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between md:gap-12">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-semibold text-foreground">WordWave</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Fast multiplayer word guessing: same definition for everyone, up to four players, keyboard or voice input.
              Practice solo or invite friends with a room code.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {SITE_NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground md:text-left">
          © {year} WordWave. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
