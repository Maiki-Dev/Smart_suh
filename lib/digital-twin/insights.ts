import type { IncidentTwinSummary, TwinInsight } from '@/lib/digital-twin/types';

interface InsightInput {
  buildingName: string;
  apartments: Array<{
    apartment_number: string;
    floor: number | null;
    entrance: string | null;
    open_issue_count: number;
    active_incident_count: number;
    payment_status: string;
  }>;
  activeIncidents: IncidentTwinSummary[];
  paymentRate: number;
  buildingHealth: number;
}

export function generateBuildingInsights(input: InsightInput): TwinInsight[] {
  const insights: TwinInsight[] = [];
  let id = 0;

  const floorIssueMap = new Map<number, number>();
  for (const apt of input.apartments) {
    if (apt.floor != null && apt.open_issue_count > 0) {
      floorIssueMap.set(apt.floor, (floorIssueMap.get(apt.floor) ?? 0) + apt.open_issue_count);
    }
  }

  const hotFloors = [...floorIssueMap.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  if (hotFloors.length > 0) {
    const [floor, count] = hotFloors[0];
    insights.push({
      id: String(++id),
      severity: count >= 6 ? 'critical' : 'warning',
      icon: '⚠️',
      message: `${floor}-р давхарт ${count} нээлттэй асуудал илэрлээ.`,
    });
  }

  for (const inc of input.activeIncidents) {
    if (inc.category === 'WATER_LEAK' || inc.category === 'NO_WATER') {
      const affected = inc.affected_apartment_ids.length;
      if (affected >= 2) {
        insights.push({
          id: String(++id),
          severity: 'critical',
          icon: '💧',
          message: `Усны асуудал ${affected} орон сууцад илэрсэн (${inc.incident_number}).`,
        });
      }
    }

    if (inc.floor_min != null && inc.floor_max != null && inc.floor_max - inc.floor_min >= 2) {
      insights.push({
        id: String(++id),
        severity: 'warning',
        icon: '🔴',
        message: `${inc.title}: ${inc.floor_min}–${inc.floor_max} давхар нөлөөлсөн.`,
      });
    }
  }

  const overdueCount = input.apartments.filter((a) => a.payment_status === 'OVERDUE').length;
  if (overdueCount > 0 && input.paymentRate < 75) {
    insights.push({
      id: String(++id),
      severity: 'warning',
      icon: '💰',
      message: `${input.buildingName}-ийн төлбөрийн хувь ${input.paymentRate}% (${overdueCount} орон сууц хугацаа хэтэрсэн).`,
    });
  }

  if (input.buildingHealth < 50) {
    insights.push({
      id: String(++id),
      severity: 'critical',
      icon: '🏢',
      message: `${input.buildingName} барилгын эрүүл мэнд ${input.buildingHealth}/100 — шууд анхаарал шаардлагатай.`,
    });
  }

  const recentIssueFloors = input.apartments
    .filter((a) => a.open_issue_count >= 2 && a.floor != null)
    .map((a) => a.floor as number);
  if (recentIssueFloors.length >= 2) {
    const minF = Math.min(...recentIssueFloors);
    const maxF = Math.max(...recentIssueFloors);
    if (maxF - minF <= 3) {
      insights.push({
        id: String(++id),
        severity: 'warning',
        icon: '⚠️',
        message: `${minF}–${maxF} давхарт олон асуудал илэрсэн — босоо шугам шалгахыг зөвлөж байна.`,
      });
    }
  }

  return insights.slice(0, 6);
}
