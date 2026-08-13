-- Анхны нууц үгээр нэвтэрсний дараа шинэ нууц үг заавал солих
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
