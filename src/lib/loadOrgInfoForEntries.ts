import { faviconsForArxivUrl } from "./affiliations";
import type { ArxivEntry, OrgInfo } from "../types";

const ORG_FETCH_CONCURRENCY = 3;

type LoadOrgInfoForEntriesOptions = {
  entries: ArxivEntry[];
  openAiKey: string;
  orgCache: Record<string, OrgInfo[]>;
  pendingArxivIds: Set<string>;
  onEntryLoaded: (arxivId: string, orgs: OrgInfo[]) => void;
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
 *   onEntryLoaded,
 *   onPendingCountChange,
 *   shouldCancel: () => false,
 * });
 */
export async function loadOrgInfoForEntries({
  entries,
  openAiKey,
  orgCache,
  pendingArxivIds,
  onEntryLoaded,
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
        onEntryLoaded(nextEntry.arxivId, orgs);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}
