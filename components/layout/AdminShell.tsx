"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  LogOut,
  Bell as BellIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { AuthContext } from "@/lib/auth/session";
import {
  ADMIN_FEATURE_NAV,
  ADMIN_NAV_GROUPS,
  ADMIN_PRIMARY_NAV,
  findAdminNavGroup,
  isNavItemActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/components/layout/admin-nav";
import { SidebarBrandHeader } from "@/components/layout/SidebarBrandHeader";

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
    <div
      data-shell-root
      className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-background text-foreground"
    >
      <div className="flex h-full w-full">
        <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarBrandHeader subtitle={orgName} href="/admin" />

          <AdminSidebarNav activeSegment={activeSegment} className="flex-1 min-h-0 py-3" />

          <div className="shrink-0 border-t border-sidebar-border p-3">
            <AdminUserCard
              initials={initials}
              fullName={fullName}
              roleLabel={roleBadge.label}
              active={activeSegment === "settings"}
            />
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
              <div className="ml-1 flex items-center gap-2 sm:border-l sm:border-border sm:pl-3">
                <Badge variant="secondary" className={cn("hidden font-normal sm:inline-flex", roleBadge.className)}>
                  {roleBadge.label}
                </Badge>
                <a
                  href="/admin/settings"
                  className="group flex items-center gap-1.5 rounded-full p-0.5 ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Тохиргоо"
                >
                  <Avatar size="sm" className="transition-transform group-hover:scale-105">
                    <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                </a>
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
  const activeGroup = findAdminNavGroup(activeSegment);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of ADMIN_NAV_GROUPS) {
      initial[group.id] = group.id === activeGroup?.id;
    }
    return initial;
  });

  useEffect(() => {
    if (activeGroup) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [activeGroup?.id]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <nav className={cn("overflow-y-auto overscroll-contain px-2", className)}>
      <ul className="space-y-0.5">
        {ADMIN_PRIMARY_NAV.map((item) => (
          <AdminNavLink
            key={item.segment || "home"}
            item={item}
            active={isNavItemActive(item, activeSegment)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>

      <div className="my-3 space-y-1">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Шинэ боломж
        </p>
        <ul className="space-y-0.5 rounded-lg border border-primary/15 bg-primary/[0.04] p-1">
          {ADMIN_FEATURE_NAV.map((item) => (
            <AdminNavLink
              key={item.segment}
              item={item}
              active={isNavItemActive(item, activeSegment)}
              onNavigate={onNavigate}
              featured
            />
          ))}
        </ul>
      </div>

      <div className="my-3 border-t border-sidebar-border/60" />

      <div className="space-y-1">
        {ADMIN_NAV_GROUPS.map((group) => (
          <CollapsibleNavGroup
            key={group.id}
            group={group}
            activeSegment={activeSegment}
            open={openGroups[group.id] ?? false}
            onToggle={() => toggleGroup(group.id)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function AdminNavLink({
  item,
  active,
  onNavigate,
  compact,
  featured,
}: {
  item: AdminNavItem;
  active: boolean;
  onNavigate?: () => void;
  compact?: boolean;
  featured?: boolean;
}) {
  const Icon = item.icon;
  return (
    <li>
      <a
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
          compact ? "h-8" : "h-9",
          featured && !active && "hover:bg-primary/10",
          active
            ? featured
              ? "bg-primary/15 font-medium text-foreground ring-1 ring-primary/20"
              : "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon
          className={cn(
            "size-4 shrink-0",
            active ? (featured ? "text-primary" : "text-primary") : "text-muted-foreground",
          )}
        />
        <span className="truncate">{item.label}</span>
        {item.badge === "new" ? (
          <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
            Шинэ
          </span>
        ) : null}
      </a>
    </li>
  );
}

function CollapsibleNavGroup({
  group,
  activeSegment,
  open,
  onToggle,
  onNavigate,
}: {
  group: AdminNavGroup;
  activeSegment: string;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasActive = group.items.some((item) => item.segment === activeSegment);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-medium transition-colors",
          hasActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ChevronDown
          className={cn("size-3.5 shrink-0 transition-transform", open ? "rotate-0" : "-rotate-90")}
        />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">{group.items.length}</span>
      </button>
      {open ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-sidebar-border/60 ml-3 pl-1.5">
          {group.items.map((item) => (
            <AdminNavLink
              key={item.segment}
              item={item}
              active={isNavItemActive(item, activeSegment)}
              onNavigate={onNavigate}
              compact
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function AdminUserCard({
  initials,
  fullName,
  roleLabel,
  active = false,
  onNavigate,
  className,
}: {
  initials: string;
  fullName: string;
  roleLabel: string;
  active?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <a
      href="/admin/settings"
      onClick={onNavigate}
      className={cn(
        "group mb-2 flex cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-2.5 transition-all",
        "hover:border-sidebar-border hover:bg-sidebar-accent hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        active
          ? "border-sidebar-border bg-sidebar-accent shadow-sm"
          : "border-transparent bg-muted/30",
        className,
      )}
      aria-label="Тохиргоо руу орох"
    >
      <Avatar size="sm" className="shrink-0 ring-2 ring-background transition-all group-hover:ring-primary/25">
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight transition-colors group-hover:text-sidebar-accent-foreground">
          {fullName || initials}
        </p>
        <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
      </div>
      <ChevronRight
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-all",
          active ? "opacity-100 text-primary" : "opacity-40 group-hover:translate-x-0.5 group-hover:opacity-100",
        )}
        aria-hidden
      />
    </a>
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
          <AdminUserCard
            initials={initials}
            fullName={fullName}
            roleLabel={roleBadge.label}
            active={activeSegment === "settings"}
            onNavigate={closeMobileNav}
          />
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

export { ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, ADMIN_PRIMARY_NAV, ADMIN_FEATURE_NAV } from "@/components/layout/admin-nav";
export type { AdminNavItem } from "@/components/layout/admin-nav";
