"use client"

import { cn } from "@/lib/utils"

const ROWS: string[][] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M"],
 
]

type OnScreenLetterKeyboardProps = {
  /** Randează tastatura (ex. rundă activă și cuvânt incomplet). */
  visible: boolean
  onKey: (letter: string) => void
  /** În timpul lockout-ului la literă greșită — taste dezactivate. */
  disabled?: boolean
  className?: string
}

/**
 * Tastatură litere sub masca cuvântului — doar mobil; nu deschide tastatura sistem.
 */
export function OnScreenLetterKeyboard({
  visible,
  onKey,
  disabled = false,
  className,
}: OnScreenLetterKeyboardProps) {
  if (!visible) return null

  return (
    <div
      className={cn(
        "md:hidden w-full max-w-md mx-auto px-1 pb-1 pt-2 select-none",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      role="group"
      aria-label="Letter keyboard"
    >
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1 mb-1">
          {row.map((ch) => (
            <button
              key={ch}
              type="button"
              disabled={disabled}
              className={cn(
                "min-h-10 min-w-[2rem] shrink-0 rounded-md border border-border bg-muted/50 text-sm font-semibold text-foreground",
                "active:scale-95 active:bg-muted transition-transform",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              onClick={() => onKey(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
