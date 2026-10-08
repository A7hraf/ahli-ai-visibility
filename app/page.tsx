import { Suspense } from "react";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { loadDataset } from "@/lib/dataset";
import { actionViews } from "@/lib/actions";
import { projection } from "@/lib/projection";
import { PageHeader } from "@/components/ui";
import Overview, { type PlanSnapshot } from "@/components/dash/Overview";

export default async function Home() {
  const { lang, t } = await getT();
  const ui = UI[lang];
  const [ds, actions] = await Promise.all([loadDataset(), actionViews()]);
  const proj = ds.runs.length ? await projection(actions) : null;
  const plan: PlanSnapshot | null = proj
    ? {
        done: actions.filter((a) => a.status === "done").length,
        doing: actions.filter((a) => a.status === "doing").length,
        todo: actions.filter((a) => a.status === "todo").length,
        current: proj.current,
        target: proj.target,
        points: proj.points,
        labels: { actual: t.home.actual, noAction: t.home.noAction, withPlan: t.home.withPlan, today: t.home.today, forecast: t.home.forecast },
      }
    : null;
  return (
    <>
      <PageHeader title={ui.overview.title} lead={ui.overview.sub} />
      <Suspense>
        <Overview ds={ds} ui={ui} lang={lang} plan={plan} />
      </Suspense>
    </>
  );
}
