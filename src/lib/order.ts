/** Moving an item in a list ordered by hand: one place (↑ ↓) or next to another item (drag and drop). */
export type Move = "up" | "down" | { before: string } | { after: string };

/** The request body the server's /move endpoints take. */
export const moveBody = (m: Move) => (typeof m === "string" ? { direction: m } : m);
