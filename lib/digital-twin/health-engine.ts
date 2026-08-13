import type {
  AptHealthStatus,
  ApartmentLayerStates,
  DigitalTwinHealthWeights,
  HealthGrade,
  LayerColor,
} from '@/lib/digital-twin/types';

export interface ApartmentRawMetrics {
  apartment_id: string;
  apartment_status: string;
  payment_status: string;
  current_debt: number;
  open_issue_count: number;
  critical_issue_count: number;
  high_issue_count: number;
  incident_count: number;
  active_incident_count: number;
  maintenance_open_count: number;
  maintenance_critical_count: number;
  resident_count: number;
  vehicle_count: number;
  active_vehicle_count: number;
  gate_access_count: number;
  suspended_vehicle_count: number;
}

export function scoreToGrade(score: number): HealthGrade {
  if (score >= 90) return 'EXCELLENT';
  if (score >= 75) return 'GOOD';
  if (score >= 50) return 'WARNING';
  return 'CRITICAL';
}

export function scoreToAptStatus(score: number, inactive: boolean): AptHealthStatus {
  if (inactive) return 'INACTIVE';
  if (score >= 75) return 'HEALTHY';
  if (score >= 50) return 'WARNING';
  return 'CRITICAL';
}

function paymentScore(status: string): number {
  switch (status) {
    case 'PAID':
      return 100;
    case 'NONE':
      return 85;
    case 'PENDING':
      return 75;
    case 'PARTIAL':
      return 50;
    case 'OVERDUE':
      return 15;
    default:
      return 60;
  }
}

function issueScore(openCount: number, criticalCount: number): number {
  if (criticalCount > 0) return 10;
  if (openCount >= 3) return 30;
  if (openCount === 2) return 50;
  if (openCount === 1) return 70;
  return 100;
}

function incidentScore(activeCount: number, totalCount: number): number {
  if (activeCount > 0) return 5;
  if (totalCount > 0) return 60;
  return 100;
}

function maintenanceScore(openCount: number, criticalCount: number): number {
  if (criticalCount > 0) return 20;
  if (openCount >= 2) return 45;
  if (openCount === 1) return 65;
  return 100;
}

function parkingScore(
  vehicleCount: number,
  activeCount: number,
  gateAccessCount: number,
  suspendedCount: number,
): number {
  if (vehicleCount === 0) return 80;
  if (suspendedCount > 0 && gateAccessCount === 0) return 15;
  if (suspendedCount > 0) return 45;
  if (activeCount === vehicleCount && gateAccessCount > 0) return 100;
  return 70;
}

export function paymentLayerColor(status: string): LayerColor {
  switch (status) {
    case 'PAID':
      return 'green';
    case 'PARTIAL':
      return 'yellow';
    case 'OVERDUE':
      return 'red';
    case 'NONE':
      return 'gray';
    default:
      return 'yellow';
  }
}

export function issueLayerColor(openCount: number, criticalCount: number): LayerColor {
  if (criticalCount > 0 || openCount >= 3) return 'red';
  if (openCount > 0) return 'yellow';
  return 'green';
}

export function incidentLayerColor(activeCount: number): LayerColor {
  return activeCount > 0 ? 'red' : 'green';
}

export function parkingLayerColor(
  vehicleCount: number,
  gateAccessCount: number,
  suspendedCount: number,
): LayerColor {
  if (vehicleCount === 0) return 'white';
  if (suspendedCount > 0 && gateAccessCount === 0) return 'red';
  if (suspendedCount > 0) return 'yellow';
  return 'green';
}

export function maintenanceLayerColor(openCount: number, criticalCount: number): LayerColor {
  if (criticalCount > 0) return 'red';
  if (openCount > 0) return 'yellow';
  return 'green';
}

export function occupancyLayerColor(residentCount: number): LayerColor {
  return residentCount > 0 ? 'green' : 'gray';
}

export function overallLayerColor(status: AptHealthStatus): LayerColor {
  switch (status) {
    case 'HEALTHY':
      return 'green';
    case 'WARNING':
      return 'yellow';
    case 'CRITICAL':
      return 'red';
    default:
      return 'gray';
  }
}

