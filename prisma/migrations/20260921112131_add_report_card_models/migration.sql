/*
  Warnings:

  - You are about to drop the column `commentSemester1` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `commentSemester2` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `conductSemester1` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `conductSemester2` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `parentNameSemester1` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `parentNameSemester2` on the `ReportCard` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "isManagingDirector" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ReportCard" DROP COLUMN "commentSemester1",
DROP COLUMN "commentSemester2",
DROP COLUMN "conductSemester1",
DROP COLUMN "conductSemester2",
DROP COLUMN "parentNameSemester1",
DROP COLUMN "parentNameSemester2",
ADD COLUMN     "managingDirectorDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "managingDirectorId" TEXT,
ADD COLUMN     "managingDirectorName" TEXT,
ADD COLUMN     "managingDirectorSignature" TEXT,
ADD COLUMN     "parentName" TEXT;

-- CreateTable
CREATE TABLE "ReportCardSemester" (
    "id" SERIAL NOT NULL,
    "reportCardId" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "homeroomTeacherId" TEXT,
    "homeroomTeacherName" TEXT,
    "homeroomTeacherSignature" TEXT,
    "comment" TEXT,
    "conduct" TEXT,
    "reportCardBasicSkillId" INTEGER,

    CONSTRAINT "ReportCardSemester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionPolicy" (
    "id" SERIAL NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "section" "GradeSection" NOT NULL,
    "promotionMinimumAverage" DOUBLE PRECISION NOT NULL,
    "detentionMaximumAverage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PromotionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportCardSemester_reportCardId_semester_key" ON "ReportCardSemester"("reportCardId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionPolicy_academicYearId_section_key" ON "PromotionPolicy"("academicYearId", "section");

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_managingDirectorId_fkey" FOREIGN KEY ("managingDirectorId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardSemester" ADD CONSTRAINT "ReportCardSemester_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardSemester" ADD CONSTRAINT "ReportCardSemester_homeroomTeacherId_fkey" FOREIGN KEY ("homeroomTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardSemester" ADD CONSTRAINT "ReportCardSemester_reportCardBasicSkillId_fkey" FOREIGN KEY ("reportCardBasicSkillId") REFERENCES "ReportCardBasicSkill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionPolicy" ADD CONSTRAINT "PromotionPolicy_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
