import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ClipboardCopy, Download } from "lucide-react";
import { buildBibtexForList } from "../lib/bibtex";
import type { SavedList } from "../types";

type CopyStatus = "idle" | "copied" | "error";

/**
 * Builds a safe `.bib` filename from a saved list name.
 *
 * @param listName - User-facing saved list name.
 * @returns A sanitized filename stem with a `.bib` extension.
 */
function buildBibtexFilename(listName: string): string {
  const sanitizedName = listName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${sanitizedName || "saved-list"}.bib`;
}

/**
 * Triggers a browser download for a BibTeX document string.
 *
 * @param fileName - Download filename to present to the browser.
 * @param fileContents - BibTeX text to write into the downloaded file.
 * @returns Nothing.
 */
function downloadBibtexFile(fileName: string, fileContents: string): void {
  const blob = new Blob([fileContents], { type: "text/x-bibtex;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

/**
 * Renders saved-list export actions for BibTeX copy and download.
 *
 * @param props - Active saved list to export.
 * @returns A compact toolbar above the saved-list gallery.
 *
 * @example
 * <SavedListExportToolbar list={activeList} />
 */
export function SavedListExportToolbar({ list }: { list: SavedList }) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const bibtexDocument = useMemo(() => buildBibtexForList(list), [list]);
  const exportDisabled = list.papers.length === 0;
  const paperLabel = list.papers.length === 1 ? "paper" : "papers";

  useEffect(() => {
    if (copyStatus === "idle") return;
    const timeoutId = window.setTimeout(() => setCopyStatus("idle"), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [copyStatus]);

  async function handleCopyBibtex() {
    try {
      await navigator.clipboard.writeText(bibtexDocument);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 pt-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Saved List
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">{list.name}</h2>
        <p className="mt-1 text-sm text-slate-400">
          {list.papers.length} {paperLabel}
        </p>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyBibtex}
            disabled={exportDisabled}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy BibTeX
          </button>
          <button
            type="button"
            onClick={() =>
              downloadBibtexFile(buildBibtexFilename(list.name), bibtexDocument)
            }
            disabled={exportDisabled}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Download .bib
          </button>
        </div>
        {copyStatus !== "idle" && (
          <div
            className={[
              "inline-flex items-center gap-2 text-xs",
              copyStatus === "copied" ? "text-emerald-300" : "text-rose-300",
            ].join(" ")}
          >
            {copyStatus === "copied" ? (
              <>
                <Check className="h-3.5 w-3.5" />
                BibTeX copied
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                Copy failed
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
