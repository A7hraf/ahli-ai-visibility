import { Suspense } from "react";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { loadDataset } from "@/lib/dataset";
import { PageHeader } from "@/components/ui";
import Queries from "@/components/dash/Queries";

export default async function QueriesPage() {
  const { lang } = await getT();
  const ui = UI[lang];
  const ds = await loadDataset();
  return (
    <>
      <PageHeader title={ui.queries.title} lead={ui.queries.sub} />
      <Suspense>
        <Queries ds={ds} ui={ui} lang={lang} />
      </Suspense>
    </>
  );
}
