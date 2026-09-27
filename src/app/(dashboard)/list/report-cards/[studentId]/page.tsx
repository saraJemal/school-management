import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  calculateFinalResult,
  roundResult,
} from "@/lib/resultCalculation";
import PrintButton from "@/components/PrintButton";
import FormContainer from "@/components/FormContainer";
import { calculateStudentSemesterAttendance } from "@/lib/attendance";

type PageProps = {
  params: {
    studentId: string;
  };
  searchParams: {
    academicYearId?: string;
  };
};

type SubjectSemesterResult = {
  subjectId: number;
  subjectName: string;
  semester1: number | null;
  semester2: number | null;
  annualAverage: number | null;
};

type SemesterRankData = {
  studentId: string;
  average: number;
};

const calculateSemesterAverage = (
  subjectResults: SubjectSemesterResult[],
  semester: "SEMESTER1" | "SEMESTER2"
) => {
  const values = subjectResults
    .map((subject) =>
      semester === "SEMESTER1"
        ? subject.semester1
        : subject.semester2
    )
    .filter(
      (value): value is number =>
        value !== null
    );

  if (values.length === 0) {
    return null;
  }

  return roundResult(
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
};

const calculateAnnualAverage = (
  subjectResults: SubjectSemesterResult[]
) => {
  const annualResults = subjectResults
    .map((subject) => subject.annualAverage)
    .filter(
      (value): value is number =>
        value !== null
    );

  if (annualResults.length === 0) {
    return null;
  }

  return roundResult(
    annualResults.reduce(
      (sum, value) => sum + value,
      0
    ) / annualResults.length
  );
};

const calculateSemesterTotal = (
  subjectResults: SubjectSemesterResult[],
  semester: "SEMESTER1" | "SEMESTER2"
) => {
  const values = subjectResults
    .map((subject) =>
      semester === "SEMESTER1"
        ? subject.semester1
        : subject.semester2
    )
    .filter(
      (value): value is number =>
        value !== null
    );

  if (values.length === 0) {
    return null;
  }

  return roundResult(
    values.reduce(
      (sum, value) => sum + value,
      0
    )
  );
};

const calculateAnnualTotal = (
  subjectResults: SubjectSemesterResult[]
) => {
  const semester1Total =
    calculateSemesterTotal(
      subjectResults,
      "SEMESTER1"
    );

  const semester2Total =
    calculateSemesterTotal(
      subjectResults,
      "SEMESTER2"
    );

  if (
    semester1Total !== null &&
    semester2Total !== null
  ) {
    // Both semesters recorded
    return roundResult(
      (semester1Total +
        semester2Total) /
        2
    );
  }

  if (semester1Total !== null) {
    // Semester 2 not yet recorded
    return semester1Total;
  }

  if (semester2Total !== null) {
    // Semester 1 not recorded
    return semester2Total;
  }

  return null;
};

const getAge = (birthday: Date) => {
  const today = new Date();

  let age =
    today.getFullYear() -
    birthday.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthday.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() <
        birthday.getDate())
  ) {
    age--;
  }

  return age;
};

