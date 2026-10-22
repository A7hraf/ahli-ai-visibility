import { Suspense } from "react";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { loadDataset } from "@/lib/dataset";
import Queries from "@/components/dash/Queries";

export default async function QueriesPage() {
  const { lang } = await getT();
  const ui = UI[lang];
  const ds = await loadDataset();
  return (
    <>
      <Suspense>
        <Queries ds={ds} ui={ui} lang={lang} />
      </Suspense>
    </>
  );
}
