-- Apartment and invoice fee breakdown (байр, зогсоол, ус, цахилгаан)

ALTER TABLE apartments
    ADD COLUMN IF NOT EXISTS apartment_fee   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS parking_fee   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS water_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS electricity_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS apartment_fee   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS parking_fee   NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS water_fee     NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS electricity_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Backfill existing rows: treat legacy monthly_fee / amount as apartment fee
UPDATE apartments
   SET apartment_fee = monthly_fee
 WHERE apartment_fee = 0
   AND parking_fee = 0
   AND water_fee = 0
   AND electricity_fee = 0
   AND monthly_fee > 0;

UPDATE invoices
   SET apartment_fee = amount
 WHERE apartment_fee = 0
   AND parking_fee = 0
   AND water_fee = 0
   AND electricity_fee = 0
   AND amount > 0;

ALTER TABLE apartments
    DROP CONSTRAINT IF EXISTS apartments_apartment_fee_not_negative,
    ADD  CONSTRAINT apartments_apartment_fee_not_negative CHECK (apartment_fee >= 0),
    DROP CONSTRAINT IF EXISTS apartments_parking_fee_not_negative,
    ADD  CONSTRAINT apartments_parking_fee_not_negative CHECK (parking_fee >= 0),
    DROP CONSTRAINT IF EXISTS apartments_water_fee_not_negative,
    ADD  CONSTRAINT apartments_water_fee_not_negative CHECK (water_fee >= 0),
    DROP CONSTRAINT IF EXISTS apartments_electricity_fee_not_negative,
    ADD  CONSTRAINT apartments_electricity_fee_not_negative CHECK (electricity_fee >= 0);

ALTER TABLE invoices
    DROP CONSTRAINT IF EXISTS invoices_apartment_fee_not_negative,
    ADD  CONSTRAINT invoices_apartment_fee_not_negative CHECK (apartment_fee >= 0),
    DROP CONSTRAINT IF EXISTS invoices_parking_fee_not_negative,
    ADD  CONSTRAINT invoices_parking_fee_not_negative CHECK (parking_fee >= 0),
    DROP CONSTRAINT IF EXISTS invoices_water_fee_not_negative,
    ADD  CONSTRAINT invoices_water_fee_not_negative CHECK (water_fee >= 0),
    DROP CONSTRAINT IF EXISTS invoices_electricity_fee_not_negative,
    ADD  CONSTRAINT invoices_electricity_fee_not_negative CHECK (electricity_fee >= 0);
