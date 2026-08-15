const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  accepted: "bg-blue-500/15 text-blue-400",
  picked_up: "bg-indigo-500/15 text-indigo-400",
  delivering: "bg-purple-500/15 text-purple-400",
  delivered: "bg-green-500/15 text-green-400",
  cancelled: "bg-red-500/15 text-red-400",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  const colorClass = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>{label}</span>
  );
}
