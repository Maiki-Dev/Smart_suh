"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Машин", href: "/admin/vehicles", segment: "vehicles" },
  { label: "Зогсоолын эрх", href: "/admin/gate-access", segment: "gate-access" },
  { label: "Зочин", href: "/admin/visitors", segment: "visitors" },
] as const;

export type ParkingTab = (typeof tabs)[number]["segment"];

export function ParkingTabs({ active }: { active: ParkingTab }) {
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
