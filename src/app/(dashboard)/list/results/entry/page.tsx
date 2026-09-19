import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Semester } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ResultEntryTable from "@/components/ResultEntryTable";

type PageProps = {
  searchParams: Promise<{
    academicYearId?: string;
    semester?: string;
    classId?: string;
    subjectId?: string;
  }>;
};

const ResultEntryPage = async ({
  searchParams,
}: PageProps) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  /*
   * ----------------------------------------------------------
   * RESULT ENTRY IS TEACHER-ONLY
   * ----------------------------------------------------------
   *
   * Admin:
   *   Can VIEW results but cannot ENTER/EDIT them.
   *
   * Teacher:
   *   Can enter/edit results only for a class + subject
   *   assigned to that teacher through Lesson.
   *
   * Student:
   *   View only.
   *
   * Parent:
   *   View only.
   */

  if (role !== "teacher" || !userId) {
    redirect("/list/results");
  }

  const params = await searchParams;

  const academicYearId = Number(params.academicYearId);
  const classId = Number(params.classId);
  const subjectId = Number(params.subjectId);

  const semester: Semester =
    params.semester === "SEMESTER2"
      ? "SEMESTER2"
      : "SEMESTER1";

  /*
   * ----------------------------------------------------------
   * VALIDATE URL PARAMETERS
   * ----------------------------------------------------------
   */

  if (
    !Number.isInteger(academicYearId) ||
    !Number.isInteger(classId) ||
    !Number.isInteger(subjectId)
  ) {
    redirect("/list/results");
  }

  /*
   * ----------------------------------------------------------
   * CONVERT CLERK USER ID -> TEACHER DATABASE ID
   * ----------------------------------------------------------
   *
   * Clerk user ID and Teacher.id are different identifiers.
   */

  const teacher = await prisma.teacher.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      id: true,
    },
  });

  if (!teacher) {
    redirect("/list/results");
  }

  /*
   * ----------------------------------------------------------
   * LOAD ACADEMIC YEAR
   * ----------------------------------------------------------
   */

  const academicYear =
    await prisma.academicYear.findUnique({
      where: {
        id: academicYearId,
      },
    });

  if (!academicYear) {
    redirect("/list/results");
  }

  /*
   * ----------------------------------------------------------
   * LOAD SELECTED CLASS
   * ----------------------------------------------------------
   */

  const selectedClass = await prisma.class.findUnique({
    where: {
      id: classId,
    },
    include: {
      grade: true,
    },
  });

  if (!selectedClass) {
    redirect("/list/results");
  }

  /*
   * ----------------------------------------------------------
   * TEACHER RESULT AUTHORIZATION
   * ----------------------------------------------------------
   *
   * The teacher must actually teach the selected subject
   * in the selected class.
   *
   * IMPORTANT:
   *
   * teacher.id
   *     = school's Teacher database ID
   *
   * Lesson.teacherId
   *     = school's Teacher database ID
   *
   * We deliberately DO NOT use:
   *
   * Class.homeRoomTeacherId
   *
   * because result authorization is based on the subject
   * assignment represented by Lesson.
   */

  const lesson = await prisma.lesson.findFirst({
    where: {
      classId,
      subjectId,
      teacherId: teacher.id,
    },
    select: {
      id: true,
      subject: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  /*
   * No Lesson means this teacher is not authorized to
   * enter results for this class + subject.
   *
   * This also prevents manually changing classId or
   * subjectId in the URL to access another teacher's
   * result entry page.
   */

  if (!lesson) {
    redirect("/list/results");
  }

  const subject = lesson.subject;

  /*
   * ----------------------------------------------------------
   * ASSESSMENT DEFINITIONS
   * ----------------------------------------------------------
   *
   * Assessments belong to:
   *
   * Academic Year
   * Grade
   * Subject
   * Semester
   */

  const assessments =
    await prisma.assessment.findMany({
      where: {
        academicYearId,
        gradeId: selectedClass.gradeId,
        subjectId,
        semester,
      },
      orderBy: {
        id: "asc",
      },
    });

  /*
   * ----------------------------------------------------------
   * STUDENTS
   * ----------------------------------------------------------
   *
   * Students come from StudentEnrollment because:
   *
   * - class membership is academic-year specific
   * - roll number is enrollment-specific
   */

  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        academicYearId,
        classId,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
      },
      orderBy: {
        rollNumber: "asc",
      },
    });

  const students = enrollments.map(
    (enrollment) => ({
      studentId: enrollment.student.id,
      rollNumber: enrollment.rollNumber,
      name: enrollment.student.name,
      surname: enrollment.student.surname,
    })
  );

  /*
   * ----------------------------------------------------------
   * EXISTING SCORES
   * ----------------------------------------------------------
   *
   * Load previously saved scores so the teacher can continue
   * working on a draft.
   */

  const assessmentIds = assessments.map(
    (assessment) => assessment.id
  );

  const studentIds = students.map(
    (student) => student.studentId
  );

  const studentAssessments =
    assessmentIds.length > 0 &&
    studentIds.length > 0
      ? await prisma.studentAssessment.findMany({
          where: {
            assessmentId: {
              in: assessmentIds,
            },
            studentId: {
              in: studentIds,
            },
          },
          select: {
            studentId: true,
            assessmentId: true,
            score: true,
          },
        })
      : [];

  /*
   * ----------------------------------------------------------
   * INITIAL SCORE LOOKUP
   * ----------------------------------------------------------
   */

  const initialScores: Record<string, number> = {};

  for (const item of studentAssessments) {
    initialScores[
      `${item.studentId}_${item.assessmentId}`
    ] = item.score;
  }

  /*
   * ----------------------------------------------------------
   * RESULT SUBMISSION / LOCK STATUS
   * ----------------------------------------------------------
   */

  const submission =
    await prisma.resultSubmission.findUnique({
      where: {
        academicYearId_classId_subjectId_semester: {
          academicYearId,
          classId,
          subjectId,
          semester,
        },
      },
    });

  const locked =
    submission?.status === "SUBMITTED";

  console.log(
    "========== RESULT ENTRY AUTH =========="
  );

  console.log({
    role,
    teacherId: teacher.id,
    academicYearId,
    classId,
    subjectId,
    semester,
    lessonId: lesson.id,
    submissionStatus: submission?.status,
    locked,
  });

  /*
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">
            Enter Results
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            {academicYear.name} ·{" "}
            {semester === "SEMESTER1"
              ? "Semester 1"
              : "Semester 2"}
          </p>

          <p className="text-sm text-gray-500">
            {selectedClass.name} · {subject.name}
          </p>
        </div>

        <div
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            locked
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {locked ? "Submitted" : "Draft"}
        </div>
      </div>

      {locked && (
        <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          This result has already been submitted and is
          locked. You cannot change the scores unless the
          result is reopened by an authorized supervisor.
        </div>
      )}

      <ResultEntryTable
        academicYearId={academicYearId}
        classId={classId}
        subjectId={subjectId}
        semester={semester}
        assessments={assessments}
        students={students}
        locked={locked}
        initialScores={initialScores}
      />
    </div>
  );
};

export default ResultEntryPage;