export function formatMNT(value: number): string {
  return value.toLocaleString('mn-MN') + '₮';
}

export function apartmentStatusLabel(status: string): string {
  switch (status) {
    case 'OCCUPIED':
      return 'Оршин сууж байгаа';
    case 'VACANT':
      return 'Хоосон';
    case 'MAINTENANCE':
      return 'Засвар';
    default:
      return status;
  }
}

export function residentStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Идэвхтэй';
    case 'INACTIVE':
      return 'Идэвхгүй';
    case 'MOVED_OUT':
      return 'Нүүсэн';
    default:
      return status;
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'PAID':
      return 'Төлсөн';
    case 'PARTIAL':
      return 'Хэсэгчлэн';
    case 'OVERDUE':
      return 'Хугацаа хэтэрсэн';
    case 'PENDING':
      return 'Төлөгдөөгүй';
    case 'NONE':
      return 'Нэхэмжлэлгүй';
    default:
      return status;
  }
}

export function vehicleStatusLabel(activeCount: number, totalCount: number): string {
  if (activeCount > 0) return 'Идэвхтэй';
  if (totalCount > 0) return 'Идэвхгүй';
  return 'Байхгүй';
}
