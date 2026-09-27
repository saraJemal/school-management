
-- CreateEnum
CREATE TYPE "GradeSection" AS ENUM (
  'KG',
  'PRIMARY',
  'MIDDLE',
  'SECONDARY',
  'PREPARATORY'
);

-- Drop old Assessment foreign key
ALTER TABLE "Assessment"
DROP CONSTRAINT IF EXISTS "Assessment_classId_fkey";

-- Drop old Assessment unique index
DROP INDEX IF EXISTS "Assessment_academicYearId_classId_subjectId_semester_type_key";

-- Remove old classId and add gradeId
ALTER TABLE "Assessment"
DROP COLUMN IF EXISTS "classId";

ALTER TABLE "Assessment"
ADD COLUMN "gradeId" INTEGER NOT NULL;

-- Add section temporarily as nullable
ALTER TABLE "Grade"
ADD COLUMN "section" "GradeSection";

-- Populate existing grades
UPDATE "Grade"
SET "section" =
  CASE
    WHEN "level" BETWEEN 1 AND 3 THEN 'KG'::"GradeSection"
    WHEN "level" BETWEEN 4 AND 8 THEN 'PRIMARY'::"GradeSection"
    WHEN "level" BETWEEN 9 AND 10 THEN 'MIDDLE'::"GradeSection"
    WHEN "level" BETWEEN 11 AND 13 THEN 'SECONDARY'::"GradeSection"
    WHEN "level" BETWEEN 14 AND 15 THEN 'PREPARATORY'::"GradeSection"
  END;

-- Make section required
ALTER TABLE "Grade"
ALTER COLUMN "section" SET NOT NULL;

-- Student parentId is optional
ALTER TABLE "Student"
ALTER COLUMN "parentId" DROP NOT NULL;

-- Create SubjectSection
CREATE TABLE "SubjectSection" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "section" "GradeSection" NOT NULL,

    CONSTRAINT "SubjectSection_pkey" PRIMARY KEY ("id")
);

-- SubjectSection unique constraint
CREATE UNIQUE INDEX "SubjectSection_subjectId_section_key"
ON "SubjectSection"("subjectId", "section");

-- Assessment unique constraint
CREATE UNIQUE INDEX "Assessment_academicYearId_gradeId_subjectId_semester_type_key"
ON "Assessment"(
  "academicYearId",
  "gradeId",
  "subjectId",
  "semester",
  "type"
);

-- Student parent relation
ALTER TABLE "Student"
DROP CONSTRAINT IF EXISTS "Student_parentId_fkey";

ALTER TABLE "Student"
ADD CONSTRAINT "Student_parentId_fkey"
FOREIGN KEY ("parentId")
REFERENCES "Parent"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- SubjectSection relation
ALTER TABLE "SubjectSection"
ADD CONSTRAINT "SubjectSection_subjectId_fkey"
FOREIGN KEY ("subjectId")
REFERENCES "Subject"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Assessment grade relation
ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_gradeId_fkey"
FOREIGN KEY ("gradeId")
REFERENCES "Grade"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;