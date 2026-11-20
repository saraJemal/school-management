-- AlterTable
ALTER TABLE "PerformanceAnalysis" ADD COLUMN     "resultSubmissionId" INTEGER;

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_resultSubmissionId_idx" ON "PerformanceAnalysis"("resultSubmissionId");

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_resultSubmissionId_fkey" FOREIGN KEY ("resultSubmissionId") REFERENCES "ResultSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
