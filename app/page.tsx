import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { SiteNavbar } from "@/components/site-navbar"
import { alternatesEnCanonical } from "@/lib/seo-alternates"
import { getSiteUrl } from "@/lib/site-url"
import { HomeHero } from "./home-hero"

const base = getSiteUrl()

export const metadata: Metadata = {
  alternates: alternatesEnCanonical("/", "/ro"),
  openGraph: {
    url: `${base}/`,
    locale: "en_US",
  },
  robots: { index: true, follow: true },
}

const HomePlayClient = dynamic(
  () => import("./home-play-client").then((m) => m.HomePlayClient),
  {
    loading: () => (
      <div
        className="flex flex-col gap-6 md:col-span-7"
        aria-busy="true"
        aria-label="Loading play form"
      >
        <div className="min-h-[28rem] animate-pulse rounded-xl border-2 border-border bg-muted/30 md:min-h-[32rem]" />
      </div>
    ),
  },
)

export default function HomePage() {
  return (
    <>
      <SiteNavbar homePriorityLogo />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 px-4 py-8 outline-none md:min-h-[calc(100dvh-6rem)] md:items-stretch md:justify-start md:py-10"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-6 md:max-w-6xl md:grid-cols-12 md:gap-x-12 md:gap-y-8">
          <HomeHero />
          <HomePlayClient />
        </div>
      </main>
    </>
  )
}
