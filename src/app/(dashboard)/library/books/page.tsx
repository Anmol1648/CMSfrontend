"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { MasterSelect } from "@/components/masters/MasterSelect";
import { PageHeader } from "@/components/layout/AppShell";
import { BookCover } from "@/components/library/BookCover";
import { FindMember } from "@/components/library/FindMember";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ApiError, errorMessage } from "@/lib/api/client";
import { Book, BookInput, BookKind, Copy, COPY_STATUS, CopyInput, KIND_LABEL, libraryApi, MemberHit, showDate, todayIST } from "@/lib/api/library";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const KINDS = Object.keys(KIND_LABEL) as BookKind[];

const empty: BookInput = { title: "", subtitle: null, authors: null, publisher: null, edition: null, year: null, isbn: null, kind: "book", categoryId: null, languageId: null, locationId: null, callNumber: null, level: null, price: null, pages: null, keywords: null, coverFileId: null, fileId: null, link: null, notes: null, isActive: true, copies: 1 };

function BookForm({ book, onClose }: { book: Book | null; onClose: (id?: string) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<BookInput>(book ? { ...book, copies: undefined } : empty);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const set = (p: Partial<BookInput>) => setV((x) => ({ ...x, ...p }));
  const num = (s: string) => (s === "" ? null : Math.round(Number(s)));
  const upload = async (file: File, field: "coverFileId" | "fileId") => {
    setBusy(field);
    try {
      set({ [field]: (await libraryApi.upload(file)).id });
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setBusy(null);
    }
  };
  const save = async () => {
    setError(null);
    try {
      const { copies, ...rest } = v;
      const b = await libraryApi.saveBook(book?.id ?? null, book ? rest : { ...rest, copies: v.kind === "ebook" ? 0 : copies });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      showToast(book ? "Saved" : "Added to the catalogue", "success");
      onClose(b.id);
    } catch (err) {
      setError(errorMessage(err));
      setFields(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };
  return (
    <Modal isOpen onClose={() => onClose()} title={book ? "Edit book" : "Add a book"} width="max-w-3xl">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Input label="Title" value={v.title} onChange={(e) => set({ title: e.target.value })} error={fields.title} />
          <Select label="Type" value={v.kind} onChange={(k) => set({ kind: k as BookKind })} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        </div>
        <Input label="Subtitle (optional)" value={v.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value || null })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Authors" value={v.authors ?? ""} onChange={(e) => set({ authors: e.target.value || null })} placeholder="R. K. Narayan" />
          <Input label="Publisher" value={v.publisher ?? ""} onChange={(e) => set({ publisher: e.target.value || null })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Input label="ISBN" value={v.isbn ?? ""} onChange={(e) => set({ isbn: e.target.value || null })} error={fields.isbn} />
          <Input label="Edition" value={v.edition ?? ""} onChange={(e) => set({ edition: e.target.value || null })} />
          <Input label="Year" type="number" value={v.year ?? ""} onChange={(e) => set({ year: num(e.target.value) })} error={fields.year} />
          <Input label="Pages" type="number" value={v.pages ?? ""} onChange={(e) => set({ pages: num(e.target.value) })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <MasterSelect master="library_category" label="Category" value={v.categoryId ?? ""} onChange={(id) => set({ categoryId: id || null })} />
          <MasterSelect master="library_language" label="Language" value={v.languageId ?? ""} onChange={(id) => set({ languageId: id || null })} />
          <MasterSelect master="library_location" label="Shelf" value={v.locationId ?? ""} onChange={(id) => set({ locationId: id || null })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Call number" value={v.callNumber ?? ""} onChange={(e) => set({ callNumber: e.target.value || null })} placeholder="823 NAR" />
          <Input label="For (classes)" value={v.level ?? ""} onChange={(e) => set({ level: e.target.value || null })} placeholder="Class VI–VIII" />
          <Input label="Price (₹)" type="number" value={v.price ?? ""} onChange={(e) => set({ price: num(e.target.value) })} error={fields.price} />
        </div>
        <Input label="Keywords (for search)" value={v.keywords ?? ""} onChange={(e) => set({ keywords: e.target.value || null })} placeholder="space, rockets, India" />
        {v.kind === "ebook" && <Input label="Link (online e-book)" value={v.link ?? ""} onChange={(e) => set({ link: e.target.value || null })} error={fields.link} placeholder="https://…" />}
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-1.5 text-sm font-bold text-primary cursor-pointer">
            <span className="material-symbols-outlined text-lg">image</span>
            {busy === "coverFileId" ? "Uploading…" : v.coverFileId ? "Cover added (change)" : "Add a cover photo"}
            <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "coverFileId"); e.target.value = ""; }} />
          </label>
          {v.kind === "ebook" && (
            <label className="inline-flex items-center gap-1.5 text-sm font-bold text-primary cursor-pointer">
              <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
              {busy === "fileId" ? "Uploading…" : v.fileId ? "E-book file added (change)" : "Upload the e-book (PDF)"}
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "fileId"); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {!book && v.kind !== "ebook" && <Input label="Copies to add now" type="number" min={0} max={200} value={v.copies ?? 0} onChange={(e) => set({ copies: Math.max(0, Math.min(200, Math.round(Number(e.target.value) || 0))) })} />}
        <TextArea label="Notes" rows={2} value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} />
        <Checkbox checked={v.isActive} onChange={(x) => set({ isActive: x })} label="In use (shown in the catalogue)" />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!!busy}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddCopies({ book, onClose }: { book: Book; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [count, setCount] = useState(1);
  const [acquiredOn, setAcquiredOn] = useState(todayIST());
  const [source, setSource] = useState("purchase");
  const [price, setPrice] = useState(book.price ? String(book.price) : "");
  const [billNo, setBillNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      const r = await libraryApi.addCopies(book.id, { count, acquiredOn, source, price: price ? Math.round(Number(price)) : null, billNo: billNo || null, locationId: null });
      queryClient.invalidateQueries({ queryKey: ["library"] });
      showToast(`${r.added} cop${r.added === 1 ? "y" : "ies"} added: ${r.accessionNos[0]}${r.added > 1 ? ` to ${r.accessionNos[r.added - 1]}` : ""}`, "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Add copies of ${book.title}`}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="How many" type="number" min={1} max={200} value={count} onChange={(e) => setCount(Math.max(1, Math.min(200, Math.round(Number(e.target.value) || 1))))} />
          <Input label="Received on" type="date" value={acquiredOn} onChange={(e) => setAcquiredOn(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="From" value={source} onChange={setSource} options={[{ value: "purchase", label: "Bought" }, { value: "donation", label: "Donated" }, { value: "other", label: "Other" }]} />
          <Input label="Price each (₹)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input label="Bill no." value={billNo} onChange={(e) => setBillNo(e.target.value)} />
        </div>
        <p className="text-xs text-on-surface-variant/70">Each copy gets the next accession number (System Settings → Library). Print their labels after.</p>
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Add copies</Button>
        </div>
      </div>
    </Modal>
  );
}

function CopyForm({ copy, onClose }: { copy: Copy; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [v, setV] = useState<CopyInput>({ accessionNo: copy.accessionNo, status: (["available", "damaged", "lost", "withdrawn"].includes(copy.status) ? copy.status : "available") as CopyInput["status"], conditionId: copy.conditionId, locationId: copy.locationId, acquiredOn: copy.acquiredOn, source: copy.source, billNo: copy.billNo, price: copy.price, notes: copy.notes });
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<CopyInput>) => setV((x) => ({ ...x, ...p }));
  const lent = copy.status === "issued" || copy.status === "on_hold";
  const save = async () => {
    try {
      await libraryApi.updateCopy(copy.id, v);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Copy ${copy.accessionNo}`}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Accession number" value={v.accessionNo} onChange={(e) => set({ accessionNo: e.target.value })} />
          {lent ? <Input label="State" value={COPY_STATUS[copy.status]?.label ?? copy.status} disabled /> : <Select label="State" value={v.status} onChange={(s) => set({ status: s as CopyInput["status"] })} options={[{ value: "available", label: "On the shelf" }, { value: "damaged", label: "Damaged (not lent)" }, { value: "lost", label: "Lost" }, { value: "withdrawn", label: "Withdrawn (removed from stock)" }]} />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MasterSelect master="book_condition" label="Condition" value={v.conditionId ?? ""} onChange={(id) => set({ conditionId: id || null })} />
          <MasterSelect master="library_location" label="Shelf (if not the book’s)" value={v.locationId ?? ""} onChange={(id) => set({ locationId: id || null })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Received on" type="date" value={v.acquiredOn ?? ""} onChange={(e) => set({ acquiredOn: e.target.value || null })} />
          <Input label="Price (₹)" type="number" value={v.price ?? ""} onChange={(e) => set({ price: e.target.value ? Math.round(Number(e.target.value)) : null })} />
          <Input label="Bill no." value={v.billNo ?? ""} onChange={(e) => set({ billNo: e.target.value || null })} />
        </div>
        <Input label="Notes" value={v.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function BookDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { can } = useAuth();
  const manage = can("library.manage");
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["library", "book", id], queryFn: () => libraryApi.book(id) });
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [copy, setCopy] = useState<Copy | null>(null);
  const [reserving, setReserving] = useState(false);
  const b = q.data;
  const reserveFor = async (m: MemberHit) => {
    if (!b) return;
    try {
      const r = await libraryApi.reserve({ bookId: b.id, memberKind: m.kind, memberId: m.id });
      showToast(r.ready ? `Kept for ${m.name}: a copy was on the shelf` : `${m.name} is number ${r.place} in the queue`, "success");
      setReserving(false);
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const removeCopy = async (c: Copy) => {
    if (!(await confirm({ title: `Delete copy ${c.accessionNo}?`, message: "Only a copy never lent can be deleted; else mark it withdrawn.", confirmLabel: "Delete", danger: true }))) return;
    try {
      await libraryApi.deleteCopy(c.id);
      queryClient.invalidateQueries({ queryKey: ["library"] });
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const removeBook = async () => {
    if (!b || !(await confirm({ title: `Delete “${b.title}”?`, message: "Its copies go with it. A book that has been lent can’t be deleted (make it not in use instead).", confirmLabel: "Delete", danger: true }))) return;
    try {
      await libraryApi.deleteBook(b.id);
      queryClient.invalidateQueries({ queryKey: ["library"] });
      onClose();
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={b?.title ?? "Book"} width="max-w-4xl">
      {!b ? (
        <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="flex gap-4">
            <BookCover book={b} className="h-28 w-20" />
            <div className="flex-1 min-w-0 text-sm space-y-1">
              {b.subtitle && <p className="text-on-surface-variant">{b.subtitle}</p>}
              <p>
                <b>{b.authors ?? "—"}</b>
                {b.publisher ? ` · ${b.publisher}` : ""}
                {b.year ? ` · ${b.year}` : ""}
                {b.edition ? ` · ${b.edition}` : ""}
              </p>
              <p className="text-xs text-on-surface-variant/80">
                {KIND_LABEL[b.kind]} · {b.category ?? "No category"} · {b.language ?? "—"} · {b.location ?? "No shelf"}
                {b.callNumber ? ` · ${b.callNumber}` : ""}
                {b.isbn ? ` · ISBN ${b.isbn}` : ""}
                {b.price ? ` · ₹${b.price}` : ""}
              </p>
              {b.level && <p className="text-xs text-on-surface-variant/80">For {b.level}</p>}
              {!b.isActive && <Pill>Not in use</Pill>}
              {b.link && (
                <a href={b.link} target="_blank" rel="noopener noreferrer" className="text-primary font-bold text-xs">
                  Open the e-book
                </a>
              )}
            </div>
            {manage && (
              <div className="flex flex-col gap-2">
                <Button variant="secondary" onClick={() => setEdit(true)}>
                  Edit
                </Button>
                <Button variant="tertiary" onClick={removeBook}>
                  Delete
                </Button>
              </div>
            )}
          </div>
          {b.kind !== "ebook" && (
            <div>
              <div className="flex items-center justify-between">
                <p className={label}>Copies ({b.copies.length})</p>
                {manage && (
                  <div className="flex gap-2">
                    <Link href={`/library/labels?book=${b.id}`} target="_blank" className="text-xs font-bold text-primary inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">print</span> Print labels
                    </Link>
                    <Button variant="tertiary" onClick={() => setAdding(true)}>
                      Add copies
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/20">
                      <th className="py-2 pr-3">Acc. no.</th>
                      <th className="py-2 pr-3">State</th>
                      <th className="py-2 pr-3">With</th>
                      <th className="py-2 pr-3">Condition</th>
                      <th className="py-2 pr-3">Shelf</th>
                      <th className="py-2 pr-3">Received</th>
                      {manage && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {b.copies.map((c) => (
                      <tr key={c.id} className="border-b border-outline-variant/10">
                        <td className="py-2 pr-3 font-bold">{c.accessionNo}</td>
                        <td className="py-2 pr-3">
                          <Pill tone={COPY_STATUS[c.status]?.tone ?? "neutral"}>{COPY_STATUS[c.status]?.label ?? c.status}</Pill>
                        </td>
                        <td className="py-2 pr-3 text-xs">{c.loan ? <span className={c.loan.overdue ? "text-error font-bold" : ""}>{c.loan.member} · due {showDate(c.loan.dueOn)}</span> : "—"}</td>
                        <td className="py-2 pr-3 text-xs">{c.condition ?? "—"}</td>
                        <td className="py-2 pr-3 text-xs">{c.location ?? "—"}</td>
                        <td className="py-2 pr-3 text-xs">{showDate(c.acquiredOn)}</td>
                        {manage && (
                          <td className="py-2 text-right whitespace-nowrap">
                            <button type="button" onClick={() => setCopy(c)} className="p-1 rounded hover:bg-surface-container-high" aria-label="Edit copy">
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button type="button" onClick={() => removeCopy(c)} className="p-1 rounded hover:bg-surface-container-high text-error" aria-label="Delete copy">
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {can("library.issue") && b.kind !== "ebook" && (
            <div>
              {reserving ? <FindMember onPick={reserveFor} label="Reserve for: find the member" /> : (
                <Button variant="tertiary" onClick={() => setReserving(true)}>
                  Reserve for a member
                </Button>
              )}
            </div>
          )}
          {b.reservations.length > 0 && (
            <div>
              <p className={label}>Waiting for it</p>
              <ol className="mt-2 space-y-1 text-sm">
                {b.reservations.map((r) => (
                  <li key={r.id}>
                    {r.place}. {r.member} {r.status === "ready" ? <Pill tone="success">Kept till {showDate(r.holdUntil)}</Pill> : null}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      {edit && b && <BookForm book={b} onClose={() => setEdit(false)} />}
      {adding && b && <AddCopies book={b} onClose={() => setAdding(false)} />}
      {copy && <CopyForm copy={copy} onClose={() => setCopy(null)} />}
    </Modal>
  );
}

function Books() {
  const { can } = useAuth();
  const manage = can("library.manage");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState("");
  const [show, setShow] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["library", "books", search, category, kind, show, page], queryFn: () => libraryApi.books({ search: search.trim() || undefined, category: category || undefined, kind: kind || undefined, show, page }), placeholderData: keepPreviousData });
  const reset = () => setPage(1);
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Find" value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} placeholder="Title, author, ISBN, accession no" icon="search" />
          <MasterSelect master="library_category" label="Category" value={category} onChange={(id) => { setCategory(id); reset(); }} placeholder="All categories" />
          <Select label="Type" value={kind} onChange={(k) => { setKind(k); reset(); }} options={[{ value: "", label: "All types" }, ...KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))]} />
          <Select label="Show" value={show} onChange={(s) => { setShow(s); reset(); }} options={[{ value: "all", label: "All" }, { value: "available", label: "On the shelf" }, { value: "out", label: "With copies lent" }, { value: "new", label: "New arrivals" }, { value: "inactive", label: "Not in use" }]} />
        </div>
        {manage && (
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <Link href="/library/books/import" className="inline-flex items-center gap-1 text-sm font-bold text-primary">
              <span className="material-symbols-outlined text-lg">upload_file</span> Import from Excel
            </Link>
            <Link href="/library/labels" className="inline-flex items-center gap-1 text-sm font-bold text-primary">
              <span className="material-symbols-outlined text-lg">print</span> Print labels
            </Link>
            <Button onClick={() => setAdding(true)}>Add a book</Button>
          </div>
        )}
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : !q.data?.rows.length ? (
        <FormAlert tone="info">No books found.</FormAlert>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-outline-variant/10">
            {q.data.rows.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => setOpen(b.id)} className="w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low">
                  <BookCover book={b} className="h-14 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface truncate">
                      {b.title} {b.isNew && <Pill tone="primary">New</Pill>} {!b.isActive && <Pill>Not in use</Pill>}
                    </p>
                    <p className="text-xs text-on-surface-variant/80 truncate">
                      {[b.authors, b.publisher, b.year].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="text-xs text-on-surface-variant/60">
                      {KIND_LABEL[b.kind]} · {b.category ?? "No category"} · {b.language ?? "—"} · {b.location ?? "—"}
                    </p>
                  </div>
                  {b.kind === "ebook" ? (
                    <Pill tone="primary">Online</Pill>
                  ) : (
                    <div className="text-right">
                      <Pill tone={b.available ? "success" : "warning"}>{b.available ? `${b.available} on the shelf` : "All lent"}</Pill>
                      <p className="text-xs text-on-surface-variant/60 mt-1">
                        {b.copies} cop{b.copies === 1 ? "y" : "ies"} · {b.out} lent
                      </p>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-xs text-on-surface-variant/60">{q.data.total} titles</p>
            {q.data.total > q.data.pageSize && <Pagination currentPage={page} totalPage={Math.ceil(q.data.total / q.data.pageSize)} onPageChange={setPage} />}
          </div>
        </Card>
      )}
      {open && <BookDetail id={open} onClose={() => setOpen(null)} />}
      {adding && <BookForm book={null} onClose={(id) => { setAdding(false); if (id) setOpen(id); }} />}
    </div>
  );
}

export default function LibraryBooksPage() {
  return (
    <RequirePermission permission={["library.view", "library.manage"]}>
      <PageHeader title="Books" description="The library’s catalogue: every title, its copies, where they are and who has them." />
      <Books />
    </RequirePermission>
  );
}
