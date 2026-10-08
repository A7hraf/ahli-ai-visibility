import type { Metadata } from "next";
import "./globals.css";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { ENGINES, configuredEngines, isDemoMode } from "@/lib/config";
import { getRuns } from "@/lib/metrics";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Ahli Bank · AI Visibility",
  description: "Tracks how AI assistants recommend Ahli Bank Oman, in Arabic and English.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getT();
  const ui = UI[lang];
  const demo = isDemoMode();
  const real = demo ? [] : configuredEngines();
  const mode = demo ? "demo" : real.length < ENGINES.length ? "hybrid" : "live";
  const runs = await getRuns().catch(() => []);
  const label = (ids: string[]) => ENGINES.filter((e) => ids.includes(e.id)).map((e) => e.label);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" />
      </head>
      <body>
        <div className="min-h-screen">
          <Sidebar nav={ui.nav} appName={t.appName} appSub={t.appSub} />
          <main className="min-w-0 lg:ms-64">
            <TopBar
              lang={lang}
              mode={mode}
              modeLabel={ui.status[mode]}
              real={label(real)}
              simulated={label(ENGINES.map((e) => e.id).filter((id) => !real.includes(id)))}
              realLabel={t.hybrid.banner}
              simLabel={demo ? t.demoBadge : t.hybrid.simulated}
              updated={runs.length ? runs[runs.length - 1].started_at.slice(0, 10) : null}
              updatedLabel={ui.status.updated}
              run={{ run: t.runNow, running: t.running, done: t.runDone, failed: t.runFailed }}
            />
            <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-7">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
