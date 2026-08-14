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
  RESIDENT_BOTTOM_NAV_ITEMS,
  RESIDENT_FEATURE_NAV,
  RESIDENT_NAV_GROUPS,
  RESIDENT_PRIMARY_NAV,
  findResidentNavGroup,
  isResidentNavItemActive,
  type ResidentNavGroup,
  type ResidentNavItem,
} from "@/components/layout/resident-nav";
import { SidebarBrandHeader } from "@/components/layout/SidebarBrandHeader";

export {
  RESIDENT_NAV_ITEMS,
  RESIDENT_NAV_GROUPS,
  RESIDENT_BOTTOM_NAV_ITEMS,
  RESIDENT_PRIMARY_NAV,
  RESIDENT_FEATURE_NAV,
} from "@/components/layout/resident-nav";
export type { ResidentNavItem } from "@/components/layout/resident-nav";

export interface ResidentShellProps {
  ctx: AuthContext;
  apartmentLabel?: string;
  unreadNotifications?: number;
  activeSegment?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function ResidentShell({
  ctx,
  apartmentLabel = "—",
  unreadNotifications = 0,
  activeSegment = "",
  pageTitle,
  pageSubtitle,
  headerRight,
  children,
}: ResidentShellProps) {
  const initials = `${(ctx.user.first_name || "")[0] ?? ""}${(ctx.user.last_name || "")[0] ?? ""}`;
  const orgName = ctx.user.organization?.name ?? "—";
  const fullName = `${ctx.user.first_name} ${ctx.user.last_name}`.trim();
  const notifCount = Math.max(0, Math.min(99, unreadNotifications));

  return (
    <div
      data-shell-root
      className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-background text-foreground"
    >
      <div className="flex h-full w-full">
        <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarBrandHeader subtitle={apartmentLabel} href="/resident" />

          <ResidentSidebarNav
            activeSegment={activeSegment}
            notifCount={notifCount}
            className="flex-1 min-h-0 py-3"
          />

          <div className="shrink-0 border-t border-sidebar-border p-3">
            <ResidentUserCard
              initials={initials}
              fullName={fullName}
              subtitle={orgName}
              active={activeSegment === "profile"}
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
              <h1 className="truncate text-sm font-semibold">{pageTitle ?? "Нүүр"}</h1>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <a
                href="/resident/notifications"
                className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Мэдэгдэл"
              >
                <BellIcon className="size-4" />
                {notifCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                ) : null}
              </a>
              <div className="ml-1 flex items-center gap-2 sm:border-l sm:border-border sm:pl-3">
                <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
                  {apartmentLabel}
                </Badge>
                <a
                  href="/resident/profile"
                  className="group flex items-center gap-1.5 rounded-full p-0.5 ring-offset-background transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Профайл"
                >
                  <Avatar size="sm" className="transition-transform group-hover:scale-105">
                    <AvatarFallback className="bg-muted text-xs font-medium">{initials}</AvatarFallback>
                  </Avatar>
                </a>
              </div>
              {headerRight}
            </div>
          </header>

          <MobileResidentNav
            initials={initials}
            fullName={fullName}
            apartmentLabel={apartmentLabel}
            orgName={orgName}
            notifCount={notifCount}
            activeSegment={activeSegment}
          />

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 resident-content-pb">
            {pageSubtitle ? (
              <div className="border-b border-border bg-background px-4 py-4 sm:px-6 lg:px-8">
                <h2 className="text-lg font-semibold sm:text-xl">{pageTitle ?? "Нүүр"}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{pageSubtitle}</p>
              </div>
            ) : null}
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </div>

          <MobileBottomNav notifCount={notifCount} activeSegment={activeSegment} />
        </main>
      </div>
    </div>
  );
}

