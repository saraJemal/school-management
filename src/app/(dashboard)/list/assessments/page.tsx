import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/pagination";
import FormContainer from "@/components/FormContainer";
import AssessmentDefinitionTable from "@/components/AssessmentDefinitionTable";
import { Assessment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";

const assessmentTypes = [
  "CW1",
  "CW2",
  "HW1",
  "HW2",
  "WS1",
  "WS2",
  "PROJECT",
  "EXERCISE_BOOK",
  "Q1",
  "Q2",
  "TEST1",
  "TEST2",
  "MIDTERM",
  "FINAL",
] as const;

type AssessmentWithSubject = Assessment & {
  subject: {
    name: string;
  };
};

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
    ? parseInt(params.page)
    : 1;

  const search = params.search || "";

  /*
   * SELECTED GRADE
   */
  const requestedGradeId = params.gradeId
    ? parseInt(params.gradeId)
    : undefined;

  /*
   * SEMESTER
   *
   * Default = Semester 1.
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
   * GRADES
   */
  const grades = await prisma.grade.findMany({
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
   * SELECTED GRADE
   */
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
   * SUBJECTS
   *
   * For now we use SubjectSection.
   *
   * Later, when you populate SubjectSection,
   * the subjects will automatically change
   * according to the selected GradeSection.
   */
  const subjectWhere: Prisma.SubjectWhereInput = {
    sections: {
      some: {
        section: selectedGrade.section,
      },
    },

    ...(role === "teacher" && userId
      ? {
          teachers: {
            some: {
              id: userId,
            },
          },
        }
      : {}),

    ...(search
      ? {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const allSubjects =
    await prisma.subject.findMany({
      where: subjectWhere,
      orderBy: {
        name: "asc",
      },
    });

  /*
   * PAGINATION BY SUBJECT
   */
  const count = allSubjects.length;

  const start =
    ITEM_PER_PAGE * (page - 1);

  const subjects = allSubjects.slice(
    start,
    start + ITEM_PER_PAGE
  );

  /*
   * ASSESSMENTS
   *
   * Get assessments belonging to:
   * - current academic year
   * - selected grade
   * - selected semester
   * - selected subjects
   */
  const assessments =
    subjects.length > 0
      ? await prisma.assessment.findMany({
          where: {
            academicYearId:
              academicYear.id,

            gradeId: selectedGrade.id,

            semester: selectedSemester,

            subjectId: {
              in: subjects.map(
                (subject) => subject.id
              ),
            },
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
        })
      : [];

  /*
   * MAIN PAGE
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

            {(role === "admin" ||
              role === "teacher") && (
              <FormContainer
                table="assessment"
                type="create"
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
        academicYearId={academicYear.id}
        grades={grades.map((grade) => ({
          id: grade.id,
          name: grade.name,
        }))}
        selectedGradeId={selectedGrade.id}
        selectedSemester={selectedSemester}
        subjects={subjects.map(
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
            type: assessment.type,
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