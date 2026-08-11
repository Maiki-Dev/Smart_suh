import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  CreditCard as CreditCardIcon,
  Car as CarIcon,
  UserPlus as UserPlusIcon,
  Wrench as WrenchIcon,
  Megaphone as MegaphoneIcon,
  Bell as BellIcon,
} from 'lucide-react';

export interface ResidentNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  segment: string;
}

export interface ResidentNavGroup {
  id: string;
  label: string;
  items: ResidentNavItem[];
}

export const RESIDENT_NAV_GROUPS: ResidentNavGroup[] = [
  {
    id: 'overview',
    label: 'Ерөнхий',
    items: [{ label: 'Нүүр', href: '/resident', icon: HomeIcon, segment: '' }],
  },
  {
    id: 'services',
    label: 'Миний үйлчилгээ',
    items: [
      { label: 'Төлбөр', href: '/resident/payments', icon: CreditCardIcon, segment: 'payments' },
      { label: 'Машин', href: '/resident/vehicle', icon: CarIcon, segment: 'vehicle' },
      { label: 'Зочин', href: '/resident/visitors', icon: UserPlusIcon, segment: 'visitors' },
      { label: 'Засвар', href: '/resident/maintenance', icon: WrenchIcon, segment: 'maintenance' },
    ],
  },
  {
    id: 'info',
    label: 'Мэдээлэл',
    items: [
      { label: 'Зарлал', href: '/resident/announcements', icon: MegaphoneIcon, segment: 'announcements' },
      { label: 'Мэдэгдэл', href: '/resident/notifications', icon: BellIcon, segment: 'notifications' },
    ],
  },
];

export const RESIDENT_NAV_ITEMS: ResidentNavItem[] = RESIDENT_NAV_GROUPS.flatMap((g) => g.items);

/** Bottom bar: most-used pages on mobile */
export const RESIDENT_BOTTOM_NAV_ITEMS: ResidentNavItem[] = [
  RESIDENT_NAV_ITEMS[0],
  ...RESIDENT_NAV_GROUPS[1].items.slice(0, 3),
  RESIDENT_NAV_GROUPS[2].items[1],
];
