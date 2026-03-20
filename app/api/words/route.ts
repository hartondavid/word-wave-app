import { NextResponse } from "next/server"
import { pickRandomWordPairFromCategoryFile } from "@/lib/server/category-word-pick"
import { LANGUAGES } from "@/lib/game-types"

/**
 * Returnează o singură pereche cuvânt + definiție (nu întregul fișier JSON al categoriei).
 * Datele se citesc din `data/categories/` — nu mai sunt servite ca fișiere statice în /public.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category") ?? ""
  const language = searchParams.get("language") ?? "en"

  if (!(language in LANGUAGES)) {
    return NextResponse.json({ error: "invalid language" }, { status: 400 })
  }

  try {
    const pair = pickRandomWordPairFromCategoryFile(category, language)
    return NextResponse.json(pair, {
      headers: {
        "Cache-Control": "no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
}
