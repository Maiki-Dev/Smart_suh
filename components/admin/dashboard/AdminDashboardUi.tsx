import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardHeroMetric({
  label,
  value,
  detail,
  emphasis,
}: {
  label: string;
  value: string | number;
  detail?: string;
  emphasis?: "default" | "positive" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-[1.75rem] font-semibold leading-none tracking-[-0.03em] tabular-nums",
          emphasis === "positive" && "text-primary",
          emphasis === "warning" && "text-amber-600 dark:text-amber-400",
        )}
      >
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function DashboardSecondaryStrip({
  items,
}: {
  items: Array<{
    label: string;
    value: string | number;
    detail?: string;
    alert?: boolean;
  }>;
}) {
  return (
    <div className="grid grid-cols-1 divide-y rounded-xl border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "mt-1.5 text-xl font-semibold tabular-nums tracking-tight",
              item.alert && "text-amber-600 dark:text-amber-400",
            )}
          >
            {item.value}
          </p>
          {item.detail ? <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function DashboardPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-5 py-1">{children}</div>
    </section>
  );
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-xs text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function DashboardProgressRow({
  label,
  pct,
  hint,
}: {
  label: string;
  pct: number;
  hint?: string;
}) {
  const safePct = Math.max(0, Math.min(100, pct));

  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2 text-muted-foreground">
          {hint ? <span>{hint}</span> : null}
          <span className="tabular-nums">{safePct}%</span>
        </div>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardKvRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}
