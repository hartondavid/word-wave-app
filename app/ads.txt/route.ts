import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { NextResponse } from "next/server"

/** Răspuns explicit pentru crawleri AdSense (uneori `public/` singur e mai greu de detectat). */
export async function GET() {
  const body = await readFile(join(process.cwd(), "public", "ads.txt"), "utf8")
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  })
}
