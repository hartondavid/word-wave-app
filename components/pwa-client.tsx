"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  const mm = window.matchMedia("(display-mode: standalone)")
  if (mm.matches) return true
  const nav = navigator as Navigator & { standalone?: boolean }
  return Boolean(nav.standalone)
}

export function PwaClient({ className }: { className?: string }) {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)
  const [showChromeInstall, setShowChromeInstall] = useState(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isStandaloneDisplay()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredRef.current = e as BeforeInstallPromptEvent
      setShowChromeInstall(true)
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", () => {
      deferredRef.current = null
      setShowChromeInstall(false)
    })

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
    }
  }, [])

  const onInstallClick = useCallback(async () => {
    const ev = deferredRef.current
    if (!ev?.prompt) return
    await ev.prompt()
    await ev.userChoice.catch(() => {})
    deferredRef.current = null
    setShowChromeInstall(false)
  }, [])

  if (isStandaloneDisplay()) return null

  if (!showChromeInstall) return null

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onInstallClick}>
        <Download className="h-3.5 w-3.5" aria-hidden />
        Install app
      </Button>
    </div>
  )
}
