import { Suspense } from "react";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { citationStats, getRuns } from "@/lib/metrics";
import { loadDataset } from "@/lib/dataset";
import { PageHeader } from "@/components/ui";
import Sources from "@/components/dash/Sources";

export default async function SourcesPage() {
  const { lang } = await getT();
  const ui = UI[lang];
  const [ds, runs] = await Promise.all([loadDataset(), getRuns()]);
  const last = runs[runs.length - 1];
  const ownPages = last ? (await citationStats(Number(last.id))).ownPages : [];
  return (
    <>
      <PageHeader title={ui.sources.title} lead={ui.sources.sub} />
      <Suspense>
        <Sources ds={ds} ui={ui} lang={lang} ownPages={ownPages} />
      </Suspense>
    </>
  );
}
