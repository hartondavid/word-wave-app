"use client"

import Link from "next/link"
import Image from "next/image"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AmbientWavesToggle } from "@/components/ambient-waves-toggle"

/** Revolut.me — revtag în cod; poți suprascrie tot URL-ul cu NEXT_PUBLIC_REVOLUT_DONATION_URL */
const REVOLUT_REV_TAG = "david1498"

export const REVOLUT_DONATION_URL =
  process.env.NEXT_PUBLIC_REVOLUT_DONATION_URL?.trim() ||
  (REVOLUT_REV_TAG.trim() ? `https://revolut.me/${REVOLUT_REV_TAG.trim()}` : "")

/** Valuri + Support — folosit pe home (navbar desktop și rând mobil). */
export function HomeAmbientAndSupport({ className }: { className?: string }) {
  return (
    <div className={className ?? "flex shrink-0 items-center gap-2"}>
      <AmbientWavesToggle />
      {REVOLUT_DONATION_URL ? (
        <Button variant="secondary" size="sm" className="shrink-0 gap-1.5 font-medium" asChild>
          <a
            href={REVOLUT_DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support the project — donate via Revolut (opens in a new tab)"
          >
            <Heart className="h-4 w-4" aria-hidden />
            Support
          </a>
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1.5 font-medium"
          disabled
          title="Set REVOLUT_REV_TAG or NEXT_PUBLIC_REVOLUT_DONATION_URL"
        >
          <Heart className="h-4 w-4" aria-hidden />
          Support
        </Button>
      )}
    </div>
  )
}

/**
 * Bară de navigare: logo stânga; valuri + Support în dreapta.
 */
export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <nav
        className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-4 px-4 pt-5 pb-3 sm:px-6 sm:pt-6 sm:pb-3"
        aria-label="Main navigation"
      >
        <Link
          href="/"
          className="home-logo-png-animate shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="WordWave home"
        >
          <Image
            src="/logo.png"
            alt=""
            width={192}
            height={192}
            sizes="(max-width: 640px) 112px, 128px"
            quality={68}
            priority
            fetchPriority="high"
            className="h-14 w-auto max-h-14 object-contain rounded-xl sm:h-16 sm:max-h-16"
          />
        </Link>
        <HomeAmbientAndSupport />
      </nav>
    </header>
  )
}
