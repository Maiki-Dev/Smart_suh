export type AptHealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INACTIVE';

export type HealthGrade = 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';

export type TwinLayer =
  | 'overall'
  | 'payment'
  | 'issues'
  | 'incidents'
  | 'parking'
  | 'maintenance'
  | 'occupancy';

export type LayerColor = 'green' | 'yellow' | 'red' | 'gray' | 'white';

export interface DigitalTwinHealthWeights {
  payment: number;
  issue: number;
  incident: number;
  maintenance: number;
  parking: number;
}

export const DEFAULT_HEALTH_WEIGHTS: DigitalTwinHealthWeights = {
  payment: 20,
  issue: 25,
  incident: 25,
  maintenance: 15,
  parking: 15,
};

export interface ApartmentLayerStates {
  overall: LayerColor;
  payment: LayerColor;
  issues: LayerColor;
  incidents: LayerColor;
  parking: LayerColor;
  maintenance: LayerColor;
  occupancy: LayerColor;
}

export interface ApartmentTwinCell {
  id: string;
  apartment_number: string;
  entrance: string | null;
  floor: number | null;
  tower: string | null;
  status: AptHealthStatus;
  health_score: number;
  resident_count: number;
  layers: ApartmentLayerStates;
}

export interface BuildingTwinSummary {
  health_score: number;
  health_grade: HealthGrade;
  resident_count: number;
  payment_rate: number;
  open_issues: number;
  active_incidents: number;
  vehicle_count: number;
  apartment_count: number;
}

export interface BuildingTwinOverview {
  id: string;
  name: string;
  address: string | null;
  health_score: number;
  health_grade: HealthGrade;
  apartment_count: number;
  active_incidents: number;
}

export interface IncidentTwinSummary {
  id: string;
  incident_number: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  floor_min: number | null;
  floor_max: number | null;
  report_count: number;
  affected_apartment_ids: string[];
}

export interface TwinInsight {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  icon: string;
  message: string;
}

export interface BuildingEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  apartment_id: string | null;
  apartment_number: string | null;
  incident_id: string | null;
  maintenance_id: string | null;
  occurred_at: string;
  source: string;
}

export interface BuildingTwinData {
  building: { id: string; name: string; address: string | null };
  summary: BuildingTwinSummary;
  entrances: string[];
  floors: number[];
  apartments: ApartmentTwinCell[];
  active_incidents: IncidentTwinSummary[];
  insights: TwinInsight[];
  timeline: BuildingEvent[];
  recorded_at: string;
}

export interface ApartmentTwinDetail {
  id: string;
  apartment_number: string;
  building_id: string;
  building_name: string;
  entrance: string | null;
  floor: number | null;
  status: AptHealthStatus;
  health_score: number;
  resident_count: number;
  current_debt: number;
  payment_status: string;
  overdue_days: number | null;
  vehicle_count: number;
  active_vehicle_count: number;
  suspended_vehicle_count: number;
  open_issue_count: number;
  open_issues: Array<{ id: string; title: string; priority: string; status: string }>;
  active_incidents: Array<{ id: string; incident_number: string; title: string; status: string }>;
  maintenance_open: number;
  residents: Array<{ id: string; first_name: string; last_name: string; is_owner: boolean }>;
  vehicles: Array<{ id: string; plate_number: string; gate_access: boolean; active: boolean }>;
  layers: ApartmentLayerStates;
}

export interface TwinSearchResult {
  type: 'apartment' | 'resident' | 'vehicle' | 'issue' | 'incident';
  id: string;
  label: string;
  subtitle: string | null;
  apartment_id: string | null;
  apartment_number: string | null;
  building_id: string | null;
}

export interface HistoricalSnapshot {
  recorded_at: string;
  health_score: number;
  health_grade: HealthGrade;
  payment_rate: number;
  open_issues: number;
  active_incidents: number;
  apartments: Array<{
    apartment_id: string;
    apartment_number: string;
    status: AptHealthStatus;
    health_score: number;
    layer_data: Record<string, unknown>;
  }>;
}
