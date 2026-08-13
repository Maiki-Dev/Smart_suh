import 'server-only';

import { query, type DbClient } from '@/lib/db';
import { getOrganizationById } from '@/lib/queries/organizations';
import {
  DEFAULT_INCIDENT_SETTINGS,
  type IncidentDetectionSettings,
} from '@/lib/incidents/types';

export function parseIncidentSettings(
  raw: Record<string, unknown> | null | undefined,
): IncidentDetectionSettings {
  const s = raw ?? {};
  const num = (v: unknown, fallback: number, min: number, max: number) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.round(n)));
  };
  return {
    incident_min_reports: num(
      s.incident_min_reports,
      DEFAULT_INCIDENT_SETTINGS.incident_min_reports,
      1,
      20,
    ),
    incident_window_minutes: num(
      s.incident_window_minutes,
      DEFAULT_INCIDENT_SETTINGS.incident_window_minutes,
      5,
      1440,
    ),
    incident_min_confidence: num(
      s.incident_min_confidence,
      DEFAULT_INCIDENT_SETTINGS.incident_min_confidence,
      30,
      99,
    ),
    incident_auto_create:
      s.incident_auto_create === undefined
        ? DEFAULT_INCIDENT_SETTINGS.incident_auto_create
        : Boolean(s.incident_auto_create),
    incident_auto_escalate_critical:
      s.incident_auto_escalate_critical === undefined
        ? DEFAULT_INCIDENT_SETTINGS.incident_auto_escalate_critical
        : Boolean(s.incident_auto_escalate_critical),
  };
}

export async function getIncidentSettings(
  organizationId: string,
  client?: DbClient,
): Promise<IncidentDetectionSettings> {
  const org = await getOrganizationById(organizationId, client);
  return parseIncidentSettings(org?.settings ?? {});
}
