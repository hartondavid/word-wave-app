/**
 * WCAG 2.4.1 — primul focus din pagină. Stil focus: `.skip-to-main` în `app/globals.css`.
 */
export function SkipToMain({ lang }: { lang: "en" | "ro" }) {
  return (
    <a href="#main-content" className="skip-to-main">
      {lang === "ro" ? "Salt la conținutul principal" : "Skip to main content"}
    </a>
  )
}
