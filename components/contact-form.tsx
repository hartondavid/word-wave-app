"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  CONTACT_ALLOWED_EMAIL_DOMAINS,
  contactEmailDomainErrorMessage,
  isContactEmailDomainAllowed,
} from "@/lib/contact-email-allowlist"

const copy = {
  en: {
    name: "Name",
    email: "Email",
    emailHint: (domains: string) => `Gmail or Yahoo only: ${domains}.`,
    message: "Message",
    thankYou:
      "Thank you — your message was sent. Check your inbox for a confirmation email.",
    genericError: "Something went wrong.",
    networkError: "Network error. Check your connection.",
    sending: "Sending…",
    send: "Send message",
  },
  ro: {
    name: "Nume",
    email: "E-mail",
    emailHint: (domains: string) => `Doar Gmail sau Yahoo: ${domains}.`,
    message: "Mesaj",
    thankYou:
      "Mulțumim — mesajul a fost trimis. Verifică și căsuța de e-mail pentru confirmare.",
    genericError: "Ceva nu a funcționat.",
    networkError: "Eroare de rețea. Verifică conexiunea.",
    sending: "Se trimite…",
    send: "Trimite mesajul",
  },
} as const

export function ContactForm({ locale = "en" }: { locale?: "en" | "ro" }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle")
  const [errMsg, setErrMsg] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrMsg("")
    const trimmedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || !isContactEmailDomainAllowed(trimmedEmail)) {
      setErrMsg(contactEmailDomainErrorMessage(locale))
      setStatus("err")
      return
    }
    setStatus("sending")
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: trimmedEmail, message }),
      })
      const j = (await r.json()) as { ok?: boolean; error?: string }
      if (!r.ok || !j.ok) {
        setErrMsg(j.error || "Something went wrong.")
        setStatus("err")
        return
      }
      setStatus("ok")
      setName("")
      setEmail("")
      setMessage("")
      setErrMsg("")
    } catch {
      setErrMsg(copy[locale].networkError)
      setStatus("err")
    }
  }

  const t = copy[locale]
  const domainList = CONTACT_ALLOWED_EMAIL_DOMAINS.map((d) => `@${d}`).join(", ")

  return (
    <form onSubmit={onSubmit} className="space-y-4" lang={locale === "ro" ? "ro" : "en"}>
      <div className="space-y-2">
        <label htmlFor="contact-name" className="text-sm font-medium">
          {t.name}
        </label>
        <Input
          id="contact-name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="contact-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">{t.emailHint(domainList)}</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="contact-message" className="text-sm font-medium">
          {t.message}
        </label>
        <textarea
          id="contact-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={8000}
          rows={6}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>
      {status === "ok" ? (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400" role="status">
          {t.thankYou}
        </p>
      ) : null}
      {status === "err" ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {errMsg}
        </p>
      ) : null}
      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? t.sending : t.send}
      </Button>
    </form>
  )
}
