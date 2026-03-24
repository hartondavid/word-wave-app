/** Only these domains are accepted for the contact form (Gmail + Yahoo family). */
export const CONTACT_ALLOWED_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "rocketmail.com",
] as const

const allowed = new Set<string>(CONTACT_ALLOWED_EMAIL_DOMAINS)

export function isContactEmailDomainAllowed(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf("@")
  if (at < 1 || at === normalized.length - 1) return false
  const domain = normalized.slice(at + 1)
  return allowed.has(domain)
}

export function contactEmailDomainErrorMessage(): string {
  return "Please use a Gmail or Yahoo address (e.g. @gmail.com, @yahoo.com)."
}