export function computeApartmentHealth(
  raw: ApartmentRawMetrics,
  weights: DigitalTwinHealthWeights,
): {
  health_score: number;
  status: AptHealthStatus;
  layers: ApartmentLayerStates;
  dimension_scores: {
    payment: number;
    issue: number;
    incident: number;
    maintenance: number;
    parking: number;
  };
} {
  const inactive =
    raw.apartment_status === 'VACANT' ||
    raw.apartment_status === 'MAINTENANCE' ||
    raw.resident_count === 0;

  const payment = paymentScore(raw.payment_status);
  const issue = issueScore(raw.open_issue_count, raw.critical_issue_count);
  const incident = incidentScore(raw.active_incident_count, raw.incident_count);
  const maintenance = maintenanceScore(
    raw.maintenance_open_count,
    raw.maintenance_critical_count,
  );
  const parking = parkingScore(
    raw.vehicle_count,
    raw.active_vehicle_count,
    raw.gate_access_count,
    raw.suspended_vehicle_count,
  );

  const wSum =
    weights.payment + weights.issue + weights.incident + weights.maintenance + weights.parking;
  const health_score = Math.round(
    (payment * weights.payment +
      issue * weights.issue +
      incident * weights.incident +
      maintenance * weights.maintenance +
      parking * weights.parking) /
      wSum,
  );

  const status = scoreToAptStatus(health_score, inactive);

  const layers: ApartmentLayerStates = {
    overall: overallLayerColor(status),
    payment: paymentLayerColor(raw.payment_status),
    issues: issueLayerColor(raw.open_issue_count, raw.critical_issue_count),
    incidents: incidentLayerColor(raw.active_incident_count),
    parking: parkingLayerColor(
      raw.vehicle_count,
      raw.gate_access_count,
      raw.suspended_vehicle_count,
    ),
    maintenance: maintenanceLayerColor(
      raw.maintenance_open_count,
      raw.maintenance_critical_count,
    ),
    occupancy: occupancyLayerColor(raw.resident_count),
  };

  return {
    health_score,
    status,
    layers,
    dimension_scores: { payment, issue, incident, maintenance, parking },
  };
}

export function computeBuildingHealth(
  apartments: Array<{ health_score: number; dimension_scores: ReturnType<typeof computeApartmentHealth>['dimension_scores'] }>,
  weights: DigitalTwinHealthWeights,
): {
  health_score: number;
  health_grade: HealthGrade;
  payment_health: number;
  issue_health: number;
  incident_health: number;
  maintenance_health: number;
  parking_health: number;
} {
  if (apartments.length === 0) {
    return {
      health_score: 0,
      health_grade: 'CRITICAL',
      payment_health: 0,
      issue_health: 0,
      incident_health: 0,
      maintenance_health: 0,
      parking_health: 0,
    };
  }

  const avg = (fn: (a: (typeof apartments)[0]) => number) =>
    Math.round(apartments.reduce((s, a) => s + fn(a), 0) / apartments.length);

  const payment_health = avg((a) => a.dimension_scores.payment);
  const issue_health = avg((a) => a.dimension_scores.issue);
  const incident_health = avg((a) => a.dimension_scores.incident);
  const maintenance_health = avg((a) => a.dimension_scores.maintenance);
  const parking_health = avg((a) => a.dimension_scores.parking);

  const wSum =
    weights.payment + weights.issue + weights.incident + weights.maintenance + weights.parking;
  const health_score = Math.round(
    (payment_health * weights.payment +
      issue_health * weights.issue +
      incident_health * weights.incident +
      maintenance_health * weights.maintenance +
      parking_health * weights.parking) /
      wSum,
  );

  return {
    health_score,
    health_grade: scoreToGrade(health_score),
    payment_health,
    issue_health,
    incident_health,
    maintenance_health,
    parking_health,
  };
}

export function parkingStatusLabel(
  vehicleCount: number,
  gateAccessCount: number,
  suspendedCount: number,
): string {
  if (vehicleCount === 0) return 'NO_VEHICLE';
  if (suspendedCount > 0 && gateAccessCount === 0) return 'SUSPENDED';
  if (suspendedCount > 0) return 'RESTRICTED';
  return 'ACTIVE';
}
