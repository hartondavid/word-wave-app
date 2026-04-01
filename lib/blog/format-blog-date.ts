/** Elimină sufixul „ — yyyy-mm-dd” (em dash, en dash sau hyphen) din titluri vechi sau generate. */
export function stripBlogTitleDateSuffix(title: string): string {
  return title.replace(/\s*[\u2014\u2013-]\s*\d{4}-\d{2}-\d{2}\s*$/u, "").trim()
}

/**
 * Afișare în UI: doar ziua calendaristică yyyy-mm-dd.
 * Acceptă ISO complet (ex. din frontmatter) sau deja yyyy-mm-dd.
 */
export function formatBlogDateForDisplay(date: string): string {
  const s = date.trim()
  if (!s) return date
  const t = Date.parse(s)
  if (!Number.isFinite(t)) {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : date
  }
  const d = new Date(t)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${mo}-${day}`
}
