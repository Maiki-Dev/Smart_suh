-- =====================================================================
-- 002_indexes.sql — Smart СӨХ Management System
-- Performance indexes for commonly queried fields
-- =====================================================================

-- organizations
CREATE INDEX IF NOT EXISTS idx_orgs_name       ON organizations(name);

-- users
CREATE INDEX IF NOT EXISTS idx_users_org         ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org_email   ON users(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status      ON users(status);

-- buildings
CREATE INDEX IF NOT EXISTS idx_buildings_org     ON buildings(organization_id);
CREATE INDEX IF NOT EXISTS idx_buildings_name    ON buildings(organization_id, name);

-- apartments
CREATE INDEX IF NOT EXISTS idx_apts_org          ON apartments(organization_id);
CREATE INDEX IF NOT EXISTS idx_apts_building     ON apartments(building_id);
CREATE INDEX IF NOT EXISTS idx_apts_status       ON apartments(status);
CREATE INDEX IF NOT EXISTS idx_apts_number       ON apartments(organization_id, apartment_number);

-- residents
CREATE INDEX IF NOT EXISTS idx_residents_org     ON residents(organization_id);
CREATE INDEX IF NOT EXISTS idx_residents_apt     ON residents(apartment_id);
CREATE INDEX IF NOT EXISTS idx_residents_user    ON residents(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_owner   ON residents(apartment_id, is_owner) WHERE is_owner = TRUE;
CREATE INDEX IF NOT EXISTS idx_residents_phone   ON residents(organization_id, phone);
CREATE INDEX IF NOT EXISTS idx_residents_email   ON residents(organization_id, email);

-- invoices
CREATE INDEX IF NOT EXISTS idx_inv_org           ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_inv_apt           ON invoices(apartment_id);
CREATE INDEX IF NOT EXISTS idx_inv_status        ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_inv_billing       ON invoices(organization_id, billing_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_inv_due           ON invoices(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_inv_remaining     ON invoices(apartment_id, status) WHERE remaining_amount > 0;

-- payments
CREATE INDEX IF NOT EXISTS idx_pay_org           ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_apt           ON payments(apartment_id);
CREATE INDEX IF NOT EXISTS idx_pay_inv           ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_method        ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_pay_status        ON payments(status);
CREATE INDEX IF NOT EXISTS idx_pay_paid_at       ON payments(organization_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_pay_created_by    ON payments(created_by);

-- vehicles
CREATE INDEX IF NOT EXISTS idx_veh_org           ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_veh_apt           ON vehicles(apartment_id);
CREATE INDEX IF NOT EXISTS idx_veh_plate         ON vehicles(organization_id, plate_number);
CREATE INDEX IF NOT EXISTS idx_veh_rfid          ON vehicles(rfid_number) WHERE rfid_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_veh_active        ON vehicles(organization_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_veh_gate_access   ON vehicles(organization_id, gate_access) WHERE gate_access = TRUE;

-- gate_access_logs
CREATE INDEX IF NOT EXISTS idx_gate_org          ON gate_access_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_gate_vehicle      ON gate_access_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_gate_apt          ON gate_access_logs(apartment_id);
CREATE INDEX IF NOT EXISTS idx_gate_action       ON gate_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_gate_created      ON gate_access_logs(organization_id, created_at DESC);

-- barrier_jobs
CREATE INDEX IF NOT EXISTS idx_barrier_org       ON barrier_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_barrier_vehicle   ON barrier_jobs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_barrier_status    ON barrier_jobs(status);
CREATE INDEX IF NOT EXISTS idx_barrier_created   ON barrier_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_barrier_pending   ON barrier_jobs(status, created_at) WHERE status = 'PENDING';

-- visitor_passes
CREATE INDEX IF NOT EXISTS idx_pass_org          ON visitor_passes(organization_id);
CREATE INDEX IF NOT EXISTS idx_pass_apt          ON visitor_passes(apartment_id);
CREATE INDEX IF NOT EXISTS idx_pass_created_by   ON visitor_passes(created_by);
CREATE INDEX IF NOT EXISTS idx_pass_status       ON visitor_passes(status);
CREATE INDEX IF NOT EXISTS idx_pass_plate        ON visitor_passes(organization_id, plate_number);
CREATE INDEX IF NOT EXISTS idx_pass_valid        ON visitor_passes(organization_id, valid_from, valid_until);

-- maintenance_requests
CREATE INDEX IF NOT EXISTS idx_maint_org         ON maintenance_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_maint_apt         ON maintenance_requests(apartment_id);
CREATE INDEX IF NOT EXISTS idx_maint_created_by  ON maintenance_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_maint_category    ON maintenance_requests(category);
CREATE INDEX IF NOT EXISTS idx_maint_priority    ON maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maint_status      ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maint_created     ON maintenance_requests(organization_id, created_at DESC);

-- maintenance_comments
CREATE INDEX IF NOT EXISTS idx_maintcomm_req     ON maintenance_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_maintcomm_user    ON maintenance_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_maintcomm_created ON maintenance_comments(request_id, created_at DESC);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announce_org      ON announcements(organization_id);
CREATE INDEX IF NOT EXISTS idx_announce_created  ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announce_pinned   ON announcements(organization_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_announce_published ON announcements(organization_id, published_at DESC) WHERE published_at IS NOT NULL;

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_org         ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notif_user        ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notif_type        ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_created     ON notifications(user_id, created_at DESC);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_org         ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor       ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON audit_logs(organization_id, created_at DESC);
