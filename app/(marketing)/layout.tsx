import { SiteNavbar } from "@/components/site-navbar"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNavbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        {children}
      </main>
    </>
  )
}
