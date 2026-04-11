import { useEffect, useState } from "react";

/**
 * Persists React state into localStorage with a short deferred write.
 *
 * @param key - localStorage key used to load and persist the value.
 * @param init - Fallback value used when nothing has been stored yet.
 * @returns React state and setter tuple mirroring useState.
 *
 * @example
 * const [savedLists, setSavedLists] = useLocalStorage("lists", []);
 */
export function useLocalStorage<T>(key: string, init: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : init;
    } catch {
      return init;
    }
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore write errors
      }
    }, 120);

    return () => window.clearTimeout(handle);
  }, [key, value]);

  return [value, setValue] as const;
}
