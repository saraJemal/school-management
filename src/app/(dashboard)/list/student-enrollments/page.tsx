import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import {
  Prisma,
  Student,
  StudentEnrollment,
  Class,
  Grade,
  AcademicYear,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import FormContainer from "@/components/FormContainer";
import StudentEnrollmentSelectors from "@/components/StudentEnrollmentSelectors";

type StudentEnrollmentList = StudentEnrollment & {
  student: Student;
  class: Class & {
    grade: Grade;
  };
  academicYear: AcademicYear;
};

const StudentEnrollmentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const params = await searchParams;

  const page = params.page;
  const search = params.search;
  const academicYearId = params.academicYearId;
  const gradeId = params.gradeId;
  const classId = params.classId;

  const p = page ? parseInt(page) : 1;

  /*
   * ---------------------------------------------------------
   * SELECTOR DATA
   * ---------------------------------------------------------
   */

  const academicYears = await prisma.academicYear.findMany({
    orderBy: {
      startDate: "desc",
    },
  });

  const selectedAcademicYearId = academicYearId
    ? parseInt(academicYearId)
    : academicYears[0]?.id;

  const grades = await prisma.grade.findMany({
    orderBy: {
      level: "asc",
    },
  });

  const selectedGradeId = gradeId
    ? parseInt(gradeId)
    : undefined;

  /*
   * ---------------------------------------------------------
   * CLASSES FOR SERVER-SIDE FILTERING
   * ---------------------------------------------------------
   *
   * These classes are used for the selected-class summary
   * and server-side filtering.
   */

  const classes = await prisma.class.findMany({
    where: selectedGradeId
      ? {
          gradeId: selectedGradeId,
        }
      : undefined,
    include: {
      grade: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  /*
   * ---------------------------------------------------------
   * ALL CLASSES FOR CLIENT-SIDE GRADE -> CLASS SELECTOR
   * ---------------------------------------------------------
   *
   * We provide all classes to the client component.
   * The client component filters them immediately when
   * the user changes the Grade selector.
   */

  const allClasses = await prisma.class.findMany({
    select: {
      id: true,
      name: true,
      capacity: true,
      gradeId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const selectedClassId = classId
    ? parseInt(classId)
    : undefined;

  /*
   * ---------------------------------------------------------
   * MAIN ENROLLMENT QUERY
   * ---------------------------------------------------------
   */

  const query: Prisma.StudentEnrollmentWhereInput = {};

  if (search) {
    query.OR = [
      {
        student: {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        student: {
          surname: {
            contains: search,
            mode: "insensitive",
          },
        },
      },
      {
        studentId: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (selectedAcademicYearId) {
    query.academicYearId = selectedAcademicYearId;
  }

  if (selectedClassId) {
    query.classId = selectedClassId;
  } else if (selectedGradeId) {
    query.class = {
      gradeId: selectedGradeId,
    };
  }

  /*
   * ---------------------------------------------------------
   * CLASS SUMMARY
   * ---------------------------------------------------------
   */

  let selectedClass:
    | (Class & {
        grade: Grade;
      })
    | null = null;

  let enrolledCount = 0;

  if (selectedClassId && selectedAcademicYearId) {
    selectedClass = await prisma.class.findUnique({
      where: {
        id: selectedClassId,
      },
      include: {
        grade: true,
      },
    });

    enrolledCount = await prisma.studentEnrollment.count({
      where: {
        academicYearId: selectedAcademicYearId,
        classId: selectedClassId,
      },
    });
  }

  /*
   * ---------------------------------------------------------
   * PAGINATED DATA
   * ---------------------------------------------------------
   */

  const [data, count] = await prisma.$transaction([
    prisma.studentEnrollment.findMany({
      where: query,
      include: {
        student: true,
        class: {
          include: {
            grade: true,
          },
        },
        academicYear: true,
      },
      orderBy: [
        {
          academicYear: {
            startDate: "desc",
          },
        },
        {
          class: {
            name: "asc",
          },
        },
        {
          rollNumber: "asc",
        },
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),

    prisma.studentEnrollment.count({
      where: query,
    }),
  ]);

  /*
   * ---------------------------------------------------------
   * TABLE
   * ---------------------------------------------------------
   */

  const columns = [
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Student ID",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    {
      header: "Academic Year",
      accessor: "academicYear",
      className: "hidden md:table-cell",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Roll No.",
      accessor: "rollNumber",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "actions",
          },
        ]
      : []),
  ];

  const renderRow = (item: StudentEnrollmentList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-200 text-sm hover:bg-red-100"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.student.img || "/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />

        <div className="flex flex-col">
          <h3 className="font-semibold">
            {item.student.name} {item.student.surname}
          </h3>

          <p className="text-xs text-gray-500">
            {item.student.username}
          </p>
        </div>
      </td>

      <td className="hidden md:table-cell">
        {item.studentId}
      </td>

      <td className="hidden md:table-cell">
        {item.academicYear.name}
      </td>

      <td className="hidden md:table-cell">
        {item.class.grade.name}
      </td>

      <td>
        {item.class.name}
      </td>

      <td className="hidden md:table-cell">
        {item.rollNumber}
      </td>

      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer
              table="studentEnrollment"
              type="update"
              data={item}
            />

            <FormContainer
              table="studentEnrollment"
              type="delete"
              id={item.id}
            />
          </div>
        </td>
      )}
    </tr>
  );

  const availableSeats = selectedClass
    ? Math.max(
        selectedClass.capacity - enrolledCount,
        0
      )
    : 0;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* =====================================================
          TOP
      ====================================================== */}

      <div className="flex items-center justify-between mb-6">
        <h1 className="hidden md:block text-lg font-semibold">
          Student Enrollments
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image
                src="/filter.png"
                alt=""
                width={14}
                height={14}
              />
            </button>

            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image
                src="/sort.png"
                alt=""
                width={14}
                height={14}
              />
            </button>

            {role === "admin" && (
              <FormContainer
                table="studentEnrollment"
                type="create"
              />
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          ACADEMIC YEAR / GRADE / CLASS SELECTORS
      ====================================================== */}

      <StudentEnrollmentSelectors
        academicYears={academicYears.map((year) => ({
          id: year.id,
          name: year.name,
        }))}
        grades={grades.map((grade) => ({
          id: grade.id,
          level: grade.level,
          name: grade.name,
          section: grade.section,
        }))}
        classes={allClasses}
        selectedAcademicYearId={selectedAcademicYearId}
        selectedGradeId={selectedGradeId}
        selectedClassId={selectedClassId}
      />

      {/* =====================================================
          SELECTED CLASS SUMMARY
      ====================================================== */}

      {selectedClass && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">
              Class
            </p>

            <h2 className="text-lg font-semibold">
              {selectedClass.name}
            </h2>
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">
              Grade
            </p>

            <h2 className="text-lg font-semibold">
              {selectedClass.grade.name}
            </h2>
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">
              Enrolled Students
            </p>

            <h2 className="text-lg font-semibold">
              {enrolledCount}
            </h2>
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">
              Available Seats
            </p>

            <h2 className="text-lg font-semibold">
              {availableSeats}
            </h2>
          </div>
        </div>
      )}

      {/* =====================================================
          LIST
      ====================================================== */}

      <Table
        columns={columns}
        renderRow={renderRow}
        data={data}
      />

      {/* =====================================================
          PAGINATION
      ====================================================== */}

      <Pagination
        page={p}
        count={count}
      />
    </div>
  );
};

export default StudentEnrollmentListPage;