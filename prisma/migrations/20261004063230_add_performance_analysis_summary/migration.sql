-- CreateTable
CREATE TABLE "PerformanceAnalysisSummary" (
    "id" SERIAL NOT NULL,
    "performanceAnalysisId" INTEGER NOT NULL,
    "totalStudents" INTEGER NOT NULL,
    "totalMale" INTEGER NOT NULL,
    "totalFemale" INTEGER NOT NULL,
    "excellentMale" INTEGER NOT NULL,
    "excellentFemale" INTEGER NOT NULL,
    "excellentTotal" INTEGER NOT NULL,
    "veryGoodMale" INTEGER NOT NULL,
    "veryGoodFemale" INTEGER NOT NULL,
    "veryGoodTotal" INTEGER NOT NULL,
    "averageMale" INTEGER NOT NULL,
    "averageFemale" INTEGER NOT NULL,
    "averageTotal" INTEGER NOT NULL,
    "poorMale" INTEGER NOT NULL,
    "poorFemale" INTEGER NOT NULL,
    "poorTotal" INTEGER NOT NULL,
    "failMale" INTEGER NOT NULL,
    "failFemale" INTEGER NOT NULL,
    "failTotal" INTEGER NOT NULL,

    CONSTRAINT "PerformanceAnalysisSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceAnalysisSummary_performanceAnalysisId_key" ON "PerformanceAnalysisSummary"("performanceAnalysisId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysisSummary_performanceAnalysisId_idx" ON "PerformanceAnalysisSummary"("performanceAnalysisId");

-- AddForeignKey
ALTER TABLE "PerformanceAnalysisSummary" ADD CONSTRAINT "PerformanceAnalysisSummary_performanceAnalysisId_fkey" FOREIGN KEY ("performanceAnalysisId") REFERENCES "PerformanceAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
