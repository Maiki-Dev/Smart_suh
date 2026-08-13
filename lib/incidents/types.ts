import type { MaintenancePriority } from '@/types';

export interface BuildingIncident {
  id: string;
  organization_id: string;
  building_id: string | null;
  incident_number: string;
  title: string;
  category: IncidentIssueType;
  priority: MaintenancePriority;
  status: IncidentStatus;
  description: string | null;
  detection_source: IncidentDetectionSource;
  confidence_score: number;
  affected_area: Record<string, unknown>;
  report_count: number;
  affected_apartment_count: number;
  floor_min: number | null;
  floor_max: number | null;
  assigned_to: string | null;
  detected_at: string;
  confirmed_at: string | null;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentAdminRow extends BuildingIncident {
  building_name: string | null;
}

/** Fine-grained issue type detected from free-text (pluggable AI / rule fallback) */
export type IncidentIssueType =
  | 'WATER_LEAK'
  | 'NO_WATER'
  | 'LOW_WATER_PRESSURE'
  | 'ELECTRICITY'
  | 'ELEVATOR'
  | 'HEATING'
  | 'SECURITY'
  | 'PARKING'
  | 'NOISE'
  | 'CLEANING'
  | 'FIRE_SAFETY'
  | 'GAS'
  | 'OTHER';

export type IncidentStatus =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'MONITORING'
  | 'RESOLVED'
  | 'FALSE_POSITIVE';

export type IncidentDetectionSource = 'AI' | 'RULE_BASED' | 'MANUAL';

export type IncidentLocationMatch =
  | 'SAME_APARTMENT'
  | 'SAME_FLOOR'
  | 'ADJACENT_FLOOR'
  | 'SAME_ENTRANCE'
  | 'SAME_BUILDING';

export interface IncidentDetectionSettings {
  incident_min_reports: number;
  incident_window_minutes: number;
  incident_min_confidence: number;
  incident_auto_create: boolean;
  incident_auto_escalate_critical: boolean;
}

export const DEFAULT_INCIDENT_SETTINGS: IncidentDetectionSettings = {
  incident_min_reports: 2,
  incident_window_minutes: 30,
  incident_min_confidence: 70,
  incident_auto_create: true,
  incident_auto_escalate_critical: true,
};

export interface IssueAnalysisResult {
  detected_type: IncidentIssueType;
  normalized_category: string;
  keywords_matched: string[];
  source: IncidentDetectionSource;
}

export interface SimilarityResult {
  score: number;
  issue_type_score: number;
  location_score: number;
  time_score: number;
  location_match: IncidentLocationMatch;
}

export interface IncidentProcessResult {
  incident_id: string | null;
  incident_number: string | null;
  confidence: number;
  is_new_incident: boolean;
  similar_report_count: number;
  resident_hint: string | null;
}

export interface ApartmentLocationContext {
  apartment_id: string;
  apartment_number: string;
  building_id: string | null;
  building_name: string | null;
  tower: string | null;
  entrance: string | null;
  floor: number | null;
}

/** Pluggable AI provider interface */
export interface IssueAnalyzerProvider {
  analyzeIssue(input: {
    title: string;
    description: string | null;
    category: string;
  }): Promise<IssueAnalysisResult>;
}

export const CRITICAL_ISSUE_TYPES: IncidentIssueType[] = [
  'FIRE_SAFETY',
  'GAS',
  'WATER_LEAK',
  'ELECTRICITY',
  'SECURITY',
];

export const ISSUE_TYPE_SEVERITY: Record<IncidentIssueType, number> = {
  FIRE_SAFETY: 10,
  GAS: 10,
  WATER_LEAK: 8,
  ELECTRICITY: 8,
  SECURITY: 7,
  ELEVATOR: 6,
  NO_WATER: 6,
  HEATING: 5,
  LOW_WATER_PRESSURE: 4,
  PARKING: 3,
  NOISE: 2,
  CLEANING: 2,
  OTHER: 1,
};

export function priorityFromScore(score: number): MaintenancePriority {
  if (score >= 8) return 'CRITICAL';
  if (score >= 5) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW';
}
