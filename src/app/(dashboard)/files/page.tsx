"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Checkbox, FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { useAuth } from "@/lib/auth/AuthProvider";
import { api, authedImageUrl, errorMessage } from "@/lib/api/client";
import { mastersApi } from "@/lib/api/masters";
import { VisibilityEditor } from "@/components/shared/VisibilityEditor";
import { fileIcon, Folder, Item, Rule, sharedApi, size } from "@/lib/api/shared";
import { cn } from "@/lib/utils";

const label = "text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest";
const EVERYONE: Rule = { inherit: true, audience: "everyone", roleSlugs: [], sectionIds: [], userIds: [], withParents: true };

/** Opens a shared file (or its link) in a new tab. */
const openShared = async (id: string, kind: string, link: string | null, toast: (m: string, t: "error") => void) => {
  try {
    if (kind === "link") {
      await api.get(sharedApi.filePath(id), { quiet: true });
      window.open(link ?? "", "_blank", "noopener");
    } else window.open(await authedImageUrl(sharedApi.filePath(id)), "_blank", "noopener");
  } catch (err) {
    toast(errorMessage(err), "error");
  }
};

function FolderForm({ folder, parentId, roles, onClose }: { folder: Folder | null; parentId: string | null; roles: { slug: string; name: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [name, setName] = useState(folder?.name ?? "");
  const [description, setDescription] = useState(folder?.description ?? "");
  const [staffAdd, setStaffAdd] = useState(folder?.staffAdd ?? false);
  const [rule, setRule] = useState<Rule>(folder ? { inherit: folder.inherit, audience: folder.audience, roleSlugs: folder.roleSlugs, sectionIds: folder.sectionIds, userIds: folder.userIds, withParents: folder.withParents } : { ...EVERYONE, inherit: !!parentId, audience: "everyone" });
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try {
      await sharedApi.saveFolder(folder?.id ?? null, { ...rule, inherit: parentId || folder?.parentId ? rule.inherit : false, parentId: folder ? folder.parentId : parentId, name, description: description || null, staffAdd, sortOrder: folder?.sortOrder ?? 0 });
      queryClient.invalidateQueries({ queryKey: ["shared"] });
      showToast("Saved", "success");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  const nested = !!(parentId || folder?.parentId);
  return (
    <Modal isOpen onClose={onClose} title={folder ? "Edit folder" : nested ? "New folder inside" : "New folder"}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Circulars" />
        <Input label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <VisibilityEditor value={nested ? rule : { ...rule, inherit: false }} onChange={setRule} roles={roles} inheritLabel={nested ? "Same as the folder it is in" : "Everyone"} />
        <Checkbox checked={staffAdd} onChange={setStaffAdd} label="Teachers can add files here" hint="For the sections they teach (e.g. worksheets, holiday homework)." />
        {error && <FormAlert>{error}</FormAlert>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type Draft = { key: string; fileId: string | null; link: string; title: string; name: string; size: number | null; busy: boolean; error?: string };

function AddFiles({ folder, roles, manage, mySections, onClose }: { folder: Folder; roles: { slug: string; name: string }[]; manage: boolean; mySections: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const tags = useQuery({ queryKey: ["master-options", "upload_tag"], queryFn: () => mastersApi.options("upload_tag"), staleTime: 5 * 60_000 });
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [rule, setRule] = useState<Rule>(manage ? EVERYONE : { ...EVERYONE, inherit: false, audience: "custom" });
  const [validUntil, setValidUntil] = useState("");
  const [needsAck, setNeedsAck] = useState(false);
  const [notify, setNotify] = useState(true);
  const [linkMode, setLinkMode] = useState(false);
  const [drag, setDrag] = useState(false);
  const [saving, setSaving] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const add = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      const key = `${f.name}-${Math.random()}`;
      setDrafts((d) => [...d, { key, fileId: null, link: "", title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), name: f.name, size: f.size, busy: true }]);
      try {
        const r = await sharedApi.upload(f);
        setDrafts((d) => d.map((x) => (x.key === key ? { ...x, fileId: r.id, busy: false } : x)));
      } catch (err) {
        setDrafts((d) => d.map((x) => (x.key === key ? { ...x, busy: false, error: errorMessage(err) } : x)));
      }
    }
  };
  const save = async () => {
    setSaving(true);
    let ok = 0;
    for (const d of drafts.filter((x) => (x.fileId || x.link) && !x.error)) {
      try {
        await sharedApi.addItem({ ...rule, folderId: folder.id, title: d.title || d.name, description: null, tagIds, kind: d.fileId ? "file" : "link", fileId: d.fileId, link: d.fileId ? null : d.link, validUntil: validUntil || null, needsAck, notify });
        ok++;
      } catch (err) {
        showToast(`${d.title}: ${errorMessage(err)}`, "error");
      }
    }
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ["shared"] });
    if (ok) {
      showToast(`${ok} shared${notify ? "; people told" : ""}`, "success");
      onClose();
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Add to ${folder.name}`} width="max-w-3xl">
      <div className="space-y-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => setLinkMode(false)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold", !linkMode ? "bg-primary text-white" : "bg-surface-container-high")}>
            Files
          </button>
          <button type="button" onClick={() => setLinkMode(true)} className={cn("rounded-full px-4 py-1.5 text-xs font-bold", linkMode ? "bg-primary text-white" : "bg-surface-container-high")}>
            A link (YouTube, Drive…)
          </button>
        </div>
        {!linkMode ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); void add(e.dataTransfer.files); }}
            onClick={() => input.current?.click()}
            className={cn("cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center", drag ? "border-primary bg-primary/5" : "border-outline-variant/50")}
          >
            <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
            <p className="text-sm font-bold mt-1">Drop files here, or click to choose</p>
            <p className="text-xs text-on-surface-variant">PDF, Word, Excel, PowerPoint, images (the size limit is in System Settings)</p>
            <input ref={input} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = ""; }} />
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setDrafts((d) => [...d, { key: String(Math.random()), fileId: null, link: "https://", title: "", name: "Link", size: null, busy: false }])}>
            Add a link
          </Button>
        )}
        {drafts.length > 0 && (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
                <span className="material-symbols-outlined text-primary">{d.fileId || d.busy ? "draft" : "link"}</span>
                <input value={d.title} onChange={(e) => setDrafts((x) => x.map((y) => (y.key === d.key ? { ...y, title: e.target.value } : y)))} placeholder="Title" className="flex-1 min-w-[10rem] rounded-lg bg-white px-3 py-1.5 text-sm" aria-label="Title" />
                {!d.fileId && !d.busy && !d.error && <input value={d.link} onChange={(e) => setDrafts((x) => x.map((y) => (y.key === d.key ? { ...y, link: e.target.value } : y)))} className="flex-1 min-w-[12rem] rounded-lg bg-white px-3 py-1.5 text-sm" aria-label="Link" />}
                <span className="text-xs text-on-surface-variant">{d.busy ? "Uploading…" : d.error ? <span className="text-error">{d.error}</span> : size(d.size)}</span>
                <button type="button" onClick={() => setDrafts((x) => x.filter((y) => y.key !== d.key))} aria-label="Remove" className="p-1">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div>
          <p className={label}>Tags</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(tags.data ?? []).filter((t) => t.isActive).map((t) => (
              <button key={t.id} type="button" onClick={() => setTagIds((x) => (x.includes(t.id) ? x.filter((y) => y !== t.id) : [...x, t.id]))} className={cn("rounded-full px-3 py-1 text-xs font-bold border", tagIds.includes(t.id) ? "bg-primary/15 text-primary border-primary/40" : "border-outline-variant/30 text-on-surface-variant")}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <VisibilityEditor value={rule} onChange={setRule} roles={roles} onlySections={manage ? undefined : mySections} />
        <div className="grid gap-4 sm:grid-cols-2 items-end">
          <Input label="Hide after (optional)" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          <div className="space-y-2">
            <Checkbox checked={needsAck} onChange={setNeedsAck} label="People must confirm they have read it" />
            <Checkbox checked={notify} onChange={setNotify} label="Tell them now (notification)" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || drafts.some((d) => d.busy) || !drafts.some((d) => (d.fileId || (d.link && d.link.length > 10)) && !d.error)}>
            Share
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TrackingModal({ item, onClose }: { item: Item; onClose: () => void }) {
  const { showToast } = useToast();
  const q = useQuery({ queryKey: ["shared", "tracking", item.id], queryFn: () => sharedApi.tracking(item.id) });
  const t = q.data;
  const openVersion = async (v: number) => {
    try {
      window.open(await authedImageUrl(sharedApi.versionPath(item.id, v)), "_blank", "noopener");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={`Who opened: ${item.title}`} width="max-w-2xl">
      {!t ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Pill tone="primary">{t.audience} can see it</Pill>
            <Pill tone="success">{t.opened} opened</Pill>
            {t.needsAck && <Pill tone={t.acknowledged >= t.audience ? "success" : "warning"}>{t.acknowledged} of {t.audience} confirmed</Pill>}
            <Pill>Version {t.version}</Pill>
          </div>
          {t.needsAck && t.notYet.length > 0 && (
            <div>
              <p className={label}>Not confirmed yet ({t.notYet.length})</p>
              <p className="mt-1 text-sm text-on-surface-variant">{t.notYet.map((x) => x.name).join(", ")}</p>
            </div>
          )}
          <div>
            <p className={label}>Opened by</p>
            <ul className="mt-2 max-h-64 overflow-y-auto divide-y divide-outline-variant/10 text-sm">
              {t.views.map((v, i) => (
                <li key={i} className="flex items-center gap-2 py-1.5">
                  <span className="flex-1">
                    {v.name} <span className="text-xs text-on-surface-variant">({v.kind})</span>
                  </span>
                  <span className="text-xs text-on-surface-variant">{v.opens}× · {new Date(v.lastAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  {v.acknowledgedAt && <Pill tone="success">Confirmed</Pill>}
                </li>
              ))}
              {!t.views.length && <li className="py-2 text-on-surface-variant">No one yet.</li>}
            </ul>
          </div>
          {t.versions.length > 0 && (
            <div>
              <p className={label}>Earlier versions</p>
              <ul className="mt-2 space-y-1 text-sm">
                {t.versions.map((v) => (
                  <li key={v.version}>
                    v{v.version} · {v.fileName ?? v.link} · {new Date(v.at).toLocaleDateString("en-IN")}{" "}
                    {v.fileName && (
                      <button type="button" onClick={() => openVersion(v.version)} className="text-xs font-bold text-primary">
                        open
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Library() {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const lib = useQuery({ queryKey: ["shared", "library"], queryFn: sharedApi.library });
  const [current, setCurrent] = useState<string | null>(null);
  const [folderForm, setFolderForm] = useState<{ folder: Folder | null; parentId: string | null } | null>(null);
  const [adding, setAdding] = useState(false);
  const [tracking, setTracking] = useState<Item | null>(null);
  const versionInput = useRef<HTMLInputElement>(null);
  const [versionFor, setVersionFor] = useState<Item | null>(null);
  const folders = lib.data?.folders ?? [];
  const folder = folders.find((f) => f.id === current) ?? folders[0] ?? null;
  const items = useQuery({ queryKey: ["shared", "items", folder?.id], queryFn: () => sharedApi.items(folder!.id), enabled: !!folder });
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      queryClient.invalidateQueries({ queryKey: ["shared"] });
      showToast(done, "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    }
  };
  const uploadVersion = async (file: File) => {
    if (!versionFor) return;
    try {
      const r = await sharedApi.upload(file);
      await sharedApi.newVersion(versionFor.id, { fileId: r.id, notify: true });
      queryClient.invalidateQueries({ queryKey: ["shared"] });
      showToast("New version shared", "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
    } finally {
      setVersionFor(null);
    }
  };
  if (lib.isLoading) return <PageLoader />;
  if (lib.error) return <FormAlert>{errorMessage(lib.error)}</FormAlert>;
  const manage = lib.data!.manage;
  const tree = (parent: string | null, depth = 0): React.ReactNode =>
    folders
      .filter((f) => f.parentId === parent)
      .map((f) => (
        <div key={f.id}>
          <button type="button" onClick={() => setCurrent(f.id)} className={cn("w-full text-left flex items-center gap-2 rounded-xl px-3 py-2 text-sm", folder?.id === f.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-surface-container-high")} style={{ paddingLeft: 12 + depth * 16 }}>
            <span className="material-symbols-outlined text-lg">{folder?.id === f.id ? "folder_open" : "folder"}</span>
            <span className="flex-1 truncate">{f.name}</span>
            {f.pending > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{f.pending}</span>}
            <span className="text-xs text-on-surface-variant">{f.files}</span>
          </button>
          {tree(f.id, depth + 1)}
        </div>
      ));
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card padding="sm">
        {tree(null)}
        {!folders.length && <p className="p-3 text-sm text-on-surface-variant">{manage ? "No folders yet." : "No folder is open to teachers yet."}</p>}
        {manage && (
          <Button variant="tertiary" className="mt-2 w-full" onClick={() => setFolderForm({ folder: null, parentId: null })}>
            New folder
          </Button>
        )}
      </Card>
      <div className="space-y-4">
        {folder && (
          <Card>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-[12rem]">
                <p className="text-lg font-extrabold">{folder.name}</p>
                {folder.description && <p className="text-sm text-on-surface-variant">{folder.description}</p>}
                <p className="text-xs text-on-surface-variant/70 mt-1">
                  Who sees it: <b>{folder.who}</b>
                  {folder.staffAdd ? " · teachers can add files" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {manage && (
                  <>
                    <Button variant="tertiary" onClick={() => setFolderForm({ folder, parentId: null })}>
                      Edit
                    </Button>
                    <Button variant="tertiary" onClick={() => setFolderForm({ folder: null, parentId: folder.id })}>
                      Folder inside
                    </Button>
                    <Button variant="tertiary" onClick={async () => (await confirm({ title: `Delete ${folder.name}?`, message: "Only an empty folder can be deleted.", confirmLabel: "Delete", danger: true })) && act(() => sharedApi.deleteFolder(folder.id), "Deleted")}>
                      Delete
                    </Button>
                  </>
                )}
                <Button onClick={() => setAdding(true)}>Add files</Button>
              </div>
            </div>
          </Card>
        )}
        {folder &&
          (items.isLoading ? (
            <PageLoader />
          ) : !items.data?.length ? (
            <FormAlert tone="info">No files in this folder.</FormAlert>
          ) : (
            <Card padding="none">
              <ul className="divide-y divide-outline-variant/10">
                {items.data.map((i) => (
                  <li key={i.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-3", i.expired && "opacity-60")}>
                    <span className="material-symbols-outlined text-2xl text-primary">{fileIcon(i.mimeType, i.kind)}</span>
                    <div className="flex-1 min-w-[12rem]">
                      <button type="button" onClick={() => openShared(i.id, i.kind, i.link, showToast)} className="text-left text-sm font-bold text-on-surface hover:text-primary">
                        {i.title}
                      </button>
                      <p className="text-xs text-on-surface-variant/70">
                        {i.kind === "link" ? "Link" : `${i.fileName} · ${size(i.sizeBytes)}`}
                        {i.version > 1 ? ` · v${i.version}` : ""} · {i.who} · by {i.uploadedBy}
                        {i.validUntil ? ` · until ${i.validUntil}` : ""}
                      </p>
                      {i.tags.length > 0 && <p className="text-[11px] text-primary">{i.tags.join(" · ")}</p>}
                    </div>
                    {i.status === "pending" && <Pill tone="warning">Waiting for approval</Pill>}
                    {i.expired && <Pill>Hidden (date passed)</Pill>}
                    {i.needsAck && <Pill tone="primary">{i.acks} confirmed</Pill>}
                    <span className="text-xs text-on-surface-variant">{i.opened} opened</span>
                    {manage && i.status === "pending" && (
                      <>
                        <Button variant="tertiary" onClick={() => act(() => sharedApi.approve(i.id, true), "Approved: people can see it")}>Approve</Button>
                        <Button variant="tertiary" onClick={() => act(() => sharedApi.approve(i.id, false), "Removed")}>Refuse</Button>
                      </>
                    )}
                    {(can("upload.reports") || manage) && (
                      <Button variant="tertiary" onClick={() => setTracking(i)}>
                        Who opened
                      </Button>
                    )}
                    {i.canEdit && i.kind === "file" && (
                      <Button variant="tertiary" onClick={() => { setVersionFor(i); versionInput.current?.click(); }}>
                        New version
                      </Button>
                    )}
                    {i.canEdit && (
                      <button type="button" onClick={async () => (await confirm({ title: `Delete “${i.title}”?`, confirmLabel: "Delete", danger: true })) && act(() => sharedApi.deleteItem(i.id), "Deleted")} className="p-1 text-error" aria-label="Delete">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
      </div>
      <input ref={versionInput} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVersion(f); e.target.value = ""; }} />
      {folderForm && <FolderForm folder={folderForm.folder} parentId={folderForm.parentId} roles={lib.data!.roles} onClose={() => setFolderForm(null)} />}
      {adding && folder && <AddFiles folder={folder} roles={lib.data!.roles} manage={manage} mySections={lib.data!.mySections} onClose={() => setAdding(false)} />}
      {tracking && <TrackingModal item={tracking} onClose={() => setTracking(null)} />}
    </div>
  );
}

export default function FilesPage() {
  return (
    <RequirePermission permission={["upload.manage", "upload.add"]}>
      <PageHeader title="File Library" description="Folders of shared files: circulars, syllabus, forms, worksheets… Choose who can see each folder or file; it appears on their Downloads." />
      <Library />
    </RequirePermission>
  );
}
