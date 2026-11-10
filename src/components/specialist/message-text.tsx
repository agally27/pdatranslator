import * as React from "react";

/** Renders plain text with paragraphs and "- " bullet lists. No HTML is ever injected. */
export function MessageText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="prose-calm text-[15px]">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const bullets = lines.filter((l) => /^[-•*]\s+/.test(l));
        if (bullets.length > 0) {
          const lead = lines.filter((l) => !/^[-•*]\s+/.test(l));
          return (
            <React.Fragment key={index}>
              {lead.length > 0 ? <p>{lead.join(" ")}</p> : null}
              <ul>{bullets.map((b, i) => <li key={i}>{b.replace(/^[-•*]\s+/, "")}</li>)}</ul>
            </React.Fragment>
          );
        }
        return <p key={index}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
