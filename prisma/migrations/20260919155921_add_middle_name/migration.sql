-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "middleName" TEXT,
ALTER COLUMN "surname" DROP NOT NULL,
ALTER COLUMN "surname" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "middleName" TEXT,
ALTER COLUMN "surname" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "middleName" TEXT,
ALTER COLUMN "surname" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "middleName" TEXT,
ALTER COLUMN "surname" DROP NOT NULL;
