"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormAlert, Pill, Select } from "@/components/forms";
import { PageHeader } from "@/components/layout/AppShell";
import { useToast } from "@/components/ui/ToastProvider";
import { RequirePermission } from "@/lib/auth/RequirePermission";
import { GatewaySettings, paymentsApi, rupees } from "@/lib/api/fees";
import { ApiError, errorMessage } from "@/lib/api/client";
import { PageLoader } from "@/components/ui/PageLoader";

function KeysBox({ title, tone, keys, placeholder, value, onChange, errors }: {
  title: string;
  tone: "test" | "live";
  keys: GatewaySettings["test"];
  placeholder: string;
  value: { keyId: string; keySecret: string; webhookSecret: string };
  onChange: (v: { keyId: string; keySecret: string; webhookSecret: string }) => void;
  errors: Record<string, string>;
}) {
  const f = tone === "live" ? "liveKeyId" : "keyId";
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${tone === "live" ? "border-emerald-300/60" : "border-amber-300/60"}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-black uppercase tracking-widest ${tone === "live" ? "text-emerald-700" : "text-amber-700"}`}>{title}</p>
        {keys.ready ? <Pill tone="success">Keys saved</Pill> : <Pill>Not set</Pill>}
      </div>
      <Input label="Key id" placeholder={placeholder} value={value.keyId} onChange={(e) => onChange({ ...value, keyId: e.target.value })} error={errors[f]} />
      <Input label={keys.hasKeySecret ? "Key secret (saved; type to replace)" : "Key secret"} type="password" value={value.keySecret} onChange={(e) => onChange({ ...value, keySecret: e.target.value })} autoComplete="off" />
      <Input label={keys.hasWebhookSecret ? "Webhook secret (saved; type to replace)" : "Webhook secret"} type="password" value={value.webhookSecret} onChange={(e) => onChange({ ...value, webhookSecret: e.target.value })} autoComplete="off" />
    </div>
  );
}

function Gateway() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const gw = useQuery({ queryKey: ["payment-gateway"], queryFn: paymentsApi.gateway });
  const [provider, setProvider] = useState<"razorpay" | "mock">("razorpay");
  const [test, setTest] = useState({ keyId: "", keySecret: "", webhookSecret: "" });
  const [live, setLive] = useState({ keyId: "", keySecret: "", webhookSecret: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!gw.data) return;
    setProvider(gw.data.provider ?? "razorpay");
    setTest((t) => ({ ...t, keyId: gw.data.test.keyId ?? "" }));
    setLive((l) => ({ ...l, keyId: gw.data.live.keyId ?? "" }));
  }, [gw.data]);
  if (!gw.data) return <PageLoader />;
  const g = gw.data;

  const save = async (mode?: "test" | "live") => {
    setErrors({});
    try {
      queryClient.setQueryData(
        ["payment-gateway"],
        await paymentsApi.saveGateway({
          provider,
          ...(mode ? { mode } : {}),
          keyId: test.keyId.trim() || null,
          ...(test.keySecret ? { keySecret: test.keySecret } : {}),
          ...(test.webhookSecret ? { webhookSecret: test.webhookSecret } : {}),
          ...(provider === "razorpay" ? { liveKeyId: live.keyId.trim() || null } : {}),
          ...(live.keySecret ? { liveKeySecret: live.keySecret } : {}),
          ...(live.webhookSecret ? { liveWebhookSecret: live.webhookSecret } : {}),
        })
      );
      setTest((t) => ({ ...t, keySecret: "", webhookSecret: "" }));
      setLive((l) => ({ ...l, keySecret: "", webhookSecret: "" }));
      showToast(mode ? (mode === "live" ? "Live mode: payments now take real money" : "Test mode: no real money") : "Payment gateway saved", mode === "live" ? "warning" : "success");
    } catch (err) {
      showToast(errorMessage(err), "error");
      setErrors(err instanceof ApiError ? err.fieldErrors() : {});
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary">Payment gateway</h3>
        <div className="flex items-center gap-2">
          {g.provider === "razorpay" && (g.mode === "live" ? <Pill tone="success">LIVE · real money</Pill> : <Pill tone="warning">TEST MODE · no real money</Pill>)}
          {g.ready ? <Pill tone="success">Ready</Pill> : <Pill tone="warning">Not set up</Pill>}
        </div>
      </div>
      <div className="space-y-4">
        <Select
          label="Gateway"
          value={provider}
          onChange={(v) => setProvider(v as "razorpay" | "mock")}
          options={[{ value: "razorpay", label: "Razorpay" }, ...(g.mockAllowed ? [{ value: "mock", label: "Test gateway (try the flow, no real money)" }] : [])]}
        />
        {provider === "razorpay" ? (
          <>
            <p className="text-xs text-on-surface-variant">
              From the Razorpay dashboard → Account &amp; Settings → API keys (one set in Test mode, one in Live mode). Secrets are stored encrypted and never shown again. Keep both saved and switch between them below.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <KeysBox title="Test keys" tone="test" keys={g.test} placeholder="rzp_test_…" value={test} onChange={setTest} errors={errors} />
              <KeysBox title="Live keys" tone="live" keys={g.live} placeholder="rzp_live_…" value={live} onChange={setLive} errors={errors} />
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
              <p className="text-sm font-bold text-primary">Payments use: {g.mode === "live" ? "LIVE keys (real money)" : "TEST keys (no real money)"}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant={g.mode === "test" ? "primary" : "secondary"} disabled={g.mode === "test"} onClick={() => save("test")}>
                  Use test mode
                </Button>
                <Button
                  variant={g.mode === "live" ? "primary" : "secondary"}
                  disabled={g.mode === "live" || (!g.live.ready && !(live.keyId && live.keySecret))}
                  onClick={() => (window.confirm("Switch to LIVE mode? From now on every payment (My Fees, the website form, QR codes) takes real money.") ? save("live") : undefined)}
                >
                  Use live mode
                </Button>
              </div>
              {errors.mode && <FormAlert>{errors.mode}</FormAlert>}
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 text-xs space-y-1">
              <p className="font-bold">In Razorpay → Webhooks (in Test mode and in Live mode), add:</p>
              <p className="font-mono break-all">{g.webhookUrl}</p>
              <p>Events: payment.captured, payment.failed, order.paid, qr_code.credited. Use each mode&apos;s webhook secret above. The address must be reachable from the internet (the hosted server), so payments are confirmed even if the payer closes the window.</p>
            </div>
          </>
        ) : (
          <FormAlert tone="info">The test gateway shows a &quot;Pay&quot; / &quot;Decline&quot; window (and a pretend QR code) instead of Razorpay. Use it to try the flow. It is never available on the live system.</FormAlert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-on-surface-variant/70">
            Online fee payment is <b>{g.onlineFees ? "on" : "off"}</b>, website registration fee <b>{g.onlineRegistration ? "on" : "off"}</b> (
            <Link href="/settings" className="underline">
              System Settings → Online payments
            </Link>
            ).
          </p>
          <Button onClick={() => save()}>Save keys</Button>
        </div>
      </div>
    </Card>
  );
}

const STATUS: Record<string, { label: string; tone: "success" | "danger" | "warning" }> = {
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  created: { label: "Not finished", tone: "warning" },
};

function Payments() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [status, setStatus] = useState("");
  const [purpose, setPurpose] = useState("");
  const [attention, setAttention] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status, purpose, attention, search]);
  const q = { page, pageSize: 50, status, purpose, attention, search };
  const list = useQuery({ queryKey: ["online-payments", q], queryFn: () => paymentsApi.list(q), placeholderData: keepPreviousData });
  const rows = list.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 50));
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-outline-variant/20">
        <Select label="Status" value={status} onChange={setStatus} options={[{ value: "", label: "All" }, { value: "paid", label: "Paid" }, { value: "created", label: "Not finished" }, { value: "failed", label: "Failed" }]} />
        <Select label="For" value={purpose} onChange={setPurpose} options={[{ value: "", label: "All" }, { value: "fees", label: "Fees" }, { value: "registration", label: "Registration fee" }]} />
        <Select label="Needs attention" value={attention} onChange={setAttention} options={[{ value: "", label: "All" }, { value: "yes", label: "Yes (e.g. paid more than due)" }]} />
        <Input label="Search" placeholder="Order / payment id, student" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              <th className="px-5 py-3 font-bold">When</th>
              <th className="px-5 py-3 font-bold">For</th>
              <th className="px-5 py-3 font-bold">Gateway ids</th>
              <th className="px-5 py-3 font-bold text-right">Amount</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-outline-variant/10 align-top">
                <td className="px-5 py-3 text-xs">{new Date(p.createdAt).toLocaleString("en-IN")}</td>
                <td className="px-5 py-3">
                  {p.student ? (
                    <Link href={`/fees/collect?student=${p.student.id}`} className="font-semibold text-primary hover:underline">
                      {p.student.name} <span className="font-mono text-xs">{p.student.admissionNo}</span>
                    </Link>
                  ) : p.enquiry ? (
                    <Link href={`/admissions/${p.enquiry.id}`} className="font-semibold text-primary hover:underline">
                      Registration: {p.enquiry.name} <span className="font-mono text-xs">{p.enquiry.enquiryNo}</span>
                    </Link>
                  ) : (
                    "—"
                  )}
                  {p.receipt && (
                    <Link href={`/fees/receipts/${p.receipt.id}`} className="block text-xs font-mono underline">
                      {p.receipt.receiptNo}
                    </Link>
                  )}
                </td>
                <td className="px-5 py-3 text-[11px] font-mono">
                  <p>{p.orderId}</p>
                  {p.paymentRef && <p className="text-on-surface-variant/70">{p.paymentRef}</p>}
                </td>
                <td className="px-5 py-3 text-right font-bold">
                  {rupees(p.amount)}
                  {p.convenienceFee > 0 && <p className="text-[10px] font-normal text-on-surface-variant/70">incl. {rupees(p.convenienceFee)} fee</p>}
                </td>
                <td className="px-5 py-3">
                  <Pill tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Pill>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 mt-1">
                    {p.method === "qr" ? "UPI QR" : "Online"} · {p.mode === "live" ? "live" : "test"}
                  </p>
                  {p.error && <p className="text-xs text-error mt-1 max-w-xs">{p.error}</p>}
                </td>
                <td className="px-5 py-3 text-right">
                  {p.status !== "paid" && p.provider !== "mock" && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const r = await paymentsApi.check(p.id);
                          showToast(r.status === "paid" ? "It was paid: receipt made" : r.status === "failed" ? "The gateway says it failed" : "Not paid at the gateway", r.status === "paid" ? "success" : "info");
                          await queryClient.invalidateQueries({ queryKey: ["online-payments"] });
                        } catch (err) {
                          showToast(errorMessage(err), "error");
                        }
                      }}
                      className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70"
                    >
                      Check with gateway
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list.data && !rows.length && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-on-surface-variant/70">
                  No online payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-outline-variant/20">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>
            Previous
          </Button>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((x) => x + 1)}>
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}

export default function OnlinePaymentsPage() {
  return (
    <RequirePermission permission="payment.configure">
      <PageHeader title="Online payments" description="The school's payment gateway, and every online payment: fees from My Fees and registration fees from the website form." />
      <div className="space-y-6">
        <Gateway />
        <Payments />
      </div>
    </RequirePermission>
  );
}
