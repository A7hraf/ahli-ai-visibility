import { trend } from "./metrics";
import type { ActionView } from "./actions";

// Share of an action's expected lift assumed to show up in the overall mention rate.
// Actions target a slice (e.g. Arabic questions only), so their effect on the total is diluted.
const SCOPE_WEIGHT = { lang: 0.5, product: 0.2, all: 1 };
const REALISATION = 0.6; // not every planned gain materialises
const WEEKS_AHEAD = 12;

export interface ProjectionPoint {
  date: string;
  actual?: number;
  noAction?: number;
  withPlan?: number;
}

export async function projection(actions: ActionView[]) {
  const tr = await trend();
  if (!tr.length) return null;
  const current = tr[tr.length - 1].mention;
  const remaining = actions.filter((a) => a.status !== "done");
  const expectedLift = Math.round(
    remaining.reduce((s, a) => s + a.impact * (a.scope.lang ? SCOPE_WEIGHT.lang : a.scope.product ? SCOPE_WEIGHT.product : SCOPE_WEIGHT.all), 0) * REALISATION,
  );
  const target = Math.min(90, Math.round(current + expectedLift));
  const points: ProjectionPoint[] = tr.map((p) => ({ date: p.date, actual: p.mention }));
  points[points.length - 1].noAction = current;
  points[points.length - 1].withPlan = current;
  const last = new Date(tr[tr.length - 1].date);
  for (let w = 1; w <= WEEKS_AHEAD; w++) {
    const d = new Date(last.getTime() + w * 7 * 86400000).toISOString().slice(0, 10);
    // gains arrive gradually: S-curve over the next 12 weeks
    const k = 1 / (1 + Math.exp(-(w - 6) / 1.6));
    points.push({ date: d, noAction: current, withPlan: Math.round((current + (target - current) * k) * 10) / 10 });
  }
  return { current, target, expectedLift: target - current, points, weeks: WEEKS_AHEAD, assumptions: { REALISATION, SCOPE_WEIGHT } };
}
