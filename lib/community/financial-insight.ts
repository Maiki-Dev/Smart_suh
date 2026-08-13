export function computeFinancialInsight(
  reserveAvailable: number,
  projectCost: number,
): {
  remaining: number;
  reductionPct: number;
  warning: boolean;
  estimatedPerApartment: number | null;
} {
  const remaining = reserveAvailable - projectCost;
  const reductionPct =
    reserveAvailable > 0 ? (projectCost / reserveAvailable) * 100 : projectCost > 0 ? 100 : 0;
  return {
    remaining,
    reductionPct,
    warning: reductionPct > 70,
    estimatedPerApartment: null,
  };
}
