import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title = "Мэдээлэл байхгүй",
  description,
  className,
  action,
}: {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-14 px-6 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted/80 text-muted-foreground ring-1 ring-border/60">
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
