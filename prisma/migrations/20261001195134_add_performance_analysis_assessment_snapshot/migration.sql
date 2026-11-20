-- CreateTable
CREATE TABLE "PerformanceAnalysisAssessment" (
    "id" SERIAL NOT NULL,
    "performanceAnalysisId" INTEGER NOT NULL,
    "assessmentId" INTEGER,
    "gradeId" INTEGER,
    "gradeName" TEXT,
    "assessmentType" "AssessmentType" NOT NULL,
    "assessmentTitle" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "category" "AssessmentCategory" NOT NULL,

    CONSTRAINT "PerformanceAnalysisAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceAnalysisAssessment_performanceAnalysisId_idx" ON "PerformanceAnalysisAssessment"("performanceAnalysisId");

-- AddForeignKey
ALTER TABLE "PerformanceAnalysisAssessment" ADD CONSTRAINT "PerformanceAnalysisAssessment_performanceAnalysisId_fkey" FOREIGN KEY ("performanceAnalysisId") REFERENCES "PerformanceAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
