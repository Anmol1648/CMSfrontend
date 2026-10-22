"use client";

import React from "react";

/**
 * A notice's text: paragraphs, "- " lists, **bold** and clickable links. Built from React elements
 * (never HTML), so nothing in a notice can run in the reader's browser.
 */
const inline = (text: string) =>
  text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part))
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
          {part}
        </a>
      );
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

const BULLET = /^\s*[-•*]\s+/;

export function NoticeBody({ text }: { text: string }) {
  // Lines grouped into blocks: a paragraph (lines kept), or a list; a blank line ends a block.
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      blocks.push({ list: false, lines: [] });
      continue;
    }
    const list = BULLET.test(line);
    const last = blocks[blocks.length - 1];
    if (last && last.list === list && last.lines.length) last.lines.push(list ? line.replace(BULLET, "") : line);
    else blocks.push({ list, lines: [list ? line.replace(BULLET, "") : line] });
  }
  return (
    <div className="space-y-3 text-sm text-on-surface">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.list ? (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {b.lines.map((l, j) => (
                <li key={j}>{inline(l)}</li>
              ))}
            </ul>
          ) : (
            <p key={i} className="leading-relaxed">
              {b.lines.map((l, j) => (
                <React.Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l)}
                </React.Fragment>
              ))}
            </p>
          )
        )}
    </div>
  );
}
