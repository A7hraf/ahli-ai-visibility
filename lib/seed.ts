// Starter question library. Edit freely from the Prompts page.
// Tip: the Bank's call centre knows the questions customers really ask.
export const DEFAULT_PROMPTS: { text: string; lang: "en" | "ar"; product: string; persona: string }[] = [
  { text: "I want to open a bank account in Oman. Which bank should I choose?", lang: "en", product: "accounts", persona: "general" },
  { text: "أريد أفتح حساب في سلطنة عمان، أي بنك أختار؟", lang: "ar", product: "accounts", persona: "general" },
  { text: "How can I open a bank account online in Oman without visiting a branch?", lang: "en", product: "accounts", persona: "private_employee" },
  { text: "كيف أفتح حساب بنكي أونلاين في عمان بدون ما أروح الفرع؟", lang: "ar", product: "accounts", persona: "private_employee" },
  { text: "Best bank account in Oman for students", lang: "en", product: "accounts", persona: "student" },
  { text: "أفضل حساب بنكي للطلاب في عمان", lang: "ar", product: "accounts", persona: "student" },
  { text: "What is the best bank for a personal loan in Oman?", lang: "en", product: "personal_finance", persona: "general" },
  { text: "أفضل بنك للتمويل الشخصي في عمان", lang: "ar", product: "personal_finance", persona: "general" },
  { text: "Which Omani bank gives the best personal loan for government employees?", lang: "en", product: "personal_finance", persona: "government_employee" },
  { text: "أبغى قرض شخصي وأنا موظف حكومي، أي بنك أفضل في عمان؟", lang: "ar", product: "personal_finance", persona: "government_employee" },
  { text: "Ahli Bank Oman personal loan interest rate and maximum amount", lang: "en", product: "personal_finance", persona: "general" },
  { text: "كم نسبة الربح على التمويل الشخصي في البنك الأهلي العماني؟", lang: "ar", product: "personal_finance", persona: "general" },
  { text: "Best home loan for expats in Oman", lang: "en", product: "home_finance", persona: "expat" },
  { text: "أفضل تمويل سكني في عمان للمواطنين", lang: "ar", product: "home_finance", persona: "government_employee" },
  { text: "Which bank in Oman has the best Islamic home finance?", lang: "en", product: "islamic", persona: "general" },
  { text: "أفضل بنك إسلامي للتمويل السكني في عمان", lang: "ar", product: "islamic", persona: "general" },
  { text: "Which credit card in Oman is best for travel?", lang: "en", product: "cards", persona: "private_employee" },
  { text: "أفضل بطاقة ائتمانية للسفر في عمان", lang: "ar", product: "cards", persona: "private_employee" },
  { text: "Is Ahli Bank Oman a good bank?", lang: "en", product: "brand", persona: "general" },
  { text: "هل البنك الأهلي العماني بنك زين؟", lang: "ar", product: "brand", persona: "general" },
];

// "Source of truth": the approved figures the Bank publishes.
// SAMPLE VALUES — replace each with the approved figure from the Product / Compliance team.
export const DEFAULT_FACTS: {
  field: string;
  product: string;
  label_en: string;
  label_ar: string;
  value: string;
  unit: string;
  note: string;
}[] = [
  { field: "personal_loan_rate", product: "personal_finance", label_en: "Personal finance rate (from)", label_ar: "نسبة التمويل الشخصي (تبدأ من)", value: "4.50", unit: "%", note: "Sample value. Replace with the approved figure." },
  { field: "personal_loan_max", product: "personal_finance", label_en: "Personal finance maximum amount", label_ar: "الحد الأعلى للتمويل الشخصي", value: "70000", unit: "OMR", note: "Sample value. Replace with the approved figure." },
  { field: "personal_loan_tenor", product: "personal_finance", label_en: "Personal finance maximum tenor", label_ar: "أقصى مدة للتمويل الشخصي", value: "10", unit: "years", note: "Sample value. Replace with the approved figure." },
  { field: "home_loan_rate", product: "home_finance", label_en: "Home finance rate (from)", label_ar: "نسبة التمويل السكني (تبدأ من)", value: "4.75", unit: "%", note: "Sample value. Replace with the approved figure." },
  { field: "min_salary", product: "personal_finance", label_en: "Minimum monthly salary", label_ar: "الحد الأدنى للراتب الشهري", value: "350", unit: "OMR", note: "Sample value. Replace with the approved figure." },
  { field: "online_account_opening", product: "accounts", label_en: "Account can be opened online", label_ar: "يمكن فتح الحساب أونلاين", value: "yes", unit: "", note: "Sample value. Confirm with the Digital Banking team." },
];
