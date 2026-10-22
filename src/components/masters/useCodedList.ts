"use client";

import { useQuery } from "@tanstack/react-query";
import { mastersApi } from "@/lib/api/masters";

/**
 * A master whose CODE is what records keep (payment modes, student leave types, test results): its
 * active options and the name of any code (an old code no longer in the list is prettified).
 */
export function useCodedList(master: string) {
  const q = useQuery({ queryKey: ["coded-list", master], queryFn: () => mastersApi.options(master), staleTime: 5 * 60_000 });
  const list = (q.data ?? []).filter((o) => o.code).map((o) => ({ ...o, code: o.code!.toLowerCase() }));
  const nameOf = (code: string | null | undefined) => (!code ? "" : (list.find((o) => o.code === code.toLowerCase())?.name ?? code.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())));
  return { list, nameOf, options: list.map((o) => ({ value: o.code, label: o.name })), loading: q.isLoading };
}

/** Payment modes (Masters → Payment modes); `counter` = the ones offered at the fee counter. */
export function usePaymentModes() {
  const modes = useCodedList("payment_mode");
  const counter = modes.list.filter((m) => m.code !== "online" && m.extra.at_counter !== false);
  return {
    ...modes,
    counter: counter.map((m) => ({ value: m.code, label: m.name })),
    needsReference: (code: string) => modes.list.find((m) => m.code === code)?.extra.needs_reference === true,
  };
}
