-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('GENERAL', 'SECTION', 'GRADE', 'CLASS');

-- CreateEnum
CREATE TYPE "ProgressRating" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "gradeId" INTEGER,
ADD COLUMN     "section" "GradeSection",
ADD COLUMN     "targetType" "TargetType" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "gradeId" INTEGER,
ADD COLUMN     "section" "GradeSection",
ADD COLUMN     "targetType" "TargetType" NOT NULL DEFAULT 'GENERAL';

-- CreateTable
CREATE TABLE "CommunicationBook" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dailyWord" TEXT,
    "characterTrait" TEXT,
    "teacherComment" TEXT,
    "teacherName" TEXT,
    "teacherSignature" TEXT,
    "parentComment" TEXT,
    "parentName" TEXT,
    "parentSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationBookSubject" (
    "id" SERIAL NOT NULL,
    "communicationBookId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "homeworkInstruction" TEXT,
    "asp" TEXT,
    "parentSignature" TEXT,

    CONSTRAINT "CommunicationBookSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyProgressReport" (
    "id" SERIAL NOT NULL,
    "communicationBookId" INTEGER NOT NULL,
    "teacherComment" TEXT,
    "teacherName" TEXT,
    "teacherSignature" TEXT,
    "parentComment" TEXT,
    "parentName" TEXT,
    "parentSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyProgressItem" (
    "id" SERIAL NOT NULL,
    "weeklyProgressReportId" INTEGER NOT NULL,
    "criterion" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rating" "ProgressRating" NOT NULL,

    CONSTRAINT "WeeklyProgressItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "senderAdminId" TEXT,
    "senderTeacherId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRecipient" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "adminId" TEXT,
    "teacherId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceAnalysis" (
    "id" SERIAL NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "studentId" TEXT,
    "classId" INTEGER,
    "gradeId" INTEGER,
    "section" "GradeSection",
    "studentName" TEXT,
    "className" TEXT,
    "gradeName" TEXT,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "maleCount" INTEGER NOT NULL DEFAULT 0,
    "femaleCount" INTEGER NOT NULL DEFAULT 0,
    "overallAverage" DOUBLE PRECISION,
    "highestAverage" DOUBLE PRECISION,
    "lowestAverage" DOUBLE PRECISION,
    "analysisTitle" TEXT,
    "analysisComment" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceAnalysisSubject" (
    "id" SERIAL NOT NULL,
    "performanceAnalysisId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "studentCount" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION,
    "highestScore" DOUBLE PRECISION,
    "lowestScore" DOUBLE PRECISION,
    "maleAverage" DOUBLE PRECISION,
    "femaleAverage" DOUBLE PRECISION,
    "comment" TEXT,

    CONSTRAINT "PerformanceAnalysisSubject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationBook_studentId_academicYearId_idx" ON "CommunicationBook"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "CommunicationBook_classId_date_idx" ON "CommunicationBook"("classId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationBook_studentId_academicYearId_date_key" ON "CommunicationBook"("studentId", "academicYearId", "date");

-- CreateIndex
CREATE INDEX "CommunicationBookSubject_subjectId_idx" ON "CommunicationBookSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationBookSubject_communicationBookId_subjectId_key" ON "CommunicationBookSubject"("communicationBookId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyProgressReport_communicationBookId_key" ON "WeeklyProgressReport"("communicationBookId");

-- CreateIndex
CREATE INDEX "WeeklyProgressItem_weeklyProgressReportId_idx" ON "WeeklyProgressItem"("weeklyProgressReportId");

-- CreateIndex
CREATE INDEX "MessageRecipient_adminId_isRead_idx" ON "MessageRecipient"("adminId", "isRead");

-- CreateIndex
CREATE INDEX "MessageRecipient_teacherId_isRead_idx" ON "MessageRecipient"("teacherId", "isRead");

-- CreateIndex
CREATE INDEX "MessageRecipient_messageId_idx" ON "MessageRecipient"("messageId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_academicYearId_semester_idx" ON "PerformanceAnalysis"("academicYearId", "semester");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_studentId_idx" ON "PerformanceAnalysis"("studentId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_classId_idx" ON "PerformanceAnalysis"("classId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_gradeId_idx" ON "PerformanceAnalysis"("gradeId");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_section_idx" ON "PerformanceAnalysis"("section");

-- CreateIndex
CREATE INDEX "PerformanceAnalysis_createdById_idx" ON "PerformanceAnalysis"("createdById");

-- CreateIndex
CREATE INDEX "PerformanceAnalysisSubject_subjectId_idx" ON "PerformanceAnalysisSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceAnalysisSubject_performanceAnalysisId_subjectId_key" ON "PerformanceAnalysisSubject"("performanceAnalysisId", "subjectId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationBook" ADD CONSTRAINT "CommunicationBook_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationBook" ADD CONSTRAINT "CommunicationBook_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationBook" ADD CONSTRAINT "CommunicationBook_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationBookSubject" ADD CONSTRAINT "CommunicationBookSubject_communicationBookId_fkey" FOREIGN KEY ("communicationBookId") REFERENCES "CommunicationBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationBookSubject" ADD CONSTRAINT "CommunicationBookSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyProgressReport" ADD CONSTRAINT "WeeklyProgressReport_communicationBookId_fkey" FOREIGN KEY ("communicationBookId") REFERENCES "CommunicationBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyProgressItem" ADD CONSTRAINT "WeeklyProgressItem_weeklyProgressReportId_fkey" FOREIGN KEY ("weeklyProgressReportId") REFERENCES "WeeklyProgressReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderAdminId_fkey" FOREIGN KEY ("senderAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderTeacherId_fkey" FOREIGN KEY ("senderTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysis" ADD CONSTRAINT "PerformanceAnalysis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysisSubject" ADD CONSTRAINT "PerformanceAnalysisSubject_performanceAnalysisId_fkey" FOREIGN KEY ("performanceAnalysisId") REFERENCES "PerformanceAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAnalysisSubject" ADD CONSTRAINT "PerformanceAnalysisSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
