"use client";

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  CreditCard as CreditCardIcon,
  Car as CarIcon,
  UserPlus as UserPlusIcon,
  Wrench as WrenchIcon,
  Megaphone as MegaphoneIcon,
  Bell as BellIcon,
  Menu as MenuIcon,
  LogOut as LogOutIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Building2,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { logoutAction } from '@/app/login/actions';
import { cn } from '@/lib/utils';
import type { AuthContext } from '@/lib/auth/session';

export interface ResidentNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  segment: string;
}

export const RESIDENT_NAV_ITEMS: ResidentNavItem[] = [
  { label: 'Home',           href: '/resident',               icon: HomeIcon,         segment: '' },
  { label: 'Payments',       href: '/resident/payments',      icon: CreditCardIcon,   segment: 'payments' },
  { label: 'Vehicle',        href: '/resident/vehicle',       icon: CarIcon,          segment: 'vehicle' },
  { label: 'Visitors',       href: '/resident/visitors',      icon: UserPlusIcon,     segment: 'visitors' },
  { label: 'Maintenance',    href: '/resident/maintenance',   icon: WrenchIcon,       segment: 'maintenance' },
  { label: 'Announcements',  href: '/resident/announcements', icon: MegaphoneIcon,    segment: 'announcements' },
  { label: 'Notifications',  href: '/resident/notifications', icon: BellIcon,         segment: 'notifications' },
];

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
  apartmentLabel = 'A-101',
  unreadNotifications = 0,
  activeSegment = '',
  pageTitle,
  pageSubtitle,
  headerRight,
  children,
}: ResidentShellProps) {
  const initials = `${(ctx.user.first_name || '')[0] ?? ''}${(ctx.user.last_name || '')[0] ?? ''}`;
  const orgName = ctx.user.organization?.name ?? '—';
  const notifCount = Math.max(0, Math.min(99, unreadNotifications));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2.5 px-5 h-14 border-b border-zinc-100 dark:border-zinc-800">
            <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Building2 className="size-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight truncate">Smart СӨХ</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">Resident</span>
            </div>
          </div>

          <nav className="flex-1 px-2 py-3 overflow-y-auto">
            <div className="grid grid-cols-1 gap-0.5">
              {RESIDENT_NAV_ITEMS.map((item) => {
                const active = item.segment === activeSegment;
                const Icon = item.icon;
                const isNotif = item.segment === 'notifications';
                return (
                  <a
                    key={item.segment}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm font-medium transition-colors relative',
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300')} />
                    <span className="truncate">{item.label}</span>
                    {isNotif && notifCount > 0 ? (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold">
                        {notifCount > 99 ? '99+' : notifCount}
                      </span>
                    ) : null}
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 ring-1 ring-emerald-100 dark:ring-emerald-500/10">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
                My apartment
              </div>
              <div className="text-lg font-semibold tracking-tight">{apartmentLabel}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{orgName}</div>
            </div>
            <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
              <Avatar size="sm">
                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {ctx.user.first_name} {ctx.user.last_name}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{ctx.user.email}</div>
              </div>
            </div>
            <form action={logoutAction} className="w-full">
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 h-8 px-2.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <LogOutIcon className="size-3.5" />
                Системээс гарах
              </button>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
            <div className="flex items-center gap-2 min-w-0">
              <label
                htmlFor="resident-nav-toggle"
                className="md:hidden size-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 cursor-pointer shrink-0"
                aria-label="Open menu"
              >
                <MenuIcon className="size-4" />
              </label>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 leading-none">
                  {apartmentLabel}
                </div>
                <h1 className="text-sm font-semibold tracking-tight truncate">
                  {pageTitle ?? 'Home'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <a
                href="/resident/notifications"
                className="relative size-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500"
              >
                <BellIcon className="size-4" />
                {notifCount > 0 ? (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-semibold inline-flex items-center justify-center">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                ) : null}
              </a>
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-zinc-200 dark:border-zinc-800">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  Resident
                </Badge>
                <Avatar size="sm">
                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              {headerRight}
            </div>
          </header>

          {/* Mobile nav (drawer) */}
          <MobileResidentNav
            initials={initials}
            orgName={orgName}
            apartmentLabel={apartmentLabel}
            notifCount={notifCount}
            activeSegment={activeSegment}
          />

          {/* Body */}
          <div className="flex-1 min-w-0 overflow-y-auto pb-24 md:pb-8">
            {pageSubtitle ? (
              <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/30 backdrop-blur">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                      {pageTitle ?? 'Нүүр хуудас'}
                    </h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{pageSubtitle}</p>
                  </div>
                </div>
              </div>
            ) : null}
            <div className={pageSubtitle ? 'p-4 sm:p-6 lg:p-8' : 'p-4 sm:p-6 lg:p-8'}>
              {children}
            </div>
          </div>

          {/* Mobile bottom nav */}
          <MobileBottomNav notifCount={notifCount} activeSegment={activeSegment} />
        </main>
      </div>
    </div>
  );
}

function ThemeToggle() {
  return (
    <button
      type="button"
      className="size-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500"
      onClick={() => {
        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        if (isDark) {
          root.classList.remove('dark');
          try { localStorage.setItem('theme', 'light'); } catch {}
        } else {
          root.classList.add('dark');
          try { localStorage.setItem('theme', 'dark'); } catch {}
        }
      }}
    >
      <SunIcon className="size-4 dark:hidden" />
      <MoonIcon className="size-4 hidden dark:block" />
    </button>
  );
}

function MobileResidentNav({
  initials,
  orgName,
  apartmentLabel,
  notifCount,
  activeSegment,
}: {
  initials: string;
  orgName: string;
  apartmentLabel: string;
  notifCount: number;
  activeSegment: string;
}) {
  return (
    <>
      <input id="resident-nav-toggle" type="checkbox" className="peer sr-only" />
      <div className="md:hidden fixed inset-0 top-14 z-20 bg-black/40 dark:bg-black/60 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition-opacity" aria-hidden="true" />
      <aside className="md:hidden fixed left-0 top-14 bottom-0 z-30 w-72 -translate-x-full peer-checked:translate-x-0 transition-transform bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          <div className="grid grid-cols-1 gap-0.5">
            {RESIDENT_NAV_ITEMS.map((item) => {
              const active = item.segment === activeSegment;
              const Icon = item.icon;
              const isNotif = item.segment === 'notifications';
              return (
                <a
                  key={item.segment}
                  href={item.href}
                  onClick={() => {
                    const el = document.getElementById('resident-nav-toggle') as HTMLInputElement | null;
                    if (el) el.checked = false;
                  }}
                  className={cn(
                    'group flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm font-medium transition-colors relative',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500')} />
                  <span>{item.label}</span>
                  {isNotif && notifCount > 0 ? (
                    <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold">
                      {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        </nav>
        <Separator className="bg-zinc-200 dark:bg-zinc-800" />
        <div className="p-3 space-y-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 ring-1 ring-emerald-100 dark:ring-emerald-500/10">
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
              My apartment
            </div>
            <div className="text-lg font-semibold tracking-tight">{apartmentLabel}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{orgName}</div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-zinc-50 dark:bg-zinc-800/60">
            <Avatar size="sm">
              <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{initials}</div>
              <div className="text-[10px] text-zinc-500 truncate">{orgName}</div>
            </div>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              Resident
            </Badge>
          </div>
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
            >
              <LogOutIcon className="size-3.5" />
              Системээс гарах
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
  const primaryItems = RESIDENT_NAV_ITEMS.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg">
      <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
        {primaryItems.map((item) => {
          const active = item.segment === activeSegment;
          const Icon = item.icon;
          const isNotif = item.segment === 'notifications';
          return (
            <a
              key={item.segment}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              <div className="relative">
                <Icon className={cn('size-[18px]', active ? '' : '')} />
                {isNotif && notifCount > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-semibold inline-flex items-center justify-center">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                ) : null}
              </div>
              <span className="truncate max-w-full">{item.label}</span>
              {active ? (
                <span className="absolute bottom-0 h-0.5 w-7 rounded-full bg-emerald-500" />
              ) : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
