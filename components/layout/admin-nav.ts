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
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  segment: string;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'overview',
    label: 'Ерөнхий',
    items: [
      { label: 'Хянах самбар', href: '/admin', icon: LayoutDashboard, segment: '' },
    ],
  },
  {
    id: 'property',
    label: 'Орон сууц',
    items: [
      { label: 'Орон сууц', href: '/admin/apartments', icon: Building2, segment: 'apartments' },
      { label: 'Оршин суугч', href: '/admin/residents', icon: Users, segment: 'residents' },
    ],
  },
  {
    id: 'finance',
    label: 'Санхүү',
    items: [
      { label: 'Нэхэмжлэл', href: '/admin/invoices', icon: FileText, segment: 'invoices' },
      { label: 'Төлбөр', href: '/admin/payments', icon: CreditCard, segment: 'payments' },
      { label: 'Тайлан', href: '/admin/reports', icon: BarChart3, segment: 'reports' },
    ],
  },
  {
    id: 'access',
    label: 'Зогсоол',
    items: [
      { label: 'Машин', href: '/admin/vehicles', icon: Car, segment: 'vehicles' },
      { label: 'Нэвтрэлт', href: '/admin/gate-access', icon: Waypoints, segment: 'gate-access' },
      { label: 'Зочин', href: '/admin/visitors', icon: UserPlus, segment: 'visitors' },
    ],
  },
  {
    id: 'operations',
    label: 'Үйлчилгээ',
    items: [
      { label: 'Засвар', href: '/admin/maintenance', icon: Wrench, segment: 'maintenance' },
      { label: 'Зарлал', href: '/admin/announcements', icon: Megaphone, segment: 'announcements' },
    ],
  },
  {
    id: 'system',
    label: 'Систем',
    items: [
      { label: 'Тохиргоо', href: '/admin/settings', icon: SettingsIcon, segment: 'settings' },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((group) => group.items);

export function findAdminNavItem(segment: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.segment === segment);
}

export function findAdminNavGroup(segment: string): AdminNavGroup | undefined {
  return ADMIN_NAV_GROUPS.find((group) => group.items.some((item) => item.segment === segment));
}
