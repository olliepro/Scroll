import * as React from "react";

export function MetricChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  return (
    <div className="px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5 text-sm">
      <span className="opacity-80">{icon}</span>
      <span className="text-xs text-zinc-300">{label}</span>
      <span className="text-xs font-semibold">
        {typeof value === "number" ? value : "—"}
      </span>
    </div>
  );
}
