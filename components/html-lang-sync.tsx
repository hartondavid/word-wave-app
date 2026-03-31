"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

function langFromPath(pathname: string): "en" | "ro" {
  if (pathname === "/ro" || pathname.startsWith("/ro/")) return "ro"
  return "en"
}

/** Sincronizează `document.documentElement.lang` la navigare client. */
export function HtmlLangSync() {
  const pathname = usePathname() ?? ""
  useEffect(() => {
    document.documentElement.lang = langFromPath(pathname)
  }, [pathname])
  return null
}
