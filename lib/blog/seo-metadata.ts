import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/site-url"
import { EN_TO_RO_SLUG, blogPostPath } from "./en-ro-slugs"
import { romanianListingForPost } from "./ro-blog-listing"
import type { BlogPost, BlogPostFromMarkdown } from "./types"
import type { BlogLocale } from "./locale-utils"
import { getPostLocale } from "./locale-utils"

function markdownBodies(post: BlogPostFromMarkdown): { en: boolean; ro: boolean } {
  const en = post.markdownEn?.trim()
  const ro = post.markdownRo?.trim()
  const legacy = post.markdown?.trim()
  if (en && ro) return { en: true, ro: true }
  if (en) return { en: true, ro: false }
  if (ro) return { en: false, ro: true }
  if (legacy) return { en: true, ro: true }
  return { en: false, ro: false }
}

export function articleIsoDate(post: BlogPost): string | undefined {
  const t = Date.parse(post.date)
  if (!Number.isFinite(t)) return undefined
  return new Date(t).toISOString()
}

/** hreflang: URL-uri canonice per limbă (slug-uri RO separate pentru ghidurile EN). */
export function blogArticleHreflangs(post: BlogPost): Record<string, string> | undefined {
  const base = getSiteUrl()
  if (post.source === "markdown") {
    const md = post
    const { en: hasEn, ro: hasRo } = markdownBodies(md)
    const langs: Record<string, string> = {}
    if (hasEn) langs.en = `${base}${blogPostPath(post, "en")}`
    if (hasRo) langs.ro = `${base}${blogPostPath(post, "ro")}`
    return Object.keys(langs).length ? langs : undefined
  }
  const roS = EN_TO_RO_SLUG[post.slug]
  if (!roS) return { en: `${base}/en/blog/${post.slug}` }
  return {
    en: `${base}/en/blog/${post.slug}`,
    ro: `${base}/ro/blog/${roS}`,
  }
}

export function blogPostingJsonLd(
  post: BlogPost,
  canonicalUrl: string,
  display?: { headline?: string; description?: string; inLanguage?: string }
) {
  const iso = articleIsoDate(post)
  const base = getSiteUrl()
  const inLang =
    display?.inLanguage ??
    (getPostLocale(post) === "ro" ? "ro" : "en")
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: display?.headline ?? post.title,
    description: display?.description ?? post.description,
    ...(iso ? { datePublished: iso, dateModified: iso } : {}),
    author: { "@type": "Organization", name: "WordWave" },
    publisher: {
      "@type": "Organization",
      name: "WordWave",
      url: base,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    inLanguage: inLang,
  }
}

export function buildBlogArticleMetadata(post: BlogPost, locale: BlogLocale): Metadata {
  const canonicalUrl =
    locale === "en" || locale === "ro"
      ? `${getSiteUrl()}${blogPostPath(post, locale)}`
      : `${getSiteUrl()}/en/blog/${post.slug}`
  const iso = articleIsoDate(post)
  const languages = blogArticleHreflangs(post)
  const listing =
    locale === "ro" ? romanianListingForPost(post) : { title: post.title, description: post.description }

  return {
    title: listing.title,
    description: listing.description,
    alternates: {
      canonical: canonicalUrl,
      ...(languages ? { languages } : {}),
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: listing.title,
      description: listing.description,
      type: "article",
      url: canonicalUrl,
      siteName: "WordWave",
      locale: locale === "ro" ? "ro_RO" : "en_US",
      ...(iso ? { publishedTime: iso, modifiedTime: iso } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: listing.title,
      description: listing.description,
    },
  }
}

export function buildBlogIndexMetadata(locale: BlogLocale): Metadata {
  const base = getSiteUrl()
  const enUrl = `${base}/en/blog`
  const roUrl = `${base}/ro/blog`

  if (locale === "en") {
    return {
      title: "Blog",
      description:
        "Guides and articles about WordWave: multiplayer tips, typing strategy, voice input, categories, game nights, and fair play.",
      alternates: {
        canonical: enUrl,
        languages: { en: enUrl, ro: roUrl, "x-default": enUrl },
      },
      robots: { index: true, follow: true },
      openGraph: {
        title: "WordWave blog",
        description:
          "Guides for hosts and players: rooms, typing strategy, voice input, categories, and game nights.",
        url: enUrl,
        type: "website",
        locale: "en_US",
      },
    }
  }

  return {
    title: "Blog",
    description:
      "Articole și ghiduri WordWave: multiplayer, strategii de tastare, microfon, categorii, seri de joc.",
    alternates: {
      canonical: roUrl,
      languages: { en: enUrl, ro: roUrl, "x-default": enUrl },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Blog WordWave",
      description:
        "Ghiduri pentru gazde și jucători: camere, strategie, voce, categorii și seri de joc.",
      url: roUrl,
      type: "website",
      locale: "ro_RO",
    },
  }
}
