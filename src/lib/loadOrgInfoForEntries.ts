import { faviconsForArxivUrl } from "./affiliations";
import type { ArxivEntry, OrgInfo } from "../types";

const ORG_FETCH_CONCURRENCY = 3;

type LoadOrgInfoForEntriesOptions = {
  entries: ArxivEntry[];
  openAiKey: string;
  orgCache: Record<string, OrgInfo[]>;
  pendingArxivIds: Set<string>;
  onEntriesLoaded: (loadedEntries: Record<string, OrgInfo[]>) => void;
  onPendingCountChange: (pendingCount: number) => void;
  shouldCancel: () => boolean;
};

/**
 * Loads missing organization enrichment for visible papers in the background.
 *
 * @param options - Entry list, cache state, lifecycle callbacks, and cancellation hook.
 * @returns Nothing after the queued org lookups settle.
 *
 * @example
 * await loadOrgInfoForEntries({
 *   entries,
 *   openAiKey,
 *   orgCache,
 *   pendingArxivIds,
 *   onEntriesLoaded,
 *   onPendingCountChange,
 *   shouldCancel: () => false,
 * });
 */
export async function loadOrgInfoForEntries({
  entries,
  openAiKey,
  orgCache,
  pendingArxivIds,
  onEntriesLoaded,
  onPendingCountChange,
  shouldCancel,
}: LoadOrgInfoForEntriesOptions): Promise<void> {
  const queuedEntries = entries.filter(
    (entry) =>
      orgCache[entry.arxivId] === undefined &&
      !pendingArxivIds.has(entry.arxivId),
  );
  if (queuedEntries.length === 0) return;

  queuedEntries.forEach((entry) => pendingArxivIds.add(entry.arxivId));
  onPendingCountChange(pendingArxivIds.size);

  const workQueue = [...queuedEntries];
  const workerCount = Math.min(ORG_FETCH_CONCURRENCY, workQueue.length);
  let pendingResults: Record<string, OrgInfo[]> = {};
  let flushHandle: ReturnType<typeof setTimeout> | null = null;

  function flushPendingResults() {
    if (Object.keys(pendingResults).length === 0) return;
    const nextResults = pendingResults;
    pendingResults = {};
    onEntriesLoaded(nextResults);
  }

  function schedulePendingResultsFlush() {
    if (flushHandle) return;
    flushHandle = setTimeout(() => {
      flushHandle = null;
      if (shouldCancel()) return;
      flushPendingResults();
    }, 120);
  }

  async function runWorker() {
    while (workQueue.length > 0) {
      if (shouldCancel()) return;
      const nextEntry = workQueue.shift();
      if (!nextEntry) return;

      let orgs: OrgInfo[] = [];
      try {
        const htmlUrl = nextEntry.link.replace("/abs/", "/html/");
        orgs = await faviconsForArxivUrl(htmlUrl, openAiKey);
      } catch {
        orgs = [];
      } finally {
        pendingArxivIds.delete(nextEntry.arxivId);
        onPendingCountChange(pendingArxivIds.size);
      }

      if (!shouldCancel()) {
        pendingResults[nextEntry.arxivId] = orgs;
        schedulePendingResultsFlush();
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  if (flushHandle) clearTimeout(flushHandle);
  if (!shouldCancel()) flushPendingResults();
}
