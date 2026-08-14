import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  CreditCard as CreditCardIcon,
  Car as CarIcon,
  UserPlus as UserPlusIcon,
  Wrench as WrenchIcon,
  Megaphone as MegaphoneIcon,
  Bell as BellIcon,
  Vote as VoteIcon,
  UserRound as UserIcon,
} from 'lucide-react';

export interface ResidentNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  segment: string;
  badge?: 'new';
  activeSegments?: string[];
}

export interface ResidentNavGroup {
  id: string;
  label: string;
  items: ResidentNavItem[];
}

export const RESIDENT_PRIMARY_NAV: ResidentNavItem[] = [
  { label: 'Нүүр', href: '/resident', icon: HomeIcon, segment: '' },
  { label: 'Төлбөр', href: '/resident/payments', icon: CreditCardIcon, segment: 'payments' },
  { label: 'Засвар', href: '/resident/maintenance', icon: WrenchIcon, segment: 'maintenance' },
  { label: 'Зарлал', href: '/resident/announcements', icon: MegaphoneIcon, segment: 'announcements' },
];

export const RESIDENT_FEATURE_NAV: ResidentNavItem[] = [
  {
    label: 'Хамтын шийдвэр',
    href: '/resident/community',
    icon: VoteIcon,
    segment: 'community',
    badge: 'new',
  },
];

export const RESIDENT_NAV_GROUPS: ResidentNavGroup[] = [
  {
    id: 'more',
    label: 'Бусад',
    items: [
      { label: 'Машин', href: '/resident/vehicle', icon: CarIcon, segment: 'vehicle' },
      { label: 'Зочин', href: '/resident/visitors', icon: UserPlusIcon, segment: 'visitors' },
      { label: 'Мэдэгдэл', href: '/resident/notifications', icon: BellIcon, segment: 'notifications' },
    ],
  },
];

/** @deprecated Use RESIDENT_PRIMARY_NAV + groups */
export const RESIDENT_NAV_ITEMS: ResidentNavItem[] = [
  ...RESIDENT_PRIMARY_NAV,
  ...RESIDENT_FEATURE_NAV,
  ...RESIDENT_NAV_GROUPS.flatMap((g) => g.items),
];

/** Bottom bar: most-used pages on mobile */
export const RESIDENT_BOTTOM_NAV_ITEMS: ResidentNavItem[] = [
  RESIDENT_PRIMARY_NAV[0],
  RESIDENT_PRIMARY_NAV[1],
  RESIDENT_NAV_GROUPS[0].items[0],
  RESIDENT_NAV_GROUPS[0].items[1],
  RESIDENT_NAV_GROUPS[0].items[2],
];

export function isResidentNavItemActive(item: ResidentNavItem, segment: string): boolean {
  if (item.activeSegments?.includes(segment)) return true;
  return item.segment === segment;
}

export function findResidentNavGroup(segment: string): ResidentNavGroup | undefined {
  return RESIDENT_NAV_GROUPS.find((group) =>
    group.items.some((item) => isResidentNavItemActive(item, segment)),
  );
}