const formatTeacherName = (
  teacher: {
    name: string;
    middleName: string | null;
    surname: string | null;
  } | null
) => {
  if (!teacher) {
    return "Not recorded";
  }

  return `${teacher.name} ${
    teacher.middleName ?? ""
  } ${teacher.surname ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
};

const formatParentName = (
  parent: {
    name: string;
    middleName: string | null;
    surname: string | null;
  } | null
) => {
  if (!parent) {
    return "Not recorded";
  }

  return `${parent.name} ${
    parent.middleName ?? ""
  } ${parent.surname ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
};

const StudentReportCardPage = async ({
  params,
  searchParams,
}: PageProps) => {
  const { userId, sessionClaims } =
    await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role =
    (sessionClaims?.metadata as {
      role?: string;
    })?.role;

  if (
    ![
      "admin",
      "teacher",
      "student",
      "parent",
    ].includes(role ?? "")
  ) {
    redirect("/unauthorized");
  }

  /*
   * =====================================================
   * ACADEMIC YEAR
   * =====================================================
   */

  const academicYearId = Number(
    searchParams.academicYearId
  );

  if (
    !academicYearId ||
    Number.isNaN(academicYearId)
  ) {
    redirect("/list/report-cards");
  }

  /*
   * =====================================================
   * STUDENT
   * =====================================================
   */

  const student =
    await prisma.student.findUnique({
      where: {
        id: params.studentId,
      },
      include: {
        parent: true,
      },
    });

  if (!student) {
    notFound();
  }

  /*
   * =====================================================
   * STUDENT / PARENT AUTHORIZATION
   * =====================================================
   */

  if (role === "student") {
    if (
      student.clerkUserId !== userId
    ) {
      redirect("/unauthorized");
    }
  }

  if (role === "parent") {
    const parent =
      await prisma.parent.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

    if (
      !parent ||
      student.parentId !== parent.id
    ) {
      redirect("/unauthorized");
    }
  }

  /*
   * =====================================================
   * STUDENT ENROLLMENT
   * =====================================================
   */

  const enrollment =
    await prisma.studentEnrollment.findUnique(
      {
        where: {
          studentId_academicYearId: {
            studentId: student.id,
            academicYearId,
          },
        },
        include: {
          class: {
            include: {
              grade: true,
            },
          },
          academicYear: true,
        },
      }
    );

  if (!enrollment) {
    notFound();
  }

  const classId =
    enrollment.classId;

  const gradeId =
    enrollment.class.gradeId;

  const gradeSection =
    enrollment.class.grade.section;

  const academicYear =
    enrollment.academicYear;

  /*
   * =====================================================
   * TEACHER AUTHORIZATION
   * =====================================================
   */

  let currentTeacher = null;

  if (role === "teacher") {
    currentTeacher =
      await prisma.teacher.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
          name: true,
          middleName: true,
          surname: true,
        },
      });

    if (!currentTeacher) {
      redirect("/unauthorized");
    }

    if (
      enrollment.class.homeRoomTeacherId !==
      currentTeacher.id
    ) {
      redirect("/unauthorized");
    }
  }

  /*
   * =====================================================
   * SUBJECTS
   * =====================================================
   */

  const subjectSections =
    await prisma.subjectSection.findMany({
      where: {
        section: gradeSection,
      },
      select: {
        subjectId: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });

  const subjects = Array.from(
    new Map(
      subjectSections.map(
        (item) => [
          item.subject.id,
          {
            id: item.subject.id,
            name: item.subject.name,
          },
        ]
      )
    ).values()
  );

  /*
   * =====================================================
   * RESULT SUBMISSIONS
   * =====================================================
   */

  const submissions =
    await prisma.resultSubmission.findMany(
      {
        where: {
          academicYearId,
          classId,
          status: "SUBMITTED",
        },
        select: {
          subjectId: true,
          semester: true,
        },
      }
    );

  const submittedResultKeys =
    new Set(
      submissions.map(
        (submission) =>
          `${submission.subjectId}-${submission.semester}`
      )
    );

  /*
   * =====================================================
   * ALL ENROLLED STUDENTS
   * =====================================================
   */

  const classEnrollments =
    await prisma.studentEnrollment.findMany(
      {
        where: {
          academicYearId,
          classId,
        },
        select: {
          studentId: true,
          rollNumber: true,
        },
        orderBy: {
          rollNumber: "asc",
        },
      }
    );

  const enrolledStudentIds =
    classEnrollments.map(
      (item) => item.studentId
    );

  const classSize =
    classEnrollments.length;

  /*
   * =====================================================
   * ASSESSMENT DEFINITIONS
   * =====================================================
   */

  const assessmentDefinitions =
    await prisma.assessment.findMany({
      where: {
        academicYearId,
        gradeId,
      },
      select: {
        subjectId: true,
        semester: true,
        type: true,
        category: true,
        maxScore: true,
        weight: true,
      },
    });

  /*
   * =====================================================
   * ALL STUDENT ASSESSMENTS
   * =====================================================
   */

  const allStudentAssessments =
    await prisma.studentAssessment.findMany({
      where: {
        studentId: {
          in: enrolledStudentIds,
        },
        assessment: {
          academicYearId,
          gradeId,
        },
      },
      select: {
        studentId: true,
        score: true,
        assessment: {
          select: {
            subjectId: true,
            semester: true,
            type: true,
          },
        },
      },
    });

  const studentAssessmentMap =
    new Map<
      string,
      number | null
    >();

  for (const result of allStudentAssessments) {
    const key =
      `${result.studentId}-` +
      `${result.assessment.subjectId}-` +
      `${result.assessment.semester}-` +
      `${result.assessment.type}`;

    studentAssessmentMap.set(
      key,
      result.score
    );
  }

  /*
   * =====================================================
   * BUILD SUBJECT RESULTS
   * =====================================================
   */

  const getStudentSubjectResults =
    (
      studentId: string
    ): SubjectSemesterResult[] => {
      return subjects.map(
        (subject) => {
          let semester1:
            | number
            | null = null;

          let semester2:
            | number
            | null = null;

          /*
           * SEMESTER 1
           */

          if (
            submittedResultKeys.has(
              `${subject.id}-SEMESTER1`
            )
          ) {
            const assessments =
              assessmentDefinitions.filter(
                (assessment) =>
                  assessment.subjectId ===
                    subject.id &&
                  assessment.semester ===
                    "SEMESTER1"
              );

            const scores: Record<
              string,
              number | null
            > = {};

            for (const assessment of assessments) {
              const key =
                `${studentId}-` +
                `${subject.id}-SEMESTER1-` +
                `${assessment.type}`;

              scores[
                assessment.type
              ] =
                studentAssessmentMap.has(key)
                  ? studentAssessmentMap.get(
                      key
                    ) ?? null
                  : null;
            }

            semester1 =
              roundResult(
                calculateFinalResult(
                  assessments,
                  scores
                )
              );
          }

          /*
           * SEMESTER 2
           */

          if (
            submittedResultKeys.has(
              `${subject.id}-SEMESTER2`
            )
          ) {
            const assessments =
              assessmentDefinitions.filter(
                (assessment) =>
                  assessment.subjectId ===
                    subject.id &&
                  assessment.semester ===
                    "SEMESTER2"
              );

            const scores: Record<
              string,
              number | null
            > = {};

            for (const assessment of assessments) {
              const key =
                `${studentId}-` +
                `${subject.id}-SEMESTER2-` +
                `${assessment.type}`;

              scores[
                assessment.type
              ] =
                studentAssessmentMap.has(key)
                  ? studentAssessmentMap.get(
                      key
                    ) ?? null
                  : null;
            }

            semester2 =
              roundResult(
                calculateFinalResult(
                  assessments,
                  scores
                )
              );
          }

          /*
           * ANNUAL SUBJECT RESULT
           */

         let annualAverage:
                  | number
                  | null = null;

                if (
                  semester1 !== null &&
                  semester2 !== null
                ) {
                  // Both semesters recorded
                  annualAverage =
                    roundResult(
                      (semester1 +
                        semester2) /
                        2
                    );
                } else if (
                  semester1 !== null
                ) {
                  // Semester 2 not yet recorded:
                  // use Semester 1 as the annual result
                  annualAverage =
                    semester1;
                } else if (
                  semester2 !== null
                ) {
                  // Semester 1 not recorded:
                  // use Semester 2 as the annual result
                  annualAverage =
                    semester2;
                }

          return {
            subjectId: subject.id,
            subjectName:
              subject.name,
            semester1,
            semester2,
            annualAverage,
          };
        }
      );
    };

  /*
   * =====================================================
   * CURRENT STUDENT RESULTS
   * =====================================================
   */

  const subjectResults =
    getStudentSubjectResults(
      student.id
    );

  /*
   * =====================================================
   * CURRENT STUDENT SEMESTER AVERAGES
   * =====================================================
   */

  const semester1Average =
    calculateSemesterAverage(
      subjectResults,
      "SEMESTER1"
    );

  const semester2Average =
    calculateSemesterAverage(
      subjectResults,
      "SEMESTER2"
    );

  const studentAverage =
    calculateAnnualAverage(
      subjectResults
    );

  /*
   * =====================================================
   * CURRENT STUDENT TOTALS
   * =====================================================
   */

  const semester1Total =
    calculateSemesterTotal(
      subjectResults,
      "SEMESTER1"
    );

  const semester2Total =
    calculateSemesterTotal(
      subjectResults,
      "SEMESTER2"
    );

  const annualTotal =
    calculateAnnualTotal(
      subjectResults
    );

  /*
   * =====================================================
   * CLASS RANKING
   * =====================================================
   */

  const semester1RankingData: SemesterRankData[] =
    [];

  const semester2RankingData: SemesterRankData[] =
    [];

  const annualRankingData: SemesterRankData[] =
    [];

  for (
    const enrolledStudentId of enrolledStudentIds
  ) {
    const rankingSubjectResults =
      getStudentSubjectResults(
        enrolledStudentId
      );

    const rankingSemester1Average =
      calculateSemesterAverage(
        rankingSubjectResults,
        "SEMESTER1"
      );

    const rankingSemester2Average =
      calculateSemesterAverage(
        rankingSubjectResults,
        "SEMESTER2"
      );

    const rankingAnnualAverage =
      calculateAnnualAverage(
        rankingSubjectResults
      );

    if (
      rankingSemester1Average !==
      null
    ) {
      semester1RankingData.push({
        studentId:
          enrolledStudentId,
        average:
          rankingSemester1Average,
      });
    }

    if (
      rankingSemester2Average !==
      null
    ) {
      semester2RankingData.push({
        studentId:
          enrolledStudentId,
        average:
          rankingSemester2Average,
      });
    }

    if (
      rankingAnnualAverage !==
      null
    ) {
      annualRankingData.push({
        studentId:
          enrolledStudentId,
        average:
          rankingAnnualAverage,
      });
    }
  }

  const sortRanking = (
    data: SemesterRankData[]
  ) => {
    data.sort(
      (a, b) =>
        b.average - a.average
    );
  };

  sortRanking(
    semester1RankingData
  );

  sortRanking(
    semester2RankingData
  );

  sortRanking(
    annualRankingData
  );

  const getRank = (
    data: SemesterRankData[]
  ) => {
    const index =
      data.findIndex(
        (item) =>
          item.studentId ===
          student.id
      );

    return index >= 0
      ? index + 1
      : null;
  };

  const semester1Rank =
    getRank(
      semester1RankingData
    );

  const semester2Rank =
    getRank(
      semester2RankingData
    );

  const studentRank =
    getRank(
      annualRankingData
    );

  // ----------------------------------------------------------
// ATTENDANCE CALCULATION
// ----------------------------------------------------------
// Rules:
// 1. Only attendance inside the academic year is considered.
// 2. Saturday and Sunday are excluded.
// 3. Multiple records for the same calendar date count once.
// 4. Only present === false counts as an absence.
// 5. Annual absence = Semester 1 + Semester 2.
// ----------------------------------------------------------

    const academicStart = new Date(academicYear.startDate);
    const academicEnd = new Date(academicYear.endDate);

    const midpointTime =
      academicStart.getTime() +
      (academicEnd.getTime() - academicStart.getTime()) / 2;

    const semesterBoundary = new Date(midpointTime);

    const attendanceSummary =
      await calculateStudentSemesterAttendance({
        studentId: student.id,
        classId,
        academicYearId: academicYear.id,
        semesterBoundary,
      });

    const semester1AbsentDays =
      attendanceSummary.semester1.absent;

    const semester2AbsentDays =
      attendanceSummary.semester2.absent;

    const annualAbsentDays =
      attendanceSummary.annual.absent;

    const absentDays = annualAbsentDays;
  /*
   * =====================================================
   * REPORT CARD
   * =====================================================
   */

  await prisma.reportCard.upsert({
    where: {
      studentId_academicYearId: {
        studentId: student.id,
        academicYearId,
      },
    },
    update: {},
    create: {
      studentId: student.id,
      academicYearId,
    },
  });

  const reportCard =
    await prisma.reportCard.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: student.id,
          academicYearId,
        },
      },
      include: {
        promotedGrade: true,
        detainedGrade: true,
        managingDirector: true,
        semesters: {
          include: {
            homeroomTeacher: true,
          },
          orderBy: {
            semester: "asc",
          },
        },
      },
    });

  /*
   * =====================================================
   * BASIC SKILLS
   * =====================================================
   */

  const basicSkills =
    reportCard
      ? await prisma.reportCardBasicSkill.findMany({
          where: {
            reportCardId:
              reportCard.id,
          },
        })
      : [];

  const semester1Report =
    reportCard?.semesters.find(
      (item) =>
        item.semester ===
        "SEMESTER1"
    );

  const semester2Report =
    reportCard?.semesters.find(
      (item) =>
        item.semester ===
        "SEMESTER2"
    );

  /*
   * =====================================================
   * ANNUAL CONDUCT
   * =====================================================
   */

  const semester1Conduct =
    semester1Report?.conduct ??
    "Not recorded";

  const semester2Conduct =
    semester2Report?.conduct ??
    "Not recorded";

  let annualConduct =
    "Not recorded";

  if (
    semester1Report?.conduct &&
    semester2Report?.conduct
  ) {
    if (
      semester1Report.conduct ===
      semester2Report.conduct
    ) {
      annualConduct =
        semester1Report.conduct;
    } else {
      annualConduct =
        `${semester1Report.conduct} / ${semester2Report.conduct}`;
    }
  } else if (
    semester1Report?.conduct
  ) {
    annualConduct =
      semester1Report.conduct;
  } else if (
    semester2Report?.conduct
  ) {
    annualConduct =
      semester2Report.conduct;
  }

  const semester1Skills =
    basicSkills.find(
      (item) =>
        item.semester ===
        "SEMESTER1"
    );

  const semester2Skills =
    basicSkills.find(
      (item) =>
        item.semester ===
        "SEMESTER2"
    );

  /*
   * =====================================================
   * AUTOMATIC PARENT NAME
   * =====================================================
   */

  const parentDisplayName =
    formatParentName(
      student.parent
        ? {
            name:
              student.parent.name,
            middleName:
              student.parent.middleName,
            surname:
              student.parent.surname,
          }
        : null
    );

  /*
   * =====================================================
   * SEMESTER HOMEROOM TEACHERS
   * =====================================================
   */

  const currentHomeRoomTeacher =
    enrollment.class.homeRoomTeacherId
      ? await prisma.teacher.findUnique({
          where: {
            id:
              enrollment.class
                .homeRoomTeacherId,
          },
          select: {
            id: true,
            name: true,
            middleName: true,
            surname: true,
          },
        })
      : null;

  const semester1TeacherName =
    semester1Report
      ?.homeroomTeacherName ??
    formatTeacherName(
      semester1Report?.homeroomTeacher ??
        currentHomeRoomTeacher
    );

  const semester2TeacherName =
    semester2Report
      ?.homeroomTeacherName ??
    formatTeacherName(
      semester2Report?.homeroomTeacher ??
        currentHomeRoomTeacher
    );

  /*
   * =====================================================
   * MANAGING DIRECTOR
   * =====================================================
   */

  const managingDirector =
    reportCard?.managingDirector ??
    (await prisma.admin.findFirst({
      where: {
        isManagingDirector: true,
      },
      select: {
        id: true,
        name: true,
        middleName: true,
        surname: true,
      },
    }));

  const managingDirectorDisplayName =
    reportCard?.managingDirectorName ??
    (managingDirector
      ? `${managingDirector.name} ${
          managingDirector.middleName ??
          ""
        } ${
          managingDirector.surname ??
          ""
        }`
          .replace(/\s+/g, " ")
          .trim()
      : "Not recorded");

  /*
   * =====================================================
   * PROMOTION / DETENTION
   * =====================================================
   */

  const promotionPolicy =
    await prisma.promotionPolicy.findUnique({
      where: {
        academicYearId_section: {
          academicYearId,
          section: gradeSection,
        },
      },
    });

  const currentGrade =
    enrollment.class.grade;

  const nextGrade =
    await prisma.grade.findUnique({
      where: {
        level:
          currentGrade.level + 1,
      },
      select: {
        id: true,
        name: true,
        level: true,
      },
    });

  let promotionText =
    "Decision not yet determined";

  let automaticallyPromoted =
    false;

  let automaticallyDetained =
    false;

  if (
    studentAverage !== null &&
    promotionPolicy
  ) {
    if (
      studentAverage >=
      promotionPolicy.promotionMinimumAverage
    ) {
      if (nextGrade) {
        promotionText =
          `Promoted to ${nextGrade.name}`;

        automaticallyPromoted =
          true;
      } else {
        promotionText =
          "Completed the highest grade";
      }
    } else if (
      studentAverage <=
      promotionPolicy.detentionMaximumAverage
    ) {
      promotionText =
        `Detained in ${currentGrade.name}`;

      automaticallyDetained =
        true;
    }
  }

  if (
    !automaticallyPromoted &&
    !automaticallyDetained &&
    (!promotionPolicy ||
      studentAverage === null)
  ) {
    if (reportCard?.promotedGrade) {
      promotionText =
        `Promoted to ${reportCard.promotedGrade.name}`;
    } else if (
      reportCard?.detainedGrade
    ) {
      promotionText =
        `Detained in ${reportCard.detainedGrade.name}`;
    }
  }

  /*
   * =====================================================
   * STUDENT NAME
   * =====================================================
   */

  const studentFullName =
    `${student.name} ${
      student.middleName ?? ""
    } ${student.surname ?? ""}`
      .replace(/\s+/g, " ")
      .trim();

  /*
   * =====================================================
   * BASIC SKILL DEFINITIONS
   * =====================================================
   */

  const basicSkillRows = [
    ["Reading", "reading"],
    ["Writing", "writing"],
    ["Spelling", "spelling"],
    ["Comprehension", "comprehension"],
    ["Computation", "computation"],
    ["Punctuality", "punctuality"],
    ["Uniform", "uniform"],
    ["Material Handling", "materialHandling"],
    ["Direction", "direction"],
    ["Completion", "completion"],
    ["English Use", "englishUse"],
    ["Work Ethics", "workEthics"],
    ["Skills", "skills"],
    ["Overall Progress", "overallProgress"],
  ] as const;

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="report-card-screen min-h-screen bg-gray-100 p-4 md:p-8 print:bg-white print:p-0">

      {/* SCREEN CONTROLS */}

      <div className="mx-auto mb-6 flex max-w-[1100px] justify-end gap-3 print:hidden">

        <PrintButton />

        {reportCard && (
          <FormContainer
            table="reportCard"
            type="update"
            data={{
              reportCard,
              student,
              enrollment,
              academicYear,
              semesters:
                reportCard.semesters,
              basicSkills,
              subjectResults,
              studentAverage,
              studentRank,
              classSize,

              /*
               * Attendance values
               *
               * Annual value retained for compatibility.
               * Semester values are also provided explicitly.
               */
              absentDays,
              semester1AbsentDays,
              semester2AbsentDays,
              annualAbsentDays,

              currentGrade,
              nextGrade,
              promotionStatus:
                promotionText,
              parentDisplayName,
              semester1TeacherName,
              semester2TeacherName,
              managingDirectorDisplayName,
              role,
            }}
          />
        )}

      </div>

      <div className="report-print-root">

        {/* =====================================================
            PRINT SHEET 1
            PAGE 1 + PAGE 4
            ===================================================== */}

        <div className="report-sheet">

          {/* =================================================
              PAGE 1
              ================================================= */}

          <section className="report-page report-page-1 bg-white">

            <div className="report-page-inner">

              <h1 className="text-center text-2xl font-bold">
                Student Report Card
              </h1>

              <div className="mt-5 flex items-center justify-center gap-5 border-b pb-5">

                <div className="flex-shrink-0">
                  <img
                    src="/badirLogo.png"
                    alt="Bedir Academy Logo"
                    className="h-24 w-24 object-contain"
                  />
                </div>

                <div className="text-center">

                  <p className="text-lg font-bold">
                    Akkaadaamii Badir
                  </p>

                  <p className="text-lg font-bold">
                    በድር አካዳሚ
                  </p>

                  <p className="text-lg font-bold">
                    Bedir Academy
                  </p>

                  <p className="mt-2 text-sm italic text-gray-600">
                    We Unlock the Potential!
                  </p>

                </div>

              </div>

              <div className="mt-6 rounded-md border p-5">

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">

                  <div>
                    <p className="text-[10px] text-gray-500">
                      Academic Year
                    </p>

                    <p className="font-semibold">
                      {academicYear.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-500">
                      Student ID
                    </p>

                    <p className="font-semibold">
                      {student.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-500">
                      Student Name
                    </p>

                    <p className="font-semibold">
                      {studentFullName}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-500">
                      Grade
                    </p>

                    <p className="font-semibold">
                      {enrollment.class.grade.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-500">
                      Class / Section
                    </p>

                    <p className="font-semibold">
                      {enrollment.class.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-500">
                      Roll Number
                    </p>

                    <p className="font-semibold">
                      {enrollment.rollNumber}
                    </p>
                  </div>

                </div>

              </div>

              <div className="mt-4 rounded-md border p-4">

                <p className="text-[10px] text-gray-500">
                  Parent / Guardian
                </p>

                <p className="mt-1 font-semibold">
                  {parentDisplayName}
                </p>

              </div>

              <div className="mt-auto grid grid-cols-2 gap-3 border-t pt-4 text-center text-[10px] text-gray-600">

                <p>
                  Primary Division: 0966555550
                </p>

                <p>
                  Kindergarten Division: 01184403778
                </p>

                <p>
                  Head Office: 0903999903
                </p>

                <p>
                  High School Division: 01184403778
                </p>

              </div>

            </div>

          </section>

          {/* =================================================
              PAGE 4
              ================================================= */}

          <section className="report-page report-page-4 bg-white">

            <div className="report-page-inner">

              <h2 className="text-center text-lg font-bold">
                BASIC SKILLS EVALUATION
              </h2>

              <p className="mt-1 text-center text-[10px] text-gray-500">
                Academic Year: {academicYear.name}
              </p>

              <div className="mt-5 overflow-hidden rounded-md border">

                <table className="w-full border-collapse text-[10px]">

                  <thead>
                    <tr className="bg-gray-100">

                      <th className="border p-2 text-left">
                        Skill
                      </th>

                      <th className="border p-2 text-center">
                        First Semester
                      </th>

                      <th className="border p-2 text-center">
                        Second Semester
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {basicSkillRows.map(
                      ([label, key]) => (
                        <tr key={key}>

                          <td className="border p-2 font-medium">
                            {label}
                          </td>

                          <td className="border p-2 text-center font-semibold">
                            {semester1Skills?.[
                              key as keyof typeof semester1Skills
                            ]?.toString() ??
                              "—"}
                          </td>

                          <td className="border p-2 text-center font-semibold">
                            {semester2Skills?.[
                              key as keyof typeof semester2Skills
                            ]?.toString() ??
                              "—"}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

              <div className="mt-4 rounded-md border p-3">

                <h3 className="text-center text-sm font-bold">
                  Evaluation Key
                </h3>

                <table className="mt-3 w-full border-collapse text-[9px]">

                  <thead>
                    <tr className="bg-gray-100">

                      <th className="border p-2 text-center">
                        Performance
                      </th>

                      <th className="border p-2 text-center">
                        Grade
                      </th>

                      <th className="border p-2 text-center">
                        Percentage
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    <tr>
                      <td className="border p-2 text-center font-medium">
                        Excellent
                      </td>

                      <td className="border p-2 text-center font-bold">
                        A
                      </td>

                      <td className="border p-2 text-center">
                        90 - 100
                      </td>
                    </tr>

                    <tr>
                      <td className="border p-2 text-center font-medium">
                        Very Good
                      </td>

                      <td className="border p-2 text-center font-bold">
                        B
                      </td>

                      <td className="border p-2 text-center">
                        80 - 89
                      </td>
                    </tr>

                    <tr>
                      <td className="border p-2 text-center font-medium">
                        Average
                      </td>

                      <td className="border p-2 text-center font-bold">
                        C
                      </td>

                      <td className="border p-2 text-center">
                        76 - 79
                      </td>
                    </tr>

                    <tr>
                      <td className="border p-2 text-center font-medium">
                        Poor
                      </td>

                      <td className="border p-2 text-center font-bold">
                        D
                      </td>

                      <td className="border p-2 text-center">
                        50 - 75
                      </td>
                    </tr>

                    <tr>
                      <td className="border p-2 text-center font-medium">
                        Fail
                      </td>

                      <td className="border p-2 text-center font-bold">
                        E
                      </td>

                      <td className="border p-2 text-center">
                        &lt; 50
                      </td>
                    </tr>

                  </tbody>

                </table>

              </div>

              <div className="mt-auto grid grid-cols-2 gap-10 pt-5">

                <div className="text-center">
                  <div className="mx-auto w-40 border-b border-gray-500" />

                  <p className="mt-1 text-[10px]">
                    Homeroom Teacher
                  </p>
                </div>

                <div className="text-center">
                  <div className="mx-auto w-40 border-b border-gray-500" />

                  <p className="mt-1 text-[10px]">
                    Managing Director
                  </p>
                </div>

              </div>

            </div>

          </section>

        </div>

        {/* =====================================================
            PRINT SHEET 2
            PAGE 2 + PAGE 3
            ===================================================== */}

        <div className="report-sheet">

          {/* =================================================
              PAGE 2
              ACADEMIC RESULTS
              ================================================= */}

          <section className="report-page report-page-2 bg-white">

            <div className="report-page-inner">

              <h2 className="text-center text-lg font-bold">
                STUDENT ACADEMIC REPORT
              </h2>

              <div className="mt-4 grid grid-cols-4 gap-3 rounded-md border p-3 text-[10px]">

                <div>
                  <p className="text-gray-500">
                    Student ID
                  </p>

                  <p className="font-semibold">
                    {student.id}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Student Name
                  </p>

                  <p className="font-semibold">
                    {studentFullName}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Age / Sex
                  </p>

                  <p className="font-semibold">
                    {getAge(student.birthday)}
                    {" / "}
                    {student.sex}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Grade / Section
                  </p>

                  <p className="font-semibold">
                    {enrollment.class.grade.name}
                    {" / "}
                    {enrollment.class.name}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Roll Number
                  </p>

                  <p className="font-semibold">
                    {enrollment.rollNumber}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Academic Year
                  </p>

                  <p className="font-semibold">
                    {academicYear.name}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">
                    Subjects
                  </p>

                  <p className="font-semibold">
                    {subjectResults.length}
                  </p>
                </div>

              </div>

              {/* =================================================
                  COMPLETE ACADEMIC TABLE
                  ================================================= */}

              <div className="mt-4 overflow-hidden rounded-md border">

                <table className="w-full border-collapse text-[8px]">

                  <thead>

                    <tr className="bg-gray-100">

                      <th
                        rowSpan={2}
                        className="w-[7%] border p-1.5 text-center"
                      >
                        No.
                      </th>

                      <th
                        rowSpan={2}
                        className="w-[33%] border p-1.5 text-left"
                      >
                        Subject
                      </th>

                      <th
                        colSpan={3}
                        className="border p-1.5 text-center"
                      >
                        Result
                      </th>

                    </tr>

                    <tr className="bg-gray-50">

                      <th className="border p-1.5 text-center">
                        Semester 1
                      </th>

                      <th className="border p-1.5 text-center">
                        Semester 2
                      </th>

                      <th className="border p-1.5 text-center">
                        Annual
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {/* SUBJECT ROWS */}

                    {subjectResults.map(
                      (subject, index) => (
                        <tr
                          key={
                            subject.subjectId
                          }
                        >

                          <td className="border p-1.5 text-center">
                            {index + 1}
                          </td>

                          <td className="border p-1.5 font-medium">
                            {subject.subjectName}
                          </td>

                          <td className="border p-1.5 text-center">
                            {subject.semester1 !==
                            null
                              ? subject.semester1.toFixed(
                                  2
                                )
                              : "—"}
                          </td>

                          <td className="border p-1.5 text-center">
                            {subject.semester2 !==
                            null
                              ? subject.semester2.toFixed(
                                  2
                                )
                              : "—"}
                          </td>

                          <td className="border p-1.5 text-center">
                            {subject.annualAverage !==
                            null
                              ? subject.annualAverage.toFixed(
                                  2
                                )
                              : "—"}
                          </td>

                        </tr>
                      )
                    )}

                    {subjectResults.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="border p-1.5 text-center text-gray-500"
                        >
                          No subjects are
                          configured for this
                          grade section.
                        </td>
                      </tr>
                    )}

                    {/* TOTAL */}

                    <tr>

                      <td
                        colSpan={2}
                        className="border p-1.5 text-left font-medium"
                      >
                        Total
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester1Total !==
                        null
                          ? semester1Total.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester2Total !==
                        null
                          ? semester2Total.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                      <td className="border p-1.5 text-center">
                        {annualTotal !==
                        null
                          ? annualTotal.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                    </tr>

                    {/* AVERAGE */}

                    <tr>

                      <td
                        colSpan={2}
                        className="border p-1.5 text-left font-medium"
                      >
                        Average
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester1Average !==
                        null
                          ? semester1Average.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester2Average !==
                        null
                          ? semester2Average.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                      <td className="border p-1.5 text-center">
                        {studentAverage !==
                        null
                          ? studentAverage.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                    </tr>

                    {/* CLASS RANK */}

                    <tr>

                      <td
                        colSpan={2}
                        className="border p-1.5 text-left font-medium"
                      >
                        Class Rank
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester1Rank ??
                          "—"}
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester2Rank ??
                          "—"}
                      </td>

                      <td className="border p-1.5 text-center">
                        {studentRank ??
                          "—"}
                      </td>

                    </tr>

                    {/* NUMBER OF STUDENTS */}

                    <tr>

                      <td
                        colSpan={2}
                        className="border p-1.5 text-left font-medium"
                      >
                        No. of Students
                      </td>

                      <td className="border p-1.5 text-center">
                        {classSize}
                      </td>

                      <td className="border p-1.5 text-center">
                        {classSize}
                      </td>

                      <td className="border p-1.5 text-center">
                        {classSize}
                      </td>

                    </tr>

                    {/* CONDUCT */}

                    <tr>

                      <td
                        colSpan={2}
                        className="border p-1.5 text-left font-medium"
                      >
                        Conduct
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester1Conduct}
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester2Conduct}
                      </td>

                      <td className="border p-1.5 text-center">
                        {annualConduct}
                      </td>

                    </tr>

                    {/* ABSENCE */}

                    <tr>

                      <td
                        colSpan={2}
                        className="border p-1.5 text-left font-medium"
                      >
                        Absence
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester1AbsentDays}
                      </td>

                      <td className="border p-1.5 text-center">
                        {semester2AbsentDays}
                      </td>

                      <td className="border p-1.5 text-center">
                        {annualAbsentDays}
                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

            </div>

          </section>

          {/* =================================================
              PAGE 3
              ================================================= */}

          <section className="report-page report-page-3 bg-white">

            <div className="report-page-inner">

              <h2 className="text-center text-lg font-bold">
                COMMENTS AND PROMOTION
              </h2>

              {/* SEMESTER 1 */}

              <div className="mt-4 rounded-md border p-4">

                <h3 className="font-bold text-sm">
                  First Semester
                </h3>

                <div className="mt-2 min-h-[55px] whitespace-pre-wrap border-b pb-2 text-[10px]">
                  {semester1Report?.comment ||
                    "No comment recorded."}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 text-[10px]">

                  <div>

                    <p className="text-gray-500">
                      Homeroom Teacher
                    </p>

                    <p className="mt-1 font-medium">
                      {semester1TeacherName}
                    </p>

                    <div className="mt-2 h-8">

                      {semester1Report?.homeroomTeacherSignature ? (
                        <img
                          src={
                            semester1Report.homeroomTeacherSignature
                          }
                          alt="Semester 1 teacher signature"
                          className="h-8 max-w-[120px] object-contain"
                        />
                      ) : (
                        <div className="mt-5 w-32 border-b border-gray-500" />
                      )}

                    </div>

                    <p className="mt-1 text-[9px] text-gray-500">
                      Teacher Signature
                    </p>

                  </div>

                  <div>

                    <p className="text-gray-500">
                      Parent Name
                    </p>

                    <p className="mt-1 font-medium">
                      {parentDisplayName}
                    </p>

                    <div className="mt-7 w-32 border-b border-gray-500" />

                    <p className="mt-1 text-[9px] text-gray-500">
                      Parent Signature
                    </p>

                  </div>

                </div>

              </div>

              {/* SEMESTER 2 */}

              <div className="mt-4 rounded-md border p-4">

                <h3 className="font-bold text-sm">
                  Second Semester
                </h3>

                <div className="mt-2 min-h-[55px] whitespace-pre-wrap border-b pb-2 text-[10px]">
                  {semester2Report?.comment ||
                    "No comment recorded."}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 text-[10px]">

                  <div>

                    <p className="text-gray-500">
                      Homeroom Teacher
                    </p>

                    <p className="mt-1 font-medium">
                      {semester2TeacherName}
                    </p>

                    <div className="mt-2 h-8">

                      {semester2Report?.homeroomTeacherSignature ? (
                        <img
                          src={
                            semester2Report.homeroomTeacherSignature
                          }
                          alt="Semester 2 teacher signature"
                          className="h-8 max-w-[120px] object-contain"
                        />
                      ) : (
                        <div className="mt-5 w-32 border-b border-gray-500" />
                      )}

                    </div>

                    <p className="mt-1 text-[9px] text-gray-500">
                      Teacher Signature
                    </p>

                  </div>

                  <div>

                    <p className="text-gray-500">
                      Parent Name
                    </p>

                    <p className="mt-1 font-medium">
                      {parentDisplayName}
                    </p>

                    <div className="mt-7 w-32 border-b border-gray-500" />

                    <p className="mt-1 text-[9px] text-gray-500">
                      Parent Signature
                    </p>

                  </div>

                </div>

              </div>

              {/* PROMOTION */}

              <div className="mt-4 rounded-md border-2 p-4 text-center">

                <h3 className="text-sm font-bold">
                  Promotion / Detention
                </h3>

                <p className="mt-2 text-base font-semibold">
                  {promotionText}
                </p>

                {promotionPolicy &&
                  studentAverage !==
                    null && (
                    <p className="mt-2 text-[9px] text-gray-500">
                      Based on annual average:
                      {" "}
                      {studentAverage.toFixed(
                        2
                      )}
                    </p>
                  )}

              </div>

              {/* MANAGING DIRECTOR */}

              <div className="mt-4 rounded-md border p-4">

                <h3 className="text-center text-sm font-bold">
                  Managing Director
                </h3>

                <div className="mt-3 grid grid-cols-3 gap-4 text-[10px]">

                  <div>

                    <p className="text-gray-500">
                      Name
                    </p>

                    <p className="mt-1 font-medium">
                      {managingDirectorDisplayName}
                    </p>

                  </div>

                  <div>

                    <p className="text-gray-500">
                      Signature
                    </p>

                    <div className="mt-1 h-9">

                      {reportCard?.managingDirectorSignature ? (
                        <img
                          src={
                            reportCard.managingDirectorSignature
                          }
                          alt="Managing Director signature"
                          className="h-8 max-w-[120px] object-contain"
                        />
                      ) : (
                        <div className="mt-5 w-32 border-b border-gray-500" />
                      )}

                    </div>

                  </div>

                  <div>

                    <p className="text-gray-500">
                      Date
                    </p>

                    <p className="mt-1 font-medium">
                      {reportCard?.managingDirectorDate
                        ? reportCard.managingDirectorDate.toLocaleDateString(
                            "en-GB"
                          )
                        : new Date().toLocaleDateString(
                            "en-GB"
                          )}
                    </p>

                  </div>

                </div>

              </div>

              <div className="mt-auto border-t pt-3 text-center text-[8px] text-gray-500">
                Student Report Card —{" "}
                {academicYear.name}
              </div>

            </div>

          </section>

        </div>

      </div>

      {/* =====================================================
          SCREEN + PRINT STYLES
          ===================================================== */}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .report-print-root {
              width: 100%;
              max-width: 1100px;
              margin: 0 auto;
            }

            .report-sheet {
              width: 100%;
              max-width: 1100px;
              margin: 0 auto 32px auto;
              display: flex;
              flex-direction: column;
              gap: 32px;
              box-sizing: border-box;
            }

            .report-page {
              width: 100%;
              min-height: 720px;
              background: white;
              border: 1px solid #e5e7eb;
              box-shadow: 0 1px 4px rgba(0,0,0,0.08);
              overflow: hidden;
              box-sizing: border-box;
            }

            .report-page-inner {
              width: 100%;
              min-height: 720px;
              padding: 32px;
              display: flex;
              flex-direction: column;
              box-sizing: border-box;
            }

            @media print {

              @page {
                size: A4 landscape;
                margin: 0;
              }

              html,
              body {
                width: 297mm !important;
                min-width: 297mm !important;
                max-width: 297mm !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                background: white !important;
              }

              .report-print-root {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 297mm !important;
                min-width: 297mm !important;
                max-width: 297mm !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
                background: white !important;
                visibility: visible !important;
                z-index: 2147483647 !important;
              }

              .report-print-root * {
                visibility: visible !important;
              }

              .report-sheet {
                display: grid !important;
                grid-template-columns: 148.5mm 148.5mm !important;
                grid-template-rows: 210mm !important;

                width: 297mm !important;
                min-width: 297mm !important;
                max-width: 297mm !important;

                height: 210mm !important;
                min-height: 210mm !important;
                max-height: 210mm !important;

                margin: 0 !important;
                padding: 0 !important;

                overflow: hidden !important;

                break-after: page !important;
                page-break-after: always !important;

                box-sizing: border-box !important;
              }

              .report-sheet:last-child {
                break-after: auto !important;
                page-break-after: auto !important;
              }

              .report-page {
                display: block !important;

                width: 148.5mm !important;
                min-width: 148.5mm !important;
                max-width: 148.5mm !important;

                height: 210mm !important;
                min-height: 210mm !important;
                max-height: 210mm !important;

                margin: 0 !important;
                padding: 0 !important;

                overflow: hidden !important;

                box-sizing: border-box !important;

                break-inside: avoid !important;
                page-break-inside: avoid !important;

                background: white !important;
              }

              .report-page-inner {
                display: block !important;

                width: 148.5mm !important;
                min-width: 148.5mm !important;
                max-width: 148.5mm !important;

                height: 210mm !important;
                min-height: 210mm !important;
                max-height: 210mm !important;

                margin: 0 !important;
                padding: 7mm !important;

                box-sizing: border-box !important;

                overflow: hidden !important;
              }

              .report-page table {
                width: 100% !important;
                max-width: 100% !important;
                table-layout: fixed !important;
                box-sizing: border-box !important;
                border-collapse: collapse !important;
              }

              .report-page th,
              .report-page td {
                box-sizing: border-box !important;
                max-width: 100% !important;
                overflow: hidden !important;
                word-wrap: break-word !important;
                overflow-wrap: anywhere !important;
              }

              .report-page img {
                max-width: 100% !important;
                height: auto !important;
              }

              .report-print-root .print\\:hidden {
                display: none !important;
              }

              .report-print-root,
              .report-print-root > *,
              .report-sheet,
              .report-page,
              .report-page-inner {
                overflow-x: hidden !important;
              }

              header,
              nav,
              aside,
              footer {
                display: none !important;
              }
            }
          `,
        }}
      />

    </div>
  );
};

export default StudentReportCardPage;