import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Car,
  Waypoints,
  UserPlus,
  Wrench,
  Megaphone,
  Settings as SettingsIcon,
  Vote,
  AlertTriangle,
  Map,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  segment: string;
  /** Highlight as new feature in sidebar */
  badge?: 'new';
  /** Additional segments that mark this item active (e.g. merged property pages) */
  activeSegments?: string[];
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_PRIMARY_NAV: AdminNavItem[] = [
  { label: 'Хянах самбар', href: '/admin', icon: LayoutDashboard, segment: '' },
  {
    label: 'Орон сууц',
    href: '/admin/apartments',
    icon: Building2,
    segment: 'apartments',
    activeSegments: ['apartments', 'residents'],
  },
  {
    label: 'Санхүү',
    href: '/admin/payments',
    icon: CreditCard,
    segment: 'payments',
    activeSegments: ['payments', 'invoices', 'reports'],
  },
  { label: 'Засвар', href: '/admin/maintenance', icon: Wrench, segment: 'maintenance' },
  { label: 'Зарлал', href: '/admin/announcements', icon: Megaphone, segment: 'announcements' },
];

/** New modules — visually highlighted for discovery */
export const ADMIN_FEATURE_NAV: AdminNavItem[] = [
  { label: 'Digital Twin', href: '/admin/digital-twin', icon: Map, segment: 'digital-twin', badge: 'new' },
  { label: 'Incidents', href: '/admin/incidents', icon: AlertTriangle, segment: 'incidents', badge: 'new' },
  { label: 'Хамтын шийдвэр', href: '/admin/community', icon: Vote, segment: 'community', badge: 'new' },
];

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'access',
    label: 'Зогсоол',
    items: [
      { label: 'Машин', href: '/admin/vehicles', icon: Car, segment: 'vehicles' },
      { label: 'Зогсоолын эрх', href: '/admin/gate-access', icon: Waypoints, segment: 'gate-access' },
      { label: 'Зочин', href: '/admin/visitors', icon: UserPlus, segment: 'visitors' },
    ],
  },
];

export const ADMIN_SETTINGS_ITEM: AdminNavItem = {
  label: 'Тохиргоо',
  href: '/admin/settings',
  icon: SettingsIcon,
  segment: 'settings',
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  ...ADMIN_PRIMARY_NAV,
  ...ADMIN_FEATURE_NAV,
  ...ADMIN_NAV_GROUPS.flatMap((group) => group.items),
  ADMIN_SETTINGS_ITEM,
];

export function isNavItemActive(item: AdminNavItem, segment: string): boolean {
  if (item.activeSegments?.includes(segment)) return true;
  return item.segment === segment;
}

export function findAdminNavItem(segment: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => isNavItemActive(item, segment));
}

export function findAdminNavGroup(segment: string): AdminNavGroup | undefined {
  return ADMIN_NAV_GROUPS.find((group) => group.items.some((item) => item.segment === segment));
}

export function isPrimaryNavSegment(segment: string): boolean {
  return ADMIN_PRIMARY_NAV.some((item) => isNavItemActive(item, segment));
}

export function isFeatureNavSegment(segment: string): boolean {
  return ADMIN_FEATURE_NAV.some((item) => item.segment === segment);
}
