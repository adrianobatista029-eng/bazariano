const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  picked_up: "bg-indigo-100 text-indigo-800",
  delivering: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const colorClass = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-800";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>{label}</span>
  );
}
