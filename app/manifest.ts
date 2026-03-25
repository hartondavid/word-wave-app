import type { MetadataRoute } from "next"

/**
 * Web App Manifest — folosit de browsere pentru instalare PWA (icon, nume, standalone).
 * Next.js expune automat la /manifest.webmanifest și adaugă <link rel="manifest">.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WordWave - Multiplayer Word Guessing Game",
    short_name: "WordWave",
    description:
      "Compete head-to-head in this fast-paced word guessing game! Race to type the correct word first.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f4f6fb",
    theme_color: "#30327d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
