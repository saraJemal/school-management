-- ============================================================
-- RECONCILE SCHEMA DRIFT
-- ============================================================

-- Admin name and surname were added to the live database
-- outside Prisma migration history.

ALTER TABLE "Admin"
ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "surname" TEXT NOT NULL DEFAULT '';

-- SectionSupervisor.teacherId was changed from required to nullable.

ALTER TABLE "SectionSupervisor"
ALTER COLUMN "teacherId" DROP NOT NULL;

-- Recreate foreign keys to match the current schema.

ALTER TABLE "Attendance"
DROP CONSTRAINT "Attendance_studentId_fkey";

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_studentId_fkey"
FOREIGN KEY ("studentId")
REFERENCES "Student"("id")
ON DELETE NO ACTION
ON UPDATE CASCADE;

ALTER TABLE "Lesson"
DROP CONSTRAINT "Lesson_teacherId_fkey";

ALTER TABLE "Lesson"
ADD CONSTRAINT "Lesson_teacherId_fkey"
FOREIGN KEY ("teacherId")
REFERENCES "Teacher"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;

ALTER TABLE "SectionSupervisor"
DROP CONSTRAINT "SectionSupervisor_teacherId_fkey";

ALTER TABLE "SectionSupervisor"
ADD CONSTRAINT "SectionSupervisor_teacherId_fkey"
FOREIGN KEY ("teacherId")
REFERENCES "Teacher"("id")
ON DELETE SET NULL
ON UPDATE NO ACTION;

ALTER TABLE "StudentAssessment"
DROP CONSTRAINT "StudentAssessment_studentId_fkey";

ALTER TABLE "StudentAssessment"
ADD CONSTRAINT "StudentAssessment_studentId_fkey"
FOREIGN KEY ("studentId")
REFERENCES "Student"("id")
ON DELETE NO ACTION
ON UPDATE CASCADE;

ALTER TABLE "StudentEnrollment"
DROP CONSTRAINT "StudentEnrollment_studentId_fkey";

ALTER TABLE "StudentEnrollment"
ADD CONSTRAINT "StudentEnrollment_studentId_fkey"
FOREIGN KEY ("studentId")
REFERENCES "Student"("id")
ON DELETE NO ACTION
ON UPDATE CASCADE;