import nodemailer from "nodemailer"

export type SmtpEnvConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  to: string
}

const SITE_NAME = "WordWave"

export function getSmtpConfigFromEnv(): SmtpEnvConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.SMTP_FROM?.trim()
  const to = process.env.CONTACT_TO_EMAIL?.trim()
  if (!host || !user || !pass || !from || !to) return null

  const portRaw = process.env.SMTP_PORT?.trim()
  const port = portRaw ? Number(portRaw) : 587
  if (!Number.isFinite(port) || port < 1 || port > 65535) return null

  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1" || port === 465

  return { host, port, secure, user, pass, from, to }
}

export async function sendContactEmails(
  cfg: SmtpEnvConfig,
  params: { name: string; email: string; message: string }
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  })

  await transporter.sendMail({
    from: cfg.from,
    to: cfg.to,
    replyTo: params.email,
    subject: `[${SITE_NAME} Contact] ${params.name}`,
    text: [
      `Name: ${params.name}`,
      `Email: ${params.email}`,
      "",
      "Message:",
      params.message,
    ].join("\n"),
  })

  await transporter.sendMail({
    from: cfg.from,
    to: params.email,
    subject: `We received your message — ${SITE_NAME}`,
    text: [
      `Hi ${params.name},`,
      "",
      `Thank you for contacting ${SITE_NAME}. This email confirms we received your message. We will get back to you when possible.`,
      "",
      "Your message:",
      "—".repeat(40),
      params.message,
      "—".repeat(40),
      "",
      "This is an automated confirmation. Replies to this address may not be monitored.",
    ].join("\n"),
  })
}
