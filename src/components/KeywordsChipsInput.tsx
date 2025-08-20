import * as React from "react";
import { useEffect } from "react";
import { tokenizeKeywords } from "../lib/utils";

export function KeywordsChipsInput({
  value,
  onChange,
  placeholder = 'Type keyword, press Enter… (use "quotes" for phrases)',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [tokens, setTokens] = React.useState<string[]>(
    () => tokenizeKeywords(value)
  );
  const [draft, setDraft] = React.useState("");

  function commit(t: string) {
    const cleaned = t.trim().replace(/^"(.*)"$/, "$1");
    if (!cleaned) return;
    setTokens((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setDraft("");
  }
  function remove(i: number) {
    setTokens((prev) => prev.filter((_, idx) => idx !== i));
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    }
    if (e.key === "Backspace" && !draft && tokens.length) {
      e.preventDefault();
      setTokens((prev) => prev.slice(0, -1));
    }
  }
  function onBlur() {
    commit(draft);
  }

  useEffect(() => {
    const serialized = tokens
      .map((t) => (t.includes(" ") ? `"${t}"` : t))
      .join(" ");
    onChange(serialized);
  }, [tokens, onChange]);

  return (
    <div className="min-h-10 w-full rounded-md border border-white/10 bg-black/50 px-2 py-1.5 flex flex-wrap gap-1 focus-within:ring-2 focus-within:ring-fuchsia-600">
      {tokens.map((t, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-xs text-zinc-200 border border-white/10"
        >
          {t}
          <button
            onClick={() => remove(i)}
            className="opacity-70 hover:opacity-100"
            aria-label="Remove keyword"
            title="Remove"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={tokens.length ? "" : placeholder}
        className="flex-1 bg-transparent outline-none text-sm text-white min-w-[8ch] placeholder:text-zinc-500"
      />
    </div>
  );
}
