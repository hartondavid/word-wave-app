import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function LegalProse({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <article
      className={cn(
        "space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base",
        "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:scroll-mt-24",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
        "[&_strong]:text-foreground",
        className
      )}
    >
      {children}
    </article>
  )
}
