import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, type ReactNode } from "react";

export function renderLatex(text: string) {
  const parts: ReactNode[] = [];
  const regex = /\$(.+?)\$/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    try {
      const html = katex.renderToString(match[1], { throwOnError: false });
      parts.push(<span key={parts.length} dangerouslySetInnerHTML={{ __html: html }} />);
    } catch {
      parts.push(match[0]);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return <Fragment>{parts}</Fragment>;
}
