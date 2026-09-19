import { Semester } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import ResultTable from "@/components/ResultTable";

type ResultListPageProps = {
  searchParams: Promise<{
    academicYearId?: string;
    semester?: string;
    classId?: string;
    subjectId?: string;
  }>;
};

const ResultListPage = async ({
  searchParams,
}: ResultListPageProps) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  const params = await searchParams;

  /*
   * ----------------------------------------------------------
   * CURRENT USER IDENTIFICATION
   * ----------------------------------------------------------
   *
   * Clerk user ID != database user ID.
   *
   * For teachers, we resolve:
   * Clerk userId -> Teacher.clerkUserId -> Teacher.id
   *
   * For students:
   * Clerk userId -> Student.clerkUserId -> Student.id
   *
   * For parents:
   * Clerk userId -> Parent.clerkUserId -> Parent.id
   */

  const teacher =
    role === "teacher" && userId
      ? await prisma.teacher.findUnique({
          where: {
            clerkUserId: userId,
          },
          select: {
            id: true,
          },
        })
      : null;

  const student =
    role === "student" && userId
      ? await prisma.student.findUnique({
          where: {
            clerkUserId: userId,
          },
          select: {
            id: true,
          },
        })
      : null;

  const parent =
    role === "parent" && userId
      ? await prisma.parent.findUnique({
          where: {
            clerkUserId: userId,
          },
          select: {
            id: true,
          },
        })
      : null;

  /*
   * ----------------------------------------------------------
   * SEMESTER
   * ----------------------------------------------------------
   */

  const selectedSemester: Semester =
    params.semester === "SEMESTER2"
      ? "SEMESTER2"
      : "SEMESTER1";

  /*
   * ----------------------------------------------------------
   * ACADEMIC YEARS
   * ----------------------------------------------------------
   *
   * Keep the existing academic-year selector behavior.
   */

  const academicYears = await prisma.academicYear.findMany({
    orderBy: {
      startDate: "desc",
    },
  });

  const requestedAcademicYearId = Number(
    params.academicYearId
  );

  const selectedAcademicYear =
    academicYears.find(
      (year) => year.id === requestedAcademicYearId
    ) ??
    academicYears.find(
      (year) => year.isCurrent
    ) ??
    academicYears[0];

  if (!selectedAcademicYear) {
    return <div>No academic year found.</div>;
  }

  /*
   * ----------------------------------------------------------
   * CHILDREN OF CURRENT PARENT
   * ----------------------------------------------------------
   *
   * Only used for parent result access.
   *
   * A parent may have multiple children and the children may
   * belong to different classes.
   */

  const parentStudentIds =
    role === "parent" && parent
      ? (
          await prisma.student.findMany({
            where: {
              parentId: parent.id,
            },
            select: {
              id: true,
            },
          })
        ).map((item) => item.id)
      : [];

  /*
   * ----------------------------------------------------------
   * CLASSES
   * ----------------------------------------------------------
   *
   * ADMIN:
   *   All classes.
   *
   * TEACHER:
   *   Only classes where the teacher has a Lesson assignment.
   *
   * STUDENT:
   *   Only the class in which the student is enrolled for the
   *   selected academic year.
   *
   * PARENT:
   *   Only classes containing one or more of the parent's
   *   children for the selected academic year.
   *
   * IMPORTANT:
   * Result authorization does NOT use homeRoomTeacherId.
   */

  const classes =
    role === "teacher" && teacher
      ? await prisma.class.findMany({
          where: {
            lessons: {
              some: {
                teacherId: teacher.id,
              },
            },
          },
          include: {
            grade: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : role === "student" && student
      ? await prisma.class.findMany({
          where: {
            enrollments: {
              some: {
                academicYearId: selectedAcademicYear.id,
                studentId: student.id,
              },
            },
          },
          include: {
            grade: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : role === "parent" && parentStudentIds.length > 0
      ? await prisma.class.findMany({
          where: {
            enrollments: {
              some: {
                academicYearId: selectedAcademicYear.id,
                studentId: {
                  in: parentStudentIds,
                },
              },
            },
          },
          include: {
            grade: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : role === "admin"
      ? await prisma.class.findMany({
          include: {
            grade: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : [];

  /*
   * ----------------------------------------------------------
   * SELECTED CLASS
   * ----------------------------------------------------------
   *
   * Because classes are already filtered according to the
   * current user's role, an arbitrary classId in the URL
   * cannot select an unauthorized class.
   */

  const requestedClassId = Number(params.classId);

  const selectedClass =
    classes.find(
      (item) => item.id === requestedClassId
    ) ?? classes[0];

  /*
   * ----------------------------------------------------------
   * SUBJECTS
   * ----------------------------------------------------------
   *
   * ADMIN:
   *   All subjects taught in the selected class.
   *
   * TEACHER:
   *   Only subjects taught by that teacher in the selected
   *   class.
   *
   * STUDENT:
   *   Subjects available in the student's enrolled class.
   *
   * PARENT:
   *   Subjects available in the selected child's/children's
   *   class.
   *
   * The selected class itself has already been authorized
   * above.
   */

  const subjects =
    selectedClass
      ? await prisma.subject.findMany({
          where: {
            lessons: {
              some: {
                classId: selectedClass.id,

                ...(role === "teacher" && teacher
                  ? {
                      teacherId: teacher.id,
                    }
                  : {}),
              },
            },
          },
          include: {
            teachers: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
        })
      : [];

  /*
   * ----------------------------------------------------------
   * SELECTED SUBJECT
   * ----------------------------------------------------------
   *
   * Because subjects are already role-filtered, an arbitrary
   * subjectId in the URL cannot expose another subject.
   */

  const requestedSubjectId = params.subjectId
    ? Number(params.subjectId)
    : undefined;

  const selectedSubject =
    subjects.find(
      (subject) => subject.id === requestedSubjectId
    ) ?? subjects[0];

  /*
   * ----------------------------------------------------------
   * RESULT EDITING PERMISSION
   * ----------------------------------------------------------
   *
   * ADMIN:
   *   NO result editing.
   *
   * TEACHER:
   *   Can edit only if assigned to the selected class +
   *   selected subject through Lesson.
   *
   * STUDENT:
   *   NO editing.
   *
   * PARENT:
   *   NO editing.
   */

  const canEditResults =
    role === "teacher" &&
    !!teacher &&
    !!selectedClass &&
    !!selectedSubject &&
    !!(
      await prisma.lesson.findFirst({
        where: {
          classId: selectedClass.id,
          subjectId: selectedSubject.id,
          teacherId: teacher.id,
        },
        select: {
          id: true,
        },
      })
    );

  /*
   * ----------------------------------------------------------
   * ASSESSMENTS
   * ----------------------------------------------------------
   *
   * Assessment definitions are selected for the authorized
   * class/grade + subject + academic year + semester.
   */

  const assessments =
    selectedAcademicYear &&
    selectedClass &&
    selectedSubject
      ? await prisma.assessment.findMany({
          where: {
            academicYearId: selectedAcademicYear.id,
            gradeId: selectedClass.gradeId,
            subjectId: selectedSubject.id,
            semester: selectedSemester,
          },
          orderBy: {
            id: "asc",
          },
        })
      : [];

  /*
   * ----------------------------------------------------------
   * STUDENT ENROLLMENTS
   * ----------------------------------------------------------
   *
   * ADMIN:
   *   All students in selected class.
   *
   * TEACHER:
   *   All students in selected class.
   *
   * STUDENT:
   *   ONLY the logged-in student.
   *
   * PARENT:
   *   ONLY the parent's children.
   *
   * This is the main server-side student-result restriction.
   */

  let enrollmentWhere: {
    academicYearId: number;
    classId: number;
    studentId?: string | { in: string[] };
  } | null = null;

  if (selectedAcademicYear && selectedClass) {
    if (role === "student" && student) {
      enrollmentWhere = {
        academicYearId: selectedAcademicYear.id,
        classId: selectedClass.id,
        studentId: student.id,
      };
    } else if (
      role === "parent" &&
      parentStudentIds.length > 0
    ) {
      enrollmentWhere = {
        academicYearId: selectedAcademicYear.id,
        classId: selectedClass.id,
        studentId: {
          in: parentStudentIds,
        },
      };
    } else if (
      role === "admin" ||
      (role === "teacher" && teacher)
    ) {
      enrollmentWhere = {
        academicYearId: selectedAcademicYear.id,
        classId: selectedClass.id,
      };
    }
  }

  const enrollments = enrollmentWhere
    ? await prisma.studentEnrollment.findMany({
        where: enrollmentWhere,
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
      })
    : [];

  /*
   * ----------------------------------------------------------
   * STUDENT IDS
   * ----------------------------------------------------------
   */

  const studentIds = enrollments.map(
    (enrollment) => enrollment.student.id
  );

  /*
   * ----------------------------------------------------------
   * ASSESSMENT IDS
   * ----------------------------------------------------------
   */

  const assessmentIds = assessments.map(
    (assessment) => assessment.id
  );

  /*
   * ----------------------------------------------------------
   * EXISTING SCORES
   * ----------------------------------------------------------
   *
   * Only scores belonging to the already-authorized student
   * IDs and assessment IDs are loaded.
   */

  const studentAssessments =
    studentIds.length > 0 &&
    assessmentIds.length > 0
      ? await prisma.studentAssessment.findMany({
          where: {
            studentId: {
              in: studentIds,
            },
            assessmentId: {
              in: assessmentIds,
            },
          },
        })
      : [];

  /*
   * ----------------------------------------------------------
   * SCORE LOOKUP
   * ----------------------------------------------------------
   */

  const scoreMap = new Map<string, number>();

  studentAssessments.forEach((item) => {
    scoreMap.set(
      `${item.studentId}_${item.assessmentId}`,
      item.score
    );
  });

  /*
   * ----------------------------------------------------------
   * BUILD RESULT TABLE STUDENTS
   * ----------------------------------------------------------
   */

  const students = enrollments.map((enrollment) => {
    const scores: Record<string, number | null> = {};

    assessments.forEach((assessment) => {
      scores[assessment.type] =
        scoreMap.get(
          `${enrollment.student.id}_${assessment.id}`
        ) ?? null;
    });

    return {
      studentId: enrollment.student.id,
      rollNumber: enrollment.rollNumber,
      name: enrollment.student.name,
      surname: enrollment.student.surname,
      scores,
    };
  });

  /*
   * ----------------------------------------------------------
   * SELECTOR DATA
   * ----------------------------------------------------------
   */

  const resultTableAcademicYears = academicYears.map(
    (year) => ({
      id: year.id,
      name: year.name,
    })
  );

  const resultTableClasses = classes.map((item) => ({
    id: item.id,
    name: item.name,
    gradeId: item.gradeId,
    gradeName: item.grade.name,
  }));

  const resultTableSubjects = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
  }));

  /*
   * ----------------------------------------------------------
   * RESULT ENTRY URL
   * ----------------------------------------------------------
   *
   * This URL is only exposed when the current user is an
   * authorized teacher.
   *
   * Admin does NOT receive an Enter Results button.
   * Student and parent do NOT receive an Enter Results button.
   */

  const editUrl =
    canEditResults &&
    selectedAcademicYear &&
    selectedClass &&
    selectedSubject
      ? `/list/results/entry` +
        `?academicYearId=${selectedAcademicYear.id}` +
        `&semester=${selectedSemester}` +
        `&classId=${selectedClass.id}` +
        `&subjectId=${selectedSubject.id}`
      : "#";

  /*
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">
            Results
          </h1>

          {selectedAcademicYear &&
            selectedClass &&
            selectedSubject && (
              <div className="text-sm text-gray-500 mt-1">
                {selectedAcademicYear.name} ·{" "}
                {selectedSemester} ·{" "}
                {selectedClass.name} ·{" "}
                {selectedClass.grade.name} ·{" "}
                {selectedSubject.name}
              </div>
            )}
        </div>

        <div className="flex items-center gap-3">
          {canEditResults && (
            <Link
              href={editUrl}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Enter Results
            </Link>
          )}
        </div>
      </div>

      <ResultTable
        academicYears={resultTableAcademicYears}
        classes={resultTableClasses}
        subjects={resultTableSubjects}
        students={students}
        assessments={assessments}
        selectedAcademicYearId={
          selectedAcademicYear?.id ?? null
        }
        selectedSemester={selectedSemester}
        selectedClassId={selectedClass?.id ?? null}
        selectedSubjectId={selectedSubject?.id}
      />
    </div>
  );
};

export default ResultListPage;