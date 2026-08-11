-- Remove legacy unique constraint (one invoice per month).
-- fee_type-based uniqueness is required for separate invoices per fee type.

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_organization_id_apartment_id_billing_year_billing_month_key;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_organization_id_apartment_id_billing_year_billing__key;
