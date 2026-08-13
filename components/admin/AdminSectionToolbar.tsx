import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tabs + primary action on one row (property/finance sections). */
export function AdminSectionToolbar({
  tabs,
  action,
}: {
  tabs: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">{tabs}</div>
      {action ? <div className="flex shrink-0 sm:justify-end">{action}</div> : null}
    </div>
  );
}

type AdminPrimaryActionProps = React.ComponentProps<typeof Button>;

export function AdminPrimaryAction({ className, children, ...props }: AdminPrimaryActionProps) {
  return (
    <Button
      size="default"
      className={cn(
        "h-8 w-full gap-1.5 px-3.5 sm:w-auto sm:min-w-[8.5rem] whitespace-nowrap",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
