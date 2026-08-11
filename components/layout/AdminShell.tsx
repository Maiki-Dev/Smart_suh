"use client";

import type { ReactNode } from "react";
import {
  Building2,
  LogOut,
  Bell as BellIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { AuthContext } from "@/lib/auth/session";
import { ADMIN_NAV_GROUPS, type AdminNavGroup } from "@/components/layout/admin-nav";

export const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  SUPER_ADMIN: { label: "Супер админ", className: "bg-emerald-600 text-white" },
  HOA_ADMIN: { label: "СӨХ админ", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  OPERATOR: { label: "Оператор", className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

export interface AdminShellProps {
  ctx: AuthContext;
  activeSegment?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function AdminShell({
  ctx,
  activeSegment = "",
  pageTitle,
  pageSubtitle,
  headerRight,
  children,
}: AdminShellProps) {
  const roleBadge = ROLE_BADGE[ctx.user.role] ?? {
    label: ctx.user.role,
    className: "bg-zinc-100 text-zinc-700",
  };
  const initials = `${(ctx.user.first_name || "")[0] ?? ""}${(ctx.user.last_name || "")[0] ?? ""}`;
  const orgName = ctx.user.organization?.name ?? "—";
  const fullName = `${ctx.user.first_name} ${ctx.user.last_name}`.trim();

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4 shrink-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Smart СӨХ</p>
              <p className="truncate text-xs text-muted-foreground">{orgName}</p>
            </div>
          </div>

          <AdminSidebarNav activeSegment={activeSegment} className="flex-1 min-h-0 py-3" />

          <div className="shrink-0 border-t border-sidebar-border p-3">
            <div className="mb-2 flex items-center gap-2.5 px-1">
              <Avatar size="sm">
                <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{fullName || initials}</p>
                <p className="truncate text-xs text-muted-foreground">{roleBadge.label}</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="size-4" />
                Гарах
              </button>
            </form>
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <MobileNavButton />
              <h1 className="truncate text-sm font-semibold">{pageTitle ?? "Хянах самбар"}</h1>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Мэдэгдэл"
              >
                <BellIcon className="size-4" />
              </button>
              <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 sm:flex">
                <Badge variant="secondary" className={cn("font-normal", roleBadge.className)}>
                  {roleBadge.label}
                </Badge>
                <Avatar size="sm">
                  <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>
              </div>
              {headerRight}
            </div>
          </header>

          <MobileNav
            initials={initials}
            fullName={fullName}
            orgName={orgName}
            roleBadge={roleBadge}
            activeSegment={activeSegment}
          />

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
            {pageSubtitle ? (
              <div className="border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
                <h2 className="text-lg font-semibold sm:text-xl">{pageTitle ?? "Хянах самбар"}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{pageSubtitle}</p>
              </div>
            ) : null}
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminSidebarNav({
  activeSegment,
  className,
  onNavigate,
}: {
  activeSegment: string;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className={cn("overflow-y-auto overscroll-contain px-2", className)}>
      <div className="space-y-4">
        {ADMIN_NAV_GROUPS.map((group) => (
          <SidebarNavGroup
            key={group.id}
            group={group}
            activeSegment={activeSegment}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function SidebarNavGroup({
  group,
  activeSegment,
  onNavigate,
}: {
  group: AdminNavGroup;
  activeSegment: string;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const active = item.segment === activeSegment;
          const Icon = item.icon;
          return (
            <li key={item.segment}>
              <a
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ThemeToggle() {
  return (
    <button
      type="button"
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
      onClick={() => {
        const root = document.documentElement;
        const isDark = root.classList.contains("dark");
        if (isDark) {
          root.classList.remove("dark");
          try {
            localStorage.setItem("theme", "light");
          } catch {
            /* ignore */
          }
        } else {
          root.classList.add("dark");
          try {
            localStorage.setItem("theme", "dark");
          } catch {
            /* ignore */
          }
        }
      }}
    >
      <SunIcon className="size-4 dark:hidden" />
      <MoonIcon className="size-4 hidden dark:block" />
    </button>
  );
}

function MobileNavButton() {
  return (
    <label
      htmlFor="mobile-nav-toggle"
      className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
      aria-label="Цэс нээх"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="20" y2="17" />
      </svg>
    </label>
  );
}

function MobileNav({
  initials,
  fullName,
  orgName,
  roleBadge,
  activeSegment,
}: {
  initials: string;
  fullName: string;
  orgName: string;
  roleBadge: { label: string; className: string };
  activeSegment: string;
}) {
  const closeMobileNav = () => {
    const el = document.getElementById("mobile-nav-toggle") as HTMLInputElement | null;
    if (el) el.checked = false;
  };

  return (
    <>
      <input id="mobile-nav-toggle" type="checkbox" className="peer sr-only" />
      <label
        htmlFor="mobile-nav-toggle"
        className="fixed inset-0 top-14 z-20 bg-black/40 opacity-0 pointer-events-none peer-checked:pointer-events-auto peer-checked:opacity-100 transition-opacity md:hidden"
        aria-hidden="true"
      />
      <aside className="fixed bottom-0 left-0 top-14 z-30 flex w-64 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-150 peer-checked:translate-x-0 md:hidden">
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-medium">{fullName || initials}</p>
          <p className="truncate text-xs text-muted-foreground">{orgName}</p>
        </div>
        <AdminSidebarNav activeSegment={activeSegment} className="flex-1 min-h-0 py-3" onNavigate={closeMobileNav} />
        <div className="border-t border-sidebar-border p-3">
          <Badge variant="secondary" className={cn("mb-2 font-normal", roleBadge.className)}>
            {roleBadge.label}
          </Badge>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="size-4" />
              Гарах
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

export { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS } from "@/components/layout/admin-nav";
export type { AdminNavItem } from "@/components/layout/admin-nav";
