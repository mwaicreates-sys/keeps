import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      <Icon size={28} strokeWidth={1.5} className="text-ink-soft" />
      <p className="font-display text-lg text-ink">{title}</p>
      {body && <p className="max-w-xs text-sm text-ink-soft">{body}</p>}
      {action}
    </div>
  );
}
