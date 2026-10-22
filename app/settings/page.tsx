import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { COMPETITORS, ENGINES, env, isDemoMode, repeats } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { listUsers, usingDefaultPasswords } from "@/lib/users";
import { Card, PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { MyPassword, TeamAccounts } from "@/components/TeamAccounts";

export default async function SettingsPage() {
  const { lang, t } = await getT();
  const ui = UI[lang];
  const demo = isDemoMode();
  const me = await currentUser();
  const admin = me?.role === "admin";
  const users = admin ? await listUsers() : [];
  return (
    <>
      <PageHeader kicker={ui.kick.settings} title={t.settings.title} lead={t.settings.lead} />
      {admin && usingDefaultPasswords() && (
        <p className="mb-5 flex items-start gap-2 rounded-[4px] border border-gold/40 bg-gold-50 px-4 py-3 text-[13px] text-gold-700">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
          {ui.users.defaultWarn}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-12">
        {admin && (
          <Card title={ui.users.title} note={ui.users.term} className="lg:col-span-8">
            <TeamAccounts initial={users} me={me!.uid} ui={ui} lang={lang} />
          </Card>
        )}
        <Card title={ui.users.account} note={me?.email} className={admin ? "lg:col-span-4" : "lg:col-span-5"}>
          <p className="mb-4 flex items-center gap-2 text-[13px] text-ink-2">
            <span className={`h-2.5 w-2.5 rounded-full ${admin ? "bg-navy" : "bg-gold"}`} />
            <b>{me ? ui.auth.roles[me.role] : ""}</b>
          </p>
          <MyPassword ui={ui} />
        </Card>

        <Card title={t.settings.engines} note="Data sources" className="lg:col-span-7">
          {!admin && <p className="mb-3 rounded-[4px] bg-slate-100 px-3 py-2 text-[12.5px] text-ink-muted">{ui.users.adminOnly}</p>}
          <ul className="flex flex-col divide-y divide-line">
            {ENGINES.map((e) => {
              const on = !!env(e.envKey);
              return (
                <li key={e.id} className="flex items-center gap-3 py-3.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color }} />
                  <span>
                    <span className="block text-[14.5px] font-bold text-ink">{e.label}</span>
                    <span className="block text-[12px] text-ink-soft">{e.webSearch ? t.settings.webSearch : t.settings.memoryOnly}</span>
                  </span>
                  <span className="ms-auto flex items-center gap-3">
                    {admin && <code dir="ltr" className="hidden rounded-[3px] bg-slate-100 px-1.5 py-0.5 text-[11px] text-ink-muted sm:inline">{e.envKey}</code>}
                    <span className={`rounded-[3px] px-2 py-0.5 text-[12px] font-bold ${on ? "bg-good-soft text-good" : "bg-slate-200 text-ink-muted"}`}>{on ? t.settings.connected : demo ? t.settings.notConnected : t.hybrid.badge}</span>
                    <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition ${on ? "bg-navy" : "bg-slate-300"}`}>
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "end-0.5" : "start-0.5"}`} />
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={t.settings.schedule} note="Weekly run" className="lg:col-span-5">
          <p className="mb-4 flex items-center gap-2 rounded-[4px] bg-slate-100 px-3.5 py-3 text-[14px] font-bold text-ink">
            <Icon name="play" size={15} />
            {t.settings.scheduleValue}
          </p>
          <dl className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-ink-muted">{t.settings.mode}</dt>
              <dd className="mt-1 font-bold text-ink">{demo ? t.settings.demo : t.settings.live}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">{t.settings.repeats}</dt>
              <dd className="num mt-1 font-bold text-ink">{repeats()}×</dd>
            </div>
          </dl>
          {admin && (
            <ol className="mt-5 flex flex-col gap-3 border-t border-line pt-5">
              {t.settings.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-bold text-gold-400">{i + 1}</span>
                  <p className="text-[13px] leading-relaxed text-ink-2">{s}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title={t.settings.privacy} className={admin ? "lg:col-span-6" : "lg:col-span-7"}>
          <ul className="flex flex-col gap-3">
            {t.settings.privacyItems.map((p, i) => (
              <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-2">
                <span className="mt-0.5 text-good">
                  <Icon name="shield" size={17} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </Card>

        <Card title={t.settings.competitors} className={admin ? "lg:col-span-6" : "lg:col-span-12"}>
          <div className="flex flex-wrap gap-2">
            {COMPETITORS.map((c) => (
              <span key={c.name} className="flex items-center gap-2 rounded-[4px] border border-line px-2.5 py-1.5 text-[13px] text-ink-2">
                <span className="rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-bold text-white" style={{ background: c.color }}>
                  {c.short}
                </span>
                {c.name}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">{lang === "ar" ? "لتعديل القائمة: lib/config.ts" : "Edit the list in lib/config.ts"}</p>
        </Card>
      </div>
    </>
  );
}
