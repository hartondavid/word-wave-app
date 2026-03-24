/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/favicon.png",
        permanent: true,
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Folosește Image Optimization pe Vercel (WebP/AVIF, resize) — îmbunătățește LCP vs unoptimized.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 112, 128, 160, 192, 256],
    qualities: [40, 45, 50, 60, 75],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  poweredByHeader: false,
}

export default nextConfig
