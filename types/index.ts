export type UUID = string;
export type Timestamp = string;

export type UserRole = 'SUPER_ADMIN' | 'HOA_ADMIN' | 'OPERATOR' | 'RESIDENT';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type ApartmentStatus = 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
export type ResidentStatus = 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT';

export type InvoiceStatus =
  | 'PENDING'
  | 'PARTIAL'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type InvoiceFeeType = 'APARTMENT' | 'PARKING' | 'WATER' | 'ELECTRICITY';

export type PaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'QPAY'
  | 'SOCIALPAY'
  | 'CARD'
  | 'OTHER';

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED';

export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'VAN' | 'TRUCK' | 'OTHER';
export type GateAction = 'ENTER' | 'EXIT' | 'DENIED';
export type BarrierStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type PassStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'USED';

export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'STRUCTURAL'
  | 'HVAC'
  | 'CLEANING'
  | 'OTHER';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MaintenanceStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD';

export type NotificationType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'MAINTENANCE'
  | 'ANNOUNCEMENT'
  | 'GATE'
  | 'SYSTEM';

export interface Organization {
  id: UUID;
  name: string;
  registration_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface User {
  id: UUID;
  organization_id: UUID;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  must_change_password: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Building {
  id: UUID;
  organization_id: UUID;
  name: string;
  address: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Apartment {
  id: UUID;
  organization_id: UUID;
  building_id: UUID;
  tower: string | null;
  entrance: string | null;
  floor: number | null;
  apartment_number: string;
  area_m2: number | null;
  monthly_fee: number;
  apartment_fee: number;
  parking_fee: number;
  water_fee: number;
  electricity_fee: number;
  status: ApartmentStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Resident {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  user_id: UUID | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  is_owner: boolean;
  status: ResidentStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Invoice {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  invoice_number: string;
  billing_year: number;
  billing_month: number;
  fee_type: InvoiceFeeType;
  amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  status: InvoiceStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Payment {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  invoice_id: UUID | null;
  amount: number;
  payment_method: PaymentMethod;
  transaction_id: string | null;
  status: PaymentStatus;
  paid_at: Timestamp;
  created_by: UUID | null;
  created_at: Timestamp;
}

export interface Vehicle {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  plate_number: string;
  vehicle_type: VehicleType;
  owner_name: string | null;
  rfid_number: string | null;
  active: boolean;
  gate_access: boolean;
  access_started_at: Timestamp | null;
  access_expires_at: Timestamp | null;
  disabled_at: Timestamp | null;
  disabled_reason: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GateAccessLog {
  id: UUID;
  organization_id: UUID;
  vehicle_id: UUID | null;
  apartment_id: UUID | null;
  action: GateAction;
  reason: string | null;
  triggered_by: string | null;
  created_at: Timestamp;
}

export interface BarrierJob {
  id: UUID;
  organization_id: UUID;
  vehicle_id: UUID | null;
  action: string;
  status: BarrierStatus;
  attempts: number;
  payload: Record<string, unknown>;
  last_error: string | null;
  processed_at: Timestamp | null;
  created_at: Timestamp;
}

export interface VisitorPass {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  created_by: UUID | null;
  visitor_name: string;
  phone: string | null;
  plate_number: string | null;
  valid_from: Timestamp;
  valid_until: Timestamp;
  qr_code: string | null;
  status: PassStatus;
  created_at: Timestamp;
}

export interface MaintenanceRequest {
  id: UUID;
  organization_id: UUID;
  apartment_id: UUID;
  created_by: UUID | null;
  assigned_to: UUID | null;
  title: string;
  description: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MaintenanceComment {
  id: UUID;
  request_id: UUID;
  user_id: UUID | null;
  comment: string;
  created_at: Timestamp;
}

export interface Announcement {
  id: UUID;
  organization_id: UUID;
  title: string;
  content: string;
  image_url: string | null;
  attachment_url: string | null;
  published_at: Timestamp | null;
  expires_at: Timestamp | null;
  is_pinned: boolean;
  created_by: UUID | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Notification {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: Timestamp;
}

export interface AuditLog {
  id: UUID;
  organization_id: UUID;
  actor_id: UUID | null;
  action: string;
  entity_type: string;
  entity_id: UUID | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: Timestamp;
}

export interface Session {
  id: UUID;
  session_token: string;
  user_id: UUID;
  organization_id: UUID;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Timestamp;
  created_at: Timestamp;
  last_active_at: Timestamp;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface ListResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}
