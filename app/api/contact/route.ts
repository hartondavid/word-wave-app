import { NextResponse } from "next/server"

export const runtime = "nodejs"
import {
  contactEmailDomainErrorMessage,
  isContactEmailDomainAllowed,
} from "@/lib/contact-email-allowlist"
import { getSmtpConfigFromEnv, sendContactEmails } from "@/lib/send-contact-emails"

export async function POST(req: Request) {
  const smtp = getSmtpConfigFromEnv()
  if (!smtp) {
    return NextResponse.json(
      { ok: false, error: "Contact email is not configured on this server." },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const name = String(body.name ?? "").trim()
  const email = String(body.email ?? "").trim()
  const message = String(body.message ?? "").trim()

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { ok: false, error: "Please enter your name (2–120 characters)." },
      { status: 400 }
    )
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isContactEmailDomainAllowed(email)) {
    return NextResponse.json(
      { ok: false, error: contactEmailDomainErrorMessage() },
      { status: 400 }
    )
  }

  if (message.length < 10 || message.length > 8000) {
    return NextResponse.json(
      { ok: false, error: "Message must be between 10 and 8000 characters." },
      { status: 400 }
    )
  }

  try {
    await sendContactEmails(smtp, { name, email, message })
  } catch {
    return NextResponse.json(
      { ok: false, error: "Could not send your message. Try again later." },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
