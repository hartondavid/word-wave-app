"use client"

import { type RefObject, useEffect } from "react"

/**
 * Pe Safari iOS / unele browsere, tastatura micșorează visual viewport-ul dar nu layout-ul;
 * `h-dvh` rămâne „înalt”, iar header-ul și zona de jos par „fixe” în timp ce mijlocul e acoperit.
 * Setăm înălțimea explicit la `visualViewport.height` ca la Chrome (care adesea redimensionează layout-ul).
 */
export function useSyncGameViewportHeight(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean
): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const el = rootRef.current
    if (!el) return
    const vv = window.visualViewport
    if (!vv) return

    const sync = () => {
      const h = Math.max(0, Math.round(vv.height))
      el.style.height = `${h}px`
    }

    sync()
    vv.addEventListener("resize", sync)
    vv.addEventListener("scroll", sync)
    return () => {
      vv.removeEventListener("resize", sync)
      vv.removeEventListener("scroll", sync)
      el.style.removeProperty("height")
    }
  }, [enabled, rootRef])
}
