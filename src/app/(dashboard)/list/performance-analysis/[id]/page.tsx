import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma, GradeSection } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/PrintButton";
import PerformanceAnalysisStudentSelector from "@/components/PerformanceAnalysisStudentSelector";
import { saveOverallPerformanceAnalysis } from "@/lib/actions";
import {
  calculateFinalResult,
  roundResult,
} from "@/lib/resultCalculation";

type PerformanceAnalysisWithDetails =
  Prisma.PerformanceAnalysisGetPayload<{
    include: {
      academicYear: true;
      grade: true;
      class: true;
      subject: true;
      createdByAdmin: true;
      createdByTeacher: true;
      summary: true;
      students: {
        orderBy: [
          { gradeName: "asc" },
          { className: "asc" },
          { rollNumber: "asc" },
        ];
      };
    };
  }>;

type LiveOverallStudent = {
  id: string;
  studentName: string;
  sex: string | null;
  gradeName: string;
  className: string;
  rollNumber: number;
  score: number;
  normalizedScore: number;
  category:
    | "EXCELLENT"
    | "VERY_GOOD"
    | "AVERAGE"
    | "POOR"
    | "FAIL";
};

type SelectorEnrollment = {
  studentId: string;
  classId: number;
  className: string;
  gradeId: number;
  gradeName: string;
  section: GradeSection;
};

const getPerformanceCategory = (
  normalizedScore: number
): LiveOverallStudent["category"] => {
  if (normalizedScore >= 9) return "EXCELLENT";
  if (normalizedScore > 7) return "VERY_GOOD";
  if (normalizedScore > 6) return "AVERAGE";
  if (normalizedScore >= 5) return "POOR";
  return "FAIL";
};

const getLevelLabel = (
  level: PerformanceAnalysisWithDetails["level"]
) => {
  switch (level) {
    case "SCHOOL":
      return "School";
    case "SECTION":
      return "Section";
    case "GRADE":
      return "Grade";
    case "CLASS":
      return "Class";
    default:
      return level;
  }
};

const getAssessmentLabel = (
  assessmentType:
    | PerformanceAnalysisWithDetails["assessmentType"]
    | null
    | undefined
) => {
  switch (assessmentType) {
    case "Q1":
      return "Quiz 1";
    case "Q2":
      return "Quiz 2";
    case "TEST1":
      return "Test 1";
    case "TEST2":
      return "Test 2";
    case "MIDTERM":
      return "Mid Exam";
    case "FINAL":
      return "Final Exam";
    default:
      return assessmentType ?? "-";
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "EXCELLENT":
      return "Excellent";
    case "VERY_GOOD":
      return "Very Good";
    case "AVERAGE":
      return "Average";
    case "POOR":
      return "Poor";
    case "FAIL":
      return "Fail";
    default:
      return category;
  }
};

const getSearchParam = (
  value: string | string[] | undefined
) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

