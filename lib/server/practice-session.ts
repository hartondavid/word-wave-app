import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"
import { removeDiacritics } from "@/lib/words"

const COOKIE_NAME = "wm_practice_v1"
const MAX_SESSION_MS = 60 * 60 * 1000

function getKey(): Buffer {
  const secret =
    process.env.PRACTICE_COOKIE_SECRET ||
    "dev-practice-secret-minimum-32-characters!!"
  return scryptSync(secret, "wm-practice-salt-v1", 32)
}

export { COOKIE_NAME }

export type PracticeRoundSecret = { word: string; definition: string }

/** Encrypt word + definition for httpOnly cookie (server-only). */
export function sealPracticeRound(word: string, definition: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const plaintext = JSON.stringify({ w: word, d: definition, t: Date.now() })
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString("base64url")
}

export function unsealPracticeRound(
  sealed: string
): PracticeRoundSecret | null {
  try {
    const buf = Buffer.from(sealed, "base64url")
    if (buf.length < 12 + 16) return null
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const enc = buf.subarray(28)
    const key = getKey()
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      "utf8"
    )
    const parsed = JSON.parse(dec) as { w?: string; d?: string; t?: number }
    if (
      typeof parsed.w !== "string" ||
      typeof parsed.d !== "string" ||
      typeof parsed.t !== "number"
    )
      return null
    if (Date.now() - parsed.t > MAX_SESSION_MS) return null
    return { word: parsed.w, definition: parsed.d }
  } catch {
    return null
  }
}

/** Client progress must match the answer for every non-underscore cell. */
export function isValidProgressAgainstWord(
  progress: string,
  word: string
): boolean {
  if (progress.length !== word.length) return false
  for (let i = 0; i < word.length; i++) {
    if (progress[i] === "_") continue
    const p = removeDiacritics(progress[i].toLowerCase())
    const w = removeDiacritics(word[i].toLowerCase())
    if (p !== w) return false
  }
  return true
}
