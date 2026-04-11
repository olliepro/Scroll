let scheduledHydrationHandle: number | null = null;

declare global {
  interface Window {
    _altmetric_embed_init?: () => void;
  }
}

/**
 * Schedules one shared Altmetric embed hydration pass for the current frame.
 *
 * @returns Nothing after the global badge hydrator has been queued.
 *
 * @example
 * scheduleAltmetricHydration();
 */
export function scheduleAltmetricHydration(): void {
  if (typeof window === "undefined") return;
  if (scheduledHydrationHandle !== null) return;

  scheduledHydrationHandle = window.setTimeout(() => {
    scheduledHydrationHandle = null;
    window._altmetric_embed_init?.();
  }, 0);
}
