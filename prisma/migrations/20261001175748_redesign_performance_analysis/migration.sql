/*
  Warnings:

  - You are about to drop the column `analysisComment` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `analysisTitle` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `femaleCount` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `highestAverage` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `lowestAverage` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `maleCount` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `overallAverage` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `studentCount` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `studentName` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PerformanceAnalysis` table. All the data in the column will be lost.
  - You are about to drop the `PerformanceAnalysisSubject` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `assessmentScope` to the `PerformanceAnalysis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `PerformanceAnalysis` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PerformanceCategory" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'AVERAGE', 'POOR', 'FAIL');

-- CreateEnum
CREATE TYPE "PerformanceAnalysisLevel" AS ENUM ('CLASS', 'GRADE', 'SECTION', 'SCHOOL');

-- CreateEnum
CREATE TYPE "PerformanceAnalysisAssessmentScope" AS ENUM ('ASSESSMENT', 'OVERALL');

-- DropForeignKey
ALTER TABLE "PerformanceAnalysis" DROP CONSTRAINT "PerformanceAnalysis_createdById_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceAnalysis" DROP CONSTRAINT "PerformanceAnalysis_studentId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceAnalysisSubject" DROP CONSTRAINT "PerformanceAnalysisSubject_performanceAnalysisId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceAnalysisSubject" DROP CONSTRAINT "PerformanceAnalysisSubject_subjectId_fkey";

-- DropIndex
DROP INDEX "PerformanceAnalysis_createdById_idx";

-- DropIndex
DROP INDEX "PerformanceAnalysis_studentId_idx";

-- AlterTable
ALTER TABLE "PerformanceAnalysis" DROP COLUMN "analysisComment",
DROP COLUMN "analysisTitle",
DROP COLUMN "createdById",
DROP COLUMN "femaleCount",
DROP COLUMN "highestAverage",
DROP COLUMN "lowestAverage",
DROP COLUMN "maleCount",
DROP COLUMN "overallAverage",
DROP COLUMN "studentCount",
DROP COLUMN "studentId",
DROP COLUMN "studentName",
DROP COLUMN "updatedAt",
ADD COLUMN     "assessmentMaxScore" DOUBLE PRECISION,
ADD COLUMN     "assessmentScope" "PerformanceAnalysisAssessmentScope" NOT NULL,
ADD COLUMN     "assessmentTitle" TEXT,
ADD COLUMN     "assessmentType" "AssessmentType",
ADD COLUMN     "assessmentWeight" DOUBLE PRECISION,
ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "createdByTeacherId" TEXT,
ADD COLUMN     "level" "PerformanceAnalysisLevel" NOT NULL,
ADD COLUMN     "sectionName" TEXT,
ADD COLUMN     "subjectId" INTEGER,
ADD COLUMN     "subjectName" TEXT;

-- DropTable
DROP TABLE "PerformanceAnalysisSubject";

-- CreateTable
CREATE TABLE "PerformanceAnalysisStudent" (
    "id" SERIAL NOT NULL,
    "performanceAnalysisId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "sex" "UserSex" NOT NULL,
    "gradeName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "rollNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "normalizedScore" DOUBLE PRECISION NOT NULL,
    "category" "PerformanceCategory" NOT NULL,

    CONSTRAINT "PerformanceAnalysisStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceAnalysisStudent_performanceAnalysisId_idx" ON "PerformanceAnalysisStudent"("performanceAnalysisId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysisStudent_studentId_idx" ON "PerformanceAnalysisStudent"("studentId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysisStudent_category_idx" ON "PerformanceAnalysisStudent"("category");

-- CreateIndex
CREATE INDEX "PerformanceAnalysisStudent_sex_idx" ON "PerformanceAnalysisStudent"("sex");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_level_idx" ON "PerformanceAnalysis"("level");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_subjectId_idx" ON "PerformanceAnalysis"("subjectId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_assessmentType_idx" ON "PerformanceAnalysis"("assessmentType");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_createdByAdminId_idx" ON "PerformanceAnalysis"("createdByAdminId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_createdByTeacherId_idx" ON "PerformanceAnalysis"("createdByTeacherId");

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_createdByTeacherId_fkey" FOREIGN KEY ("createdByTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysisStudent" ADD CONSTRAINT "PerformanceAnalysisStudent_performanceAnalysisId_fkey" FOREIGN KEY ("performanceAnalysisId") REFERENCES "PerformanceAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysisStudent" ADD CONSTRAINT "PerformanceAnalysisStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