function ResidentSidebarNav({
  activeSegment,
  notifCount,
  className,
  onNavigate,
}: {
  activeSegment: string;
  notifCount: number;
  className?: string;
  onNavigate?: () => void;
}) {
  const activeGroup = findResidentNavGroup(activeSegment);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of RESIDENT_NAV_GROUPS) {
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
        {RESIDENT_PRIMARY_NAV.map((item) => (
          <ResidentNavLink
            key={item.segment || "home"}
            item={item}
            active={isResidentNavItemActive(item, activeSegment)}
            onNavigate={onNavigate}
          />
        ))}
      </ul>

      <div className="my-3 space-y-1">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Шинэ боломж
        </p>
        <ul className="space-y-0.5 rounded-lg border border-primary/15 bg-primary/[0.04] p-1">
          {RESIDENT_FEATURE_NAV.map((item) => (
            <ResidentNavLink
              key={item.segment}
              item={item}
              active={isResidentNavItemActive(item, activeSegment)}
              onNavigate={onNavigate}
              featured
            />
          ))}
        </ul>
      </div>

      <div className="my-3 border-t border-sidebar-border/60" />

      <div className="space-y-1">
        {RESIDENT_NAV_GROUPS.map((group) => (
          <CollapsibleNavGroup
            key={group.id}
            group={group}
            activeSegment={activeSegment}
            notifCount={notifCount}
            open={openGroups[group.id] ?? false}
            onToggle={() => toggleGroup(group.id)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function ResidentNavLink({
  item,
  active,
  notifCount = 0,
  onNavigate,
  compact,
  featured,
}: {
  item: ResidentNavItem;
  active: boolean;
  notifCount?: number;
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
            active ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span className="truncate">{item.label}</span>
        {item.badge === "new" ? (
          <span className="ml-auto shrink-0 rounded-full bg-primary px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
            Шинэ
          </span>
        ) : notifCount > 0 ? (
          <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {notifCount > 99 ? "99+" : notifCount}
          </span>
        ) : null}
      </a>
    </li>
  );
}

function CollapsibleNavGroup({
  group,
  activeSegment,
  notifCount,
  open,
  onToggle,
  onNavigate,
}: {
  group: ResidentNavGroup;
  activeSegment: string;
  notifCount: number;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasActive = group.items.some((item) => isResidentNavItemActive(item, activeSegment));

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
            <ResidentNavLink
              key={item.segment}
              item={item}
              active={isResidentNavItemActive(item, activeSegment)}
              notifCount={item.segment === "notifications" ? notifCount : 0}
              onNavigate={onNavigate}
              compact
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ResidentUserCard({
  initials,
  fullName,
  subtitle,
  active = false,
  onNavigate,
  className,
}: {
  initials: string;
  fullName: string;
  subtitle: string;
  active?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <a
      href="/resident/profile"
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
      aria-label="Профайл руу орох"
    >
      <Avatar size="sm" className="shrink-0 ring-2 ring-background transition-all group-hover:ring-primary/25">
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight transition-colors group-hover:text-sidebar-accent-foreground">
          {fullName || initials}
        </p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
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
      htmlFor="resident-nav-toggle"
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

function MobileResidentNav({
  initials,
  fullName,
  apartmentLabel,
  orgName,
  notifCount,
  activeSegment,
}: {
  initials: string;
  fullName: string;
  apartmentLabel: string;
  orgName: string;
  notifCount: number;
  activeSegment: string;
}) {
  const closeNav = () => {
    const el = document.getElementById("resident-nav-toggle") as HTMLInputElement | null;
    if (el) el.checked = false;
  };

  return (
    <>
      <input id="resident-nav-toggle" type="checkbox" className="peer sr-only" />
      <label
        htmlFor="resident-nav-toggle"
        className="fixed inset-0 top-14 z-20 bg-black/40 opacity-0 pointer-events-none peer-checked:pointer-events-auto peer-checked:opacity-100 transition-opacity md:hidden"
        aria-hidden="true"
      />
      <aside className="fixed bottom-0 left-0 top-14 z-30 flex w-64 -translate-x-full flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-150 peer-checked:translate-x-0 md:hidden">
        <div className="border-b border-sidebar-border px-4 py-3">
          <p className="truncate text-sm font-medium">{fullName || initials}</p>
          <p className="truncate text-xs text-muted-foreground">{apartmentLabel}</p>
        </div>
        <ResidentSidebarNav
          activeSegment={activeSegment}
          notifCount={notifCount}
          className="flex-1 min-h-0 py-3"
          onNavigate={closeNav}
        />
        <div className="border-t border-sidebar-border p-3">
          <ResidentUserCard
            initials={initials}
            fullName={fullName}
            subtitle={orgName}
            active={activeSegment === "profile"}
            onNavigate={closeNav}
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

function MobileBottomNav({
  notifCount,
  activeSegment,
}: {
  notifCount: number;
  activeSegment: string;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background md:hidden" data-mobile-bottom-nav>
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {RESIDENT_BOTTOM_NAV_ITEMS.map((item) => {
          const active = isResidentNavItemActive(item, activeSegment);
          const Icon = item.icon;
          const badge = item.segment === "notifications" ? notifCount : 0;
          return (
            <a
              key={item.segment || "home"}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <div className="relative">
                <Icon className="size-[18px]" />
                {badge > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-medium text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </div>
              <span className="max-w-full truncate">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
