-- =====================================================================
-- unseed.sql — ABC Residence development seed-ийг устгах
-- organizations CASCADE-аар холбоотой бүх мөр устана.
-- =====================================================================

SET TIME ZONE 'Asia/Ulaanbaatar';

DELETE FROM organizations
WHERE id = '00000000-0000-0000-0000-000000000001';
