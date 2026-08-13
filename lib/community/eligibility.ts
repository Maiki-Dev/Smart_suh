import 'server-only';

import { query, type DbClient } from '@/lib/db';
import type { EligibilityRules, ProposalVotingMode } from '@/types';

export interface EligibleResidentRow {
  resident_id: string;
  apartment_id: string;
  user_id: string | null;
  voting_weight: number;
  apartment_number: string;
  entrance: string | null;
  floor: number | null;
  area_m2: number | null;
}

export async function resolveEligibleResidents(
  organizationId: string,
  buildingId: string | null,
  rules: EligibilityRules,
  votingMode: ProposalVotingMode,
  client?: DbClient,
): Promise<EligibleResidentRow[]> {
  const clauses = [
    'r.organization_id = $1',
    "r.status = 'ACTIVE'",
    'a.status = \'OCCUPIED\'',
  ];
  const params: unknown[] = [organizationId];
  let idx = 2;

  if (buildingId) {
    clauses.push(`a.building_id = $${idx++}`);
    params.push(buildingId);
  } else if (rules.building_id) {
    clauses.push(`a.building_id = $${idx++}`);
    params.push(rules.building_id);
  }

  if (rules.scope === 'ENTRANCE' && rules.entrances?.length) {
    clauses.push(`a.entrance = ANY($${idx++}::text[])`);
    params.push(rules.entrances);
  }

  if (rules.scope === 'FLOOR' && rules.floors?.length) {
    clauses.push(`a.floor = ANY($${idx++}::int[])`);
    params.push(rules.floors);
  }

  if (rules.scope === 'APARTMENTS' && rules.apartment_ids?.length) {
    clauses.push(`a.id = ANY($${idx++}::uuid[])`);
    params.push(rules.apartment_ids);
  }

  if (rules.scope === 'PARKING_OWNERS' || rules.parking_only) {
    clauses.push(`EXISTS (
      SELECT 1 FROM vehicles v
       WHERE v.apartment_id = a.id AND v.active = TRUE
    )`);
  }

  if (rules.scope === 'ELIGIBLE_RESIDENTS') {
    clauses.push('r.user_id IS NOT NULL');
  }

  const { rows } = await query<EligibleResidentRow>(
    `
      SELECT
        r.id AS resident_id,
        r.apartment_id,
        r.user_id,
        a.apartment_number,
        a.entrance,
        a.floor,
        a.area_m2,
        CASE
          WHEN $${idx}::text = 'WEIGHTED_BY_SQUARE_METER'
            THEN GREATEST(COALESCE(a.area_m2, 1), 1)
          ELSE 1
        END::numeric(10,4) AS voting_weight
      FROM residents r
      JOIN apartments a ON r.apartment_id = a.id
     WHERE ${clauses.join(' AND ')}
     ORDER BY a.apartment_number, r.last_name
    `,
    [...params, votingMode],
    client,
  );

  if (votingMode === 'ONE_APARTMENT_ONE_VOTE') {
    const byApartment = new Map<string, EligibleResidentRow>();
    for (const row of rows) {
      const existing = byApartment.get(row.apartment_id);
      if (!existing || (row.user_id && !existing.user_id)) {
        byApartment.set(row.apartment_id, row);
      }
    }
    return Array.from(byApartment.values());
  }

  return rows.filter((r) => r.user_id);
}

export function computeVoteWeight(
  mode: ProposalVotingMode,
  areaM2: number | null,
  customWeight = 1,
): number {
  switch (mode) {
    case 'WEIGHTED_BY_SQUARE_METER':
      return Math.max(areaM2 ?? 1, 1);
    case 'WEIGHTED_CUSTOM':
      return customWeight;
    default:
      return 1;
  }
}
