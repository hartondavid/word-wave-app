import type { Metadata } from "next"

/** Doar /ro, /ro/practice, /ro/game — fără canonical global (evită SEO greșit pe sub-rute). */
export const metadata: Metadata = {
  robots: { index: true, follow: true },
}

export default function RoLayout({ children }: { children: React.ReactNode }) {
  return children
}
