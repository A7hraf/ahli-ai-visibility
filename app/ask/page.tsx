import { getT } from "@/lib/i18n";
import { BRAND, COMPETITORS, ENGINES, configuredEngines, isDemoMode } from "@/lib/config";
import { UI } from "@/lib/ui-text";
import { currentUser } from "@/lib/auth";
import AskClient from "@/components/AskClient";

export default async function AskPage() {
  const { lang, t } = await getT();
  const demo = isDemoMode();
  const me = await currentUser();
  const real = demo ? [] : configuredEngines();
  const examples =
    lang === "ar"
      ? ["أريد أفتح حساب في سلطنة عمان، أي بنك أختار؟", "أفضل بنك للتمويل الشخصي للموظف الحكومي في عمان", "أي بنك في عمان عنده أفضل بطاقة للسفر؟"]
      : ["I want to open a bank account in Oman. Which bank should I choose?", "Best bank in Oman for a car loan", "Which Omani bank has the best mobile app?"];
  return (
    <>
      <AskClient
        t={t.ask}
        lang={lang}
        demo={demo}
        engines={ENGINES.map((e) => ({ id: e.id, label: e.label, color: e.color, simulated: !real.includes(e.id) }))}
        examples={examples}
        brandAliases={BRAND.aliases}
        competitorAliases={COMPETITORS.flatMap((c) => c.aliases.filter((a) => a.length > 3))}
        head={{ kicker: UI[lang].kick.ask, title: t.ask.title, lead: t.ask.lead, empty: lang === "ar" ? "اكتب سؤالاً واضغط «اسأل المساعدين»" : "Type a question and press Ask the assistants" }}
        canSave={me?.role === "admin"}
      />
    </>
  );
}
