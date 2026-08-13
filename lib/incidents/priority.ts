import type { IncidentIssueType } from '@/lib/incidents/types';
import {
  CRITICAL_ISSUE_TYPES,
  ISSUE_TYPE_SEVERITY,
  priorityFromScore,
} from '@/lib/incidents/types';
import type { MaintenancePriority } from '@/types';

export function calculateIncidentPriority(input: {
  reportCount: number;
  affectedApartments: number;
  issueType: IncidentIssueType;
  windowMinutes: number;
  firstReportAt: Date;
  lastReportAt: Date;
}): MaintenancePriority {
  const typeSeverity = ISSUE_TYPE_SEVERITY[input.issueType] ?? 1;
  const reportFactor = Math.min(4, input.reportCount * 0.8);
  const aptFactor = Math.min(3, input.affectedApartments * 0.5);

  const durationMin =
    (input.lastReportAt.getTime() - input.firstReportAt.getTime()) / 60000;
  const growthRate =
    input.reportCount > 1 && durationMin > 0
      ? input.reportCount / (durationMin / input.windowMinutes)
      : 1;
  const growthFactor = Math.min(3, growthRate * 1.5);

  let score = typeSeverity + reportFactor + aptFactor + growthFactor;

  if (CRITICAL_ISSUE_TYPES.includes(input.issueType) && input.reportCount >= 3) {
    score += 2;
  }

  return priorityFromScore(score);
}
