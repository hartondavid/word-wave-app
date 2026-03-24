"use client"

import { useEffect } from "react"

/** Public ID; override with NEXT_PUBLIC_ADSENSE_CLIENT in env if needed. */
const DEFAULT_CLIENT = "ca-pub-9976449948294413"

/**
 * Loads AdSense after idle time so first paint / LCP are less contested.
 * Script is still injected in <head> (no next/script data-nscript).
 */
export function AdsenseDeferred() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    const client =
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim() || DEFAULT_CLIENT
    if (!client) return
    if (document.querySelector('script[data-adsense-deferred="1"]')) return

    const inject = () => {
      if (document.querySelector('script[data-adsense-deferred="1"]')) return
      const addPreconnect = (href: string) => {
        const sel = `link[data-ads-preconnect="${href}"]`
        if (document.querySelector(sel)) return
        const l = document.createElement("link")
        l.rel = "preconnect"
        l.href = href
        l.crossOrigin = "anonymous"
        l.setAttribute("data-ads-preconnect", href)
        document.head.appendChild(l)
      }
      addPreconnect("https://pagead2.googlesyndication.com")
      addPreconnect("https://googleads.g.doubleclick.net")

      const s = document.createElement("script")
      s.async = true
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
      s.crossOrigin = "anonymous"
      s.setAttribute("data-adsense-deferred", "1")
      document.head.appendChild(s)
    }

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => inject(), { timeout: 4500 })
    } else {
      setTimeout(inject, 2000)
    }
  }, [])

  return null
}
