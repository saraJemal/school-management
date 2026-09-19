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
          {student.name} {student.surname}
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

  const role = (sessionClaims?.metadata as { role?: string })?.role;

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

  const selectedAcademicYearId = searchParams.academicYearId
    ? Number(searchParams.academicYearId)
    : undefined;

  const selectedGradeId = searchParams.gradeId
    ? Number(searchParams.gradeId)
    : undefined;

  const selectedClassId = searchParams.classId
    ? Number(searchParams.classId)
    : undefined;

  const page = searchParams.page
    ? Number(searchParams.page)
    : 1;

  /*
   * ------------------------------------------------------------
   * ACADEMIC YEARS
   * ------------------------------------------------------------
   */

  const academicYears = await prisma.academicYear.findMany({
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

  const grades = await prisma.grade.findMany({
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
   * CLASSES
   * ------------------------------------------------------------
   *
   * We load the classes so the client component can filter them
   * by the selected grade.
   */

  const classes = await prisma.class.findMany({
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
   * IMPORTANT:
   * Students are loaded ONLY after a class has been selected.
   *
   * StudentEnrollment is the authoritative source for:
   * - academic year
   * - class
   * - roll number
   */

  let students: any[] = [];
  let count = 0;

  if (
    selectedAcademicYearId &&
    selectedGradeId &&
    selectedClassId
  ) {
    /*
     * Make sure the selected class actually belongs to the
     * selected grade.
     */
    const selectedClass = await prisma.class.findFirst({
      where: {
        id: selectedClassId,
        gradeId: selectedGradeId,
      },
      select: {
        id: true,
      },
    });

    if (selectedClass) {
      const where = {
        academicYearId: selectedAcademicYearId,
        classId: selectedClassId,
      };

      count = await prisma.studentEnrollment.count({
        where,
      });

      const enrollments =
        await prisma.studentEnrollment.findMany({
          where,
          orderBy: {
            rollNumber: "asc",
          },
          skip: (page - 1) * ITEM_PER_PAGE,
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

      students = enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        name: enrollment.student.name,
        surname: enrollment.student.surname,

        enrollments: [
          {
            rollNumber: enrollment.rollNumber,
            class: enrollment.class,
          },
        ],
      }));
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
          Report Cards
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
          selectedAcademicYearId={selectedAcademicYearId}
          selectedGradeId={selectedGradeId}
          selectedClassId={selectedClassId}
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
                academicYearId={selectedAcademicYearId}
              />
            ) : (
              <div className="flex items-center justify-center rounded-md border border-dashed border-gray-300 py-12 text-sm text-gray-500">
                No students are enrolled in the selected class
                for this academic year.
              </div>
            )}
          </div>

          {count > ITEM_PER_PAGE && (
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
          Please select an academic year, grade, and class to
          view students.
        </div>
      )}
    </div>
  );
};

export default ReportCardsPage;