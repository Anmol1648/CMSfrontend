"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/forms";
import { mastersApi } from "@/lib/api/masters";

/**
 * A dropdown of a master list's options (religion, state, bank…) for any form. For a list with a
 * parent (district → state), pass the chosen parent; nothing is offered until there is one.
 * `value` stays shown even if that option was made inactive later.
 */
export function MasterSelect({
  master,
  parentId,
  needsParent = false,
  value,
  onChange,
  label,
  placeholder = "Choose…",
  error,
  disabled,
  autoPickSingle = false,
}: {
  master: string;
  parentId?: string | null;
  /** The list has a parent list: wait until parentId is chosen. */
  needsParent?: boolean;
  value: string;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  /** Choose the only option automatically (e.g. a single country). */
  autoPickSingle?: boolean;
}) {
  const waiting = needsParent && !parentId;
  // The value the form opened with is fetched even if inactive now (a record keeps its choice).
  const initial = useRef(value);
  const options = useQuery({
    queryKey: ["master-options", master, parentId ?? null, initial.current || null],
    queryFn: () => mastersApi.options(master, { parent: parentId ?? undefined, include: initial.current ? [initial.current] : [] }),
    enabled: !waiting,
    staleTime: 5 * 60_000,
  });
  const list = options.data ?? [];
  const only = list.length === 1 ? list[0].id : null;

  useEffect(() => {
    if (autoPickSingle && !value && only) onChange(only);
  }, [autoPickSingle, value, only, onChange]);

  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled || waiting || options.isLoading}
      options={[
        { value: "", label: waiting ? "Choose the one above first" : options.isLoading ? "Loading…" : placeholder },
        ...list.map((o) => ({ value: o.id, label: o.isActive ? o.name : `${o.name} (inactive)` })),
      ]}
    />
  );
}

/**
 * Linked dropdowns down a chain of lists, e.g. Country → State → District to pick a town's
 * district. `value` holds one id per level (top first); changing a level clears the levels below.
 */
export function MasterChainSelect({
  chain,
  value,
  onChange,
  placeholder,
  error,
  disabled,
}: {
  chain: { key: string; label: string; plural: string }[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** e.g. "All states" for a filter; defaults to "Choose…". */
  placeholder?: (level: { label: string; plural: string }) => string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <>
      {chain.map((level, i) => (
        <MasterSelect
          key={level.key}
          master={level.key}
          label={level.label}
          parentId={i === 0 ? null : value[i - 1] || null}
          needsParent={i > 0}
          value={value[i] ?? ""}
          placeholder={placeholder?.(level)}
          error={i === chain.length - 1 ? error : undefined}
          disabled={disabled}
          autoPickSingle={i === 0}
          onChange={(id) => onChange([...value.slice(0, i), id])}
        />
      ))}
    </>
  );
}
