import type { Metadata } from "next";
import "./globals.css";
import { getT } from "@/lib/i18n";
import { isDemoMode } from "@/lib/config";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Ahli Bank · AI Visibility Monitor",
  description: "Tracks how AI assistants talk about Ahli Bank Oman, in Arabic and English.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getT();
  const demo = isDemoMode();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Rubik:wght@500;600;700&display=swap"
        />
      </head>
      <body>
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar lang={lang} t={{ nav: t.nav, appName: t.appName, appSub: t.appSub, footer: t.footer }} demo={demo} demoLabel={t.demoBadge} liveLabel={t.liveBadge} />
          <main className="min-w-0 flex-1">
            {demo && (
              <div className="border-b border-gold-100 bg-gold-50 px-4 py-2.5 text-sm text-gold-700 sm:px-8">
                <span className="me-2 inline-block rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-white">{t.demoBadge}</span>
                {t.demoBanner}
              </div>
            )}
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
