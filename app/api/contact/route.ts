import { NextResponse } from "next/server"

const WEB3FORMS_KEY = process.env.WEB3FORMS_ACCESS_KEY?.trim()

/**
 * Contact form → Web3Forms (free tier). Set WEB3FORMS_ACCESS_KEY in Vercel env.
 * https://web3forms.com — inbox without running your own mail server.
 */
export async function POST(req: Request) {
  if (!WEB3FORMS_KEY) {
    return NextResponse.json(
      { ok: false, error: "Contact is not configured on this server." },
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
    return NextResponse.json({ ok: false, error: "Please enter your name (2–120 characters)." }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 })
  }
  if (message.length < 10 || message.length > 8000) {
    return NextResponse.json(
      { ok: false, error: "Message must be between 10 and 8000 characters." },
      { status: 400 }
    )
  }

  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `[WordWave] ${name}`,
      name,
      email,
      message,
    }),
  })

  const data = (await res.json()) as { success?: boolean; message?: string }

  if (!res.ok || !data.success) {
    return NextResponse.json(
      { ok: false, error: data.message || "Failed to send message. Try again later." },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