export default async function PerformanceAnalysisViewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: {
    section?: string | string[];
    grade?: string | string[];
    class?: string | string[];
  };
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    notFound();
  }

  const role = sessionClaims?.metadata?.role as
    | string
    | undefined;

  if (role !== "admin" && role !== "teacher") {
    notFound();
  }

  const analysisId = Number(params.id);

  if (Number.isNaN(analysisId)) {
    notFound();
  }

  const analysis =
    await prisma.performanceAnalysis.findUnique({
      where: {
        id: analysisId,
      },
      include: {
        academicYear: true,
        grade: true,
        class: true,
        subject: true,
        createdByAdmin: true,
        createdByTeacher: true,
        summary: true,
        students: {
          orderBy: [
            { gradeName: "asc" },
            { className: "asc" },
            { rollNumber: "asc" },
          ],
        },
      },
    });

  if (!analysis) {
    notFound();
  }

  /*
   * Teacher access is based on the DB Teacher ID,
   * not the Clerk user ID.
   */
  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      notFound();
    }

    if (analysis.createdByTeacherId !== teacher.id) {
      notFound();
    }
  }

  const isOverall =
    analysis.assessmentScope === "OVERALL";

  const isClassOverall =
    isOverall &&
    analysis.level === "CLASS" &&
    !!analysis.classId;

  /*
   * ============================================================
   * LIVE CLASS-LEVEL OVERALL DATA
   * ============================================================
   */
  let overallSubmission: {
    id: number;
    status: "DRAFT" | "SUBMITTED";
  } | null = null;

  let liveOverallStudents: LiveOverallStudent[] = [];

  if (isClassOverall) {
    overallSubmission =
      await prisma.resultSubmission.findUnique({
        where: {
          academicYearId_classId_subjectId_semester: {
            academicYearId: analysis.academicYearId,
            classId: analysis.classId!,
            subjectId: analysis.subjectId!,
            semester: analysis.semester,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

    if (overallSubmission) {
      /*
       * Overall must inspect ALL loaded assessments,
       * including CLASS_ACTIVITY.
       */
      const assessments =
        await prisma.assessment.findMany({
          where: {
            academicYearId: analysis.academicYearId,
            subjectId: analysis.subjectId!,
            semester: analysis.semester,
            ...(analysis.gradeId
              ? {
                  gradeId: analysis.gradeId,
                }
              : {}),
          },
          select: {
            id: true,
            type: true,
            maxScore: true,
            weight: true,
            category: true,
          },
          orderBy: {
            id: "asc",
          },
        });

      const enrollments =
        await prisma.studentEnrollment.findMany({
          where: {
            academicYearId:
              analysis.academicYearId,
            classId: analysis.classId!,
          },
          select: {
            studentId: true,
            rollNumber: true,
            student: {
              select: {
                id: true,
                name: true,
                sex: true,
              },
            },
            class: {
              select: {
                name: true,
                grade: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            rollNumber: "asc",
          },
        });

      const assessmentIds =
        assessments.map(
          (assessment) => assessment.id
        );

      const studentIds =
        enrollments.map(
          (enrollment) =>
            enrollment.studentId
        );

      const studentAssessments =
        assessmentIds.length > 0 &&
        studentIds.length > 0
          ? await prisma.studentAssessment.findMany(
              {
                where: {
                  studentId: {
                    in: studentIds,
                  },
                  assessmentId: {
                    in: assessmentIds,
                  },
                },
                select: {
                  studentId: true,
                  assessmentId: true,
                  score: true,
                },
              }
            )
          : [];

      const scoreMap = new Map<
        string,
        number | null
      >();

      for (const studentAssessment of studentAssessments) {
        scoreMap.set(
          `${studentAssessment.studentId}-${studentAssessment.assessmentId}`,
          studentAssessment.score
        );
      }

      const assessmentDefinitions =
        assessments.map((assessment) => ({
          type: assessment.type,
          category: assessment.category,
          maxScore: assessment.maxScore,
          weight: assessment.weight,
        }));

      for (const enrollment of enrollments) {
        const scores: Record<
          string,
          number | null | undefined
        > = {};

        let hasAnyRecordedAssessment =
          false;

        for (const assessment of assessments) {
          const score = scoreMap.get(
            `${enrollment.studentId}-${assessment.id}`
          );

          if (
            score !== null &&
            score !== undefined
          ) {
            scores[assessment.type] =
              score;
            hasAnyRecordedAssessment =
              true;
          } else {
            scores[assessment.type] =
              undefined;
          }
        }

        if (!hasAnyRecordedAssessment) {
          continue;
        }

        const finalScore = roundResult(
          calculateFinalResult(
            assessmentDefinitions,
            scores
          )
        );

        const normalizedScore = roundResult(
          finalScore / 10
        );

        liveOverallStudents.push({
          id: enrollment.studentId,
          studentName:
            enrollment.student.name,
          sex: enrollment.student.sex,
          gradeName:
            enrollment.class.grade?.name ??
            "-",
          className:
            enrollment.class.name,
          rollNumber:
            enrollment.rollNumber,
          score: finalScore,
          normalizedScore,
          category:
            getPerformanceCategory(
              normalizedScore
            ),
        });
      }
    }
  }

  /*
   * ============================================================
   * STUDENT DATA SOURCE
   * ============================================================
   */
  const baseDisplayedStudents = isOverall
    ? isClassOverall
      ? liveOverallStudents
      : []
    : analysis.students;

  const isHigherLevelOverall =
    isOverall && !isClassOverall;

  const isAssessmentType =
    analysis.assessmentScope ===
    "ASSESSMENT";

  /*
   * ============================================================
   * ASSESSMENT-TYPE STUDENT SELECTOR
   * ============================================================
   */
  const hasStudentSelector =
    isAssessmentType &&
    analysis.level !== "CLASS";

  let selectorEnrollments:
    SelectorEnrollment[] = [];

  if (hasStudentSelector) {
    const enrollmentWhere: Prisma.StudentEnrollmentWhereInput =
      {
        academicYearId:
          analysis.academicYearId,
      };

    /*
     * SECTION analysis.
     */
    if (analysis.level === "SECTION") {
      if (!analysis.sectionName) {
        selectorEnrollments = [];
      } else {
        enrollmentWhere.class = {
          grade: {
            section:
              analysis.sectionName as GradeSection,
          },
        };
      }
    }

    /*
     * GRADE analysis.
     */
    if (analysis.level === "GRADE") {
      if (!analysis.gradeId) {
        selectorEnrollments = [];
      } else {
        enrollmentWhere.class = {
          gradeId: analysis.gradeId,
        };
      }
    }

    /*
     * SCHOOL / SECTION / GRADE
     */
    if (
      analysis.level === "SCHOOL" ||
      analysis.level === "SECTION" ||
      analysis.level === "GRADE"
    ) {
      if (
        analysis.level === "SECTION" &&
        !analysis.sectionName
      ) {
        selectorEnrollments = [];
      } else if (
        analysis.level === "GRADE" &&
        !analysis.gradeId
      ) {
        selectorEnrollments = [];
      } else {
        const enrollments =
          await prisma.studentEnrollment.findMany({
            where: enrollmentWhere,
            select: {
              studentId: true,
              classId: true,
              class: {
                select: {
                  name: true,
                  gradeId: true,
                  grade: {
                    select: {
                      name: true,
                      section: true,
                    },
                  },
                },
              },
            },
          });

        selectorEnrollments =
          enrollments.map(
            (enrollment) => ({
              studentId:
                enrollment.studentId,
              classId:
                enrollment.classId,
              className:
                enrollment.class.name,
              gradeId:
                enrollment.class.gradeId,
              gradeName:
                enrollment.class.grade.name,
              section:
                enrollment.class.grade
                  .section,
            })
          );
      }
    }
  }

  /*
   * ============================================================
   * RAW SELECTOR VALUES
   * ============================================================
   */
  const rawSelectedSection =
    getSearchParam(
      searchParams?.section
    );

  const rawSelectedGrade =
    getSearchParam(
      searchParams?.grade
    );

  const rawSelectedClass =
    getSearchParam(
      searchParams?.class
    );

  /*
   * ============================================================
   * AVAILABLE SECTIONS
   * ============================================================
   */
  const availableSections =
    analysis.level === "SCHOOL"
      ? Array.from(
          new Set(
            selectorEnrollments.map(
              (enrollment) =>
                enrollment.section
            )
          )
        ).sort()
      : [];

  const selectedSection =
    analysis.level === "SCHOOL" &&
    availableSections.includes(
      rawSelectedSection as GradeSection
    )
      ? (rawSelectedSection as GradeSection)
      : "";

  /*
   * ============================================================
   * AVAILABLE GRADES
   * ============================================================
   */
  const availableGradeObjects =
    analysis.level === "SCHOOL"
      ? selectorEnrollments.filter(
          (enrollment) =>
            !selectedSection ||
            enrollment.section ===
              selectedSection
        )
      : selectorEnrollments;

  const availableGrades =
    Array.from(
      new Map(
        availableGradeObjects.map(
          (enrollment) => [
            enrollment.gradeId,
            {
              id: enrollment.gradeId,
              name: enrollment.gradeName,
            },
          ]
        )
      ).values()
    ).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  const selectedGradeId =
    analysis.level === "SCHOOL" ||
    analysis.level === "SECTION"
      ? availableGrades.some(
          (grade) =>
            String(grade.id) ===
            rawSelectedGrade
        )
        ? Number(rawSelectedGrade)
        : 0
      : analysis.level === "GRADE" &&
        analysis.gradeId
      ? analysis.gradeId
      : 0;

  /*
   * ============================================================
   * AVAILABLE CLASSES
   * ============================================================
   */
  const availableClassObjects =
    selectorEnrollments.filter(
      (enrollment) => {
        if (
          analysis.level === "SCHOOL"
        ) {
          if (
            !selectedSection ||
            !selectedGradeId
          ) {
            return false;
          }

          return (
            enrollment.section ===
              selectedSection &&
            enrollment.gradeId ===
              selectedGradeId
          );
        }

        if (
          analysis.level === "SECTION"
        ) {
          if (!selectedGradeId) {
            return false;
          }

          return (
            enrollment.gradeId ===
            selectedGradeId
          );
        }

        if (
          analysis.level === "GRADE"
        ) {
          return (
            enrollment.gradeId ===
            analysis.gradeId
          );
        }

        return false;
      }
    );

  const availableClasses =
    Array.from(
      new Map(
        availableClassObjects.map(
          (enrollment) => [
            enrollment.classId,
            {
              id: enrollment.classId,
              name: enrollment.className,
            },
          ]
        )
      ).values()
    ).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

  const selectedClassId =
    availableClasses.some(
      (classItem) =>
        String(classItem.id) ===
        rawSelectedClass
    )
      ? Number(rawSelectedClass)
      : 0;

  /*
   * ============================================================
   * REQUIRED SELECTION
   * ============================================================
   */
  const selectorSelectionComplete =
    analysis.level === "SCHOOL"
      ? !!selectedSection &&
        !!selectedGradeId &&
        !!selectedClassId
      : analysis.level === "SECTION"
      ? !!selectedGradeId &&
        !!selectedClassId
      : analysis.level === "GRADE"
      ? !!selectedClassId
      : true;

  /*
   * ============================================================
   * LOAD SELECTED ASSESSMENT STUDENTS
   * ============================================================
   */
  let selectedAssessmentStudents =
    analysis.students;

  if (hasStudentSelector) {
    if (!selectorSelectionComplete) {
      selectedAssessmentStudents = [];
    } else {
      const selectedEnrollments =
        selectorEnrollments.filter(
          (enrollment) => {
            if (
              analysis.level ===
                "SCHOOL" &&
              enrollment.section !==
                selectedSection
            ) {
              return false;
            }

            if (
              (analysis.level ===
                "SCHOOL" ||
                analysis.level ===
                  "SECTION") &&
              enrollment.gradeId !==
                selectedGradeId
            ) {
              return false;
            }

            return (
              enrollment.classId ===
              selectedClassId
            );
          }
        );

      const selectedStudentIds =
        selectedEnrollments.map(
          (enrollment) =>
            enrollment.studentId
        );

      if (
        selectedStudentIds.length === 0
      ) {
        selectedAssessmentStudents = [];
      } else {
        selectedAssessmentStudents =
          await prisma.performanceAnalysisStudent.findMany(
            {
              where: {
                performanceAnalysisId:
                  analysis.id,
                studentId: {
                  in: selectedStudentIds,
                },
              },
              orderBy: [
                {
                  gradeName: "asc",
                },
                {
                  className: "asc",
                },
                {
                  rollNumber: "asc",
                },
              ],
            }
          );
      }
    }
  }

  /*
   * Keep Assessment Type and Overall students
   * as separate typed collections.
   */
  const assessmentDisplayedStudents =
    selectedAssessmentStudents;

  const overallDisplayedStudents:
    LiveOverallStudent[] =
    liveOverallStudents;

  /*
   * ============================================================
   * STUDENTS ANALYZED
   * ============================================================
   */
  const studentsAnalyzed =
    isHigherLevelOverall
      ? analysis.summary?.totalStudents ??
        0
      : isAssessmentType
      ? analysis.students.length
      : baseDisplayedStudents.length;

  /*
   * ============================================================
   * CLASS OVERALL SAVED STATUS
   * ============================================================
   */
  const overallIsSaved =
    isClassOverall &&
    overallSubmission?.status ===
      "SUBMITTED" &&
    analysis.resultSubmissionId ===
      overallSubmission.id;

  const analysisType = isOverall
    ? "Overall /100"
    : "Assessment";

  const assessmentTitle = isOverall
    ? "Final Score /100"
    : getAssessmentLabel(
        analysis.assessmentType
      );

  const createdBy =
    analysis.createdByAdmin?.name ??
    analysis.createdByTeacher?.name ??
    "-";

  const categories = [
    "EXCELLENT",
    "VERY_GOOD",
    "AVERAGE",
    "POOR",
    "FAIL",
  ] as const;

  /*
   * ============================================================
   * PERFORMANCE SUMMARY
   * ============================================================
   */
  const summaryStudents =
    baseDisplayedStudents;

  const categorySummary = categories.map(
    (category) => {
      if (isHigherLevelOverall) {
        const summary = analysis.summary;

        if (!summary) {
          return {
            category,
            label:
              getCategoryLabel(category),
            male: 0,
            female: 0,
            total: 0,
          };
        }

        switch (category) {
          case "EXCELLENT":
            return {
              category,
              label:
                getCategoryLabel(category),
              male: summary.excellentMale,
              female:
                summary.excellentFemale,
              total:
                summary.excellentTotal,
            };

          case "VERY_GOOD":
            return {
              category,
              label:
                getCategoryLabel(category),
              male: summary.veryGoodMale,
              female:
                summary.veryGoodFemale,
              total:
                summary.veryGoodTotal,
            };

          case "AVERAGE":
            return {
              category,
              label:
                getCategoryLabel(category),
              male: summary.averageMale,
              female:
                summary.averageFemale,
              total:
                summary.averageTotal,
            };

          case "POOR":
            return {
              category,
              label:
                getCategoryLabel(category),
              male: summary.poorMale,
              female:
                summary.poorFemale,
              total:
                summary.poorTotal,
            };

          case "FAIL":
            return {
              category,
              label:
                getCategoryLabel(category),
              male: summary.failMale,
              female:
                summary.failFemale,
              total:
                summary.failTotal,
            };
        }
      }

      const students =
        summaryStudents.filter(
          (student) =>
            student.category ===
            category
        );

      const male = students.filter(
        (student) =>
          student.sex === "MALE"
      ).length;

      const female = students.filter(
        (student) =>
          student.sex === "FEMALE"
      ).length;

      return {
        category,
        label:
          getCategoryLabel(category),
        male,
        female,
        total: students.length,
      };
    }
  );

  const totalMale =
    isHigherLevelOverall
      ? analysis.summary?.totalMale ??
        0
      : summaryStudents.filter(
          (student) =>
            student.sex === "MALE"
        ).length;

  const totalFemale =
    isHigherLevelOverall
      ? analysis.summary?.totalFemale ??
        0
      : summaryStudents.filter(
          (student) =>
            student.sex === "FEMALE"
        ).length;

  const totalStudents =
    isHigherLevelOverall
      ? analysis.summary?.totalStudents ??
        0
      : summaryStudents.length;

  return (
    <div className="performance-print-root">
      <div className="p-4 flex flex-col gap-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/badirLogo.png"
              alt="Badir Development School"
              width={70}
              height={70}
              className="object-contain"
            />

            <div>
              <h1 className="text-2xl font-semibold">
                Performance Analysis
              </h1>

              <p className="text-sm text-gray-500">
                {isOverall
                  ? "Overall semester subject performance"
                  : "Selected assessment performance"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <PrintButton label="Print Analysis" />

            {isClassOverall &&
              overallSubmission?.status ===
                "SUBMITTED" &&
              !overallIsSaved && (
                <form
                  action={
                    saveOverallPerformanceAnalysis
                  }
                >
                  <input
                    type="hidden"
                    name="id"
                    value={analysis.id}
                  />

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-badirStar text-sm font-medium hover:opacity-90"
                  >
                    Save Overall Analysis
                  </button>
                </form>
              )}

            {overallIsSaved && (
              <span className="px-4 py-2 rounded-md bg-gray-100 text-sm font-medium">
                Overall Analysis Saved
              </span>
            )}

            <Link
              href="/list/performance-analysis"
              className="px-4 py-2 rounded-md bg-gray-100 text-sm font-medium hover:bg-badirStar"
            >
              Back
            </Link>
          </div>
        </div>

        {/* ANALYSIS INFORMATION */}
        <div className="performance-first-page">
          <div className="bg-white rounded-md p-5 shadow-sm border print-card">
            <h2 className="text-lg font-semibold mb-4">
              Analysis Information
            </h2>

            <div className="analysis-information-grid grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">
                  Academic Year
                </p>
                <p className="font-medium">
                  {analysis.academicYear.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Semester
                </p>
                <p className="font-medium">
                  {analysis.semester}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Level
                </p>
                <p className="font-medium">
                  {getLevelLabel(
                    analysis.level
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Section
                </p>
                <p className="font-medium">
                  {analysis.sectionName ??
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Grade
                </p>
                <p className="font-medium">
                  {analysis.gradeName ??
                    analysis.grade?.name ??
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Class
                </p>
                <p className="font-medium">
                  {analysis.className ??
                    analysis.class?.name ??
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Subject
                </p>
                <p className="font-medium">
                  {analysis.subjectName ??
                    analysis.subject?.name ??
                    "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Students Analyzed
                </p>
                <p className="font-medium">
                  {studentsAnalyzed}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Analysis Type
                </p>
                <p className="font-medium">
                  {analysisType}
                </p>
              </div>

              {isOverall ? (
                <div>
                  <p className="text-xs text-gray-500">
                    Final Score
                  </p>
                  <p className="font-medium">
                    /100
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-gray-500">
                      Assessment
                    </p>
                    <p className="font-medium">
                      {assessmentTitle}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Maximum Score
                    </p>
                    <p className="font-medium">
                      {analysis.assessmentMaxScore !=
                      null
                        ? analysis.assessmentMaxScore
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Weight
                    </p>
                    <p className="font-medium">
                      {analysis.assessmentWeight !=
                      null
                        ? analysis.assessmentWeight
                        : "-"}
                    </p>
                  </div>
                </>
              )}

              <div>
                <p className="text-xs text-gray-500">
                  Created By
                </p>
                <p className="font-medium">
                  {createdBy}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Created At
                </p>
                <p className="font-medium">
                  {analysis.createdAt.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* PERFORMANCE SUMMARY */}
          <div className="bg-white rounded-md p-5 shadow-sm border print-card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {isOverall
                  ? "Overall Performance Summary"
                  : "Assessment Performance Summary"}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {isOverall
                  ? "Distribution of students according to their final semester score out of 100."
                  : "Distribution of students according to their performance in the selected assessment."}
              </p>

              <p className="text-xs text-gray-500 mt-2">
                Performance ranges:
                <span className="ml-1">
                  {isOverall ? (
                    <>
                      Excellent{" "}
                      <strong>90–100</strong>
                      {" · "}
                      Very Good{" "}
                      <strong>&gt;70–&lt;90</strong>
                      {" · "}
                      Average{" "}
                      <strong>&gt;60–70</strong>
                      {" · "}
                      Poor{" "}
                      <strong>50–60</strong>
                      {" · "}
                      Fail{" "}
                      <strong>&lt;50</strong>
                    </>
                  ) : (
                    <>
                      Excellent{" "}
                      <strong>9–10</strong>
                      {" · "}
                      Very Good{" "}
                      <strong>&gt;7–&lt;9</strong>
                      {" · "}
                      Average{" "}
                      <strong>&gt;6–7</strong>
                      {" · "}
                      Poor{" "}
                      <strong>5–6</strong>
                      {" · "}
                      Fail{" "}
                      <strong>&lt;5</strong>
                    </>
                  )}
                </span>
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 text-sm font-semibold">
                      Performance
                    </th>
                    <th className="text-center p-3 text-sm font-semibold">
                      Male
                    </th>
                    <th className="text-center p-3 text-sm font-semibold">
                      Female
                    </th>
                    <th className="text-center p-3 text-sm font-semibold">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {categorySummary.map(
                    (item) => (
                      <tr
                        key={item.category}
                        className="border-b last:border-b-0"
                      >
                        <td className="p-3 font-medium">
                          {item.label}
                        </td>

                        <td className="p-3 text-center">
                          {item.male}
                        </td>

                        <td className="p-3 text-center">
                          {item.female}
                        </td>

                        <td className="p-3 text-center font-semibold">
                          {item.total}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>

                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="p-3 font-semibold">
                      Total
                    </td>

                    <td className="p-3 text-center font-semibold">
                      {totalMale}
                    </td>

                    <td className="p-3 text-center font-semibold">
                      {totalFemale}
                    </td>

                    <td className="p-3 text-center font-semibold">
                      {totalStudents}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* STUDENT PERFORMANCE */}
        <div
        id="student-performance"
        className="bg-white rounded-md p-5 shadow-sm border performance-student-page">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              {isOverall
                ? isHigherLevelOverall
                  ? "Overall Performance"
                  : "Overall Student Performance"
                : "Student Assessment Performance"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {isOverall
                ? isHigherLevelOverall
                  ? "Aggregate performance summary for the selected analysis level."
                  : "Final semester performance shown as a score out of 100."
                : "Individual student performance in the selected assessment."}
            </p>
          </div>

          {/* HIGHER-LEVEL OVERALL */}
          {isHigherLevelOverall ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Individual student records are not
              stored for{" "}
              {getLevelLabel(
                analysis.level
              )} Overall analysis. The Performance
              Analysis Summary above is the
              persisted result for this analysis
              level.
            </div>
          ) : isAssessmentType &&
            analysis.level !== "CLASS" ? (
            <>
              <PerformanceAnalysisStudentSelector
                analysisId={analysis.id}
                level={analysis.level}
                availableSections={
                  availableSections
                }
                selectedSection={
                  selectedSection
                }
                availableGrades={
                  availableGrades
                }
                selectedGradeId={
                  selectedGradeId
                }
                availableClasses={
                  availableClasses
                }
                selectedClassId={
                  selectedClassId
                }
                selectorSelectionComplete={
                  selectorSelectionComplete
                }
                assessmentDisplayedStudentsCount={
                  assessmentDisplayedStudents.length
                }
              />

              {/* SELECTED STUDENT TABLE */}
              {selectorSelectionComplete ? (
                <div className="overflow-x-auto">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Students in{" "}
                        {
                          availableClasses.find(
                            (classItem) =>
                              classItem.id ===
                              selectedClassId
                          )?.name
                        }
                      </p>

                      <p className="text-xs text-gray-500">
                        {analysis.level ===
                          "SCHOOL" &&
                        selectedSection
                          ? `${selectedSection} · `
                          : ""}

                        {analysis.level !==
                          "GRADE" &&
                        selectedGradeId
                          ? `${
                              availableGrades.find(
                                (grade) =>
                                  grade.id ===
                                  selectedGradeId
                              )?.name ??
                              ""
                            } · `
                          : ""}

                        {
                          assessmentDisplayedStudents.length
                        }{" "}
                        student
                        {assessmentDisplayedStudents.length ===
                        1
                          ? ""
                          : "s"}
                      </p>
                    </div>
                  </div>

                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-sm font-semibold">
                          #
                        </th>

                        <th className="text-left p-3 text-sm font-semibold">
                          Student
                        </th>

                        <th className="text-left p-3 text-sm font-semibold">
                          Sex
                        </th>

                        <th className="text-left p-3 text-sm font-semibold">
                          Grade
                        </th>

                        <th className="text-left p-3 text-sm font-semibold">
                          Class
                        </th>

                        <th className="text-center p-3 text-sm font-semibold">
                          Roll No.
                        </th>

                        <th className="text-center p-3 text-sm font-semibold">
                          Score
                        </th>

                        <th className="text-center p-3 text-sm font-semibold">
                          Max
                        </th>

                        <th className="text-center p-3 text-sm font-semibold">
                          Normalized /10
                        </th>

                        <th className="text-center p-3 text-sm font-semibold">
                          Performance
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {assessmentDisplayedStudents.map(
                        (student, index) => (
                          <tr
                            key={student.id}
                            className="border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <td className="p-3">
                              {index + 1}
                            </td>

                            <td className="p-3 font-medium">
                              {student.studentName}
                            </td>

                            <td className="p-3">
                              {student.sex}
                            </td>

                            <td className="p-3">
                              {student.gradeName}
                            </td>

                            <td className="p-3">
                              {student.className}
                            </td>

                            <td className="p-3 text-center">
                              {student.rollNumber}
                            </td>

                            <td className="p-3 text-center font-semibold">
                              {student.score.toFixed(
                                2
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {student.maxScore.toFixed(
                                2
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {student.normalizedScore.toFixed(
                                2
                              )}
                            </td>

                            <td className="p-3 text-center font-medium">
                              {getCategoryLabel(
                                student.category
                              )}
                            </td>
                          </tr>
                        )
                      )}

                      {assessmentDisplayedStudents.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={10}
                            className="p-6 text-center text-sm text-gray-500"
                          >
                            No students were recorded
                            for this class and
                            assessment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-gray-500 border rounded-md bg-gray-50">
                  Select{" "}
                  {analysis.level ===
                  "SCHOOL"
                    ? "a section, grade, and class"
                    : analysis.level ===
                      "SECTION"
                    ? "a grade and class"
                    : "a class"}{" "}
                  above to view its students.
                </div>
              )}
            </>
          ) : isOverall ? (
            /* CLASS OVERALL */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 text-sm font-semibold">
                      #
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Student
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Sex
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Grade
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Class
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Roll No.
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Final Score /100
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Performance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {overallDisplayedStudents.map(
                    (student, index) => (
                      <tr
                        key={student.id}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="p-3">
                          {index + 1}
                        </td>

                        <td className="p-3 font-medium">
                          {student.studentName}
                        </td>

                        <td className="p-3">
                          {student.sex}
                        </td>

                        <td className="p-3">
                          {student.gradeName}
                        </td>

                        <td className="p-3">
                          {student.className}
                        </td>

                        <td className="p-3 text-center">
                          {student.rollNumber}
                        </td>

                        <td className="p-3 text-center font-semibold">
                          {student.score.toFixed(
                            2
                          )}
                        </td>

                        <td className="p-3 text-center font-medium">
                          {getCategoryLabel(
                            student.category
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {overallDisplayedStudents.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-6 text-center text-sm text-gray-500"
                      >
                        No recorded student
                        assessment data is
                        available for this
                        class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* CLASS-LEVEL ASSESSMENT */
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 text-sm font-semibold">
                      #
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Student
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Sex
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Grade
                    </th>

                    <th className="text-left p-3 text-sm font-semibold">
                      Class
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Roll No.
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Score
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Max
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Normalized /10
                    </th>

                    <th className="text-center p-3 text-sm font-semibold">
                      Performance
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.students.map(
                    (student, index) => (
                      <tr
                        key={student.id}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="p-3">
                          {index + 1}
                        </td>

                        <td className="p-3 font-medium">
                          {student.studentName}
                        </td>

                        <td className="p-3">
                          {student.sex}
                        </td>

                        <td className="p-3">
                          {student.gradeName}
                        </td>

                        <td className="p-3">
                          {student.className}
                        </td>

                        <td className="p-3 text-center">
                          {student.rollNumber}
                        </td>

                        <td className="p-3 text-center font-semibold">
                          {student.score.toFixed(
                            2
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {student.maxScore.toFixed(
                            2
                          )}
                        </td>

                        <td className="p-3 text-center">
                          {student.normalizedScore.toFixed(
                            2
                          )}
                        </td>

                        <td className="p-3 text-center font-medium">
                          {getCategoryLabel(
                            student.category
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {analysis.students.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-6 text-center text-sm text-gray-500"
                      >
                        No students were recorded
                        for this assessment
                        analysis.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PRINT STYLES */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .performance-print-root {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
            }

            .performance-student-page {
              width: 100%;
              box-sizing: border-box;
            }

            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }

              html,
              body {
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                background: white !important;
              }

              .performance-print-root {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                background: white !important;
                visibility: visible !important;
                z-index: 2147483647 !important;
              }

              .performance-print-root * {
                visibility: visible !important;
              }

              header,
              nav,
              aside,
              footer {
                display: none !important;
              }

              .performance-print-root .print\\:hidden {
                display: none !important;
              }

              .performance-print-root > .p-4 {
                width: 210mm !important;
                min-width: 210mm !important;
                max-width: 210mm !important;
                margin: 0 !important;
                padding: 10mm !important;
                box-sizing: border-box !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 6mm !important;
                overflow: visible !important;
              }

              .performance-print-root .print-card {
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                background: white !important;
                box-shadow: none !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .performance-student-page {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                break-before: page !important;
                page-break-before: always !important;
                break-inside: auto !important;
                page-break-inside: auto !important;
                background: white !important;
                box-shadow: none !important;
              }

              .performance-print-root table {
                width: 100% !important;
                max-width: 100% !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                box-sizing: border-box !important;
              }

              .performance-print-root thead {
                display: table-header-group !important;
              }

              .performance-print-root tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .performance-print-root th,
              .performance-print-root td {
                box-sizing: border-box !important;
                max-width: 100% !important;
                overflow: hidden !important;
                word-wrap: break-word !important;
                overflow-wrap: anywhere !important;
              }

              .performance-print-root tr:hover {
                background: transparent !important;
              }

              .performance-print-root img {
                max-width: 100% !important;
                height: auto !important;
              }

              .performance-print-root a {
                color: black !important;
                text-decoration: none !important;
              }

              .performance-print-root,
              .performance-print-root > *,
              .performance-print-root .performance-student-page,
              .performance-print-root .print-card {
                overflow-x: hidden !important;
              }

              .performance-first-page {
                display: flex !important;
                flex-direction: column !important;
                gap: 6mm !important;
                break-after: page !important;
                page-break-after: always !important;
              }

              .performance-first-page .print-card {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .performance-student-page {
                break-before: auto !important;
                page-break-before: auto !important;
              }

              .performance-print-root .analysis-information-grid {
                display: grid !important;
                grid-template-columns: repeat(
                  3,
                  minmax(0, 1fr)
                ) !important;
                column-gap: 6mm !important;
                row-gap: 3mm !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}