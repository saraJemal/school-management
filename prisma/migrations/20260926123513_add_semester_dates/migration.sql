-- Add semester date columns as nullable first
ALTER TABLE "AcademicYear"
ADD COLUMN "semester1StartDate" TIMESTAMP(3),
ADD COLUMN "semester1EndDate" TIMESTAMP(3),
ADD COLUMN "semester2StartDate" TIMESTAMP(3),
ADD COLUMN "semester2EndDate" TIMESTAMP(3);

-- Populate the existing 2026/2027 academic year
UPDATE "AcademicYear"
SET
  "semester1StartDate" = TIMESTAMP '2026-09-15 00:00:00',
  "semester1EndDate"   = TIMESTAMP '2027-02-05 00:00:00',
  "semester2StartDate" = TIMESTAMP '2027-02-08 00:00:00',
  "semester2EndDate"   = TIMESTAMP '2027-06-30 00:00:00'
WHERE "id" = 1
  AND "name" = '2026/2027';

-- Make the semester dates required
ALTER TABLE "AcademicYear"
ALTER COLUMN "semester1StartDate" SET NOT NULL,
ALTER COLUMN "semester1EndDate" SET NOT NULL,
ALTER COLUMN "semester2StartDate" SET NOT NULL,
ALTER COLUMN "semester2EndDate" SET NOT NULL;