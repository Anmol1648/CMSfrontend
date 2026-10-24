"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Qr } from "@/components/library/Qr";
import { authedImageUrl } from "@/lib/api/client";
import { logoSrc } from "@/lib/api/school";
import type { Design, DesignInput, Holder, School } from "@/lib/api/idcards";

/** Field labels on the card (kept short: the card is small). */
export const LABELS: Record<string, string> = {
  class: "Class",
  admissionNo: "Adm. No",
  rollNo: "Roll No",
  dob: "D.O.B",
  bloodGroup: "Blood Gr.",
  father: "Father",
  mother: "Mother",
  phone: "Phone",
  address: "Address",
  transport: "Bus",
  house: "House",
  emergency: "Emergency",
  validUntil: "Valid till",
  cardNo: "Card No",
  designation: "Designation",
  department: "Department",
  employeeCode: "Emp. Code",
  joiningDate: "Joined",
  schoolAddress: "School",
};

/** An image from a logged-in endpoint, kept whole (signature). */
function AuthedImg({ path, className, style }: { path: string | null; className?: string; style?: React.CSSProperties }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    setSrc(null);
    if (path) authedImageUrl(path).then(setSrc).catch(() => setSrc(null));
  }, [path]);
  return src ? <img src={src} alt="" className={className} style={style} /> : null;
}

function Barcode({ text, height }: { text: string; height: number }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) JsBarcode(ref.current, text, { format: "CODE128", height, width: 1.3, fontSize: 9, margin: 0, displayValue: true });
  }, [text, height]);
  return <svg ref={ref} style={{ maxWidth: "100%" }} />;
}

type CardDesign = Design | (DesignInput & { signatureUrl?: string | null });
const MM = (n: number) => `${n}mm`;

/** One side of a card, drawn in real millimetres (CR80: 85.6 × 54). */
export function IdCardSide({ design, holder, school, side }: { design: CardDesign; holder: Holder; school: School; side: "front" | "back" }) {
  const portrait = design.orientation === "portrait";
  const w = portrait ? 54 : 85.6;
  const h = portrait ? 85.6 : 54;
  const cardNo = holder.card?.cardNo ?? holder.values.cardNo ?? "";
  const shownNo = cardNo || "ID-••••••";
  const v = (k: string) => (k === "cardNo" ? shownNo : k === "validUntil" ? holder.values.validUntil || "on printing" : (holder.values[k] ?? ""));
  const list = (keys: string[]) => keys.filter((k) => !["photo", "name"].includes(k) && v(k));
  const logo = logoSrc(school.logoUrl);
  const base: React.CSSProperties = { width: MM(w), height: MM(h), fontFamily: "Inter, Arial, sans-serif", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
  const header = (tall: boolean) => (
    <div style={{ background: design.color, color: design.textColor, padding: `${MM(tall ? 2 : 1.3)} ${MM(2.5)}`, display: "flex", alignItems: "center", gap: MM(2) }}>
      {logo && <img src={logo} alt="" style={{ width: MM(tall ? 9 : 7), height: MM(tall ? 9 : 7), objectFit: "contain", background: "#fff", borderRadius: MM(1.2), padding: MM(0.4) }} />}
      <div style={{ minWidth: 0, lineHeight: 1.15 }}>
        <div style={{ fontWeight: 800, fontSize: MM(tall ? 3.1 : 2.8), textTransform: "uppercase", letterSpacing: "0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{school.short || school.name}</div>
        <div style={{ fontSize: MM(1.7), opacity: 0.85 }}>{holder.type === "staff" ? "Staff identity card" : "Student identity card"}</div>
      </div>
    </div>
  );
  const rows = (keys: string[], size = 2.05) => (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: MM(size), lineHeight: 1.25 }}>
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <td style={{ color: "#555", paddingRight: MM(1), whiteSpace: "nowrap", verticalAlign: "top", width: "1%" }}>{LABELS[k] ?? k}</td>
            <td style={{ fontWeight: 600, color: "#111", wordBreak: "break-word" }}>{v(k)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const photo = design.fields.includes("photo") && (
    <div style={{ width: MM(portrait ? 21 : 19), height: MM(portrait ? 26 : 24), border: `${MM(0.5)} solid ${design.color}`, borderRadius: MM(1.2), overflow: "hidden", background: "#eef1f5", flexShrink: 0 }}>
      {holder.photo ? <AuthedImg path={holder.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: MM(1.8), color: "#999", textAlign: "center", paddingTop: MM(10) }}>No photo</div>}
    </div>
  );
  const code =
    design.code === "qr" ? (
      <Qr text={shownNo} size={portrait ? 46 : 44} />
    ) : design.code === "barcode" ? (
      <div style={{ width: MM(portrait ? 34 : 34) }}>
        <Barcode text={shownNo} height={22} />
      </div>
    ) : null;

  if (side === "back") {
    return (
      <div className="idcard" style={{ ...base, background: "#fff", border: "0.2mm solid #ccc", borderRadius: MM(2.5), overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ background: design.color, height: MM(3) }} />
        <div style={{ padding: `${MM(2)} ${MM(2.8)}`, flex: 1, display: "flex", flexDirection: "column", gap: MM(1.5), overflow: "hidden" }}>
          {rows(list(design.backFields), 2)}
          {design.backText && <div style={{ fontSize: MM(1.8), color: "#333", whiteSpace: "pre-line", lineHeight: 1.3 }}>{design.backText}</div>}
          <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: MM(2) }}>
            <div style={{ fontSize: MM(1.8), color: "#555" }}>
              {LABELS.cardNo}: <b style={{ color: "#111" }}>{shownNo}</b>
            </div>
            {(design.signatureUrl || design.signatureLabel) && (
              <div style={{ textAlign: "center" }}>
                {design.signatureUrl && <AuthedImg path={design.signatureUrl} style={{ height: MM(7), maxWidth: MM(22), objectFit: "contain" }} />}
                <div style={{ fontSize: MM(1.7), borderTop: "0.2mm solid #999", paddingTop: MM(0.3), minWidth: MM(16) }}>{design.signatureLabel || "Signature"}</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ background: design.color, height: MM(1.5) }} />
      </div>
    );
  }

  return (
    <div className="idcard" style={{ ...base, background: "#fff", border: "0.2mm solid #ccc", borderRadius: MM(2.5), overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {header(portrait)}
      {portrait ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: `${MM(2)} ${MM(2.8)} ${MM(1.5)}`, gap: MM(1), overflow: "hidden" }}>
          {photo}
          {design.fields.includes("name") && <div style={{ fontWeight: 800, fontSize: MM(3.1), textAlign: "center", lineHeight: 1.1, color: design.color }}>{holder.name}</div>}
          <div style={{ width: "100%", flex: 1, overflow: "hidden" }}>{rows(list(design.fields))}</div>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>{code}</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", padding: `${MM(1.8)} ${MM(2.5)}`, gap: MM(2.5), overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: MM(1) }}>
            {photo}
            {design.code === "qr" && code}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: MM(0.8) }}>
            {design.fields.includes("name") && <div style={{ fontWeight: 800, fontSize: MM(3.2), lineHeight: 1.1, color: design.color }}>{holder.name}</div>}
            <div style={{ flex: 1, overflow: "hidden" }}>{rows(list(design.fields), 2)}</div>
            {design.code === "barcode" && code}
          </div>
        </div>
      )}
      <div style={{ background: design.color, height: MM(1.5) }} />
    </div>
  );
}

