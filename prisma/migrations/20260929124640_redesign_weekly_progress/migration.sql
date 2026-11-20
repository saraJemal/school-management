/*
  Warnings:

  - You are about to drop the column `communicationBookId` on the `WeeklyProgressReport` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[studentId,academicYearId,weekStart]` on the table `WeeklyProgressReport` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academicYearId` to the `WeeklyProgressReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `classId` to the `WeeklyProgressReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentId` to the `WeeklyProgressReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weekEnd` to the `WeeklyProgressReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weekStart` to the `WeeklyProgressReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ProgressRating" ADD VALUE 'SATISFACTORY';

-- DropForeignKey
ALTER TABLE "WeeklyProgressReport" DROP CONSTRAINT "WeeklyProgressReport_communicationBookId_fkey";

-- DropIndex
DROP INDEX "WeeklyProgressReport_communicationBookId_key";

-- AlterTable
ALTER TABLE "WeeklyProgressReport" DROP COLUMN "communicationBookId",
ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "classId" INTEGER NOT NULL,
ADD COLUMN     "studentId" TEXT NOT NULL,
ADD COLUMN     "weekEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "weekStart" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "WeeklyProgressReport_studentId_academicYearId_idx" ON "WeeklyProgressReport"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "WeeklyProgressReport_classId_weekStart_idx" ON "WeeklyProgressReport"("classId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyProgressReport_studentId_academicYearId_weekStart_key" ON "WeeklyProgressReport"("studentId", "academicYearId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyProgressReport" ADD CONSTRAINT "WeeklyProgressReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyProgressReport" ADD CONSTRAINT "WeeklyProgressReport_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyProgressReport" ADD CONSTRAINT "WeeklyProgressReport_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
