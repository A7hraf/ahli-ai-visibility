import { getT } from "@/lib/i18n";
import { COMPETITORS, ENGINES, env, isDemoMode, repeats } from "@/lib/config";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import AdminTokenField from "@/components/AdminTokenField";

export default async function SettingsPage() {
  const { lang, t } = await getT();
  const demo = isDemoMode();
  return (
    <>
      <PageHeader title={t.settings.title} lead={t.settings.lead} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t.settings.engines}>
          <ul className="flex flex-col divide-y divide-line">
            {ENGINES.map((e) => {
              const on = !!env(e.envKey);
              return (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                  <span className="font-medium">{e.label}</span>
                  <span className="text-xs text-ink-soft">{e.webSearch ? t.settings.webSearch : t.settings.memoryOnly}</span>
                  <span className="ms-auto flex items-center gap-2">
                    <code dir="ltr" className="hidden rounded bg-canvas px-1.5 py-0.5 text-[11px] text-ink-muted sm:inline">{e.envKey}</code>
                    <Badge tone={on ? "good" : demo ? "muted" : "gold"}>{on ? t.settings.connected : demo ? t.settings.notConnected : t.hybrid.badge}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
            <div><p className="text-xs text-ink-muted">{t.settings.mode}</p><p className="mt-1 font-semibold">{demo ? t.settings.demo : t.settings.live}</p></div>
            <div><p className="text-xs text-ink-muted">{t.settings.repeats}</p><p className="num mt-1 font-semibold">{repeats()}</p></div>
            <div className="col-span-2"><p className="text-xs text-ink-muted">{t.settings.schedule}</p><p className="mt-1 font-semibold">{t.settings.scheduleValue}</p></div>
          </div>
        </Card>

        <Card title={t.settings.howTo}>
          <ol className="flex flex-col gap-4">
            {t.settings.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-semibold text-gold-400">{i + 1}</span>
                <p className="pt-0.5 text-sm leading-relaxed">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t border-line pt-5">
            <AdminTokenField lang={lang} />
          </div>
        </Card>

        <Card title={t.settings.privacy}>
          <ul className="flex flex-col gap-3">
            {t.settings.privacyItems.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 text-good"><Icon name="shield" size={17} /></span>
                {p}
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t.settings.competitors}>
          <div className="flex flex-wrap gap-2">
            {COMPETITORS.map((c) => (<Badge key={c.name}>{c.name}</Badge>))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">{lang === "ar" ? "لتعديل القائمة: lib/config.ts" : "Edit the list in lib/config.ts"}</p>
        </Card>
      </div>
    </>
  );
}
