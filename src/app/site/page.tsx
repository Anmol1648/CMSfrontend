import { redirect } from "next/navigation";

/** /site → the English website. */
export default function SiteRoot() {
  redirect("/site/en");
}
