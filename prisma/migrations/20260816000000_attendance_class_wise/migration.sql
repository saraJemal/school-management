-- Add classId temporarily so existing attendance data can be migrated.
ALTER TABLE "Attendance"
ADD COLUMN "classId" INTEGER;

-- Copy the class belonging to each attendance record's lesson.
UPDATE "Attendance" a
SET "classId" = l."classId"
FROM "Lesson" l
WHERE a."lessonId" = l."id";

-- Safety check: every Attendance row must have a classId.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Attendance"
        WHERE "classId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Attendance migration failed: some records could not be assigned a classId.';
    END IF;
END
$$;

-- Safety check: no Attendance records were lost.
-- The shadow database is empty, so the check is only
-- enforced when attendance records already exist.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM "Attendance") > 0
       AND (SELECT COUNT(*) FROM "Attendance") <> 57 THEN
        RAISE EXCEPTION 'Attendance migration failed: expected 57 records, found %.',
            (SELECT COUNT(*) FROM "Attendance");
    END IF;
END
$$;

-- classId is now safe to make required.
ALTER TABLE "Attendance"
ALTER COLUMN "classId" SET NOT NULL;

-- Remove the old lesson relationship.
ALTER TABLE "Attendance"
DROP CONSTRAINT "Attendance_lessonId_fkey";

-- Remove the old lesson-based uniqueness rule.
DROP INDEX "Attendance_studentId_lessonId_date_key";

-- Remove the old lesson reference.
ALTER TABLE "Attendance"
DROP COLUMN "lessonId";

-- Add the new class relationship.
ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Add the new class-based uniqueness rule.
CREATE UNIQUE INDEX "Attendance_studentId_classId_date_key"
ON "Attendance"("studentId", "classId", "date");
