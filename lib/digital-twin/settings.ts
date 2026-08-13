import type { DigitalTwinHealthWeights } from '@/lib/digital-twin/types';
import { DEFAULT_HEALTH_WEIGHTS } from '@/lib/digital-twin/types';

export function parseDigitalTwinSettings(
  raw: Record<string, unknown> | null | undefined,
): { health_weights: DigitalTwinHealthWeights } {
  const s = raw ?? {};
  const weightsRaw = (s.digital_twin_health_weights ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const weights: DigitalTwinHealthWeights = {
    payment: num(weightsRaw.payment, DEFAULT_HEALTH_WEIGHTS.payment),
    issue: num(weightsRaw.issue, DEFAULT_HEALTH_WEIGHTS.issue),
    incident: num(weightsRaw.incident, DEFAULT_HEALTH_WEIGHTS.incident),
    maintenance: num(weightsRaw.maintenance, DEFAULT_HEALTH_WEIGHTS.maintenance),
    parking: num(weightsRaw.parking, DEFAULT_HEALTH_WEIGHTS.parking),
  };
  const total =
    weights.payment + weights.issue + weights.incident + weights.maintenance + weights.parking;
  if (total === 0) return { health_weights: DEFAULT_HEALTH_WEIGHTS };
  if (total === 100) return { health_weights: weights };
  const scale = 100 / total;
  return {
    health_weights: {
      payment: Math.round(weights.payment * scale),
      issue: Math.round(weights.issue * scale),
      incident: Math.round(weights.incident * scale),
      maintenance: Math.round(weights.maintenance * scale),
      parking: Math.round(weights.parking * scale),
    },
  };
}
