"use client";

import type { ReactNode } from "react";
import {
  Building2,
  LogOut,
  Bell as BellIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
import type { AuthContext } from "@/lib/auth/session";
import {
  RESIDENT_BOTTOM_NAV_ITEMS,
  RESIDENT_NAV_GROUPS,
  type ResidentNavGroup,
  type ResidentNavItem,
} from "@/components/layout/resident-nav";

export { RESIDENT_NAV_ITEMS, RESIDENT_NAV_GROUPS, RESIDENT_BOTTOM_NAV_ITEMS } from "@/components/layout/resident-nav";
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
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4 shrink-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">Smart СӨХ</p>
              <p className="truncate text-xs text-muted-foreground">Оршин суугч</p>
            </div>
          </div>

          <ResidentSidebarNav
            activeSegment={activeSegment}
            notifCount={notifCount}
            className="flex-1 min-h-0 py-3"
          />

          <div className="shrink-0 border-t border-sidebar-border p-3">
            <div className="mb-3 rounded-md border border-sidebar-border bg-muted/40 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Орон сууц</p>
              <p className="text-sm font-semibold leading-tight">{apartmentLabel}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{orgName}</p>
            </div>
            <ResidentProfileCard
              initials={initials}
              fullName={fullName}
              email={ctx.user.email}
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
              <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 sm:flex">
                <Badge variant="secondary" className="font-normal">
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
            email={ctx.user.email}
            orgName={orgName}
            apartmentLabel={apartmentLabel}
            notifCount={notifCount}
            activeSegment={activeSegment}
          />

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 pb-20 md:pb-0">
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
  return (
    <nav className={cn("overflow-y-auto overscroll-contain px-2", className)}>
      <div className="space-y-4">
        {RESIDENT_NAV_GROUPS.map((group) => (
          <ResidentNavGroupBlock
            key={group.id}
            group={group}
            activeSegment={activeSegment}
            notifCount={notifCount}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}

function ResidentNavGroupBlock({
  group,
  activeSegment,
  notifCount,
  onNavigate,
}: {
  group: ResidentNavGroup;
  activeSegment: string;
  notifCount: number;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <p className="mb-1 px-2 text-xs font-medium text-muted-foreground">{group.label}</p>
      <ul className="space-y-0.5">
        {group.items.map((item) => (
          <ResidentNavLink
            key={item.segment}
            item={item}
            active={item.segment === activeSegment}
            notifCount={item.segment === "notifications" ? notifCount : 0}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
}

function ResidentNavLink({
  item,
  active,
  notifCount,
  onNavigate,
}: {
  item: ResidentNavItem;
  active: boolean;
  notifCount: number;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <li>
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
        {notifCount > 0 ? (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-white">
            {notifCount > 99 ? "99+" : notifCount}
          </span>
        ) : null}
      </a>
    </li>
  );
}

function ResidentProfileCard({
  initials,
  fullName,
  email,
  active = false,
  onNavigate,
  className,
}: {
  initials: string;
  fullName: string;
  email: string;
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
        <p className="truncate text-xs text-muted-foreground">{email}</p>
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
  email,
  orgName,
  apartmentLabel,
  notifCount,
  activeSegment,
}: {
  initials: string;
  fullName: string;
  email: string;
  orgName: string;
  apartmentLabel: string;
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
          <p className="text-xs text-muted-foreground">Орон сууц</p>
          <p className="truncate text-sm font-semibold">{apartmentLabel}</p>
          <p className="truncate text-xs text-muted-foreground">{orgName}</p>
        </div>
        <ResidentSidebarNav
          activeSegment={activeSegment}
          notifCount={notifCount}
          className="flex-1 min-h-0 py-3"
          onNavigate={closeNav}
        />
        <div className="border-t border-sidebar-border p-3">
          <ResidentProfileCard
            initials={initials}
            fullName={fullName}
            email={email}
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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background md:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {RESIDENT_BOTTOM_NAV_ITEMS.map((item) => {
          const active = item.segment === activeSegment;
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
