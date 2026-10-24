"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { Holder, HolderType, idCardsApi } from "@/lib/api/idcards";
import { CardSheet } from "@/components/idcards/IdCard";

function AddPerson({ type, onAdd }: { type: HolderType; onAdd: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string; sub: string }[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => idCardsApi.search(type, q).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q, type]);
  return (
    <div className="relative">
      <Input label={type === "student" ? "Or add a student (name / admission no)" : "Or add a staff member (name / code)"} value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl bg-white shadow-lg border border-outline-variant/30">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm hover:bg-surface-container-low"
                onClick={() => {
                  onAdd(h.id);
                  setQ("");
                }}
              >
                <b>{h.name}</b> <span className="text-on-surface-variant">· {h.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Print() {
  const { showToast } = useToast();
  const o = useQuery({ queryKey: ["idcards", "options"], queryFn: idCardsApi.options });
  const [type, setType] = useState<HolderType>("student");
  const [sectionId, setSectionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [withoutCard, setWithoutCard] = useState(false);
  const [list, setList] = useState<Holder[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [designId, setDesignId] = useState("");
  const [mode, setMode] = useState<"sheet" | "single">("sheet");
  const [backs, setBacks] = useState(true);
  const [loading, setLoading] = useState(false);
  const designs = (o.data?.designs ?? []).filter((d) => d.kind === type);
  useEffect(() => {
    setDesignId((designs.find((d) => d.isDefault) ?? designs[0])?.id ?? "");
    setList([]);
    setChosen(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, o.data]);
  const design = designs.find((d) => d.id === designId);
  const load = async (input: { sectionId?: string; departmentId?: string; ids?: string[] }, add = false) => {
    setLoading(true);
    try {
      const r = await idCardsApi.pick({ type, withoutCard: add ? false : withoutCard, ...input });
      const merged = add ? [...list, ...r.filter((x) => !list.some((y) => y.id === x.id))] : r;
      setList(merged);
      setChosen(new Set(add ? [...Array.from(chosen), ...r.map((x) => x.id)] : r.map((x) => x.id)));
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  };
  const picked = useMemo(() => list.filter((x) => chosen.has(x.id)), [list, chosen]);
  const noPhoto = picked.filter((x) => !x.photo);
  const doPrint = async () => {
    try {
      const r = await idCardsApi.print({ type, designId, ids: picked.map((x) => x.id) });
      setList((l) => l.map((x) => r.holders.find((y) => y.id === x.id) ?? x));
      showToast(`${r.added} new card(s), ${r.reprinted} reprint(s) recorded`, "success");
      setTimeout(() => window.print(), 600);
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  if (o.isLoading) return <PageLoader />;
  if (o.error) return <FormAlert>{errorMessage(o.error)}</FormAlert>;
  const opts = o.data!;
  return (
    <div className="space-y-4">
      <Tabs tabs={[{ id: "student", label: "Students" }, { id: "staff", label: "Staff" }]} activeTab={type} onChange={(x) => setType(x as HolderType)} />
      <Card>
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] items-end">
          {type === "student" ? (
            <div className="flex gap-2 items-end">
              <Select label="Section" value={sectionId} onChange={setSectionId} options={[{ value: "", label: "Choose…" }, ...opts.sections.map((s) => ({ value: s.id, label: s.name }))]} />
              <Button onClick={() => load({ sectionId })} disabled={!sectionId} loading={loading}>
                Show
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <Select label="Department" value={departmentId} onChange={setDepartmentId} options={[{ value: "", label: "All staff" }, ...opts.departments.map((s) => ({ value: s.id, label: s.name }))]} />
              <Button onClick={() => load({ departmentId: departmentId || undefined })} loading={loading}>
                Show
              </Button>
            </div>
          )}
          <div className="pb-3">
            <Checkbox checked={withoutCard} onChange={setWithoutCard} label="Only those without a card" />
          </div>
          <AddPerson type={type} onAdd={(id) => load({ ids: [id] }, true)} />
        </div>
      </Card>
      {!designs.length && (
        <FormAlert tone="warning">
          No {type} card design yet. {opts.can.design ? <Link href="/id-cards/designs" className="font-bold underline">Make one in Card Designs</Link> : "Ask the office to make one."}
        </FormAlert>
      )}
      {list.length > 0 && design && (
        <>
          <Card>
            <div className="grid gap-4 md:grid-cols-4 items-end">
              <Select label="Design" value={designId} onChange={setDesignId} options={designs.map((d) => ({ value: d.id, label: d.name }))} />
              <Select label="Print on" value={mode} onChange={(v) => setMode(v as "sheet" | "single")} options={[{ value: "sheet", label: `A4 sheet (${design.orientation === "portrait" ? 9 : 10} per page, cut out)` }, { value: "single", label: "One card per page (PVC card printer)" }]} />
              <div className="pb-3">
                <Checkbox checked={backs && design.back} disabled={!design.back} onChange={setBacks} label="Print the back side too" hint={mode === "sheet" ? "Backs come mirrored on the next page, for two-sided printing." : undefined} />
              </div>
              <Button onClick={doPrint} disabled={!picked.length}>
                <span className="material-symbols-outlined text-lg">print</span> Print {picked.length} card(s)
              </Button>
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">Printing records the cards: each person without a card gets a card number; others are reprinted with their number. A lost card is replaced from Cards Given (the old one stops being valid).</p>
          </Card>
          {noPhoto.length > 0 && (
            <FormAlert tone="warning">
              {noPhoto.length} without a photo: {noPhoto.slice(0, 8).map((x) => x.name).join(", ")}
              {noPhoto.length > 8 ? "…" : ""}.{" "}
              <Link href="/id-cards/photos" className="font-bold underline">
                Take their photos
              </Link>{" "}
              first, or untick them.
            </FormAlert>
          )}
          <Card padding="none">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-outline-variant/20 text-sm">
              <Checkbox checked={chosen.size === list.length} onChange={(c) => setChosen(new Set(c ? list.map((x) => x.id) : []))} label={`${chosen.size} of ${list.length} ticked`} />
            </div>
            <ul className="max-h-72 overflow-auto divide-y divide-outline-variant/15">
              {list.map((x) => (
                <li key={x.id} className="flex items-center gap-3 px-5 py-2 text-sm">
                  <input type="checkbox" className="accent-[#1A365D]" checked={chosen.has(x.id)} onChange={() => setChosen((s) => { const n = new Set(s); if (n.has(x.id)) n.delete(x.id); else n.add(x.id); return n; })} aria-label={`Tick ${x.name}`} />
                  <span className="flex-1">
                    <b>{x.name}</b> <span className="text-on-surface-variant">· {x.sub}</span>
                  </span>
                  {!x.photo && <Pill tone="warning">No photo</Pill>}
                  {x.card ? <Pill tone="success">{x.card.cardNo}</Pill> : <Pill>No card yet</Pill>}
                </li>
              ))}
            </ul>
          </Card>
          <div className="overflow-x-auto rounded-2xl bg-surface-container-low p-4">
            <CardSheet design={design} holders={picked} school={opts.school} mode={mode} backs={backs} />
          </div>
        </>
      )}
    </div>
  );
}

export default function IdCardsPrintPage() {
  return (
    <RequirePermission permission="idcard.print">
      <PageHeader title="Print ID Cards" description="Choose a section (or staff), check the photos, pick a design and print on A4 sheets or a PVC card printer." />
      <Print />
    </RequirePermission>
  );
}
