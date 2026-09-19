import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/pagination";
import FormContainer from "@/components/FormContainer";
import AssessmentDefinitionTable from "@/components/AssessmentDefinitionTable";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";

const AssessmentListPage = async ({
  searchParams,
}: {
  searchParams: {
    [key: string]: string | undefined;
  };
}) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  const params = await searchParams;

  const page = params.page
    ? Math.max(1, parseInt(params.page))
    : 1;

  const search = params.search || "";

  /*
   * SEMESTER
   */
  const selectedSemester =
    params.semester === "SEMESTER2"
      ? "SEMESTER2"
      : "SEMESTER1";

  /*
   * CURRENT ACADEMIC YEAR
   */
  const academicYear =
    await prisma.academicYear.findFirst({
      where: {
        isCurrent: true,
      },
    });

  if (!academicYear) {
    return (
      <div className="bg-white p-6 rounded-md m-4">
        <p className="text-red-500">
          No current academic year has been configured.
        </p>
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * DETERMINE WHICH GRADES THE USER IS ALLOWED TO VIEW
   * ----------------------------------------------------------
   *
   * ADMIN:
   *   Can view all grades.
   *
   * TEACHER:
   *   Can view assessment definitions for grades.
   *   Assessment definitions remain READ-ONLY for teachers.
   *
   * STUDENT:
   *   Only the student's current academic-year enrolled grade.
   *
   * PARENT:
   *   Only the current academic-year enrolled grades of
   *   the parent's children.
   */

  let allowedGradeIds: number[] | undefined = undefined;

  if (role === "student") {
    if (!userId) {
      return (
        <div className="bg-white p-6 rounded-md m-4">
          <p className="text-red-500">
            User authentication could not be verified.
          </p>
        </div>
      );
    }

    const student = await prisma.student.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return (
        <div className="bg-white p-6 rounded-md m-4">
          <p className="text-red-500">
            Student account could not be found.
          </p>
        </div>
      );
    }

    const enrollment =
      await prisma.studentEnrollment.findFirst({
        where: {
          studentId: student.id,
          academicYearId: academicYear.id,
        },
        include: {
          class: {
            select: {
              gradeId: true,
            },
          },
        },
      });

    if (!enrollment) {
      return (
        <div className="bg-white p-6 rounded-md m-4">
          <p className="text-red-500">
            You are not enrolled in the current academic year.
          </p>
        </div>
      );
    }

    allowedGradeIds = [
      enrollment.class.gradeId,
    ];
  }

  if (role === "parent") {
    if (!userId) {
      return (
        <div className="bg-white p-6 rounded-md m-4">
          <p className="text-red-500">
            User authentication could not be verified.
          </p>
        </div>
      );
    }

    const parent = await prisma.parent.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!parent) {
      return (
        <div className="bg-white p-6 rounded-md m-4">
          <p className="text-red-500">
            Parent account could not be found.
          </p>
        </div>
      );
    }

    const children =
      await prisma.student.findMany({
        where: {
          parentId: parent.id,

          enrollments: {
            some: {
              academicYearId:
                academicYear.id,
            },
          },
        },

        select: {
          enrollments: {
            where: {
              academicYearId:
                academicYear.id,
            },

            select: {
              class: {
                select: {
                  gradeId: true,
                },
              },
            },
          },
        },
      });

    allowedGradeIds = Array.from(
      new Set(
        children.flatMap((child) =>
          child.enrollments.map(
            (enrollment) =>
              enrollment.class.gradeId
          )
        )
      )
    );

    if (allowedGradeIds.length === 0) {
      return (
        <div className="bg-white p-6 rounded-md m-4">
          <p className="text-red-500">
            No child is enrolled in the current academic year.
          </p>
        </div>
      );
    }
  }

  /*
   * ----------------------------------------------------------
   * GRADES
   * ----------------------------------------------------------
   *
   * For students and parents, only permitted grades are loaded.
   * Admin and teacher retain the existing all-grade behavior.
   */

  const grades = await prisma.grade.findMany({
    where:
      allowedGradeIds !== undefined
        ? {
            id: {
              in: allowedGradeIds,
            },
          }
        : undefined,

    orderBy: {
      level: "asc",
    },
  });

  if (grades.length === 0) {
    return (
      <div className="bg-white p-6 rounded-md m-4">
        <p className="text-red-500">
          No grades found.
        </p>
      </div>
    );
  }

  /*
   * ----------------------------------------------------------
   * SELECTED GRADE
   * ----------------------------------------------------------
   *
   * Admin/teacher:
   *   requested grade is accepted if it exists.
   *
   * Student/parent:
   *   requested grade is accepted ONLY if it belongs to
   *   their allowed grades.
   *
   * This prevents changing ?gradeId=... in the URL to access
   * another grade.
   */

  const requestedGradeId = params.gradeId
    ? parseInt(params.gradeId)
    : undefined;

  const gradeId =
    requestedGradeId &&
    grades.some(
      (grade) => grade.id === requestedGradeId
    )
      ? requestedGradeId
      : grades[0].id;

  const selectedGrade = grades.find(
    (grade) => grade.id === gradeId
  )!;

  /*
   * ----------------------------------------------------------
   * SUBJECTS
   * ----------------------------------------------------------
   *
   * Subjects are connected to grades through SubjectSection.
   *
   * The important condition is:
   *
   *   SubjectSection.section === selectedGrade.section
   *
   * This is the correct relationship for your schema because
   * SubjectSection is intentionally defined by:
   *
   *   subjectId + section
   *
   * ----------------------------------------------------------
   *
   * Teacher:
   *   Assessment definitions remain view-only.
   *   We therefore keep the existing behavior of displaying
   *   the subjects belonging to the selected grade section.
   *
   * Student/Parent:
   *   They see only subjects belonging to their permitted grade.
   */

  const subjects =
    await prisma.subject.findMany({
      where: {
        sections: {
          some: {
            section:
              selectedGrade.section,
          },
        },

        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
      },

      select: {
        id: true,
        name: true,
      },

      orderBy: {
        name: "asc",
      },
    });

  /*
   * ----------------------------------------------------------
   * PAGINATION
   * ----------------------------------------------------------
   */

  const count = subjects.length;

  const start =
    ITEM_PER_PAGE * (page - 1);

  const paginatedSubjects =
    subjects.slice(
      start,
      start + ITEM_PER_PAGE
    );

  /*
   * ----------------------------------------------------------
   * ASSESSMENT DEFINITIONS
   * ----------------------------------------------------------
   *
   * Definitions are restricted to:
   *
   *   current academic year
   *   selected grade
   *   selected semester
   *
   * Student/parent grade access has already been validated
   * above, so they cannot use an arbitrary gradeId.
   */

  const assessments =
    await prisma.assessment.findMany({
      where: {
        academicYearId:
          academicYear.id,

        gradeId:
          selectedGrade.id,

        semester:
          selectedSemester,
      },

      include: {
        subject: {
          select: {
            name: true,
          },
        },
      },

      orderBy: [
        {
          subjectId: "asc",
        },
        {
          id: "asc",
        },
      ],
    });

  /*
   * ----------------------------------------------------------
   * MAIN PAGE
   * ----------------------------------------------------------
   */

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">

      {/* TOP */}
      <div className="flex items-center justify-between">

        <h1 className="hidden md:block text-lg font-semibold">
          Assessment Definitions
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">

          <TableSearch />

          <div className="flex items-center gap-4 self-end">

            {/* ONLY ADMIN CAN CREATE */}
            {role === "admin" && (
              <FormContainer
                table="assessmentRow"
                type="create"
                data={{
                  academicYearId:
                    academicYear.id,
                  gradeId:
                    selectedGrade.id,
                  semester:
                    selectedSemester,
                }}
              />
            )}

          </div>
        </div>
      </div>

      {/* INFORMATION */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">

        <span>
          Academic Year:{" "}
          <strong className="text-gray-700">
            {academicYear.name}
          </strong>
        </span>

        <span>
          Grade:{" "}
          <strong className="text-gray-700">
            {selectedGrade.name}
          </strong>
        </span>

        <span>
          Section:{" "}
          <strong className="text-gray-700">
            {selectedGrade.section}
          </strong>
        </span>

        <span>
          Semester:{" "}
          <strong className="text-gray-700">
            {selectedSemester ===
            "SEMESTER1"
              ? "Semester 1"
              : "Semester 2"}
          </strong>
        </span>

      </div>

      {/* ASSESSMENT DEFINITION TABLE */}
      <AssessmentDefinitionTable
        academicYearId={
          academicYear.id
        }

        role={role}

        grades={grades.map(
          (grade) => ({
            id: grade.id,
            name: grade.name,
          })
        )}

        selectedGradeId={
          selectedGrade.id
        }

        selectedSemester={
          selectedSemester
        }

        subjects={paginatedSubjects.map(
          (subject) => ({
            id: subject.id,
            name: subject.name,
          })
        )}

        assessments={assessments.map(
          (assessment) => ({
            id: assessment.id,
            subjectId:
              assessment.subjectId,
            type:
              assessment.type,
            category:
              assessment.category,
            maxScore:
              assessment.maxScore,
            weight:
              assessment.weight,
          })
        )}
      />

      {/* PAGINATION */}
      <Pagination
        page={page}
        count={count}
      />

    </div>
  );
};

export default AssessmentListPage;