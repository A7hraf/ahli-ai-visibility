import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { ENGINES, configuredEngines, isDemoMode } from "@/lib/config";
import { getRuns } from "@/lib/metrics";
import { all } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Sada · Ahli Bank AI Visibility",
  description: "Tracks how AI assistants recommend Ahli Bank Oman, in Arabic and English.",
};

export const dynamic = "force-dynamic";

const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@500;600;700&family=Source+Serif+4:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getT();
  const ui = UI[lang];
  const user = await currentUser();
  const head = (
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href={FONTS} />
    </head>
  );

  // signed out: only the login page renders, without the app shell
  if (!user)
    return (
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
        {head}
        <body>{children}</body>
      </html>
    );

  const demo = isDemoMode();
  const real = demo ? [] : configuredEngines();
  const mode = demo ? "demo" : real.length < ENGINES.length ? "hybrid" : "live";
  const [runs, alerts, prompts] = await Promise.all([
    getRuns().catch(() => []),
    all<{ n: number }>("SELECT COUNT(*) AS n FROM alerts WHERE status = 'open'").catch(() => [{ n: 0 }]),
    all<{ product: string; persona: string }>("SELECT DISTINCT product, persona FROM prompts").catch(() => []),
  ]);
  const label = (ids: string[]) => ENGINES.filter((e) => ids.includes(e.id)).map((e) => e.label);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      {head}
      <body>
        <div className="min-h-screen">
          <Sidebar
            nav={ui.nav}
            appName={ui.auth.appName}
            appSub={ui.auth.appSub}
            user={{ name: user.name, email: user.email, role: user.role, roleLabel: ui.auth.roles[user.role] }}
            alerts={Number(alerts[0]?.n ?? 0)}
            signout={ui.auth.signout}
          />
          <main className="min-w-0 lg:ms-64">
            <Suspense>
              <TopBar
                lang={lang}
                ui={ui}
                mode={mode}
                real={label(real)}
                simulated={label(ENGINES.map((e) => e.id).filter((id) => !real.includes(id)))}
                realLabel={t.hybrid.banner}
                simLabel={demo ? t.demoBadge : t.hybrid.simulated}
                updated={runs.length ? runs[runs.length - 1].started_at.slice(0, 10) : null}
                run={{ run: t.runNow, running: t.running, done: t.runDone, failed: t.runFailed }}
                canRun={user.role === "admin"}
                engines={ENGINES.map((e) => ({ id: e.id, label: e.label, color: e.color }))}
                products={[...new Set(prompts.map((p) => p.product))]}
                personas={[...new Set(prompts.map((p) => p.persona))]}
              />
            </Suspense>
            <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-4 sm:px-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
