-- CreateEnum
CREATE TYPE "ResultSubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "ResultSubmission" (
    "id" SERIAL NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "semester" "Semester" NOT NULL,
    "status" "ResultSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "resetAt" TIMESTAMP(3),
    "resetById" TEXT,

    CONSTRAINT "ResultSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionSupervisor" (
    "id" SERIAL NOT NULL,
    "section" "GradeSection" NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "SectionSupervisor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultSubmission_academicYearId_classId_subjectId_semester_key" ON "ResultSubmission"("academicYearId", "classId", "subjectId", "semester");

-- CreateIndex
CREATE UNIQUE INDEX "SectionSupervisor_section_key" ON "SectionSupervisor"("section");

-- CreateIndex
CREATE UNIQUE INDEX "SectionSupervisor_teacherId_key" ON "SectionSupervisor"("teacherId");

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSupervisor" ADD CONSTRAINT "SectionSupervisor_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
