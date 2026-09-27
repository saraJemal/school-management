/*
  Warnings:

  - You are about to drop the column `parentName` on the `ReportCard` table. All the data in the column will be lost.
  - You are about to drop the column `reportCardBasicSkillId` on the `ReportCardSemester` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReportCardSemester" DROP CONSTRAINT "ReportCardSemester_reportCardBasicSkillId_fkey";

-- AlterTable
ALTER TABLE "ReportCard" DROP COLUMN "parentName";

-- AlterTable
ALTER TABLE "ReportCardSemester" DROP COLUMN "reportCardBasicSkillId",
ADD COLUMN     "parentName" TEXT;
