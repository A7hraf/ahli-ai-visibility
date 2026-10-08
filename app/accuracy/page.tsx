import { getT } from "@/lib/i18n";
import { all } from "@/lib/db";
import { openAlerts } from "@/lib/metrics";
import { engineLabel } from "@/lib/config";
import { Badge, Card, PageHeader } from "@/components/ui";
import { BarList, Donut, Legend } from "@/components/viz/core";
import { CHANNEL_COLORS } from "@/lib/dataset";
import { ENGINES } from "@/lib/config";
import { FactEditor, AlertToggle } from "@/components/AccuracyControls";
import type { Fact } from "@/lib/types";

export default async function AccuracyPage() {
  const { lang, t } = await getT();
  const facts = await all<Fact>("SELECT * FROM facts ORDER BY product, id");
  const alerts = await openAlerts(100);
  const label = (field: string) => {
    const f = facts.find((x) => x.field === field);
    return f ? (lang === "ar" ? f.label_ar : f.label_en) : field;
  };
  const open = alerts.filter((a) => a.status === "open").length;

  return (
    <>
      <PageHeader title={t.accuracy.title} lead={t.accuracy.lead} />

      <div className="mb-6 grid gap-4 lg:grid-cols-12">
        <Card title={lang === "ar" ? "حالة التنبيهات" : "Alert status"} className="lg:col-span-4">
          <Donut
            size={160}
            thickness={18}
            data={[
              { key: "open", label: t.accuracy.open, value: open, color: "#d03b3b" },
              { key: "resolved", label: t.accuracy.resolved, value: alerts.length - open, color: "#1D7A47" },
            ]}
            center={
              <>
                <span className={`text-[32px] font-extrabold leading-none ${open ? "text-bad" : "text-good"}`}>{open}</span>
                <span className="mt-1 text-[11px] text-ink-muted">{t.accuracy.open}</span>
              </>
            }
          />
          <Legend
            className="mt-4 justify-center"
            items={[
              { label: t.accuracy.open, color: "#d03b3b", value: open },
              { label: t.accuracy.resolved, color: "#1D7A47", value: alerts.length - open },
            ]}
          />
        </Card>
        <Card title={lang === "ar" ? "التنبيهات حسب القناة" : "Alerts by AI channel"} note={lang === "ar" ? "كل التنبيهات المسجلة" : "All alerts recorded"} className="lg:col-span-4">
          <BarList
            unit=""
            items={ENGINES.map((e, i) => ({ key: e.id, label: e.label, value: alerts.filter((a) => a.engine === e.id).length, color: CHANNEL_COLORS[i] })).filter((x) => x.value > 0)}
          />
        </Card>
        <Card title={lang === "ar" ? "أكثر المعلومات خطأً" : "Most misquoted facts"} note={lang === "ar" ? "عدد مرات ذكر رقم مختلف عن المعتمد" : "Times AI quoted a different figure"} className="lg:col-span-4">
          <BarList
            unit=""
            labelWidth="w-44"
            items={[...new Set(alerts.map((a) => a.field))]
              .map((fd) => ({ key: fd, label: label(fd), value: alerts.filter((a) => a.field === fd).length, color: "#eb6834" }))
              .sort((x, y) => y.value - x.value)}
          />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card title={t.accuracy.truth} note={t.accuracy.truthNote} className="xl:col-span-2">
          <ul className="flex flex-col divide-y divide-line">
            {facts.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-navy">{lang === "ar" ? f.label_ar : f.label_en}</span>
                  <Badge>{t.products[f.product as keyof typeof t.products]}</Badge>
                </div>
                <FactEditor id={Number(f.id)} value={f.value} unit={f.unit} labels={{ edit: t.accuracy.edit, save: t.accuracy.save }} />
                {f.note && <p className={`text-xs ${f.note.startsWith("Sample") ? "text-warn" : "text-ink-soft"}`}>{f.note.startsWith("Sample") ? (lang === "ar" ? "قيمة مثال: استبدلها بالرقم المعتمد." : f.note) : f.note}</p>}
              </li>
            ))}
          </ul>
        </Card>

        <Card title={`${t.accuracy.alerts} (${open} ${t.accuracy.open})`} className="xl:col-span-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-ink-muted">{t.accuracy.none}</p>
          ) : (
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-[12px] uppercase tracking-wide text-ink-muted">
                    <th className="px-5 py-2.5 text-start font-medium sm:px-6">{t.accuracy.question}</th>
                    <th className="px-2 py-2.5 text-start font-medium">{t.accuracy.field}</th>
                    <th className="px-2 py-2.5 text-start font-medium">{t.accuracy.said}</th>
                    <th className="px-2 py-2.5 text-start font-medium">{t.accuracy.expected}</th>
                    <th className="px-5 py-2.5 sm:px-6" />
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id} className={`border-b border-line last:border-0 ${a.status === "resolved" ? "opacity-55" : ""}`}>
                      <td className="max-w-[260px] px-5 py-3 sm:px-6">
                        <Badge tone="brand">{engineLabel(a.engine)}</Badge>
                        <p dir="auto" className="mt-1 truncate text-ink-muted">{a.prompt_text}</p>
                      </td>
                      <td className="px-2 py-3">{label(a.field)}</td>
                      <td className="num px-2 py-3 font-semibold text-bad">{a.said}</td>
                      <td className="num px-2 py-3 font-semibold text-good">{a.expected}</td>
                      <td className="px-5 py-3 text-end sm:px-6">
                        <AlertToggle id={Number(a.id)} status={a.status} labels={{ resolve: t.accuracy.resolve, reopen: t.accuracy.reopen, resolved: t.accuracy.resolved }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
