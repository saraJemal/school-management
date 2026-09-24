import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import ReportCardFilters from "@/components/ReportCardFilters";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";

const columns = [
  {
    header: "Roll No.",
    accessor: "rollNumber",
  },
  {
    header: "Student ID",
    accessor: "studentId",
  },
  {
    header: "Student Name",
    accessor: "studentName",
  },
  {
    header: "Action",
    accessor: "action",
  },
];

type ReportCardTableProps = {
  students: any[];
  academicYearId: number;
};

const ReportCardTable = ({
  students,
  academicYearId,
}: ReportCardTableProps) => {
  const renderRow = (student: any) => {
    const enrollment = student.enrollments[0];

    return (
      <tr
        key={student.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-gray-100"
      >
        <td className="p-3">
          {enrollment?.rollNumber ?? "-"}
        </td>

        <td className="p-3 font-medium">
          {student.id}
        </td>

        <td className="p-3">
          {student.name} {student.surname ?? ""}
        </td>

        <td className="p-3">
          <Link
            href={`/list/report-cards/${student.id}?academicYearId=${academicYearId}`}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
          >
            View
          </Link>
        </td>
      </tr>
    );
  };

  return (
    <Table
      columns={columns}
      renderRow={renderRow}
      data={students}
    />
  );
};

const ReportCardsPage = async ({
  searchParams,
}: {
  searchParams: {
    academicYearId?: string;
    gradeId?: string;
    classId?: string;
    page?: string;
  };
}) => {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return null;
  }

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  if (
    role !== "admin" &&
    role !== "teacher" &&
    role !== "student" &&
    role !== "parent"
  ) {
    return null;
  }

  /*
   * ------------------------------------------------------------
   * SELECTED FILTERS
   * ------------------------------------------------------------
   */

  const selectedAcademicYearId =
    searchParams.academicYearId
      ? Number(searchParams.academicYearId)
      : undefined;

  const selectedGradeId =
    searchParams.gradeId
      ? Number(searchParams.gradeId)
      : undefined;

  const selectedClassId =
    searchParams.classId
      ? Number(searchParams.classId)
      : undefined;

  const page =
    searchParams.page
      ? Number(searchParams.page)
      : 1;

  /*
   * ------------------------------------------------------------
   * ACADEMIC YEARS
   * ------------------------------------------------------------
   */

  const academicYears =
    await prisma.academicYear.findMany({
      orderBy: {
        startDate: "desc",
      },
      select: {
        id: true,
        name: true,
      },
    });

  /*
   * ------------------------------------------------------------
   * GRADES
   * ------------------------------------------------------------
   */

  const grades =
    await prisma.grade.findMany({
      orderBy: {
        level: "asc",
      },
      select: {
        id: true,
        level: true,
        name: true,
      },
    });

  /*
   * ------------------------------------------------------------
   * TEACHER AUTHORIZATION
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Clerk userId is NOT the database Teacher ID.
   *
   * Clerk userId
   *      ↓
   * Teacher.clerkUserId
   *      ↓
   * Teacher.id
   *
   * For teachers, this DB teacher ID is used to restrict
   * both the class filter and the student query.
   */

  let teacherId: string | undefined;

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
      return null;
    }

    teacherId = teacher.id;
  }

  /*
   * ------------------------------------------------------------
   * CLASSES
   * ------------------------------------------------------------
   *
   * ADMIN:
   *   Can see all classes.
   *
   * TEACHER:
   *   Can see ONLY classes where the logged-in teacher is the
   *   homeroom teacher.
   *
   * This restriction is applied to the filter itself, so the
   * teacher cannot even select another teacher's class from the
   * normal UI.
   *
   * The student query below repeats the authorization check
   * server-side as a second layer of protection against manually
   * changing classId in the URL.
   */

  const classes =
    await prisma.class.findMany({
      where:
        role === "teacher"
          ? {
              homeRoomTeacherId:
                teacherId,
            }
          : undefined,

      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
        gradeId: true,
      },
    });

  /*
   * ------------------------------------------------------------
   * STUDENTS
   * ------------------------------------------------------------
   *
   * StudentEnrollment is the authoritative source for:
   *
   * - academic year
   * - class
   * - roll number
   *
   * No Student.classId or Student.gradeId is used.
   */

  let students: any[] = [];
  let count = 0;

  if (
    selectedAcademicYearId &&
    selectedGradeId &&
    selectedClassId
  ) {
    /*
     * ----------------------------------------------------------
     * VERIFY SELECTED CLASS
     * ----------------------------------------------------------
     *
     * The selected class must:
     *
     * 1. Belong to the selected grade.
     * 2. Exist.
     * 3. For teachers, belong to the logged-in teacher as
     *    homeroom teacher.
     *
     * This protects against manually changing classId in the URL.
     */

    const selectedClass =
      await prisma.class.findFirst({
        where: {
          id: selectedClassId,
          gradeId: selectedGradeId,

          ...(role === "teacher"
            ? {
                homeRoomTeacherId:
                  teacherId,
              }
            : {}),
        },

        select: {
          id: true,
          name: true,
        },
      });

    /*
     * If the selected class does not belong to the teacher,
     * return an empty result.
     *
     * Therefore changing:
     *
     * ?classId=...
     *
     * manually cannot expose another teacher's students.
     */

    if (selectedClass) {
      const where = {
        academicYearId:
          selectedAcademicYearId,

        classId: selectedClassId,
      };

      /*
       * --------------------------------------------------------
       * COUNT
       * --------------------------------------------------------
       */

      count =
        await prisma.studentEnrollment.count({
          where,
        });

      /*
       * --------------------------------------------------------
       * ENROLLMENTS
       * --------------------------------------------------------
       */

      const enrollments =
        await prisma.studentEnrollment.findMany({
          where,

          orderBy: {
            rollNumber: "asc",
          },

          skip:
            (page - 1) *
            ITEM_PER_PAGE,

          take: ITEM_PER_PAGE,

          select: {
            rollNumber: true,

            student: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },

            class: {
              select: {
                id: true,
                name: true,

                grade: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

      /*
       * --------------------------------------------------------
       * TABLE DATA
       * --------------------------------------------------------
       */

      students =
        enrollments.map(
          (enrollment) => ({
            id:
              enrollment.student.id,

            name:
              enrollment.student.name,

            surname:
              enrollment.student.surname,

            enrollments: [
              {
                rollNumber:
                  enrollment.rollNumber,

                class:
                  enrollment.class,
              },
            ],
          })
        );
    }
  }

  /*
   * ------------------------------------------------------------
   * PAGE
   * ------------------------------------------------------------
   */

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">

      {/* TOP */}

      <div className="flex items-center justify-between">

        <h1 className="hidden md:block text-lg font-semibold">
          Student Report Cards
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
        </div>

      </div>

      {/* FILTERS */}

      <div className="mt-6">

        <ReportCardFilters
          academicYears={academicYears}
          grades={grades}
          classes={classes}
          selectedAcademicYearId={
            selectedAcademicYearId
          }
          selectedGradeId={
            selectedGradeId
          }
          selectedClassId={
            selectedClassId
          }
        />

      </div>

      {/* STUDENT LIST */}

      {selectedClassId &&
      selectedGradeId &&
      selectedAcademicYearId ? (
        <>

          <div className="mt-6">

            {students.length > 0 ? (
              <ReportCardTable
                students={students}
                academicYearId={
                  selectedAcademicYearId
                }
              />
            ) : (
              <div className="flex items-center justify-center rounded-md border border-dashed border-gray-300 py-12 text-sm text-gray-500">

                {role === "teacher"
                  ? "No students are enrolled in this class, or you are not the homeroom teacher for this class."
                  : "No students are enrolled in the selected class for this academic year."}

              </div>
            )}

          </div>

          {count >
            ITEM_PER_PAGE && (
            <Pagination
              page={page}
              count={count}
            />
          )}

        </>

      ) : (

        /*
         * Empty state before a class is selected.
         */

        <div className="mt-8 flex items-center justify-center rounded-md border border-dashed border-gray-300 py-16 text-sm text-gray-500">

          Please select an academic year,
          grade, and class to view
          students.

        </div>

      )}

    </div>
  );
};

export default ReportCardsPage;