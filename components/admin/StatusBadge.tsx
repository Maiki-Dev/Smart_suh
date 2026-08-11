import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const toneClasses: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
};

export function StatusBadge({
  label,
  tone = 'zinc',
  className,
}: {
  label: string;
  tone?: keyof typeof toneClasses;
  className?: string;
}) {
  return (
    <Badge className={cn('text-[10px] uppercase tracking-wider', toneClasses[tone], className)}>
      {label}
    </Badge>
  );
}

export function apartmentStatusTone(status: string): keyof typeof toneClasses {
  switch (status) {
    case 'OCCUPIED':
      return 'emerald';
    case 'VACANT':
      return 'zinc';
    case 'MAINTENANCE':
      return 'amber';
    default:
      return 'zinc';
  }
}

export function residentStatusTone(status: string): keyof typeof toneClasses {
  switch (status) {
    case 'ACTIVE':
      return 'emerald';
    case 'INACTIVE':
      return 'zinc';
    case 'MOVED_OUT':
      return 'amber';
    default:
      return 'zinc';
  }
}

export function paymentStatusTone(status: string): keyof typeof toneClasses {
  switch (status) {
    case 'PAID':
      return 'emerald';
    case 'PARTIAL':
      return 'sky';
    case 'OVERDUE':
      return 'rose';
    case 'PENDING':
      return 'amber';
    default:
      return 'zinc';
  }
}
