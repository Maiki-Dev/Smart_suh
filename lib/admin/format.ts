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

export function invoiceStatusLabel(status: string): string {
  switch (status) {
    case 'CANCELLED':
      return 'Цуцлагдсан';
    default:
      return paymentStatusLabel(status);
  }
}

export function paymentRecordStatusLabel(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Баталгаажсан';
    case 'PENDING':
      return 'Хүлээгдэж буй';
    case 'FAILED':
      return 'Амжилтгүй';
    case 'REFUNDED':
      return 'Буцаагдсан';
    default:
      return status;
  }
}

export function vehicleStatusLabel(activeCount: number, totalCount: number): string {
  if (activeCount > 0) return 'Идэвхтэй';
  if (totalCount > 0) return 'Идэвхгүй';
  return 'Байхгүй';
}

export function vehicleTypeLabel(type: string): string {
  switch (type) {
    case 'CAR':
      return 'Автомашин';
    case 'SUV':
      return 'Жип';
    case 'MOTORCYCLE':
      return 'Мотоцикл';
    case 'VAN':
      return 'Микро';
    case 'TRUCK':
      return 'Ачааны машин';
    default:
      return type;
  }
}

export function gateActionLabel(action: string): string {
  switch (action) {
    case 'ENTER':
      return 'Орсон';
    case 'EXIT':
      return 'Гарсан';
    default:
      return action;
  }
}

export function maintenanceStatusLabel(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Нээлттэй';
    case 'IN_PROGRESS':
      return 'Явцад';
    case 'ON_HOLD':
      return 'Түр зогссон';
    case 'COMPLETED':
      return 'Дууссан';
    case 'CANCELLED':
      return 'Цуцлагдсан';
    default:
      return status;
  }
}

export function maintenancePriorityLabel(priority: string): string {
  switch (priority) {
    case 'HIGH':
      return 'Өндөр';
    case 'MEDIUM':
      return 'Дунд';
    case 'LOW':
      return 'Бага';
    default:
      return priority;
  }
}

export function maintenanceCategoryLabel(category: string): string {
  switch (category) {
    case 'PLUMBING':
      return 'Ус, канал';
    case 'ELECTRICAL':
      return 'Цахилгаан';
    case 'HEATING':
      return 'Халаалт';
    case 'ELEVATOR':
      return 'Лифт';
    case 'SECURITY':
      return 'Аюулгүй байдал';
    case 'CLEANING':
      return 'Цэвэрлэгээ';
    case 'OTHER':
      return 'Бусад';
    default:
      return category;
  }
}

export function activityKindLabel(kind: string): string {
  switch (kind) {
    case 'payment':
      return 'Төлбөр';
    case 'maintenance':
      return 'Засвар';
    case 'gate':
      return 'Гацаа';
    case 'invoice':
      return 'Нэхэмжлэл';
    default:
      return kind;
  }
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Супер админ';
    case 'HOA_ADMIN':
      return 'СӨХ админ';
    case 'OPERATOR':
      return 'Оператор';
    case 'RESIDENT':
      return 'Оршин суугч';
    default:
      return role;
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'CASH':
      return 'Бэлэн';
    case 'BANK_TRANSFER':
      return 'Дансаар';
    case 'QPAY':
      return 'QPay';
    case 'SOCIALPAY':
      return 'SocialPay';
    case 'CARD':
      return 'Карт';
    case 'OTHER':
      return 'Бусад';
    default:
      return method;
  }
}

export const INVOICE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Төлөгдөөгүй' },
  { value: 'PARTIAL', label: 'Хэсэгчлэн' },
  { value: 'PAID', label: 'Төлсөн' },
  { value: 'OVERDUE', label: 'Хугацаа хэтэрсэн' },
  { value: 'CANCELLED', label: 'Цуцлагдсан' },
] as const;

export const MONTH_LABELS = [
  '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
  '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар',
] as const;
