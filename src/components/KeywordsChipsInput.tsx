import { useEffect, useState } from "react";
import { normalizeKeywordString } from "../lib/utils";

type KeywordsChipsInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

/**
 * Renders a comma-separated keyword input with normalized spacing.
 *
 * @param props - Controlled value, change callback, and optional placeholder text.
 * @returns A single-line keyword input tuned for comma-separated entry.
 *
 * @example
 * <KeywordsChipsInput value="LLM, RL" onChange={setKeywords} />
 */
export function KeywordsChipsInput({
  value,
  onChange,
  placeholder = 'LLM, RL, "policy gradient"',
}: KeywordsChipsInputProps) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  function handleChange(nextValue: string) {
    const normalizedSpacing = nextValue.replace(/\s*,\s*/g, ", ");
    setDraftValue(normalizedSpacing);
    onChange(normalizedSpacing);
  }

  function handleBlur() {
    const normalizedValue = normalizeKeywordString(draftValue);
    setDraftValue(normalizedValue);
    onChange(normalizedValue);
  }

  return (
    <input
      value={draftValue}
      onBlur={handleBlur}
      onChange={(event) => handleChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/60"
    />
  );
}
