"use client";

import { useQuery } from "@tanstack/react-query";
import { logoSrc, schoolApi } from "@/lib/api/school";
import { PAYMENT_MODES, Receipt, rupees } from "@/lib/api/fees";
import { cn } from "@/lib/utils";

/** A fee receipt as printed: half an A4 page with the school's name and logo, or an 80 mm roll. */

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const twoDigits = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`);
const threeDigits = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : "", twoDigits(n % 100)].filter(Boolean).join(" ");

/** 125450 → "One Lakh Twenty Five Thousand Four Hundred Fifty" (the Indian way). */
export const inWords = (n: number) => {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  return parts.join(" ");
};

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function ReceiptView({ receipt: r, format = "a4_half" }: { receipt: Receipt; format?: "a4_half" | "thermal" }) {
  const school = useQuery({ queryKey: ["public-school"], queryFn: schoolApi.publicInfo, staleTime: Infinity });
  const profile = useQuery({ queryKey: ["school-profile"], queryFn: schoolApi.profile, staleTime: 5 * 60_000, retry: false });
  const p = profile.data;
  const address = p ? [p.addressLine1, p.addressLine2, p.city, p.district, p.state, p.pincode].filter(Boolean).join(", ") : "";
  const thermal = format === "thermal";
  const logo = logoSrc(school.data?.logoUrl);

  return (
    <div className={cn("receipt bg-white text-black relative", thermal ? "w-[80mm] p-3 text-[11px]" : "w-full max-w-[200mm] p-8 text-[12px] border border-black/20")}>
      {r.status === "cancelled" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-6xl font-black text-red-600/25 -rotate-12 border-8 border-red-600/25 px-6">CANCELLED</span>
        </div>
      )}
      <div className={cn("flex items-center gap-4 border-b border-black/60 pb-3", thermal && "flex-col text-center gap-1")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && !thermal && <img src={logo} alt="" className="h-14 w-14 object-contain" />}
        <div className="flex-1">
          <p className={cn("font-black uppercase", thermal ? "text-[13px]" : "text-[17px]")}>{p?.legalName || school.data?.legalName || school.data?.name}</p>
          {address && <p>{address}</p>}
          {(p?.phone || p?.email) && <p>{[p?.phone && `Ph: ${p.phone}`, p?.email].filter(Boolean).join(" · ")}</p>}
          {(p?.affiliationNo || p?.udiseCode) && <p>{[p?.affiliationNo && `Affiliation no. ${p.affiliationNo}`, p?.udiseCode && `UDISE ${p.udiseCode}`].filter(Boolean).join(" · ")}</p>}
        </div>
        <div className={cn("text-right", thermal && "text-center")}>
          <p className="font-black uppercase tracking-wide">Fee receipt</p>
          <p className="font-mono font-bold">{r.receiptNo}</p>
          <p>{fmt(r.date)}</p>
        </div>
      </div>

      <div className={cn("grid gap-x-6 gap-y-1 py-3 border-b border-black/30", thermal ? "grid-cols-1" : "grid-cols-2")}>
        <p>
          Student: <b>{r.student.name}</b>
        </p>
        <p>
          Admission no: <b className="font-mono">{r.student.admissionNo}</b>
        </p>
        <p>
          Class: <b>{r.student.section ?? "—"}</b>
          {r.student.roll ? ` · Roll ${r.student.roll}` : ""}
        </p>
        <p>
          Session: <b>{r.academicYear.name}</b>
        </p>
        {r.parent && (
          <p>
            {r.parent.relation ?? "Parent"}: <b>{r.parent.name}</b>
          </p>
        )}
      </div>

      <table className="w-full my-3 border-collapse">
        <thead>
          <tr className="border-b border-black/60 text-left">
            <th className="py-1 font-bold">Particulars</th>
            <th className="py-1 font-bold text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {r.instalments.map((i) => (
            <tr key={i.id} className="align-top border-b border-black/10">
              <td className="py-1">
                <p className="font-bold">{i.name}</p>
                {i.lines.map((l, k) => (
                  <p key={k} className="pl-3">
                    {l.head}
                    {l.refundable ? " (refundable)" : ""}
                  </p>
                ))}
                {i.fine > 0 && <p className="pl-3">Late fine</p>}
              </td>
              <td className="py-1 text-right">
                <p>&nbsp;</p>
                {i.lines.map((l, k) => (
                  <p key={k}>{rupees(l.amount)}</p>
                ))}
                {i.fine > 0 && <p>{rupees(i.fine)}</p>}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/60">
            <td className="py-1 font-black">Total received</td>
            <td className="py-1 text-right font-black">{rupees(r.amount)}</td>
          </tr>
        </tfoot>
      </table>
      <p>
        Rupees <b>{inWords(r.amount)}</b> only
      </p>
      <p className="mt-1">
        Paid by <b>{PAYMENT_MODES[r.mode]}</b>
        {r.reference ? ` · ref ${r.reference}` : ""}
        {r.bankName ? ` · ${r.bankName}` : ""}
        {r.online?.convenienceFee ? ` · convenience fee ${rupees(r.online.convenienceFee)} paid separately` : ""}
      </p>
      {r.note && <p className="mt-1 italic">{r.note}</p>}
      {r.status === "cancelled" && (
        <p className="mt-2 font-bold text-red-700">
          Cancelled{r.cancelledBy ? ` by ${r.cancelledBy}` : ""}: {r.cancelReason}
        </p>
      )}
      <div className={cn("flex justify-between items-end mt-8", thermal && "mt-4")}>
        <p className="text-[10px] max-w-[60%]">{r.footer}</p>
        <div className="text-center">
          <p className="border-t border-black/60 pt-1 px-6">{r.online ? "Paid online (no signature needed)" : `Received by${r.collectedBy ? ` ${r.collectedBy}` : ""}`}</p>
        </div>
      </div>
    </div>
  );
}
