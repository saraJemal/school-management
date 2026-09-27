-- Fix the historical supervisorId -> homeRoomTeacherId rename.
-- The actual database may already contain homeRoomTeacherId,
-- so this migration is intentionally conditional.

DO $$
BEGIN
  -- Rename the old column if it still exists.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Class'
      AND column_name = 'supervisorId'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Class'
      AND column_name = 'homeRoomTeacherId'
  ) THEN
    ALTER TABLE "Class"
      RENAME COLUMN "supervisorId" TO "homeRoomTeacherId";
  END IF;

  -- Rename the foreign-key constraint only if necessary.
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Class_supervisorId_fkey'
      AND conrelid = '"Class"'::regclass
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Class_homeRoomTeacherId_fkey'
      AND conrelid = '"Class"'::regclass
  ) THEN
    ALTER TABLE "Class"
      RENAME CONSTRAINT "Class_supervisorId_fkey"
      TO "Class_homeRoomTeacherId_fkey";
  END IF;
END $$;
