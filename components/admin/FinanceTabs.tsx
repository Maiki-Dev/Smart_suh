"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Төлбөр", href: "/admin/payments", segment: "payments" },
  { label: "Нэхэмжлэл", href: "/admin/invoices", segment: "invoices" },
  { label: "Тайлан", href: "/admin/reports", segment: "reports" },
] as const;

export type FinanceTab = (typeof tabs)[number]["segment"];

export function FinanceTabs({ active }: { active: FinanceTab }) {
  return (
    <div className="inline-flex w-full rounded-lg border bg-muted/40 p-1 sm:w-auto">
      {tabs.map((tab) => {
        const isActive = tab.segment === active;
        return (
          <Link
            key={tab.segment}
            href={tab.href}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors sm:flex-none sm:px-4 sm:text-left",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
