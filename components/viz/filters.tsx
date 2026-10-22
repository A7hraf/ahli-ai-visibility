"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { Filters } from "@/lib/analytics";

const KEYS = ["ch", "mk", "pl", "seg", "pd"] as const;

export const DEFAULT_PERIOD = "4";

/** Dashboard filters live in the URL, so a filtered view can be shared or bookmarked. */
export function useFilters(defaultPeriod = DEFAULT_PERIOD) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const f: Filters = useMemo(() => {
    const o: Filters = {};
    for (const k of KEYS) {
      const v = sp.get(k);
      if (v) o[k] = v;
    }
    if (!o.pd) o.pd = defaultPeriod;
    return o;
  }, [sp, defaultPeriod]);
  const set = useCallback(
    (patch: Partial<Filters>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      const q = next.toString();
      router.replace(q ? `${path}?${q}` : path, { scroll: false });
    },
    [sp, router, path],
  );
  return { f, set };
}
