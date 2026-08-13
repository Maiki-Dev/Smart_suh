import type {
  IncidentDetectionSource,
  IncidentIssueType,
  IncidentLocationMatch,
  IncidentStatus,
} from '@/lib/incidents/types';
import type { MaintenancePriority } from '@/types';

export function incidentIssueTypeLabel(t: IncidentIssueType): string {
  const map: Record<IncidentIssueType, string> = {
    WATER_LEAK: 'Ус алдах',
    NO_WATER: 'Усгүй',
    LOW_WATER_PRESSURE: 'Усны даралт бага',
    ELECTRICITY: 'Цахилгаан',
    ELEVATOR: 'Лифт',
    HEATING: 'Халаалт',
    SECURITY: 'Аюулгүй байдал',
    PARKING: 'Зогсоол',
    NOISE: 'Чимээ',
    CLEANING: 'Цэвэрлэгээ',
    FIRE_SAFETY: 'Галын аюулгүй байдал',
    GAS: 'Хий',
    OTHER: 'Бусад',
  };
  return map[t] ?? t;
}

export function incidentStatusLabel(s: IncidentStatus): string {
  const map: Record<IncidentStatus, string> = {
    DETECTED: 'Илэрсэн',
    INVESTIGATING: 'Шалгаж байна',
    CONFIRMED: 'Баталгаажсан',
    IN_PROGRESS: 'Хэрэгжиж байна',
    MONITORING: 'Хяналтад',
    RESOLVED: 'Шийдэгдсэн',
    FALSE_POSITIVE: 'Буруу илрүүлэг',
  };
  return map[s] ?? s;
}

export function incidentStatusVariant(
  s: IncidentStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'RESOLVED') return 'default';
  if (s === 'FALSE_POSITIVE') return 'outline';
  if (['DETECTED', 'INVESTIGATING'].includes(s)) return 'secondary';
  if (s === 'CONFIRMED' || s === 'IN_PROGRESS') return 'destructive';
  return 'outline';
}

export function locationMatchLabel(m: IncidentLocationMatch): string {
  const map: Record<IncidentLocationMatch, string> = {
    SAME_APARTMENT: 'Ижил орон сууц',
    SAME_FLOOR: 'Ижил давхар',
    ADJACENT_FLOOR: 'Ойролцоо давхар',
    SAME_ENTRANCE: 'Ижил орц',
    SAME_BUILDING: 'Ижил барилга',
  };
  return map[m] ?? m;
}

export function detectionSourceLabel(s: IncidentDetectionSource): string {
  const map: Record<IncidentDetectionSource, string> = {
    AI: 'AI',
    RULE_BASED: 'Дүрэм',
    MANUAL: 'Гараар',
  };
  return map[s] ?? s;
}

export function incidentTitleFromType(type: IncidentIssueType): string {
  return `${incidentIssueTypeLabel(type)} — Building Incident`;
}
