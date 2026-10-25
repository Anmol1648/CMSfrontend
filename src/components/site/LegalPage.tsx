import { Lang, t } from "@/lib/site/content";
import type { LegalDoc } from "@/lib/site/legal";

/** A legal page of the website (English text; the Hindi site notes that the English version applies). */
export function LegalPage({ doc, lang }: { doc: LegalDoc; lang: Lang }) {
  const note = t(lang).legalNote;
  return (
    <article lang="en" className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {note && <p lang="hi" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{note}</p>}
        <h1 className="text-4xl font-black tracking-tight text-slate-900">{doc.title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {doc.updated}</p>
        <div className="mt-8 space-y-8">
          {doc.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-extrabold text-slate-900">{s.heading}</h2>
              {s.body.map((p) => (
                <p key={p} className="mt-2 leading-relaxed text-slate-700">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}
