import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AnalyticsLoader } from '@/components/analytics-loader'
import { AudioGestureUnlock } from '@/components/audio-gesture-unlock'
import { GoogleAnalytics } from '@/components/google-analytics'
import { SiteFooter } from '@/components/site-footer'
import './globals.css'

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
})

/**
 * URL canonic pentru og:image / metadataBase.
 * - Preferă NEXT_PUBLIC_SITE_URL (ex. https://wordwave.live) în Vercel → Environment Variables.
 * - Apoi VERCEL_PROJECT_PRODUCTION_URL = domeniul de producție (custom domain), NU *.vercel.app.
 *   WhatsApp / alte aplicații refuză adesea thumbnail dacă og:image e pe alt host decât linkul.
 * - VERCEL_URL e doar ultimul fallback (preview *.vercel.app).
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000')

/** Google AdSense: native script in head (next/script adds data-nscript, which AdSense warns about). */
const ADSENSE_CLIENT = 'ca-pub-9976449948294413'

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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {process.env.NODE_ENV === 'production' ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className="font-sans antialiased overflow-x-hidden">
        <AudioGestureUnlock />
        <GoogleAnalytics />
        {children}
        <SiteFooter />
        <AnalyticsLoader />
      </body>
    </html>
  )
}
