import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AnalyticsLoader } from '@/components/analytics-loader'
import { AudioGestureUnlock } from '@/components/audio-gesture-unlock'
import { GoogleAnalytics } from '@/components/google-analytics'
import { SiteFooter } from '@/components/site-footer'
import { AdsenseDeferred } from '@/components/adsense-deferred'
import { getSiteUrl } from '@/lib/site-url'
import './globals.css'

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
  adjustFontFallback: true,
  preload: true,
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
  adjustFontFallback: true,
  /** Mono is rarely LCP; skipping preload shortens the critical font chain. */
  preload: false,
})

/** Vezi `getSiteUrl()` — NEXT_PUBLIC_SITE_URL pe Vercel pentru producție. */
const siteUrl = getSiteUrl()

const title = 'WordWave - Multiplayer Word Guessing Game'
const description =
  'Compete head-to-head in this fast-paced word guessing game! Race to type the correct word first.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: '%s | WordWave' },
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'WordWave',
    locale: 'en_US',
    url: '/',
    images: [
      {
        url: '/social.png',
        alt: 'WordWave',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/social.png'],
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'WordWave',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#30327d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased overflow-x-hidden">
        <AudioGestureUnlock />
        <GoogleAnalytics />
        {children}
        <SiteFooter />
        {process.env.NODE_ENV === "production" ? <AdsenseDeferred /> : null}
        <AnalyticsLoader />
      </body>
    </html>
  )
}
