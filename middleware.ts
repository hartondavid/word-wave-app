import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/** Propagă pathname pentru `<html lang>` corect la SSR (Lighthouse / WCAG). */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|robots|sitemap|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
}
