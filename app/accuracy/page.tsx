import { getT } from "@/lib/i18n";
import { UI, fill } from "@/lib/ui-text";
import { all } from "@/lib/db";
import { openAlerts } from "@/lib/metrics";
import { engineLabel, ENGINES } from "@/lib/config";
import { currentUser } from "@/lib/auth";
import { Badge, Card, PageHeader } from "@/components/ui";
import { BarList } from "@/components/viz/core";
import { FactEditor, AlertToggle } from "@/components/AccuracyControls";
import type { Fact } from "@/lib/types";

export default async function AccuracyPage() {
  const { lang, t } = await getT();
  const ui = UI[lang];
  const [facts, alerts, me] = await Promise.all([all<Fact>("SELECT * FROM facts ORDER BY product, id"), openAlerts(100), currentUser()]);
  const canEdit = me?.role === "admin";
  const label = (field: string) => {
    const f = facts.find((x) => x.field === field);
    return f ? (lang === "ar" ? f.label_ar : f.label_en) : field;
  };
  const open = alerts.filter((a) => a.status === "open").length;
  const byField = [...new Set(alerts.map((a) => a.field))].map((fd) => ({ fd, n: alerts.filter((a) => a.field === fd).length })).sort((x, y) => y.n - x.n);
  const worst = byField[0] ? label(byField[0].fd) : "–";
  const ar = lang === "ar";
  const sorted = [...alerts].sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open"));
  const table = (list: typeof alerts) =>
    list.length === 0 ? null : (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] font-bold text-ink-2">
                  <th className="px-5 py-2.5 text-start sm:px-6">{t.accuracy.question}</th>
                  <th className="px-2 py-2.5 text-start">{ar ? "المساعد" : "Assistant"}</th>
                  <th className="px-2 py-2.5 text-start">{t.accuracy.field}</th>
                  <th className="px-2 py-2.5 text-start">{t.accuracy.said}</th>
                  <th className="px-2 py-2.5 text-start">{t.accuracy.expected}</th>
                  <th className="px-5 py-2.5 sm:px-6" />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className={`border-b border-line transition last:border-0 hover:bg-slate-100 ${a.status === "resolved" ? "opacity-60" : ""}`}>
                    <td className="max-w-[300px] px-5 py-3.5 sm:px-6">
                      <p dir="auto" className="line-clamp-2 text-ink">
                        {a.prompt_text}
                      </p>
                    </td>
                    <td className="px-2 py-3.5">
                      <span className="flex items-center gap-1.5 font-bold text-ink">
                        <span className="h-2 w-2 rounded-full" style={{ background: ENGINES.find((e) => e.id === a.engine)?.color }} />
                        {engineLabel(a.engine)}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-ink-2">{label(a.field)}</td>
                    <td className="num px-2 py-3.5 font-bold text-bad">✗ {a.said}</td>
                    <td className="num px-2 py-3.5 font-bold text-good">✓ {a.expected}</td>
                    <td className="px-5 py-3.5 text-end sm:px-6">
                      <AlertToggle id={Number(a.id)} status={a.status} labels={{ resolve: t.accuracy.resolve, reopen: t.accuracy.reopen, resolved: t.accuracy.resolved }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
    );

  return (
    <>
      <PageHeader
        kicker={ui.kick.accuracy}
        title={t.accuracy.title}
        lead={alerts.length ? fill(ar ? "عندنا {n} تنبيهات مفتوحة، وأكثر معلومة تنقال غلط هي {f}." : "We have {n} open alerts; the most misquoted fact is {f}.", { n: open, f: worst }) : t.accuracy.lead}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div className={`rise lift flex flex-col gap-2 rounded-[4px] border p-5 ${open ? "border-[#FBD3E0] bg-bad-soft" : "border-line bg-white"}`}>
          <p className={`text-[14px] font-bold ${open ? "text-bad" : "text-ink"}`}>{ar ? "تنبيهات مفتوحة" : "Open alerts"}</p>
          <p className={`font-display text-[36px] leading-none ${open ? "text-bad" : "text-good"}`}>{open}</p>
        </div>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{ar ? "تم حلها" : "Fixed"}</p>
          <p className="font-display text-[36px] leading-none text-good">{alerts.length - open}</p>
        </div>
        <div className="rise lift flex flex-col gap-2 rounded-[4px] border border-line bg-white p-5">
          <p className="text-[14px] font-bold text-ink">{ar ? "أكثر معلومة غلط" : "Most misquoted"}</p>
          <p className="font-display text-[24px] leading-tight text-navy">{worst}</p>
        </div>
      </div>

      <Card title={t.accuracy.alerts} note="AI said vs approved" className="mb-5">
        <p className="mb-4 text-[14px] text-ink-2">{ar ? "قارن اللي قاله المساعد بالرقم المعتمد، وعلّمه «تم الحل» بعد التصحيح." : "Compare what the assistant said with the approved figure, and mark it fixed once corrected."}</p>
        {alerts.length === 0 ? (
          <p className="rounded-[4px] bg-good-soft p-4 text-sm text-good">✓ {t.accuracy.none}</p>
        ) : (
          <>
            {table(sorted.filter((a) => a.status === "open"))}
            {alerts.length - open > 0 && (
              <details className="group mt-4 border-t border-line pt-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[13.5px] font-bold text-good">
                  <span className="transition group-open:rotate-90 rtl:rotate-180 rtl:group-open:rotate-90">›</span>
                  {ar ? "تم حلها" : "Fixed"} ({alerts.length - open})
                </summary>
                <div className="mt-2">{table(sorted.filter((a) => a.status !== "open"))}</div>
              </details>
            )}
          </>
        )}
      </Card>

      <div className="grid gap-5 xl:grid-cols-12">
        <Card title={t.accuracy.truth} note="Source of truth" className="xl:col-span-7">
          <p className="mb-3 text-[14px] text-ink-2">{t.accuracy.truthNote}</p>
          {!canEdit && <p className="mb-3 rounded-[4px] bg-slate-100 px-3 py-2 text-[12.5px] text-ink-muted">{ui.users.adminOnly}</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {facts.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 rounded-[4px] border border-line p-3.5 transition hover:border-line-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] font-bold text-ink-2">{ar ? f.label_ar : f.label_en}</span>
                  <Badge>{t.products[f.product as keyof typeof t.products]}</Badge>
                </div>
                <FactEditor id={Number(f.id)} value={f.value} unit={f.unit} canEdit={canEdit} labels={{ edit: t.accuracy.edit, save: t.accuracy.save }} />
                {f.note && <p className={`text-xs ${f.note.startsWith("Sample") ? "text-warn" : "text-ink-soft"}`}>{f.note.startsWith("Sample") ? (ar ? "قيمة مثال: استبدلها بالرقم المعتمد." : f.note) : f.note}</p>}
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex flex-col gap-5 xl:col-span-5">
          <Card title={ar ? "التنبيهات حسب المساعد" : "Alerts by assistant"} note="Since launch">
            <BarList unit="" items={ENGINES.map((e) => ({ key: e.id, label: e.label, value: alerts.filter((a) => a.engine === e.id).length, color: e.color }))} />
          </Card>
          <Card title={ar ? "أكثر المعلومات خطأً" : "Most misquoted facts"} note={ar ? "عدد مرات ذكر رقم مختلف عن المعتمد" : "Times AI quoted a different figure"}>
            <BarList unit="" labelWidth="w-44" items={byField.map((x) => ({ key: x.fd, label: label(x.fd), value: x.n, color: "#D6006C" }))} />
          </Card>
        </div>
      </div>
    </>
  );
}
