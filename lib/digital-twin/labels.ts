import type { AptHealthStatus, HealthGrade, LayerColor, TwinLayer } from '@/lib/digital-twin/types';

export function aptHealthStatusLabel(status: AptHealthStatus): string {
  const map: Record<AptHealthStatus, string> = {
    HEALTHY: 'Эрүүл',
    WARNING: 'Анхаарал',
    CRITICAL: 'Яаралтай',
    INACTIVE: 'Идэвхгүй',
  };
  return map[status] ?? status;
}

export function healthGradeLabel(grade: HealthGrade): string {
  const map: Record<HealthGrade, string> = {
    EXCELLENT: 'Маш сайн',
    GOOD: 'Сайн',
    WARNING: 'Анхаарал',
    CRITICAL: 'Яаралтай',
  };
  return map[grade] ?? grade;
}

export function twinLayerLabel(layer: TwinLayer): string {
  const map: Record<TwinLayer, string> = {
    overall: 'Ерөнхий эрүүл мэнд',
    payment: 'Төлбөр',
    issues: 'Нээлттэй асуудал',
    incidents: 'Incident',
    parking: 'Зогсоол',
    maintenance: 'Засвар',
    occupancy: 'Оршин суугч',
  };
  return map[layer] ?? layer;
}

export function layerLegend(layer: TwinLayer): Array<{ color: LayerColor; label: string }> {
  switch (layer) {
    case 'payment':
      return [
        { color: 'green', label: 'Төлсөн' },
        { color: 'yellow', label: 'Хэсэгчлэн' },
        { color: 'red', label: 'Хугацаа хэтэрсэн' },
        { color: 'gray', label: 'Мэдээлэл байхгүй' },
      ];
    case 'issues':
      return [
        { color: 'green', label: 'Асуудал байхгүй' },
        { color: 'yellow', label: 'Нээлттэй' },
        { color: 'red', label: 'Яаралтай' },
      ];
    case 'incidents':
      return [
        { color: 'red', label: 'Нөлөөлсөн' },
        { color: 'green', label: 'Нөлөөлөөгүй' },
      ];
    case 'parking':
      return [
        { color: 'green', label: 'Идэвхтэй' },
        { color: 'yellow', label: 'Хязгаарлагдсан' },
        { color: 'red', label: 'Түдгэлзсэн' },
        { color: 'white', label: 'Машингүй' },
      ];
    case 'maintenance':
      return [
        { color: 'green', label: 'Нээлттэй байхгүй' },
        { color: 'yellow', label: 'Явагдаж байна' },
        { color: 'red', label: 'Яаралтай' },
      ];
    case 'occupancy':
      return [
        { color: 'green', label: 'Оршин суугачтай' },
        { color: 'gray', label: 'Хоосон' },
      ];
    default:
      return [
        { color: 'green', label: 'Эрүүл' },
        { color: 'yellow', label: 'Анхаарал' },
        { color: 'red', label: 'Яаралтай' },
        { color: 'gray', label: 'Идэвхгүй' },
      ];
  }
}

export function layerColorClass(color: LayerColor): string {
  const map: Record<LayerColor, string> = {
    green: 'bg-emerald-500/90 hover:bg-emerald-500 text-white',
    yellow: 'bg-amber-400/90 hover:bg-amber-400 text-amber-950',
    red: 'bg-red-500/90 hover:bg-red-500 text-white',
    gray: 'bg-muted hover:bg-muted/80 text-muted-foreground',
    white: 'bg-background border border-border hover:bg-muted text-muted-foreground',
  };
  return map[color];
}

export function aptStatusColorClass(status: AptHealthStatus): string {
  const map: Record<AptHealthStatus, string> = {
    HEALTHY: 'bg-emerald-500/90 text-white',
    WARNING: 'bg-amber-400/90 text-amber-950',
    CRITICAL: 'bg-red-500/90 text-white',
    INACTIVE: 'bg-muted text-muted-foreground',
  };
  return map[status];
}
