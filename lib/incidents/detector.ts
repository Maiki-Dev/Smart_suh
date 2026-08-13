import 'server-only';

import { createAuditLog } from '@/lib/queries/audit_logs';
import { createNotification } from '@/lib/queries/notifications';
import { getMaintenanceRequestById } from '@/lib/queries/maintenance';
import { query } from '@/lib/db';
import { analyzeIssue } from '@/lib/incidents/analyzer';
import { incidentIssueTypeLabel, incidentTitleFromType } from '@/lib/incidents/labels';
import { calculateIncidentPriority } from '@/lib/incidents/priority';
import { getIncidentSettings } from '@/lib/incidents/settings';
import { aggregateConfidence, computeSimilarity } from '@/lib/incidents/similarity';
import type { ApartmentLocationContext, IncidentProcessResult } from '@/lib/incidents/types';
import {
  addAffectedArea,
  addTimelineEvent,
  createIncident,
  findOpenIncidentForCluster,
  findRecentSimilarRequests,
  getApartmentLocationContext,
  linkIssueToIncident,
  nextIncidentNumber,
  updateIncident,
  withTransaction,
} from '@/lib/queries/incidents';
import { recordBuildingEvent } from '@/lib/queries/digital-twin';
import { notifyMaintenanceStaff } from '@/lib/maintenance/maintenance-service';

function toLocationContext(row: Record<string, unknown>): ApartmentLocationContext {
  return {
    apartment_id: String(row.apartment_id),
    apartment_number: String(row.apartment_number ?? ''),
    building_id: row.building_id ? String(row.building_id) : null,
    building_name: row.building_name ? String(row.building_name) : null,
    tower: row.tower ? String(row.tower) : null,
    entrance: row.entrance ? String(row.entrance) : null,
    floor: row.floor != null ? Number(row.floor) : null,
  };
}

/** Main entry — called after maintenance request saved. Never throws to caller. */
export async function processNewMaintenanceIssue(
  requestId: string,
  actorId?: string | null,
): Promise<IncidentProcessResult> {
  try {
    return await runDetection(requestId, actorId);
  } catch (err) {
    console.error('Incident detection failed (non-blocking):', requestId, err);
    return {
      incident_id: null,
      incident_number: null,
      confidence: 0,
      is_new_incident: false,
      similar_report_count: 0,
      resident_hint: null,
    };
  }
}

