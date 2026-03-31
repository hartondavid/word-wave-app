import { EN_TO_RO_SLUG, RO_TO_EN_SLUG } from "@/lib/blog/en-ro-slugs"

export type SiteLocale = "en" | "ro"

export function currentLocaleFromPathname(pathname: string): SiteLocale {
  if (pathname === "/ro" || pathname.startsWith("/ro/")) return "ro"
  return "en"
}

/** Path fără prefix `/ro` (pagina „logică” în EN). */
function stripRoPrefix(path: string): string {
  if (path === "/ro") return "/"
  if (path.startsWith("/ro/")) {
    const rest = path.slice(4)
    return rest ? `/${rest}` : "/"
  }
  return path
}

function blogAlternatePath(normalized: string, target: SiteLocale): string | null {
  const m = normalized.match(/^\/(en|ro)\/blog(?:\/([^/]+))?$/)
  if (!m) return null
  const loc = m[1] as "en" | "ro"
  const slug = m[2]

  if (target === "en") {
    if (!slug) return "/en/blog"
    if (loc === "en") return `/en/blog/${slug}`
    const enS = RO_TO_EN_SLUG[slug] ?? slug
    return `/en/blog/${enS}`
  }
  if (!slug) return "/ro/blog"
  if (loc === "ro") return `/ro/blog/${slug}`
  const roS = EN_TO_RO_SLUG[slug] ?? slug
  return `/ro/blog/${roS}`
}

function legacyBlogAlternate(normalized: string, target: SiteLocale): string | null {
  if (normalized === "/blog") {
    return target === "ro" ? "/ro/blog" : "/en/blog"
  }
  if (normalized.startsWith("/blog/")) {
    const slug = normalized.slice("/blog/".length).replace(/\/$/, "")
    if (!slug) return target === "ro" ? "/ro/blog" : "/en/blog"
    if (target === "ro") {
      const roS = EN_TO_RO_SLUG[slug] ?? slug
      return `/ro/blog/${roS}`
    }
    return `/en/blog/${slug}`
  }
  return null
}

/**
 * URL echivalent în cealaltă limbă pentru aceeași pagină logică (marketing, blog, practice, cameră).
 */
export function alternatePathForLocale(pathname: string, target: SiteLocale): string {
  const raw = pathname.split("?")[0] || "/"
  const normalized =
    raw.length > 1 && raw.endsWith("/") ? raw.slice(0, -1) : raw

  const blog = blogAlternatePath(normalized, target)
  if (blog) return blog

  const legacy = legacyBlogAlternate(normalized, target)
  if (legacy) return legacy

  const logical = stripRoPrefix(normalized)

  if (target === "ro") {
    if (logical === "/") return "/ro"
    return `/ro${logical}`
  }
  return logical === "/" ? "/" : logical
}
