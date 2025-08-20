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
    <div className="px-2.5 py-1.5 rounded-full bg-slate-100 border border-slate-300 flex items-center gap-1.5 text-sm">
      <span className="opacity-80">{icon}</span>
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-xs font-semibold text-slate-800">
        {typeof value === "number" ? value : "—"}
      </span>
    </div>
  );
}
