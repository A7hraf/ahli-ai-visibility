import type { Lang } from "./types";

export type Category = "content" | "technical" | "partners" | "accuracy";
export type Status = "todo" | "doing" | "done";

type L = { en: string; ar: string };

export interface ActionDef {
  key: string;
  category: Category;
  priority: 1 | 2 | 3; // 1 = do first
  effort: "low" | "medium" | "high";
  impact: number; // expected lift in mention rate (percentage points) for its scope
  scope: { lang?: "ar" | "en"; product?: string };
  owner: L;
  title: L;
  problem: L; // what is wrong today, in plain words
  why: L; // why it matters
  steps: { en: string[]; ar: string[] };
  evidence?: string;
}

// The Bank's improvement plan, written for non-technical readers.
// Built from the public audit of 8 Oct 2026. Expected impact figures are planning assumptions, not guarantees.
export const ACTIONS: ActionDef[] = [
  {
    key: "arabic_qa",
    category: "content",
    priority: 1,
    effort: "medium",
    impact: 12,
    scope: { lang: "ar" },
    owner: { en: "Digital Marketing", ar: "التسويق الرقمي" },
    title: { en: "Answer customers' Arabic questions directly on the website", ar: "الإجابة عن أسئلة العملاء بالعربي مباشرة في الموقع" },
    problem: {
      en: "When customers ask in Arabic, the AI finds comparison sites and newspapers, not Ahli Bank pages. In a 10-question search test, Ahli Bank appeared in 0 results.",
      ar: "عندما يسأل العملاء بالعربي، يجد الذكاء الاصطناعي مواقع المقارنة والصحف، وليس صفحات البنك الأهلي. في اختبار بحث من 10 أسئلة، ظهر البنك الأهلي في 0 نتائج.",
    },
    why: { en: "AI assistants quote pages that answer the exact question. No answer page means no mention.", ar: "مساعدات الذكاء الاصطناعي تقتبس الصفحات التي تجيب عن السؤال نفسه. بدون صفحة إجابة، لا يُذكر البنك." },
    steps: {
      en: ["Collect the 30 most common questions from the call centre", "Write a short, clear Arabic answer page for each (steps, documents, time)", "Add the same in English", "Link them from each product page"],
      ar: ["اجمع أكثر 30 سؤالاً يسألها العملاء من مركز الاتصال", "اكتب لكل سؤال صفحة عربية قصيرة وواضحة (الخطوات، المستندات، المدة)", "أضف نسخة إنجليزية لكل صفحة", "اربطها من صفحة كل منتج"],
    },
  },
  {
    key: "guides",
    category: "content",
    priority: 1,
    effort: "medium",
    impact: 8,
    scope: {},
    owner: { en: "Digital Marketing + Product teams", ar: "التسويق الرقمي + فرق المنتجات" },
    title: { en: "Publish helpful guides like competitors do", ar: "نشر أدلة مفيدة كما يفعل المنافسون" },
    problem: {
      en: "Bank Dhofar publishes guides such as 'How to choose the best personal loan in Oman', and they appear in search results. Ahli Bank has no equivalent.",
      ar: "بنك ظفار ينشر أدلة مثل «كيف تختار أفضل قرض شخصي في عُمان»، وتظهر في نتائج البحث. البنك الأهلي ليس عنده محتوى مشابه.",
    },
    why: { en: "Guides answer the questions customers ask before they choose a bank, which is exactly when AI is asked.", ar: "الأدلة تجيب عن أسئلة العميل قبل أن يختار البنك، وهي اللحظة التي يسأل فيها الذكاء الاصطناعي." },
    steps: {
      en: ["Start with 5 guides: open an account, choose a personal loan, home finance for citizens, home finance for expats, travel cards", "Include real numbers and a last-updated date", "Publish in Arabic and English"],
      ar: ["ابدأ بخمسة أدلة: فتح حساب، اختيار تمويل شخصي، التمويل السكني للمواطنين، التمويل السكني للمقيمين، بطاقات السفر", "ضع أرقاماً حقيقية وتاريخ آخر تحديث", "انشرها بالعربي والإنجليزي"],
    },
    evidence: "https://www.bankdhofar.com/knowledge-centre/how-to-choose-the-best-personal-loan-in-oman/",
  },
  {
    key: "pdf_terms",
    category: "accuracy",
    priority: 1,
    effort: "low",
    impact: 4,
    scope: { product: "personal_finance" },
    owner: { en: "Digital Marketing + Web team", ar: "التسويق الرقمي + فريق الموقع" },
    title: { en: "Move loan terms out of old PDFs onto the product page", ar: "نقل شروط التمويل من ملفات PDF القديمة إلى صفحة المنتج" },
    problem: {
      en: "The personal-loan key facts exist as a 2024 PDF and a 2025 PDF, both visible to search engines. AI can quote the old rates.",
      ar: "بيان الحقائق للتمويل الشخصي موجود كملف PDF لعام 2024 وآخر لعام 2025، والاثنان ظاهران لمحركات البحث. قد يقتبس الذكاء الاصطناعي الأسعار القديمة.",
    },
    why: { en: "Wrong rates quoted by AI can mislead customers and create complaints.", ar: "الأسعار الخاطئة التي يذكرها الذكاء الاصطناعي قد تضلل العملاء وتسبب شكاوى." },
    steps: {
      en: ["Write current terms as text on the product page", "Delete or redirect the 2024 PDF", "Show 'Last updated' on the page"],
      ar: ["اكتب الشروط الحالية كنص في صفحة المنتج", "احذف ملف 2024 أو حوّله", "أظهر «آخر تحديث» في الصفحة"],
    },
    evidence: "https://ahlibank.om/assets/uploads/2024/01/ahlibank-KFS_Personal-Loan_Bilingual.pdf",
  },
  {
    key: "comparison_sites",
    category: "partners",
    priority: 1,
    effort: "low",
    impact: 6,
    scope: { lang: "ar" },
    owner: { en: "Digital Marketing", ar: "التسويق الرقمي" },
    title: { en: "Update Ahli Bank's listings on comparison websites", ar: "تحديث بيانات البنك الأهلي في مواقع المقارنة" },
    problem: {
      en: "Giraffy and YallaCompare are among the sources AI reads most in Arabic. On one, Ahli Bank was offer 12 of 20.",
      ar: "Giraffy وYallaCompare من أكثر المصادر التي يقرأها الذكاء الاصطناعي بالعربي. وفي أحدها جاء البنك الأهلي في المرتبة 12 من 20.",
    },
    why: { en: "If these sites show old or incomplete data, AI repeats it.", ar: "إذا كانت هذه المواقع تعرض بيانات قديمة أو ناقصة، يكررها الذكاء الاصطناعي." },
    steps: {
      en: ["Contact each comparison site", "Send current rates, fees and product names", "Check them every month"],
      ar: ["تواصل مع كل موقع مقارنة", "أرسل الأسعار والرسوم وأسماء المنتجات الحالية", "راجعها كل شهر"],
    },
    evidence: "https://giraffy.com/om/ar/finance/personal-loans",
  },
  {
    key: "crawler_access",
    category: "technical",
    priority: 1,
    effort: "low",
    impact: 5,
    scope: {},
    owner: { en: "IT Security + Web team", ar: "أمن المعلومات + فريق الموقع" },
    title: { en: "Let AI search engines read the website safely", ar: "السماح لمحركات بحث الذكاء الاصطناعي بقراءة الموقع بأمان" },
    problem: {
      en: "The website's bot protection blocked our automated reader. It may also block the official crawlers of ChatGPT, Claude and Perplexity.",
      ar: "حماية الموقع منعت أداة القراءة الآلية. وقد تمنع أيضاً الروبوتات الرسمية لـ ChatGPT وClaude وPerplexity.",
    },
    why: { en: "If AI cannot read the site, it relies only on what others say about the Bank.", ar: "إذا لم يستطع الذكاء الاصطناعي قراءة الموقع، فسيعتمد فقط على ما يقوله الآخرون عن البنك." },
    steps: {
      en: ["Review robots.txt and firewall rules with IT", "Allow only verified AI search crawlers", "Run the Website readiness check to confirm"],
      ar: ["راجع ملف robots.txt وقواعد جدار الحماية مع تقنية المعلومات", "اسمح فقط لروبوتات البحث الموثقة", "شغّل فحص جاهزية الموقع للتأكد"],
    },
  },
  {
    key: "brand_identity",
    category: "technical",
    priority: 2,
    effort: "low",
    impact: 3,
    scope: { lang: "en" },
    owner: { en: "Web team", ar: "فريق الموقع" },
    title: { en: "Make clear Ahli Bank Oman is not Ahlibank Qatar", ar: "توضيح أن البنك الأهلي عُمان ليس أهلي بنك قطر" },
    problem: {
      en: "Searching 'ahlibank personal finance' shows Qatar's ahlibank.com.qa next to ahlibank.om.",
      ar: "البحث عن «ahlibank personal finance» يُظهر موقع ahlibank.com.qa القطري بجانب ahlibank.om.",
    },
    why: { en: "AI can mix the two banks' products and rates.", ar: "قد يخلط الذكاء الاصطناعي بين منتجات وأسعار البنكين." },
    steps: {
      en: ["Write 'Ahli Bank Oman' in page titles", "Add organisation details (legal name, country, logo) in a format machines read (schema.org)"],
      ar: ["اكتب «البنك الأهلي عُمان» في عناوين الصفحات", "أضف بيانات المؤسسة (الاسم القانوني، الدولة، الشعار) بصيغة تقرأها الآلات (schema.org)"],
    },
    evidence: "https://www.ahlibank.com.qa/en/borrow/personal-loan",
  },
  {
    key: "press",
    category: "partners",
    priority: 2,
    effort: "medium",
    impact: 5,
    scope: {},
    owner: { en: "Corporate Communications", ar: "الاتصال المؤسسي" },
    title: { en: "Get product news into Omani media", ar: "نشر أخبار المنتجات في الإعلام العُماني" },
    problem: {
      en: "Competitors' offers appear in Oman Daily, Zawya, Times of Oman and Oman Observer. These news sites are sources AI trusts.",
      ar: "عروض المنافسين تظهر في جريدة عُمان وزاوية وتايمز أوف عُمان وعُمان أوبزرفر. هذه المواقع الإخبارية مصادر يثق بها الذكاء الاصطناعي.",
    },
    why: { en: "News coverage is how engines like DeepSeek, which answer from memory, learn about a bank.", ar: "التغطية الإعلامية هي الطريقة التي تتعرف بها محركات مثل DeepSeek، التي تجيب من ذاكرتها، على البنك." },
    steps: {
      en: ["Issue a press release for each product launch or offer", "Include clear numbers (rates, amounts)", "Publish in Arabic and English outlets"],
      ar: ["أصدر بياناً صحفياً لكل منتج أو عرض جديد", "ضع أرقاماً واضحة (النسب، المبالغ)", "انشر في وسائل عربية وإنجليزية"],
    },
  },
  {
    key: "duplicates",
    category: "technical",
    priority: 3,
    effort: "low",
    impact: 2,
    scope: {},
    owner: { en: "Web team", ar: "فريق الموقع" },
    title: { en: "One web address per page", ar: "عنوان واحد لكل صفحة في الموقع" },
    problem: {
      en: "Some product pages exist at two addresses, which splits their strength in search.",
      ar: "بعض صفحات المنتجات موجودة على عنوانين، فتتوزع قوتها في البحث.",
    },
    why: { en: "Search engines and AI favour one clear page per topic.", ar: "محركات البحث والذكاء الاصطناعي تفضّل صفحة واحدة واضحة لكل موضوع." },
    steps: {
      en: ["Choose the main address for each page", "Redirect the duplicate", "Add a canonical tag"],
      ar: ["اختر العنوان الرئيسي لكل صفحة", "حوّل العنوان المكرر إليه", "أضف وسم canonical"],
    },
    evidence: "https://ahlibank.om/personal-banking/loans/myloan/",
  },
  {
    key: "community",
    category: "partners",
    priority: 3,
    effort: "medium",
    impact: 2,
    scope: { lang: "en" },
    owner: { en: "Social Media team", ar: "فريق وسائل التواصل" },
    title: { en: "Answer customer questions in public forums", ar: "الإجابة عن أسئلة العملاء في المنتديات العامة" },
    problem: {
      en: "Reddit and expat forums are frequently cited when AI answers English questions. The Bank is not part of those conversations.",
      ar: "Reddit ومنتديات المقيمين تُستخدم كثيراً كمصادر عندما يجيب الذكاء الاصطناعي بالإنجليزي. البنك غير حاضر في هذه النقاشات.",
    },
    why: { en: "Real customer voices shape how AI describes a bank.", ar: "أصوات العملاء الحقيقية تشكّل طريقة وصف الذكاء الاصطناعي للبنك." },
    steps: {
      en: ["Monitor Oman banking threads weekly", "Reply with helpful, official information", "Never share customer details publicly"],
      ar: ["تابع نقاشات البنوك في عُمان أسبوعياً", "ردّ بمعلومات رسمية مفيدة", "لا تشارك أي بيانات عملاء علناً"],
    },
  },
];

export const CATEGORY_COLOR: Record<Category, string> = {
  content: "#0B6298",
  technical: "#5B6CB5",
  partners: "#2F8A78",
  accuracy: "#B23A2E",
};


export function pick(l: L, lang: Lang) {
  return l[lang];
}

/** Initial statuses. In demo mode three quick wins were done before week 5 and Arabic content is in progress. */
export function initialStatus(key: string, demoRunDates?: string[]): { status: Status; doneAt: string | null } {
  if (!demoRunDates?.length) return { status: "todo", doneAt: null };
  const fix = demoRunDates[Math.min(4, demoRunDates.length - 1)];
  const dayBefore = new Date(new Date(fix).getTime() - 86400000).toISOString();
  if (["pdf_terms", "comparison_sites", "crawler_access"].includes(key)) return { status: "done", doneAt: dayBefore };
  if (key === "arabic_qa") return { status: "doing", doneAt: null };
  return { status: "todo", doneAt: null };
}
