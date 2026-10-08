import { Suspense } from "react";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { loadDataset } from "@/lib/dataset";
import { PageHeader } from "@/components/ui";
import Competitors from "@/components/dash/Competitors";

export default async function CompetitorsPage() {
  const { lang } = await getT();
  const ui = UI[lang];
  const ds = await loadDataset();
  return (
    <>
      <PageHeader title={ui.competitors.title} lead={ui.competitors.sub} />
      <Suspense>
        <Competitors ds={ds} ui={ui} lang={lang} />
      </Suspense>
    </>
  );
}
