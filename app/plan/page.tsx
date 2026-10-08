import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { actionViews, CATEGORY_COLOR } from "@/lib/actions";
import { projection } from "@/lib/projection";
import { PageHeader } from "@/components/ui";
import PlanBoard from "@/components/dash/PlanBoard";

export default async function PlanPage() {
  const { lang, t } = await getT();
  const actions = await actionViews();
  const proj = await projection(actions);
  return (
    <>
      <PageHeader title={UI[lang].nav.plan} lead={t.plan.lead} />
      <PlanBoard
        actions={actions}
        colors={CATEGORY_COLOR}
        ui={UI[lang]}
        lang={lang}
        t={{ plan: t.plan, cats: t.cats, catsHint: t.catsHint, status: t.status, effort: t.effort, products: t.products, home: t.home }}
        proj={proj ? { current: proj.current, target: proj.target, points: proj.points } : null}
      />
    </>
  );
}
