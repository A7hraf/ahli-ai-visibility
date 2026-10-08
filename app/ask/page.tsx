import { getT } from "@/lib/i18n";
import { BRAND, COMPETITORS, ENGINES, configuredEngines, isDemoMode } from "@/lib/config";
import { PageHeader } from "@/components/ui";
import AskClient from "@/components/AskClient";

export default async function AskPage() {
  const { lang, t } = await getT();
  const demo = isDemoMode();
  const available = demo ? ENGINES.map((e) => e.id) : configuredEngines();
  const examples =
    lang === "ar"
      ? ["أريد أفتح حساب في سلطنة عمان، أي بنك أختار؟", "أفضل بنك للتمويل الشخصي للموظف الحكومي في عمان", "أي بنك في عمان عنده أفضل بطاقة للسفر؟"]
      : ["I want to open a bank account in Oman. Which bank should I choose?", "Best bank in Oman for a car loan", "Which Omani bank has the best mobile app?"];
  return (
    <>
      <PageHeader title={t.ask.title} lead={t.ask.lead} />
      <AskClient
        t={t.ask}
        lang={lang}
        demo={demo}
        engines={ENGINES.filter((e) => available.includes(e.id)).map((e) => ({ id: e.id, label: e.label, color: e.color }))}
        examples={examples}
        brandAliases={BRAND.aliases}
        competitorAliases={COMPETITORS.flatMap((c) => c.aliases.filter((a) => a.length > 3))}
      />
    </>
  );
}
