import { useEffect, useState } from "react";

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
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}
