// Website readiness: can AI search engines reach, read and trust the Bank's pages?

export const AI_BOTS = ["OAI-SearchBot", "GPTBot", "ChatGPT-User", "Claude-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "Googlebot", "Bingbot"];

export const DEFAULT_PAGES = [
  "https://ahlibank.om/",
  "https://ahlibank.om/ahlibank/personal-banking/loans/personal-loan/",
  "https://ahlibank.om/ahlibank/personal-banking/loans/home-loan/",
];

export interface CheckItem {
  id: string;
  ok: boolean | null; // null = could not verify
  detail: string;
}
export interface PageReport {
  url: string;
  status: number | null;
  items: CheckItem[];
}
export interface SiteReport {
  checkedAt: string;
  source: "live" | "audit";
  robots: { reachable: boolean; blocked: string[]; allowed: string[]; note: string };
  pages: PageReport[];
}

const UA = "AhliVisibilityMonitor/1.0 (+internal audit)";

function robotsBlocks(txt: string, bot: string): boolean {
  // minimal parser: find groups for the bot or *, check for "Disallow: /"
  const lines = txt.split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);
  let agents: string[] = [];
  let inRules = false;
  const groups: { agents: string[]; disallowAll: boolean }[] = [];
  for (const l of lines) {
    const [k, ...rest] = l.split(":");
    const v = rest.join(":").trim();
    const key = k.trim().toLowerCase();
    if (key === "user-agent") {
      if (inRules) {
        agents = [];
        inRules = false;
      }
      agents.push(v.toLowerCase());
      groups.push({ agents: [...agents], disallowAll: false });
    } else if (key === "disallow" || key === "allow") {
      inRules = true;
      const g = groups[groups.length - 1];
      if (g) {
        g.agents = [...agents];
        if (key === "disallow" && v === "/") g.disallowAll = true;
      }
    }
  }
  const specific = groups.filter((g) => g.agents.includes(bot.toLowerCase()));
  const use = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  return use.some((g) => g.disallowAll);
}

async function get(url: string) {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  const body = (res.headers.get("content-type") || "").includes("text") ? await res.text() : "";
  return { res, body };
}

export async function liveCheck(pages = DEFAULT_PAGES): Promise<SiteReport> {
  const origin = new URL(pages[0]).origin;
  let robots: SiteReport["robots"] = { reachable: false, blocked: [], allowed: [], note: "" };
  try {
    const { res, body } = await get(`${origin}/robots.txt`);
    if (res.ok) {
      const blocked = AI_BOTS.filter((b) => robotsBlocks(body, b));
      robots = { reachable: true, blocked, allowed: AI_BOTS.filter((b) => !blocked.includes(b)), note: "robots.txt read" };
    } else robots.note = `robots.txt returned ${res.status}${res.status === 403 ? " (bot protection may be blocking crawlers)" : ""}`;
  } catch (e) {
    robots.note = `robots.txt not reachable: ${(e as Error).message}`;
  }

  const reports: PageReport[] = [];
  for (const url of pages) {
    try {
      const { res, body } = await get(url);
      const ct = res.headers.get("content-type") || "";
      const html = ct.includes("html") ? body : "";
      const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      const words = text.split(" ").filter(Boolean).length;
      const pdfLinks = (html.match(/href="[^"]+\.pdf"/gi) || []).length;
      reports.push({
        url,
        status: res.status,
        items: [
          { id: "reachable", ok: res.ok, detail: `HTTP ${res.status}` },
          { id: "html", ok: ct.includes("html"), detail: ct || "unknown type" },
          { id: "schema", ok: /application\/ld\+json/i.test(html), detail: /application\/ld\+json/i.test(html) ? "JSON-LD found" : "No structured data" },
          { id: "canonical", ok: /rel=["']canonical["']/i.test(html), detail: /rel=["']canonical["']/i.test(html) ? "Canonical tag found" : "No canonical tag" },
          { id: "arabic", ok: /hreflang=["']ar|lang=["']ar|\/ar\//i.test(html), detail: /hreflang=["']ar|lang=["']ar|\/ar\//i.test(html) ? "Arabic version linked" : "No Arabic version found" },
          { id: "content", ok: words > 300, detail: `${words} words of readable text` },
          { id: "pdf", ok: pdfLinks === 0, detail: pdfLinks ? `${pdfLinks} key details linked as PDF` : "No PDF dependence" },
          { id: "updated", ok: /last updated|updated on|آخر تحديث|dateModified/i.test(html), detail: /last updated|updated on|آخر تحديث|dateModified/i.test(html) ? "Update date shown" : "No visible update date" },
        ],
      });
    } catch (e) {
      reports.push({ url, status: null, items: [{ id: "reachable", ok: false, detail: (e as Error).message }] });
    }
  }
  return { checkedAt: new Date().toISOString(), source: "live", robots, pages: reports };
}

// Findings from the manual public-web audit of 8 Oct 2026, shown until a live check is run.
export const AUDIT_FINDINGS = [
  {
    id: "pdf",
    severity: "high",
    evidence: [
      "https://ahlibank.om/Ahlibank/assets/uploads/2025/04/ahlibank-KFS_Personal-Loan_Bilingual.pdf",
      "https://ahlibank.om/assets/uploads/2024/01/ahlibank-KFS_Personal-Loan_Bilingual.pdf",
    ],
    owner: "Marketing + Web",
  },
  { id: "lookalike", severity: "high", evidence: ["https://www.ahlibank.com.qa/en/borrow/personal-loan"], owner: "Web / IT" },
  { id: "arabic", severity: "medium", evidence: ["https://giraffy.com/om/ar/finance/personal-loans"], owner: "Marketing" },
  {
    id: "duplicate",
    severity: "medium",
    evidence: ["https://ahlibank.om/ahlibank/personal-banking/loans/personal-loan/", "https://ahlibank.om/personal-banking/loans/myloan/"],
    owner: "Web / IT",
  },
  { id: "crawlers", severity: "verify", evidence: [], owner: "IT Security" },
] as const;
