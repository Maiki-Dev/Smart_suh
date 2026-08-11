"use client";

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Car,
  Waypoints,
  UserPlus,
  Wrench,
  Megaphone,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Search as SearchIcon,
  Bell as BellIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { logoutAction } from '@/app/login/actions';
import { cn } from '@/lib/utils';
import type { AuthContext } from '@/lib/auth/session';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  segment: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: 'Хянах самбар', href: '/admin',            icon: LayoutDashboard, segment: '' },
  { label: 'Орон сууц',    href: '/admin/apartments', icon: Building2,       segment: 'apartments' },
  { label: 'Оршин суугч',  href: '/admin/residents',  icon: Users,           segment: 'residents' },
  { label: 'Нэхэмжлэл',    href: '/admin/invoices',   icon: FileText,        segment: 'invoices' },
  { label: 'Төлбөр',       href: '/admin/payments',   icon: CreditCard,      segment: 'payments' },
  { label: 'Машин',        href: '/admin/vehicles',   icon: Car,             segment: 'vehicles' },
  { label: 'Гацаа',        href: '/admin/gate-access', icon: Waypoints,      segment: 'gate-access' },
  { label: 'Зочин',        href: '/admin/visitors',   icon: UserPlus,        segment: 'visitors' },
  { label: 'Засвар',       href: '/admin/maintenance', icon: Wrench,         segment: 'maintenance' },
  { label: 'Зарлал',       href: '/admin/announcements', icon: Megaphone,    segment: 'announcements' },
  { label: 'Тайлан',       href: '/admin/reports',    icon: BarChart3,       segment: 'reports' },
  { label: 'Тохиргоо',     href: '/admin/settings',   icon: SettingsIcon,    segment: 'settings' },
];

export const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  SUPER_ADMIN: { label: 'Супер админ', className: 'bg-emerald-600 text-white' },
  HOA_ADMIN:   { label: 'СӨХ админ',   className: 'bg-emerald-100 text-emerald-700' },
  OPERATOR:    { label: 'Оператор',    className: 'bg-zinc-100 text-zinc-700' },
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
  activeSegment = '',
  pageTitle,
  pageSubtitle,
  headerRight,
  children,
}: AdminShellProps) {
  const roleBadge = ROLE_BADGE[ctx.user.role] ?? {
    label: ctx.user.role,
    className: 'bg-zinc-100 text-zinc-700',
  };
  const initials = `${(ctx.user.first_name || '')[0] ?? ''}${(ctx.user.last_name || '')[0] ?? ''}`;
  const orgName = ctx.user.organization?.name ?? '—';

  return (
    <div className="h-dvh overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex h-full w-full">
        {/* Desktop sidebar — fixed height, nav scrolls independently */}
        <aside className="hidden md:flex md:w-64 lg:w-72 h-full shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 h-14 shrink-0 border-b border-zinc-100 dark:border-zinc-800">
            <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Building2 className="size-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight truncate">Smart СӨХ</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">Админ самбар</span>
            </div>
          </div>

          <div className="px-3 py-3 shrink-0">
            <div className="flex items-center gap-2 h-8 px-2 rounded-md bg-zinc-50 dark:bg-zinc-800/60 ring-1 ring-zinc-200 dark:ring-zinc-800 text-zinc-500">
              <SearchIcon className="size-3.5 shrink-0" />
              <span className="text-xs">Хайлт (Ctrl+K)</span>
            </div>
          </div>

          <nav className="flex-1 min-h-0 px-2 pb-3 overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-1 gap-0.5">
              {ADMIN_NAV_ITEMS.map((item) => {
                const active = item.segment === activeSegment;
                const Icon = item.icon;
                return (
                  <a
                    key={item.segment}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                      active
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300')} />
                    <span className="truncate">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="px-3 py-3 shrink-0 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
              <Avatar size="sm" className="ring-2 ring-emerald-500/10">
                <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {ctx.user.first_name} {ctx.user.last_name}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">{orgName}</div>
              </div>
              <ChevronDown className="size-3.5 text-zinc-400" />
            </div>
            <form action={logoutAction} className="w-full">
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 h-8 px-2.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <LogOut className="size-3.5" />
                Системээс гарах
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-14 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-6 flex items-center justify-between gap-3 z-30">
            <div className="flex items-center gap-2 min-w-0">
              <MobileNavButton />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 leading-none">
                  {orgName}
                </div>
                <h1 className="text-sm font-semibold tracking-tight truncate">
                  {pageTitle ?? 'Хянах самбар'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <button className="relative size-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-500">
                <BellIcon className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-rose-500" />
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-zinc-200 dark:border-zinc-800">
                <Badge className={cn('text-[10px] uppercase tracking-wider', roleBadge.className)}>
                  {roleBadge.label}
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

          {/* Mobile sidebar (collapses via sheet / top nav toggle button) */}
          <MobileNav
            initials={initials}
            orgName={orgName}
            roleBadge={roleBadge}
            activeSegment={activeSegment}
          />

          {/* Page body — only this area scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {pageSubtitle ? (
              <div className="px-4 sm:px-6 lg:px-8 pt-5 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/30 backdrop-blur">
                <div className="flex items-end justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                      {pageTitle ?? 'Хянах самбар'}
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

function MobileNavButton() {
  return (
    <label
      htmlFor="mobile-nav-toggle"
      className="md:hidden size-8 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 cursor-pointer shrink-0"
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
  orgName,
  roleBadge,
  activeSegment,
}: {
  initials: string;
  orgName: string;
  roleBadge: { label: string; className: string };
  activeSegment: string;
}) {
  return (
    <>
      <input id="mobile-nav-toggle" type="checkbox" className="peer sr-only" />
      <div className="md:hidden fixed inset-0 top-14 z-20 bg-black/40 dark:bg-black/60 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition-opacity" aria-hidden="true" />
      <aside className="md:hidden fixed left-0 top-14 bottom-0 z-30 w-72 -translate-x-full peer-checked:translate-x-0 transition-transform bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
        <div className="px-3 py-3 shrink-0">
          <div className="flex items-center gap-2 h-8 px-2 rounded-md bg-zinc-50 dark:bg-zinc-800/60 ring-1 ring-zinc-200 dark:ring-zinc-800 text-zinc-500">
            <SearchIcon className="size-3.5 shrink-0" />
            <span className="text-xs">Хайлт</span>
          </div>
        </div>

        <nav className="flex-1 min-h-0 px-2 pb-3 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 gap-0.5">
            {ADMIN_NAV_ITEMS.map((item) => {
              const active = item.segment === activeSegment;
              const Icon = item.icon;
              return (
                <a
                  key={item.segment}
                  href={item.href}
                  onClick={() => {
                    const el = document.getElementById('mobile-nav-toggle') as HTMLInputElement | null;
                    if (el) el.checked = false;
                  }}
                  className={cn(
                    'group flex items-center gap-2.5 h-9 px-2.5 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                  )}
                >
                  <Icon className={cn('size-4 shrink-0', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500')} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>

        <Separator className="bg-zinc-200 dark:bg-zinc-800 shrink-0" />
        <div className="p-3 space-y-2 shrink-0">
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
            <Badge className={cn('text-[10px] uppercase tracking-wider', roleBadge.className)}>
              {roleBadge.label}
            </Badge>
          </div>
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-md text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
            >
              <LogOut className="size-3.5" />
              Системээс гарах
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

