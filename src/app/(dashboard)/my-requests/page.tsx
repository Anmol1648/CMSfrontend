"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { errorMessage } from "@/lib/api/client";
import { day, invApi, qty, REQ } from "@/lib/api/inventory";
import { apiLines, EditLine, LinesEditor } from "@/components/inventory/InvParts";

function Mine() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const q = useQuery({ queryKey: ["inventory", "my-requests"], queryFn: invApi.myRequests });
  const [lines, setLines] = useState<EditLine[]>([]);
  const [purpose, setPurpose] = useState("");
  const send = async () => {
    try {
      const r = await invApi.request({ purpose: purpose || null, lines: apiLines(lines) });
      showToast(r.status === "pending" ? `${r.number} sent for approval` : `${r.number} sent to the store`, "success");
      setLines([]);
      setPurpose("");
      queryClient.invalidateQueries({ queryKey: ["inventory", "my-requests"] });
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  };
  return (
    <div className="space-y-4 max-w-4xl">
      <Card>
        <p className="font-extrabold mb-3">Ask the store for items</p>
        <div className="space-y-3">
          <LinesEditor lines={lines} setLines={setLines} />
          <Input label="What for (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={300} placeholder="Class project, exam duty, lab practical…" />
          <div className="flex justify-end">
            <Button onClick={send} disabled={!lines.length}>
              Send request
            </Button>
          </div>
        </div>
      </Card>
      {q.isLoading ? (
        <PageLoader />
      ) : q.error ? (
        <FormAlert>{errorMessage(q.error)}</FormAlert>
      ) : (
        <Card>
          <p className="font-extrabold mb-3">My requests</p>
          <ul className="divide-y divide-outline-variant/20">
            {q.data!.map((r) => (
              <li key={r.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1">
                    <b>{r.number}</b> <span className="text-on-surface-variant">· {day(r.createdAt)}{r.purpose ? ` · ${r.purpose}` : ""}</span>
                  </span>
                  <Pill tone={REQ[r.status].tone}>{REQ[r.status].label}</Pill>
                  {["pending", "approved"].includes(r.status) && (
                    <Button
                      variant="tertiary"
                      onClick={async () => {
                        if (!(await confirm({ title: `Cancel ${r.number}?`, confirmLabel: "Cancel request" }))) return;
                        try {
                          await invApi.cancelRequest(r.id);
                          queryClient.invalidateQueries({ queryKey: ["inventory", "my-requests"] });
                        } catch (e) {
                          showToast(errorMessage(e), "error");
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  {r.lines.map((l) => `${l.item} ${qty(l.qty)}${l.issuedQty ? ` (given ${qty(l.issuedQty)})` : ""}`).join(" · ")}
                  {r.answer ? ` · Note: ${r.answer}` : ""}
                </p>
              </li>
            ))}
            {!q.data!.length && <li className="py-2 text-sm text-on-surface-variant">No requests yet.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}

export default function MyRequestsPage() {
  return (
    <RequirePermission permission="inventory.request">
      <PageHeader title="My Requests" description="Ask the store for stationery, cleaning things, lab items… Small requests go straight to the store; bigger ones need approval first." />
      <Mine />
    </RequirePermission>
  );
}
