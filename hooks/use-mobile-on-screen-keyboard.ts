"use client"

import { useEffect, useState } from "react"

const QUERY = "(max-width: 767px)"

/**
 * true pe viewport îngust (telefon) — folosim tastatură on-screen în loc să focalizăm input ascuns (evită tastatura sistem).
 */
export function useMobileOnScreenKeyboard() {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const apply = () => setMobile(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  return mobile
}
