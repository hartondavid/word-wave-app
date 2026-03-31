import type { Metadata } from "next"
import { ContactForm } from "@/components/contact-form"
import { alternatesRoCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactează echipa WordWave — întrebări, feedback, solicitări de confidențialitate sau parteneriate.",
  alternates: alternatesRoCanonical("/contact", "/ro/contact"),
}

export default function ContactPageRo() {
  return (
    <div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">Contact</h1>
      <p className="mb-8 text-muted-foreground leading-relaxed">
        Folosește formularul de mai jos pentru întrebări generale, raportări de erori, solicitări legate de date personale sau
        idei de colaborare. Citim fiecare mesaj; timpul de răspuns variază. Pentru solicitări GDPR, menționează „Solicitare
        confidențialitate” în corpul mesajului.
      </p>
      <ContactForm locale="ro" />
    </div>
  )
}
