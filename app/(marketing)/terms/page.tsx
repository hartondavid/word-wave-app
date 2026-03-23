import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing use of WordWave at wordwave.live.",
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: March 2025</p>
      <LegalProse>
        <p>
          These Terms of Service (“Terms”) govern access to and use of WordWave at wordwave.live (the “Service”). By using
          the Service you agree to these Terms. If you disagree, do not use the Service.
        </p>

        <h2>Description of the Service</h2>
        <p>
          WordWave provides an online word guessing game with optional multiplayer. The Service is provided “as is” and may
          change, suspend, or discontinue features at any time without liability except where prohibited by law.
        </p>

        <h2>Accounts and conduct</h2>
        <p>
          You choose a display name for gameplay. Do not impersonate others, use offensive or unlawful names, harass
          players, cheat with automated tools, or attempt to disrupt servers, databases, or other users’ sessions. We may
          remove access or data associated with abuse.
        </p>

        <h2>User content</h2>
        <p>
          Messages you send through contact forms are your responsibility. Do not submit illegal or harmful content. We may
          process submissions only to operate support and improve the Service.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The WordWave name, logo, UI, and original text on the site are protected. You receive a limited, revocable licence
          to use the Service for personal, non-commercial entertainment unless we agree otherwise in writing.
        </p>

        <h2>Disclaimer of warranties</h2>
        <p>
          To the fullest extent permitted by law, we disclaim all warranties, express or implied, including merchantability,
          fitness for a particular purpose, and non-infringement. We do not guarantee uninterrupted or error-free operation.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential, or
          punitive damages, or loss of profits or data, arising from your use of the Service. Our aggregate liability for
          any claim relating to the Service shall not exceed the greater of (a) amounts you paid us in the twelve months
          before the claim or (b) zero if the Service is free.
        </p>

        <h2>Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless WordWave and its operators from claims arising out of your misuse of the
          Service or violation of these Terms, except where such indemnity is not enforceable under applicable law.
        </p>

        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws applicable to the operator’s jurisdiction, without regard to conflict-of-law
          rules. Courts in that jurisdiction have exclusive venue, subject to mandatory consumer protections in your country
          of residence.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms: use the{" "}
          <a href="/contact" className="font-medium text-primary underline underline-offset-4">Contact</a> page.
        </p>
      </LegalProse>
    </div>
  )
}
