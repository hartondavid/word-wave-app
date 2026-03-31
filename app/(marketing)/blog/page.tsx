import { redirect } from "next/navigation"

/** URL vechi /blog → versiunea EN (canonical pentru index). */
export default function BlogLegacyIndexRedirect() {
  redirect("/en/blog")
}
