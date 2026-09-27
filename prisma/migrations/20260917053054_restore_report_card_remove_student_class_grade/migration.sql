/*
  Warnings:

  - You are about to drop the column `classId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `gradeId` on the `Student` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Lesson" DROP CONSTRAINT "Lesson_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_gradeId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "classId",
DROP COLUMN "gradeId";

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ReportCard" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "conductSemester1" TEXT,
    "conductSemester2" TEXT,
    "commentSemester1" TEXT,
    "commentSemester2" TEXT,
    "parentNameSemester1" TEXT,
    "parentNameSemester2" TEXT,
    "promotedGradeId" INTEGER,
    "detainedGradeId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportCardBasicSkill" (
    "id" SERIAL NOT NULL,
    "reportCardId" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "reading" TEXT,
    "writing" TEXT,
    "spelling" TEXT,
    "comprehension" TEXT,
    "computation" TEXT,
    "punctuality" TEXT,
    "uniform" TEXT,
    "materialHandling" TEXT,
    "direction" TEXT,
    "completion" TEXT,
    "englishUse" TEXT,
    "workEthics" TEXT,
    "skills" TEXT,
    "overallProgress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportCardBasicSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportCard_studentId_academicYearId_key" ON "ReportCard"("studentId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportCardBasicSkill_reportCardId_semester_key" ON "ReportCardBasicSkill"("reportCardId", "semester");

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_promotedGradeId_fkey" FOREIGN KEY ("promotedGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCard" ADD CONSTRAINT "ReportCard_detainedGradeId_fkey" FOREIGN KEY ("detainedGradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportCardBasicSkill" ADD CONSTRAINT "ReportCardBasicSkill_reportCardId_fkey" FOREIGN KEY ("reportCardId") REFERENCES "ReportCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
