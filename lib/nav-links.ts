/** Site-wide marketing / legal navigation (AdSense-friendly structure). */
export const SITE_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules" },
  { href: "/blog", label: "Blog" },
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
  const donate = getRevolutDonationUrl()
  const support: SiteNavLinkItem = donate
    ? { href: donate, label: "Support", external: true }
    : { href: "/contact", label: "Support", external: false }

  return [
    ...SITE_NAV_LINKS.map((l) => ({
      href: l.href,
      label: l.label,
      external: false as boolean,
    })),
    support,
  ]
}