async function runDetection(
  requestId: string,
  actorId?: string | null,
): Promise<IncidentProcessResult> {
  const request = await getMaintenanceRequestById(requestId);
  if (!request) {
    return emptyResult();
  }

  const analysis = await analyzeIssue({
    title: request.title,
    description: request.description,
    category: request.category,
  });

  await query(
    `UPDATE maintenance_requests SET detected_issue_type = $1::incident_issue_type WHERE id = $2`,
    [analysis.detected_type, requestId],
  );

  const settings = await getIncidentSettings(request.organization_id);
  const locationRow = await getApartmentLocationContext(request.apartment_id);
  if (!locationRow) return emptyResult();

  const currentLocation = toLocationContext(locationRow);
  const now = new Date(request.created_at);

  const candidates = await findRecentSimilarRequests({
    organizationId: request.organization_id,
    buildingId: currentLocation.building_id,
    detectedType: analysis.detected_type,
    windowMinutes: settings.incident_window_minutes,
    excludeRequestId: requestId,
  });

  const similarities: Array<{ requestId: string; score: number; location_match: string }> = [];

  for (const cand of candidates) {
    const sim = computeSimilarity({
      typeA: analysis.detected_type,
      typeB: (cand.detected_issue_type as typeof analysis.detected_type) ?? analysis.detected_type,
      locationA: currentLocation,
      locationB: toLocationContext(cand as unknown as Record<string, unknown>),
      createdAtA: now,
      createdAtB: new Date(cand.created_at),
      windowMinutes: settings.incident_window_minutes,
    });
    if (sim.score >= 40) {
      similarities.push({
        requestId: cand.id,
        score: sim.score,
        location_match: sim.location_match,
      });
    }
  }

  const similarCount = similarities.length;
  const confidence = aggregateConfidence(similarities.map((s) => s.score));

  if (
    !settings.incident_auto_create ||
    similarCount + 1 < settings.incident_min_reports ||
    confidence < settings.incident_min_confidence
  ) {
    const hint =
      similarCount > 0
        ? `Таны байршилтай ойролцоо ижил төрлийн ${similarCount} мэдээлэл бүртгэгдсэн байна.`
        : null;
    return {
      incident_id: null,
      incident_number: null,
      confidence,
      is_new_incident: false,
      similar_report_count: similarCount,
      resident_hint: hint,
    };
  }

  return withTransaction(async (client) => {
    let existingIncident = await findOpenIncidentForCluster(
      {
        organizationId: request.organization_id,
        buildingId: currentLocation.building_id,
        category: analysis.detected_type,
      },
      client,
    );

    const allIssueIds = [requestId, ...similarities.map((s) => s.requestId)];
    const floors = [currentLocation.floor, ...candidates.map((c) => c.floor)].filter(
      (f): f is number => f != null,
    );
    const floorMin = floors.length ? Math.min(...floors) : null;
    const floorMax = floors.length ? Math.max(...floors) : null;

    const aptIds = new Set<string>([request.apartment_id]);
    for (const s of similarities) {
      const cand = candidates.find((c) => c.id === s.requestId);
      if (cand) aptIds.add(cand.apartment_id);
    }

    const firstAt = candidates.length
      ? new Date(Math.min(...candidates.map((c) => new Date(c.created_at).getTime()), now.getTime()))
      : now;
    const priority = calculateIncidentPriority({
      reportCount: allIssueIds.length,
      affectedApartments: aptIds.size,
      issueType: analysis.detected_type,
      windowMinutes: settings.incident_window_minutes,
      firstReportAt: firstAt,
      lastReportAt: now,
    });

    let isNew = false;

    if (!existingIncident) {
      isNew = true;
      const incidentNumber = await nextIncidentNumber(request.organization_id, client);
      existingIncident = await createIncident(
        {
          organization_id: request.organization_id,
          building_id: currentLocation.building_id,
          incident_number: incidentNumber,
          title: incidentTitleFromType(analysis.detected_type),
          category: analysis.detected_type,
          priority,
          status: 'DETECTED',
          description: request.description,
          detection_source: analysis.source,
          confidence_score: confidence,
          affected_area: {
            building_name: currentLocation.building_name,
            floor_min: floorMin,
            floor_max: floorMax,
          },
          report_count: allIssueIds.length,
          affected_apartment_count: aptIds.size,
          floor_min: floorMin,
          floor_max: floorMax,
          assigned_to: null,
          detected_at: now.toISOString(),
          confirmed_at: null,
          resolved_at: null,
          created_by: actorId ?? null,
        },
        client,
      );

      await addTimelineEvent(
        {
          incident_id: existingIncident.id,
          event_type: 'INCIDENT_DETECTED',
          description: `AI/Rule-based detection: ${incidentIssueTypeLabel(analysis.detected_type)} (${confidence}% confidence)`,
          actor_id: actorId,
          metadata: { report_count: allIssueIds.length },
        },
        client,
      );

      await createAuditLog({
        organization_id: request.organization_id,
        actor_id: actorId,
        action: 'INCIDENT_CREATED',
        entity_type: 'building_incident',
        entity_id: existingIncident.id,
        new_data: { category: analysis.detected_type, confidence },
        client,
      });

      await recordBuildingEvent({
        organization_id: request.organization_id,
        building_id: existingIncident.building_id,
        apartment_id: request.apartment_id,
        incident_id: existingIncident.id,
        event_type: 'INCIDENT_DETECTED',
        title: existingIncident.title,
        description: `Incident илэрсэн: ${existingIncident.incident_number}`,
        source: 'INCIDENT',
        client,
      });
    } else {
      await updateIncident(
        existingIncident.id,
        {
          report_count: existingIncident.report_count + 1,
          affected_apartment_count: aptIds.size,
          confidence_score: Math.max(existingIncident.confidence_score, confidence),
          priority:
            settings.incident_auto_escalate_critical && priority === 'CRITICAL'
              ? 'CRITICAL'
              : existingIncident.priority,
          floor_min: floorMin,
          floor_max: floorMax,
        },
        client,
      );
    }

    await linkIssueToIncident(
      {
        incident_id: existingIncident.id,
        issue_id: requestId,
        similarity_score: 100,
        location_match: 'SAME_APARTMENT',
        linked_by: 'AUTO',
      },
      client,
    );

    for (const sim of similarities) {
      const cand = candidates.find((c) => c.id === sim.requestId);
      if (!cand?.incident_id) {
        await linkIssueToIncident(
          {
            incident_id: existingIncident.id,
            issue_id: sim.requestId,
            similarity_score: sim.score,
            location_match: sim.location_match as 'SAME_FLOOR',
            linked_by: 'AUTO',
          },
          client,
        );
      }
    }

    for (const aptId of aptIds) {
      const aptRow = aptId === request.apartment_id ? locationRow : candidates.find((c) => c.apartment_id === aptId);
      if (!aptRow) continue;
      await addAffectedArea(
        {
          incident_id: existingIncident.id,
          building_id: currentLocation.building_id,
          entrance: aptRow.entrance ? String(aptRow.entrance) : null,
          floor: aptRow.floor != null ? Number(aptRow.floor) : null,
          apartment_id: aptId,
        },
        client,
      );
    }

    await addTimelineEvent(
      {
        incident_id: existingIncident.id,
        event_type: 'ISSUE_LINKED',
        description: `Issue linked: "${request.title}" (${request.apartment_id})`,
        actor_id: actorId,
      },
      client,
    );

    if (isNew) {
      await notifyMaintenanceStaff(
        request.organization_id,
        '🚨 Building Incident илэрлээ',
        `${existingIncident.incident_number}: ${incidentIssueTypeLabel(analysis.detected_type)} — ${allIssueIds.length} мэдээлэл (${confidence}%)`,
        { client },
      );
    } else {
      await notifyMaintenanceStaff(
        request.organization_id,
        '🚨 Incident +1 report',
        `${existingIncident.incident_number}: нийт ${existingIncident.report_count + 1} мэдээлэл`,
        { client },
      );
    }

    return {
      incident_id: existingIncident.id,
      incident_number: existingIncident.incident_number,
      confidence,
      is_new_incident: isNew,
      similar_report_count: similarCount,
      resident_hint: `Ижил төрлийн ${similarCount} мэдээлэл илэрсэн. Possible incident: ${incidentIssueTypeLabel(analysis.detected_type)}`,
    };
  });
}

function emptyResult(): IncidentProcessResult {
  return {
    incident_id: null,
    incident_number: null,
    confidence: 0,
    is_new_incident: false,
    similar_report_count: 0,
    resident_hint: null,
  };
}
