import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n";
import { UI } from "@/lib/ui-text";
import { BRAND, COMPETITORS, ENGINES } from "@/lib/config";
import { all } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await currentUser()) redirect("/");
  const { lang } = await getT();
  const a = UI[lang].auth;
  const { next } = await searchParams;
  const nPrompts = Number((await all<{ n: number }>("SELECT COUNT(*) AS n FROM prompts WHERE active = 1").catch(() => [{ n: 0 }]))[0]?.n ?? 0);
  const banks = [BRAND, ...COMPETITORS];
  const chip = (i: number) => ({ c: banks[i].color, t: lang === "ar" ? (i === 0 ? BRAND.nameAr : banks[i].aliases.find((x) => /[؀-ۿ]/.test(x)) ?? banks[i].name) : banks[i].name, brand: i === 0 });
  const answer = [chip(1), chip(2), chip(0)];
  const stats = [
    { v: ENGINES.length, l: a.st1 },
    { v: nPrompts, l: a.st2 },
    { v: banks.length, l: a.st3 },
  ];
  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      {/* the story side */}
      <section className="relative flex flex-col gap-9 overflow-hidden bg-navy px-6 py-10 text-white sm:px-12 lg:py-11">
        <div>
          <p className="font-display text-[28px] leading-none">{a.appName}</p>
          <p className="mt-1 text-[12px] text-white/70">{a.appSub}</p>
        </div>
        <div className="flex max-w-[540px] flex-col gap-4">
          <p className="text-[12px] font-bold tracking-wide text-gold-400" dir="ltr" style={{ textAlign: "start" }}>
            {ENGINES.map((e) => e.label).join(" · ")}
          </p>
          <h1 className="font-display text-[34px] leading-[1.15] sm:text-[48px]">{a.hero}</h1>
          <p className="text-[16px] leading-relaxed text-white/80">{a.lead}</p>
        </div>
        <div className="relative max-w-[560px] flex-1">
          <div className="rise flex w-full max-w-[420px] flex-col gap-3 rounded-[10px] bg-white/[0.97] p-4 text-ink shadow-pop sm:p-5">
            <p className="self-start rounded-[4px] bg-navy px-3 py-2 text-[13.5px] text-white">{a.sampleQ}</p>
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-bold text-white" style={{ background: ENGINES[0].color }}>
                {ENGINES[0].label[0]}
              </span>
              <p className="text-[13.5px] leading-[2]">
                {answer.map((c, i) => (
                  <span key={i}>
                    {i > 0 && (lang === "ar" ? " و" : i === answer.length - 1 ? " and " : ", ")}
                    <span className="rounded-[3px] px-1.5 py-0.5 font-bold" style={{ background: c.c, color: c.brand ? "#1a1608" : "#fff" }}>
                      {c.t}
                    </span>
                  </span>
                ))}
                {lang === "ar" ? " من الخيارات الشائعة لحساب الراتب." : " are popular choices for a salary account."}
              </p>
            </div>
            <span className="self-end rounded-[3px] bg-good-soft px-2 py-1 text-[12px] font-bold text-good">✓ {a.verdict}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-9">
          {stats.map((s) => (
            <div key={s.l} className="flex flex-col gap-1">
              <span className="font-display text-[30px] leading-none text-gold-400">{s.v}</span>
              <span className="text-[12.5px] text-white/75">{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* the sign-in side */}
      <LoginForm lang={lang} a={a} next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} />
    </div>
  );
}
