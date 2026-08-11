import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ErpTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function erpTableClassName(minWidthClass = "min-w-[900px]") {
  return cn("w-full text-sm", minWidthClass);
}

export const erpTableHeadClass =
  "bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

export const erpTableRowClass =
  "border-t border-border/60 transition-colors hover:bg-muted/30 dark:hover:bg-muted/20";
