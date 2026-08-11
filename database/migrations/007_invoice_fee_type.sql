-- Separate invoice per fee type (байр, зогсоол, ус, цахилгаан)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_fee_type') THEN
    CREATE TYPE invoice_fee_type AS ENUM ('APARTMENT', 'PARKING', 'WATER', 'ELECTRICITY');
  END IF;
END $$;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS fee_type invoice_fee_type;

-- Split legacy combined invoices into one row per fee type
INSERT INTO invoices (
  organization_id, apartment_id, invoice_number, billing_year, billing_month,
  amount, paid_amount, due_date, status, fee_type
)
SELECT
  organization_id,
  apartment_id,
  invoice_number || '-PRK',
  billing_year,
  billing_month,
  parking_fee,
  0,
  due_date,
  status,
  'PARKING'::invoice_fee_type
FROM invoices
WHERE fee_type IS NULL
  AND COALESCE(parking_fee, 0) > 0
ON CONFLICT DO NOTHING;

INSERT INTO invoices (
  organization_id, apartment_id, invoice_number, billing_year, billing_month,
  amount, paid_amount, due_date, status, fee_type
)
SELECT
  organization_id,
  apartment_id,
  invoice_number || '-WTR',
  billing_year,
  billing_month,
  water_fee,
  0,
  due_date,
  status,
  'WATER'::invoice_fee_type
FROM invoices
WHERE fee_type IS NULL
  AND COALESCE(water_fee, 0) > 0
ON CONFLICT DO NOTHING;

INSERT INTO invoices (
  organization_id, apartment_id, invoice_number, billing_year, billing_month,
  amount, paid_amount, due_date, status, fee_type
)
SELECT
  organization_id,
  apartment_id,
  invoice_number || '-ELR',
  billing_year,
  billing_month,
  electricity_fee,
  0,
  due_date,
  status,
  'ELECTRICITY'::invoice_fee_type
FROM invoices
WHERE fee_type IS NULL
  AND COALESCE(electricity_fee, 0) > 0
ON CONFLICT DO NOTHING;

UPDATE invoices
   SET fee_type = 'APARTMENT'::invoice_fee_type,
       amount = COALESCE(NULLIF(apartment_fee, 0), amount)
 WHERE fee_type IS NULL;

ALTER TABLE invoices
  ALTER COLUMN fee_type SET DEFAULT 'APARTMENT',
  ALTER COLUMN fee_type SET NOT NULL;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_organization_id_apartment_id_billing_year_billing_month_key;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_organization_id_apartment_id_billing_year_billing__key;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_org_apt_period_fee_unique,
  ADD  CONSTRAINT invoices_org_apt_period_fee_unique
       UNIQUE (organization_id, apartment_id, billing_year, billing_month, fee_type);

ALTER TABLE invoices
  DROP COLUMN IF EXISTS apartment_fee,
  DROP COLUMN IF EXISTS parking_fee,
  DROP COLUMN IF EXISTS water_fee,
  DROP COLUMN IF EXISTS electricity_fee;
