"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/AppShell";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { RequirePermission } from "@/lib/auth/RequirePermission";

export default function ImportBooksPage() {
  return (
    <RequirePermission permission="library.manage">
      <PageHeader
        title="Import books"
        description="Add the library’s books from Excel: title, authors, ISBN, category, shelf and how many copies (or their accession numbers, if they have them). A book already in the catalogue only gets its new copies."
        actions={
          <Link href="/library/books" className="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70">
            Back to books
          </Link>
        }
      />
      <ImportWizard kind="library_books" noun="books" resultTitle="Imported" done={{ href: "/library/books", label: "See the books" }} />
    </RequirePermission>
  );
}
