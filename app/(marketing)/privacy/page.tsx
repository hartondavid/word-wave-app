import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WordWave collects, uses, and stores data; cookies; analytics; and your rights under GDPR.",
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: March 2025</p>
      <LegalProse>
        <p>
          This policy describes how WordWave (“we”, “us”) handles information when you use wordwave.live and related
          services. By playing the game or browsing the site, you agree to this policy. If you do not agree, please stop
          using the site.
        </p>

        <h2>Who we are</h2>
        <p>
          WordWave is an independent web game. For privacy requests (access, deletion, questions), use the{" "}
          <a href="/contact" className="font-medium text-primary underline underline-offset-4">Contact</a> form and include
          your email so we can reply.
        </p>

        <h2>Data we process</h2>
        <ul>
          <li>
            <strong>Gameplay and multiplayer.</strong> To run live rooms we store match-related data such as room codes,
            nicknames you choose, scores, round state, and timestamps. This is processed so players can see the same game in
            real time. Data is retained only as long as needed for active sessions and reasonable operational cleanup.
          </li>
          <li>
            <strong>Technical logs.</strong> Hosting providers (for example Vercel) may log IP addresses, user agents, and
            error diagnostics for security and reliability. We do not use those logs to build advertising profiles on our
            side.
          </li>
          <li>
            <strong>Contact form.</strong> If you email us via the contact flow, we receive the fields you submit (name,
            email, message) solely to respond to you.
          </li>
        </ul>

        <h2>Cookies and similar technologies</h2>
        <p>
          We use strictly necessary storage where required for the game (for example keeping your nickname in the browser
          between pages). If we enable optional analytics (such as Vercel Analytics or Google Analytics), those tools may
          set cookies or use local storage subject to their own policies. You can block non-essential cookies in your browser
          settings; some features may degrade.
        </p>

        <h2>Legal bases (EEA/UK)</h2>
        <p>
          Where GDPR applies, we rely on: (1) performance of a contract / steps at your request (running the game you
          asked to join); (2) legitimate interests (security, abuse prevention, product improvement), balanced against your
          rights; and (3) consent where required (for example optional marketing cookies if we add them later).
        </p>

        <h2>Processors and transfers</h2>
        <p>
          We use infrastructure and database providers (including Supabase and Vercel) that may process data in the EU, US,
          or other regions under appropriate safeguards such as Standard Contractual Clauses. A list of main subprocessors
          can be provided on request.
        </p>

        <h2>Children</h2>
        <p>
          WordWave is not directed at children under 13 (or the digital age of consent in your country). If you believe a
          child has provided personal data, contact us and we will delete it where required by law.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on your location you may have rights to access, rectify, erase, restrict, or object to processing, and
          to lodge a complaint with a supervisory authority. Contact us to exercise these rights; we may need to verify your
          request.
        </p>

        <h2>Advertising</h2>
        <p>
          If third-party advertising (for example Google AdSense) is enabled in the future, those partners may collect data
          as described in their policies. We will update this page and, where required, obtain consent before loading
          non-essential ad tags.
        </p>

        <h2>Changes</h2>
        <p>
          We may update this policy when the product or law changes. The “Last updated” date at the top will change; continued
          use after updates means you accept the revised policy.
        </p>
      </LegalProse>
    </div>
  )
}