/** Cards laid out for printing: A4 sheets (fronts, then mirrored backs for two-sided printing) or one card per page. */
export function CardSheet({ design, holders, school, mode, backs }: { design: CardDesign; holders: Holder[]; school: School; mode: "sheet" | "single"; backs: boolean }) {
  const portrait = design.orientation === "portrait";
  const w = portrait ? 54 : 85.6;
  const h = portrait ? 85.6 : 54;
  const across = portrait ? 3 : 2;
  const perPage = portrait ? 9 : 10;
  const gap = 4;
  const width = across * w + (across - 1) * gap;
  const withBack = backs && design.back;
  const pages: Holder[][] = [];
  for (let i = 0; i < holders.length; i += perPage) pages.push(holders.slice(i, i + perPage));
  const css =
    mode === "single"
      ? `@page { size: ${w}mm ${h}mm; margin: 0; } @media print { .idpage { break-after: page; } .idpage:last-child { break-after: auto; } .idcard { border: none !important; border-radius: 0 !important; } }`
      : `@page { size: A4; margin: 10mm; } @media print { .idpage { break-after: page; } .idpage:last-child { break-after: auto; } }`;
  return (
    <div id="idprint">
      <style>{`${css} @media print { body * { visibility: hidden; } #idprint, #idprint * { visibility: visible; } #idprint { position: absolute; left: 0; top: 0; } .idsheet-gap { display: none; } }`}</style>
      {mode === "single"
        ? holders.map((x) => (
            <div key={x.id}>
              <div className="idpage">
                <IdCardSide design={design} holder={x} school={school} side="front" />
              </div>
              {withBack && (
                <div className="idpage">
                  <IdCardSide design={design} holder={x} school={school} side="back" />
                </div>
              )}
              <div className="idsheet-gap h-3" />
            </div>
          ))
        : pages.map((p, i) => (
            <div key={i}>
              <div className="idpage" style={{ width: MM(width), display: "flex", flexWrap: "wrap", gap: MM(gap) }}>
                {p.map((x) => (
                  <IdCardSide key={x.id} design={design} holder={x} school={school} side="front" />
                ))}
              </div>
              <div className="idsheet-gap h-4" />
              {withBack && (
                <>
                  <div className="idpage" style={{ width: MM(width), display: "flex", flexWrap: "wrap", flexDirection: "row-reverse", gap: MM(gap) }}>
                    {p.map((x) => (
                      <IdCardSide key={x.id} design={design} holder={x} school={school} side="back" />
                    ))}
                  </div>
                  <div className="idsheet-gap h-6" />
                </>
              )}
            </div>
          ))}
    </div>
  );
}

/** A sample person for the design preview. */
export const sampleHolder = (kind: "student" | "staff"): Holder => ({
  type: kind,
  id: "sample",
  name: kind === "staff" ? "Anita Sharma" : "Rohan Negi",
  photo: null,
  sub: "",
  card: { id: "", cardNo: "ID-000123", validUntil: "", status: "active" },
  values:
    kind === "staff"
      ? { designation: "TGT (Science)", department: "Science", employeeCode: "EMP-0042", joiningDate: "01 Jul 2019", dob: "12 Mar 1988", bloodGroup: "B+", phone: "9876543210", address: "Gopeshwar, Chamoli - 246401", emergency: "Rakesh Sharma · 9876500000", validUntil: "31 Mar 2027", cardNo: "ID-000123", schoolAddress: "Main Road, Joshimath · Ph 01389-222222" }
      : { class: "VII-B", admissionNo: "2025/0102", rollNo: "12", dob: "05 Aug 2013", bloodGroup: "O+", father: "Mahesh Negi", mother: "Sunita Negi", phone: "9876543210", address: "Upper Bazaar, Joshimath - 246443", transport: "Route 3 · Marwari", house: "Nanda", emergency: "Mahesh Negi · 9876543210", validUntil: "31 Mar 2027", cardNo: "ID-000123", schoolAddress: "Main Road, Joshimath · Ph 01389-222222" },
});
