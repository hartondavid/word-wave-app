import type { Metadata } from "next"
import { ContactForm } from "@/components/contact-form"
import { alternatesEnCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the WordWave team — questions, feedback, privacy requests, or partnership ideas.",
  alternates: alternatesEnCanonical("/contact", "/ro/contact"),
}

export default function ContactPage() {
  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">Contact</h1>
      <p className="mb-8 text-muted-foreground leading-relaxed">
        Use the form below for general questions, bug reports, privacy requests, or collaboration ideas. We read every
        message; response time varies. For GDPR requests, mention “Privacy request” in the message body.
      </p>
      <ContactForm />
    </div>
  )
}
