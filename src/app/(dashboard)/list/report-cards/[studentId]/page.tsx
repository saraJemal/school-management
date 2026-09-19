import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  calculateFinalResult,
  roundResult,
} from "@/lib/resultCalculation";
import PrintButton from "@/components/PrintButton";

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

type StudentRankData = {
  studentId: string;
  average: number;
};

const calculateStudentAverage = (
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

const getAge = (
  birthday: Date
) => {
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

const formatDate = (
  date: Date
) => {
  return date.toLocaleDateString(
    "en-GB"
  );
};

const getSemesterLabel = (
  semester: "SEMESTER1" | "SEMESTER2"
) => {
  return semester === "SEMESTER1"
    ? "Semester 1"
    : "Semester 2";
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
   * PAGE-LEVEL AUTHORIZATION
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
   *
   * The report card uses StudentEnrollment as the
   * source of truth for the student's class, grade,
   * academic year and roll number.
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

  const academicYear =
    enrollment.academicYear;

  /*
   * =====================================================
   * TEACHER AUTHORIZATION
   * =====================================================
   *
   * A teacher may view the report card if they teach
   * at least one subject in this student's class.
   *
   * IMPORTANT:
   * This uses Lesson.teacherId, not
   * homeRoomTeacherId.
   */

  if (role === "teacher") {
    const teacher =
      await prisma.teacher.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

    if (!teacher) {
      redirect("/unauthorized");
    }

    const assignedLesson =
      await prisma.lesson.findFirst({
        where: {
          classId,
          teacherId: teacher.id,
        },
        select: {
          id: true,
        },
      });

    if (!assignedLesson) {
      redirect("/unauthorized");
    }
  }

  /*
   * =====================================================
   * RESULT SUBMISSIONS
   * =====================================================
   *
   * Only SUBMITTED results are displayed on the
   * official report card.
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
   * SUBJECTS
   * =====================================================
   *
   * A class does not have a direct Subject relation.
   * Subjects are therefore obtained from Lessons.
   */

  const lessons =
    await prisma.lesson.findMany({
      where: {
        classId,
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
      distinct: ["subjectId"],
      orderBy: {
        subject: {
          name: "asc",
        },
      },
    });

  const subjects = lessons.map(
    (lesson) => lesson.subject
  );

  /*
   * =====================================================
   * ALL ENROLLED STUDENTS
   * =====================================================
   *
   * Used for class size and ranking.
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

  /*
   * =====================================================
   * BUILD SUBJECT RESULTS
   * =====================================================
   */

  const subjectResults: SubjectSemesterResult[] =
    [];

  for (const subject of subjects) {
    let semester1: number | null =
      null;

    let semester2: number | null =
      null;

    /*
     * ---------------------------------------------------
     * SEMESTER 1
     * ---------------------------------------------------
     */

    if (
      submittedResultKeys.has(
        `${subject.id}-SEMESTER1`
      )
    ) {
      const assessments =
        await prisma.assessment.findMany({
          where: {
            academicYearId,
            gradeId,
            subjectId: subject.id,
            semester: "SEMESTER1",
          },
          select: {
            type: true,
            category: true,
            maxScore: true,
            weight: true,
          },
        });

      const studentAssessments =
        await prisma.studentAssessment.findMany(
          {
            where: {
              studentId: student.id,
              assessment: {
                academicYearId,
                gradeId,
                subjectId: subject.id,
                semester: "SEMESTER1",
              },
            },
            select: {
              score: true,
              assessment: {
                select: {
                  type: true,
                },
              },
            },
          }
        );

      const scores: Record<
        string,
        number | null
      > = {};

      for (
        const assessment
        of assessments
      ) {
        scores[
          assessment.type
        ] = null;
      }

      for (
        const result
        of studentAssessments
      ) {
        scores[
          result.assessment.type
        ] = result.score;
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
     * ---------------------------------------------------
     * SEMESTER 2
     * ---------------------------------------------------
     */

    if (
      submittedResultKeys.has(
        `${subject.id}-SEMESTER2`
      )
    ) {
      const assessments =
        await prisma.assessment.findMany({
          where: {
            academicYearId,
            gradeId,
            subjectId: subject.id,
            semester: "SEMESTER2",
          },
          select: {
            type: true,
            category: true,
            maxScore: true,
            weight: true,
          },
        });

      const studentAssessments =
        await prisma.studentAssessment.findMany(
          {
            where: {
              studentId: student.id,
              assessment: {
                academicYearId,
                gradeId,
                subjectId: subject.id,
                semester: "SEMESTER2",
              },
            },
            select: {
              score: true,
              assessment: {
                select: {
                  type: true,
                },
              },
            },
          }
        );

      const scores: Record<
        string,
        number | null
      > = {};

      for (
        const assessment
        of assessments
      ) {
        scores[
          assessment.type
        ] = null;
      }

      for (
        const result
        of studentAssessments
      ) {
        scores[
          result.assessment.type
        ] = result.score;
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
     * ---------------------------------------------------
     * ANNUAL SUBJECT AVERAGE
     * ---------------------------------------------------
     */

    let annualAverage:
      | number
      | null = null;

    if (
      semester1 !== null &&
      semester2 !== null
    ) {
      annualAverage =
        roundResult(
          (semester1 +
            semester2) /
            2
        );
    } else if (
      semester1 !== null
    ) {
      annualAverage =
        semester1;
    } else if (
      semester2 !== null
    ) {
      annualAverage =
        semester2;
    }

    subjectResults.push({
      subjectId: subject.id,
      subjectName:
        subject.name,
      semester1,
      semester2,
      annualAverage,
    });
  }

  /*
   * =====================================================
   * REPORT CARD
   * =====================================================
   */

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
        basicSkills: true,
      },
    });

  /*
   * =====================================================
   * STUDENT AVERAGE
   * =====================================================
   */

  const studentAverage =
    calculateStudentAverage(
      subjectResults
    );

  /*
   * =====================================================
   * CLASS RANKING
   * =====================================================
   *
   * The same resultCalculation utility is used for
   * every student in the class.
   */

  const rankingData: StudentRankData[] =
    [];

  for (
    const enrolledStudentId of enrolledStudentIds
  ) {
    const rankingSubjectResults: SubjectSemesterResult[] =
      [];

    for (const subject of subjects) {
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
          await prisma.assessment.findMany({
            where: {
              academicYearId,
              gradeId,
              subjectId: subject.id,
              semester: "SEMESTER1",
            },
            select: {
              type: true,
              category: true,
              maxScore: true,
              weight: true,
            },
          });

        const results =
          await prisma.studentAssessment.findMany(
            {
              where: {
                studentId:
                  enrolledStudentId,
                assessment: {
                  academicYearId,
                  gradeId,
                  subjectId:
                    subject.id,
                  semester:
                    "SEMESTER1",
                },
              },
              select: {
                score: true,
                assessment: {
                  select: {
                    type: true,
                  },
                },
              },
            }
          );

        const scores: Record<
          string,
          number | null
        > = {};

        for (
          const assessment
          of assessments
        ) {
          scores[
            assessment.type
          ] = null;
        }

        for (
          const result of results
        ) {
          scores[
            result.assessment.type
          ] = result.score;
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
          await prisma.assessment.findMany({
            where: {
              academicYearId,
              gradeId,
              subjectId: subject.id,
              semester: "SEMESTER2",
            },
            select: {
              type: true,
              category: true,
              maxScore: true,
              weight: true,
            },
          });

        const results =
          await prisma.studentAssessment.findMany(
            {
              where: {
                studentId:
                  enrolledStudentId,
                assessment: {
                  academicYearId,
                  gradeId,
                  subjectId:
                    subject.id,
                  semester:
                    "SEMESTER2",
                },
              },
              select: {
                score: true,
                assessment: {
                  select: {
                    type: true,
                  },
                },
              },
            }
          );

        const scores: Record<
          string,
          number | null
        > = {};

        for (
          const assessment
          of assessments
        ) {
          scores[
            assessment.type
          ] = null;
        }

        for (
          const result of results
        ) {
          scores[
            result.assessment.type
          ] = result.score;
        }

        semester2 =
          roundResult(
            calculateFinalResult(
              assessments,
              scores
            )
          );
      }

      let annualAverage:
        | number
        | null = null;

      if (
        semester1 !== null &&
        semester2 !== null
      ) {
        annualAverage =
          roundResult(
            (semester1 +
              semester2) /
              2
          );
      } else if (
        semester1 !== null
      ) {
        annualAverage =
          semester1;
      } else if (
        semester2 !== null
      ) {
        annualAverage =
          semester2;
      }

      rankingSubjectResults.push({
        subjectId: subject.id,
        subjectName:
          subject.name,
        semester1,
        semester2,
        annualAverage,
      });
    }

    const average =
      calculateStudentAverage(
        rankingSubjectResults
      );

    if (average !== null) {
      rankingData.push({
        studentId:
          enrolledStudentId,
        average,
      });
    }
  }

  /*
   * Rank is based on average, descending.
   *
   * Students with equal averages receive the
   * same rank.
   */

  rankingData.sort(
    (a, b) =>
      b.average - a.average
  );

  const studentRankIndex =
    rankingData.findIndex(
      (item) =>
        item.studentId ===
        student.id
    );

  let studentRank:
    | number
    | null = null;

  if (
    studentRankIndex >= 0
  ) {
    studentRank =
      studentRankIndex + 1;
  }

  const classSize =
    classEnrollments.length;

  /*
   * =====================================================
   * ATTENDANCE
   * =====================================================
   *
   * Attendance has no academicYearId.
   * Therefore the academic year's date range is used.
   */

  const attendance =
    await prisma.attendance.findMany({
      where: {
        studentId: student.id,
        classId,
        date: {
          gte: academicYear.startDate,
          lte: academicYear.endDate,
        },
      },
      select: {
        present: true,
      },
    });

  const presentDays =
    attendance.filter(
      (item) => item.present
    ).length;

  const absentDays =
    attendance.filter(
      (item) => !item.present
    ).length;

  const recordedDays =
    attendance.length;

  const attendancePercentage =
    recordedDays > 0
      ? roundResult(
          (presentDays /
            recordedDays) *
            100
        )
      : 0;

  /*
   * =====================================================
   * BASIC SKILLS
   * =====================================================
   */

  const semester1Skills =
    reportCard?.basicSkills.find(
      (item) =>
        item.semester ===
        "SEMESTER1"
    );

  const semester2Skills =
    reportCard?.basicSkills.find(
      (item) =>
        item.semester ===
        "SEMESTER2"
    );

  /*
   * =====================================================
   * PROMOTION / DETENTION
   * =====================================================
   */

  const promotionText =
    reportCard?.promotedGrade
      ? `Promoted to ${reportCard.promotedGrade.name}`
      : reportCard?.detainedGrade
      ? `Detained in ${reportCard.detainedGrade.name}`
      : "Not yet recorded";

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">

      {/* PRINT BUTTON */}

      <div className="mx-auto mb-6 max-w-[1100px] flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[1100px]">

        {/* =================================================
            PAGE 1
            SCHOOL INFORMATION
            ================================================= */}

        <section className="report-page bg-white min-h-[1000px] p-8 md:p-12">

          <div className="flex min-h-[900px] flex-col">

            {/* SCHOOL LOGO */}

            <div className="flex justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-gray-300 text-center text-xs text-gray-400">
                School Logo
              </div>
            </div>

            <div className="mt-8 text-center">

              <h1 className="text-2xl font-bold uppercase">
                School Information
                Management System
              </h1>

              <p className="mt-2 text-xl font-semibold">
                [School Name - Afaan Oromo]
              </p>

              <p className="text-xl font-semibold">
                [School Name - Amharic]
              </p>

              <p className="text-xl font-semibold">
                [School Name - English]
              </p>

              <p className="mt-4 text-sm italic text-gray-600">
                [School Motto]
              </p>

            </div>

            <div className="mt-20 rounded-lg border p-8">

              <h2 className="text-center text-xl font-bold">
                STUDENT REPORT CARD
              </h2>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">

                <div>
                  <p className="text-xs text-gray-500">
                    Academic Year
                  </p>

                  <p className="font-semibold">
                    {academicYear.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Grade
                  </p>

                  <p className="font-semibold">
                    {enrollment.class.grade.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Class / Section
                  </p>

                  <p className="font-semibold">
                    {enrollment.class.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Roll Number
                  </p>

                  <p className="font-semibold">
                    {enrollment.rollNumber}
                  </p>
                </div>

              </div>

            </div>

            <div className="mt-auto border-t pt-8 text-center text-sm text-gray-600">

              <p>
                Head Office:
                {" "}
                [Phone Number]
              </p>

              <p>
                Division:
                {" "}
                [Division Phone Number]
              </p>

              <p className="mt-3">
                [School Address]
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            PAGE 2
            STUDENT INFORMATION + ACADEMIC RESULTS
            ================================================= */}

        <section className="report-page mt-8 bg-white min-h-[1000px] p-8 md:p-12">

          <h2 className="text-center text-xl font-bold">
            STUDENT ACADEMIC REPORT
          </h2>

          {/* STUDENT INFORMATION */}

          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border p-5 md:grid-cols-4">

            <div>
              <p className="text-xs text-gray-500">
                Student ID
              </p>
              <p className="font-semibold">
                {student.id}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Student Name
              </p>
              <p className="font-semibold">
                {student.name}{" "}
                {student.surname}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Age
              </p>
              <p className="font-semibold">
                {getAge(student.birthday)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Sex
              </p>
              <p className="font-semibold">
                {student.sex}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Grade
              </p>
              <p className="font-semibold">
                {enrollment.class.grade.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Class / Section
              </p>
              <p className="font-semibold">
                {enrollment.class.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Roll Number
              </p>
              <p className="font-semibold">
                {enrollment.rollNumber}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Academic Year
              </p>
              <p className="font-semibold">
                {academicYear.name}
              </p>
            </div>

          </div>

          {/* RESULTS */}

          <div className="mt-8 overflow-hidden rounded-lg border">

            <table className="w-full border-collapse text-sm">

              <thead>

                <tr className="bg-gray-100">

                  <th className="border p-3 text-left">
                    No.
                  </th>

                  <th className="border p-3 text-left">
                    Subject
                  </th>

                  <th className="border p-3 text-center">
                    Semester 1
                  </th>

                  <th className="border p-3 text-center">
                    Semester 2
                  </th>

                  <th className="border p-3 text-center">
                    Annual Average
                  </th>

                </tr>

              </thead>

              <tbody>

                {subjectResults.map(
                  (subject, index) => (
                    <tr
                      key={
                        subject.subjectId
                      }
                    >

                      <td className="border p-3">
                        {index + 1}
                      </td>

                      <td className="border p-3 font-medium">
                        {subject.subjectName}
                      </td>

                      <td className="border p-3 text-center">
                        {subject.semester1 !==
                        null
                          ? subject.semester1.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                      <td className="border p-3 text-center">
                        {subject.semester2 !==
                        null
                          ? subject.semester2.toFixed(
                              2
                            )
                          : "—"}
                      </td>

                      <td className="border p-3 text-center font-medium">
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
                      className="border p-8 text-center text-gray-500"
                    >
                      No submitted subject
                      results are available.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

          {/* SUMMARY */}

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">

            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-gray-500">
                Total Subjects
              </p>
              <p className="mt-1 text-lg font-bold">
                {subjectResults.length}
              </p>
            </div>

            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-gray-500">
                Annual Average
              </p>
              <p className="mt-1 text-lg font-bold">
                {studentAverage !==
                null
                  ? studentAverage.toFixed(
                      2
                    )
                  : "—"}
              </p>
            </div>

            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-gray-500">
                Rank
              </p>
              <p className="mt-1 text-lg font-bold">
                {studentRank !==
                null
                  ? studentRank
                  : "—"}
              </p>
            </div>

            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-gray-500">
                Class Size
              </p>
              <p className="mt-1 text-lg font-bold">
                {classSize}
              </p>
            </div>

          </div>

          {/* ATTENDANCE */}

          <div className="mt-6 rounded-lg border p-5">

            <h3 className="font-semibold">
              Attendance
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">

              <div>
                <p className="text-xs text-gray-500">
                  Present
                </p>
                <p className="font-semibold">
                  {presentDays}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Absent
                </p>
                <p className="font-semibold">
                  {absentDays}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Recorded Days
                </p>
                <p className="font-semibold">
                  {recordedDays}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Attendance %
                </p>
                <p className="font-semibold">
                  {attendancePercentage.toFixed(
                    2
                  )}
                  %
                </p>
              </div>

            </div>

          </div>

          {/* CONDUCT */}

          <div className="mt-6 grid grid-cols-2 gap-4">

            <div className="rounded-lg border p-4">
              <p className="text-xs text-gray-500">
                Conduct - Semester 1
              </p>

              <p className="mt-2 min-h-[30px]">
                {reportCard?.conductSemester1 ||
                  "Not recorded"}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-gray-500">
                Conduct - Semester 2
              </p>

              <p className="mt-2 min-h-[30px]">
                {reportCard?.conductSemester2 ||
                  "Not recorded"}
              </p>
            </div>

          </div>

        </section>

        {/* =================================================
            PAGE 3
            COMMENTS + PROMOTION
            ================================================= */}

        <section className="report-page mt-8 bg-white min-h-[1000px] p-8 md:p-12">

          <h2 className="text-center text-xl font-bold">
            COMMENTS AND PROMOTION
          </h2>

          {/* SEMESTER COMMENTS */}

          <div className="mt-10 grid gap-8">

            <div className="rounded-lg border p-6">

              <h3 className="font-bold">
                Semester 1 Comment
              </h3>

              <div className="mt-4 min-h-[120px] whitespace-pre-wrap border-b pb-4">
                {reportCard?.commentSemester1 ||
                  "No comment recorded."}
              </div>

            </div>

            <div className="rounded-lg border p-6">

              <h3 className="font-bold">
                Semester 2 Comment
              </h3>

              <div className="mt-4 min-h-[120px] whitespace-pre-wrap border-b pb-4">
                {reportCard?.commentSemester2 ||
                  "No comment recorded."}
              </div>

            </div>

          </div>

          {/* PARENT INFORMATION */}

          <div className="mt-8 rounded-lg border p-6">

            <h3 className="font-bold">
              Parent / Guardian
            </h3>

            <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">

              <div>
                <p className="text-xs text-gray-500">
                  Semester 1
                </p>

                <p className="mt-2 font-medium">
                  {reportCard?.parentNameSemester1 ||
                    "Not recorded"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Semester 2
                </p>

                <p className="mt-2 font-medium">
                  {reportCard?.parentNameSemester2 ||
                    "Not recorded"}
                </p>
              </div>

            </div>

          </div>

          {/* PROMOTION */}

          <div className="mt-8 rounded-lg border-2 p-6">

            <h3 className="text-center text-lg font-bold">
              Promotion / Detention
            </h3>

            <p className="mt-5 text-center text-xl font-semibold">
              {promotionText}
            </p>

          </div>

          {/* SIGNATURES */}

          <div className="mt-20 grid grid-cols-1 gap-16 md:grid-cols-3">

            <div className="text-center">

              <div className="mx-auto w-48 border-b border-gray-500" />

              <p className="mt-2 text-sm">
                Class Teacher
              </p>

            </div>

            <div className="text-center">

              <div className="mx-auto w-48 border-b border-gray-500" />

              <p className="mt-2 text-sm">
                Parent / Guardian
              </p>

            </div>

            <div className="text-center">

              <div className="mx-auto w-48 border-b border-gray-500" />

              <p className="mt-2 text-sm">
                Managing Director
              </p>

            </div>

          </div>

          <div className="mt-20 border-t pt-5 text-center text-xs text-gray-500">
            Report generated for academic year{" "}
            {academicYear.name}
          </div>

        </section>

        {/* =================================================
            PAGE 4
            BASIC SKILLS
            ================================================= */}

        <section className="report-page mt-8 bg-white min-h-[1000px] p-8 md:p-12">

          <h2 className="text-center text-xl font-bold">
            BASIC SKILLS EVALUATION
          </h2>

          <div className="mt-10 overflow-hidden rounded-lg border">

            <table className="w-full border-collapse text-sm">

              <thead>

                <tr className="bg-gray-100">

                  <th className="border p-3 text-left">
                    Skill
                  </th>

                  <th className="border p-3 text-center">
                    Semester 1
                  </th>

                  <th className="border p-3 text-center">
                    Semester 2
                  </th>

                </tr>

              </thead>

              <tbody>

                {[
                  [
                    "Reading",
                    "reading",
                  ],
                  [
                    "Writing",
                    "writing",
                  ],
                  [
                    "Spelling",
                    "spelling",
                  ],
                  [
                    "Comprehension",
                    "comprehension",
                  ],
                  [
                    "Computation",
                    "computation",
                  ],
                  [
                    "Punctuality",
                    "punctuality",
                  ],
                  [
                    "Uniform",
                    "uniform",
                  ],
                  [
                    "Material Handling",
                    "materialHandling",
                  ],
                  [
                    "Following Directions",
                    "direction",
                  ],
                  [
                    "Completion of Work",
                    "completion",
                  ],
                  [
                    "Use of English",
                    "englishUse",
                  ],
                  [
                    "Work Ethics",
                    "workEthics",
                  ],
                  [
                    "Skills",
                    "skills",
                  ],
                  [
                    "Overall Progress",
                    "overallProgress",
                  ],
                ].map(
                  ([label, key]) => (
                    <tr key={key}>

                      <td className="border p-3 font-medium">
                        {label}
                      </td>

                      <td className="border p-3 text-center">
                        {semester1Skills?.[
                          key as keyof typeof semester1Skills
                        ]?.toString() ||
                          "—"}
                      </td>

                      <td className="border p-3 text-center">
                        {semester2Skills?.[
                          key as keyof typeof semester2Skills
                        ]?.toString() ||
                          "—"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

          {/* EVALUATION KEY */}

          <div className="mt-10 rounded-lg border p-6">

            <h3 className="text-center font-bold">
              Evaluation Key
            </h3>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">

              <div>
                <strong>A</strong>{" "}
                — Excellent
              </div>

              <div>
                <strong>B</strong>{" "}
                — Very Good
              </div>

              <div>
                <strong>C</strong>{" "}
                — Good
              </div>

              <div>
                <strong>D</strong>{" "}
                — Satisfactory
              </div>

              <div>
                <strong>E</strong>{" "}
                — Needs Improvement
              </div>

              <div>
                <strong>F</strong>{" "}
                — Unsatisfactory
              </div>

            </div>

          </div>

          {/* FOOTER */}

          <div className="mt-20 text-center">

            <div className="mx-auto w-56 border-b border-gray-500" />

            <p className="mt-2 text-sm">
              Managing Director
            </p>

          </div>

        </section>

      </div>

      {/* PRINT STYLES */}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4;
                margin: 0;
              }

              body {
                background: white !important;
              }

              .report-page {
                margin: 0 !important;
                width: 210mm;
                min-height: 297mm;
                page-break-after: always;
                break-after: page;
                box-shadow: none !important;
              }

              .report-page:last-child {
                page-break-after: auto;
                break-after: auto;
              }
            }
          `,
        }}
      />

    </div>
  );
};

export default StudentReportCardPage;