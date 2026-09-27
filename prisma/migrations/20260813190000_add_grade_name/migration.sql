ALTER TABLE "Grade"
ADD COLUMN "name" TEXT;

ALTER TABLE "Grade"
ALTER COLUMN "name" SET NOT NULL;

CREATE UNIQUE INDEX "Grade_name_key" ON "Grade"("name");
