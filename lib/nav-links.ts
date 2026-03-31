/** Site-wide marketing / legal navigation (AdSense-friendly structure). */
export const SITE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
  { href: "/en/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const

const REVOLUT_REV_TAG = "david1498"

/** Revolut donation URL; empty if neither env nor default tag is set. */
export function getRevolutDonationUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_REVOLUT_DONATION_URL?.trim()
  if (fromEnv) return fromEnv
  const tag = REVOLUT_REV_TAG.trim()
  if (tag) return `https://revolut.me/${tag}`
  return ""
}

export type SiteNavLinkItem = {
  href: string
  label: string
  external: boolean
}

/** Full navbar/footer list including Support (donate or /contact fallback). */
export function getSiteNavLinks(): SiteNavLinkItem[] {
  return getSiteNavLinksForLocale("en")
}

export function getSiteNavLinksForLocale(locale: "en" | "ro"): SiteNavLinkItem[] {
  const donate = getRevolutDonationUrl()
  const support: SiteNavLinkItem = donate
    ? {
        href: donate,
        label: locale === "ro" ? "Susținere" : "Support",
        external: true,
      }
    : {
        href: locale === "ro" ? "/ro/contact" : "/contact",
        label: locale === "ro" ? "Susținere" : "Support",
        external: false,
      }

  if (locale === "ro") {
    return [
      { href: "/ro", label: "Acasă", external: false },
      { href: "/ro/about", label: "Despre", external: false },
      { href: "/ro/rules", label: "Reguli", external: false },
      { href: "/ro/blog", label: "Blog", external: false },
      { href: "/ro/contact", label: "Contact", external: false },
      { href: "/ro/privacy", label: "Confidențialitate", external: false },
      { href: "/ro/terms", label: "Termeni", external: false },
      support,
    ]
  }

  return [
    ...SITE_NAV_LINKS.map((l) => ({
      href: l.href,
      label: l.label,
      external: false as boolean,
    })),
    support,
  ]
}
