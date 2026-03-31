import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/site-url"

/** hreflang + canonical pentru o pereche EN/RO (canonical = EN). */
export function alternatesEnCanonical(enPath: string, roPath: string): NonNullable<Metadata["alternates"]> {
  const b = getSiteUrl()
  const en = `${b}${enPath}`
  const ro = `${b}${roPath}`
  return {
    canonical: en,
    languages: { en, ro, "x-default": en },
  }
}

/** hreflang + canonical pentru o pereche EN/RO (canonical = RO). */
export function alternatesRoCanonical(enPath: string, roPath: string): NonNullable<Metadata["alternates"]> {
  const b = getSiteUrl()
  const en = `${b}${enPath}`
  const ro = `${b}${roPath}`
  return {
    canonical: ro,
    languages: { en, ro, "x-default": en },
  }
}
