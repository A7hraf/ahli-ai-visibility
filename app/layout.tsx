import type { Metadata } from "next";
import "./globals.css";
import { getT } from "@/lib/i18n";
import { ENGINES, configuredEngines, isDemoMode } from "@/lib/config";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Ahli Bank · AI Visibility Monitor",
  description: "Tracks how AI assistants talk about Ahli Bank Oman, in Arabic and English.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getT();
  const demo = isDemoMode();
  const real = demo ? [] : configuredEngines();
  const hybrid = !demo && real.length < ENGINES.length;
  const label = (ids: string[]) => ENGINES.filter((e) => ids.includes(e.id)).map((e) => e.label).join(lang === "ar" ? "، " : ", ");
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
          <Sidebar lang={lang} t={{ nav: t.nav, nav2: t.nav2, appName: t.appName, appSub: t.appSub, footer: t.footer }} demo={demo} demoLabel={t.demoBadge} liveLabel={t.liveBadge} />
          <main className="min-w-0 flex-1">
            {hybrid && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-white px-4 py-2.5 text-sm sm:px-8">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-good-soft px-2.5 py-0.5 text-xs font-semibold text-good">
                  <span className="h-1.5 w-1.5 rounded-full bg-good" />
                  {t.hybrid.banner}: {label(real)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-700">
                  {t.hybrid.simulated}: {label(ENGINES.map((e) => e.id).filter((id) => !real.includes(id)))}
                </span>
                <span className="text-xs text-ink-muted">{t.hybrid.history}</span>
              </div>
            )}
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
