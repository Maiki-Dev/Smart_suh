import type {
  ApartmentLocationContext,
  IncidentIssueType,
  IncidentLocationMatch,
  SimilarityResult,
} from '@/lib/incidents/types';

export function computeLocationSimilarity(
  a: ApartmentLocationContext,
  b: ApartmentLocationContext,
): { score: number; match: IncidentLocationMatch } {
  if (a.apartment_id === b.apartment_id) {
    return { score: 1, match: 'SAME_APARTMENT' };
  }

  if (a.building_id && b.building_id && a.building_id !== b.building_id) {
    return { score: 0, match: 'SAME_BUILDING' };
  }

  if (a.entrance && b.entrance && a.entrance === b.entrance) {
    if (a.floor !== null && b.floor !== null) {
      if (a.floor === b.floor) return { score: 0.9, match: 'SAME_FLOOR' };
      if (Math.abs(a.floor - b.floor) === 1) return { score: 0.75, match: 'ADJACENT_FLOOR' };
      if (Math.abs(a.floor - b.floor) <= 2) return { score: 0.65, match: 'ADJACENT_FLOOR' };
    }
    return { score: 0.6, match: 'SAME_ENTRANCE' };
  }

  if (a.floor !== null && b.floor !== null) {
    if (a.floor === b.floor) return { score: 0.85, match: 'SAME_FLOOR' };
    if (Math.abs(a.floor - b.floor) === 1) return { score: 0.7, match: 'ADJACENT_FLOOR' };
    if (Math.abs(a.floor - b.floor) <= 2) return { score: 0.55, match: 'ADJACENT_FLOOR' };
  }

  // Vertical stack heuristic: apt numbers ending same digit (305/405/505)
  const aNum = parseInt(a.apartment_number.replace(/\D/g, ''), 10);
  const bNum = parseInt(b.apartment_number.replace(/\D/g, ''), 10);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    if (aNum % 100 === bNum % 100 && aNum !== bNum) {
      return { score: 0.72, match: 'ADJACENT_FLOOR' };
    }
  }

  if (a.building_id && b.building_id && a.building_id === b.building_id) {
    return { score: 0.45, match: 'SAME_BUILDING' };
  }

  return { score: 0.2, match: 'SAME_BUILDING' };
}

export function computeTimeProximityScore(
  createdAtA: Date,
  createdAtB: Date,
  windowMinutes: number,
): number {
  const diffMs = Math.abs(createdAtA.getTime() - createdAtB.getTime());
  const diffMin = diffMs / 60000;
  if (diffMin > windowMinutes) return 0;
  return Math.max(0, 1 - diffMin / windowMinutes);
}

export function computeIssueTypeSimilarity(
  typeA: IncidentIssueType,
  typeB: IncidentIssueType,
): number {
  if (typeA === typeB) return 1;
  const waterTypes: IncidentIssueType[] = ['WATER_LEAK', 'NO_WATER', 'LOW_WATER_PRESSURE'];
  if (waterTypes.includes(typeA) && waterTypes.includes(typeB)) return 0.75;
  return 0;
}

export function computeSimilarity(input: {
  typeA: IncidentIssueType;
  typeB: IncidentIssueType;
  locationA: ApartmentLocationContext;
  locationB: ApartmentLocationContext;
  createdAtA: Date;
  createdAtB: Date;
  windowMinutes: number;
}): SimilarityResult {
  const issue_type_score = computeIssueTypeSimilarity(input.typeA, input.typeB);
  const { score: location_score, match: location_match } = computeLocationSimilarity(
    input.locationA,
    input.locationB,
  );
  const time_score = computeTimeProximityScore(
    input.createdAtA,
    input.createdAtB,
    input.windowMinutes,
  );

  const score = Math.round(
    (issue_type_score * 0.4 + location_score * 0.4 + time_score * 0.2) * 100,
  );

  return {
    score,
    issue_type_score,
    location_score,
    time_score,
    location_match,
  };
}

export function aggregateConfidence(similarities: number[]): number {
  if (similarities.length === 0) return 0;
  const avg = similarities.reduce((s, v) => s + v, 0) / similarities.length;
  const countBoost = Math.min(15, (similarities.length - 1) * 5);
  return Math.min(100, Math.round(avg + countBoost));
}
