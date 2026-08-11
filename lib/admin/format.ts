const mntFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatMNT(value: number): string {
  return `${mntFormatter.format(value)}₮`;
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

export function gateAccessStatusLabel(enabled: boolean): string {
  return enabled ? 'ИДЭВХТЭЙ' : 'ИДЭВХГҮЙ';
}

export function gateActionLabel(action: string): string {
  switch (action) {
    case 'ENTER':
      return 'Орсон';
    case 'EXIT':
      return 'Гарсан';
    case 'DENIED':
      return 'Хориглосон';
    default:
      return action;
  }
}

export function maintenanceStatusLabel(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'Шинэ';
    case 'IN_PROGRESS':
      return 'Явцад';
    case 'ON_HOLD':
      return 'Түр зогссон';
    case 'COMPLETED':
      return 'Шийдсэн';
    case 'CANCELLED':
      return 'Хаагдсан';
    default:
      return status;
  }
}

export function maintenancePriorityLabel(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return 'Яаралтай';
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
    case 'STRUCTURAL':
      return 'Лифт / Бүтэц';
    case 'HVAC':
      return 'Халаалт';
    case 'CLEANING':
      return 'Цэвэрлэгээ';
    case 'OTHER':
      return 'Бусад';
    default:
      return category;
  }
}

export const MAINTENANCE_CATEGORY_OPTIONS = [
  { value: 'STRUCTURAL', label: 'Лифт / Бүтэц' },
  { value: 'PLUMBING', label: 'Ус, канал' },
  { value: 'ELECTRICAL', label: 'Цахилгаан' },
  { value: 'CLEANING', label: 'Цэвэрлэгээ' },
  { value: 'HVAC', label: 'Халаалт' },
  { value: 'OTHER', label: 'Бусад' },
] as const;

export const MAINTENANCE_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Бага' },
  { value: 'MEDIUM', label: 'Дунд' },
  { value: 'HIGH', label: 'Өндөр' },
  { value: 'CRITICAL', label: 'Яаралтай' },
] as const;

export const MAINTENANCE_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Шинэ' },
  { value: 'IN_PROGRESS', label: 'Явцад' },
  { value: 'COMPLETED', label: 'Шийдсэн' },
  { value: 'CANCELLED', label: 'Хаагдсан' },
  { value: 'ON_HOLD', label: 'Түр зогссон' },
] as const;

export function passStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Идэвхтэй';
    case 'USED':
      return 'Ашигласан';
    case 'EXPIRED':
      return 'Хугацаа дууссан';
    case 'CANCELLED':
      return 'Цуцлагдсан';
    default:
      return status;
  }
}

export function notificationTypeLabel(type: string): string {
  switch (type) {
    case 'INVOICE':
      return 'Нэхэмжлэл';
    case 'PAYMENT':
      return 'Төлбөр';
    case 'MAINTENANCE':
      return 'Засвар';
    case 'ANNOUNCEMENT':
      return 'Зарлал';
    case 'GATE':
      return 'Зогсоол';
    case 'SYSTEM':
      return 'Систем';
    default:
      return type;
  }
}

export function barrierStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Хүлээгдэж буй';
    case 'PROCESSING':
      return 'Боловсруулж байна';
    case 'COMPLETED':
      return 'Дууссан';
    case 'FAILED':
      return 'Амжилтгүй';
    default:
      return status;
  }
}

export function activityKindLabel(kind: string): string {
  switch (kind) {
    case 'payment':
      return 'Төлбөр';
    case 'maintenance':
      return 'Засвар';
    case 'gate':
      return 'Зогсоол';
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
