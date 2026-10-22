import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { actionViews, CATEGORY_COLOR } from "@/lib/actions";
import { CATEGORY_TINT } from "@/lib/plan";
import { projection } from "@/lib/projection";
import PlanBoard from "@/components/dash/PlanBoard";

export default async function PlanPage() {
  const { lang, t } = await getT();
  const actions = await actionViews();
  const proj = await projection(actions);
  return (
    <>
      <PlanBoard
        actions={actions}
        colors={CATEGORY_COLOR}
        tints={CATEGORY_TINT}
        ui={UI[lang]}
        lang={lang}
        t={{ plan: t.plan, cats: t.cats, catsHint: t.catsHint, status: t.status, effort: t.effort, products: t.products, home: t.home }}
        proj={proj ? { current: proj.current, target: proj.target, points: proj.points } : null}
      />
    </>
  );
}
