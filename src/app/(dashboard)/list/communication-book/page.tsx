import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

type CommunicationBookList = {
  enrollmentId: number;
  studentId: string;
  studentName: string;
  rollNumber: number;
  hasCommunicationBook: boolean;
};

type PageProps = {
  searchParams: {
    page?: string;
    search?: string;
    academicYearId?: string;
    classId?: string;
    date?: string;
  };
};

const CommunicationBookPage = async ({
  searchParams,
}: PageProps) => {
  // ==========================================================
  // AUTHENTICATION
  // ==========================================================

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role = (
    sessionClaims?.metadata as { role?: string }
  )?.role;

  if (
    role !== "admin" &&
    role !== "teacher" &&
    role !== "parent"
  ) {
    redirect("/dashboard");
  }

  // ==========================================================
  // PARAMETERS
  // ==========================================================

  const currentPage = Math.max(
    1,
    Number(searchParams.page) || 1
  );

  const searchTerm = searchParams.search?.trim() || "";

  // ==========================================================
  // PARENT ID
  //
  // Parent.id is the database ID.
  // userId is the Clerk ID. Never use userId as Parent.id.
  // ==========================================================

  let parentId: string | null = null;

  if (role === "parent") {
    const parent = await prisma.parent.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!parent) {
      redirect("/dashboard");
    }

    parentId = parent.id;
  }

  // ==========================================================
  // TEACHER ID
  //
  // Teacher access is based on the homeroom assignment.
  // ==========================================================

  let teacherId: string | null = null;

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
      redirect("/dashboard");
    }

    teacherId = teacher.id;
  }

  // ==========================================================
  // ACADEMIC YEARS
  // ==========================================================

  const academicYears = await prisma.academicYear.findMany({
    orderBy: {
      startDate: "desc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (academicYears.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">
          Communication Book
        </h1>

        <p className="mt-4 text-sm text-gray-500">
          No academic year is available.
        </p>
      </div>
    );
  }

  // ==========================================================
  // SELECTED ACADEMIC YEAR
  // ==========================================================

  const requestedAcademicYearId =
    searchParams.academicYearId &&
    !Number.isNaN(Number(searchParams.academicYearId))
      ? Number(searchParams.academicYearId)
      : null;

  const selectedAcademicYearId =
    requestedAcademicYearId !== null &&
    academicYears.some(
      (year) => year.id === requestedAcademicYearId
    )
      ? requestedAcademicYearId
      : academicYears[0].id;

  // ==========================================================
  // PARENT'S CLASS IDS
  //
  // Determine classes from the parent's own children.
  // The final enrollment query below also enforces ownership,
  // so a class filter can never expose other students.
  // ==========================================================

  let parentClassIds: number[] = [];

  if (role === "parent" && parentId) {
    const childEnrollments =
      await prisma.studentEnrollment.findMany({
        where: {
          student: {
            parentId,
          },
        },
        select: {
          classId: true,
        },
        distinct: ["classId"],
      });

    parentClassIds = childEnrollments.map(
      (enrollment) => enrollment.classId
    );
  }

  // ==========================================================
  // CLASSES
  //
  // Admin: all classes.
  // Teacher: homeroom classes only.
  // Parent: classes containing their own children.
  // ==========================================================

  const classWhere: Prisma.ClassWhereInput =
    role === "admin"
      ? {}
      : role === "teacher"
        ? {
            homeRoomTeacherId: teacherId!,
          }
        : {
            id: {
              in: parentClassIds,
            },
          };

  const classes = await prisma.class.findMany({
    where: classWhere,
    select: {
      id: true,
      name: true,
      gradeId: true,
      homeRoomTeacherId: true,
      grade: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        grade: {
          name: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  });

  // ==========================================================
  // SELECTED CLASS
  //
  // The requested class must belong to the authorized class
  // list. Invalid or unauthorized IDs are not accepted.
  // ==========================================================

  const requestedClassId =
    searchParams.classId &&
    !Number.isNaN(Number(searchParams.classId))
      ? Number(searchParams.classId)
      : null;

  const selectedClass =
    requestedClassId !== null
      ? classes.find(
          (schoolClass) =>
            schoolClass.id === requestedClassId
        ) ?? null
      : null;

  // ==========================================================
  // DATE
  // ==========================================================

  const selectedDate =
    searchParams.date ??
    new Date().toISOString().split("T")[0];

  // ==========================================================
  // FILTER FORM
  // ==========================================================

  const filterForm = (
    <form
      method="GET"
      action="/list/communication-book"
      className="flex flex-wrap items-end gap-4"
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="academicYearId"
          className="text-xs text-gray-500"
        >
          Academic Year
        </label>

        <select
          id="academicYearId"
          name="academicYearId"
          defaultValue={String(selectedAcademicYearId)}
          className="w-48 rounded-md border border-gray-300 p-2 text-sm"
        >
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="classId"
          className="text-xs text-gray-500"
        >
          Class
        </label>

        <select
          id="classId"
          name="classId"
          defaultValue={
            selectedClass
              ? String(selectedClass.id)
              : ""
          }
          className="w-48 rounded-md border border-gray-300 p-2 text-sm"
        >
          <option value="">Select class</option>

          {classes.map((schoolClass) => (
            <option
              key={schoolClass.id}
              value={schoolClass.id}
            >
              {schoolClass.grade.name} {schoolClass.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="date"
          className="text-xs text-gray-500"
        >
          Date
        </label>

        <input
          id="date"
          type="date"
          name="date"
          defaultValue={selectedDate}
          className="rounded-md border border-gray-300 p-2 text-sm"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-badirBlue px-4 py-2 text-sm font-medium text-white"
      >
        View
      </button>
    </form>
  );

  // ==========================================================
  // PAGE BEFORE CLASS IS SELECTED
  // ==========================================================

  if (!selectedClass) {
    return (
      <div className="m-4 mt-0 flex-1 rounded-md bg-white p-4">
        <div className="mb-6">
          <h1 className="text-lg font-semibold">
            Communication Book
          </h1>

          <p className="text-sm text-gray-500">
            {role === "parent"
              ? "Select a class containing one of your children to view their communication book records."
              : "Select a class and date to view communication book records."}
          </p>
        </div>

        <div className="mb-6">{filterForm}</div>

        <div className="rounded-md border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">
            {role === "parent" && classes.length === 0
              ? "No class enrollments were found for your children."
              : "Select an authorized class and click View to continue."}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // ENROLLMENT FILTER
  //
  // IMPORTANT:
  // Parent ownership is applied directly to the database
  // query, not merely to the displayed table.
  // ==========================================================

  const enrollmentWhere: Prisma.StudentEnrollmentWhereInput =
    {
      academicYearId: selectedAcademicYearId,
      classId: selectedClass.id,

      ...(role === "parent"
        ? {
            student: {
              parentId: parentId!,
              ...(searchTerm
                ? {
                    OR: [
                      {
                        id: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                      {
                        name: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                      {
                        middleName: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                      {
                        surname: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                    ],
                  }
                : {}),
            },
          }
        : {
            ...(searchTerm
              ? {
                  student: {
                    OR: [
                      {
                        id: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                      {
                        name: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                      {
                        middleName: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                      {
                        surname: {
                          contains: searchTerm,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                }
              : {}),
          }),
    };

  // ==========================================================
  // ENROLLMENTS
  // ==========================================================

  const [enrollments, count] =
    await prisma.$transaction([
      prisma.studentEnrollment.findMany({
        where: enrollmentWhere,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              middleName: true,
              surname: true,
            },
          },
        },
        orderBy: {
          rollNumber: "asc",
        },
        skip: ITEM_PER_PAGE * (currentPage - 1),
        take: ITEM_PER_PAGE,
      }),

      prisma.studentEnrollment.count({
        where: enrollmentWhere,
      }),
    ]);

  // ==========================================================
  // COMMUNICATION BOOK RECORDS FOR SELECTED DATE
  // ==========================================================

  const startOfDay = new Date(
    `${selectedDate}T00:00:00`
  );

  const endOfDay = new Date(
    `${selectedDate}T00:00:00`
  );

  endOfDay.setDate(endOfDay.getDate() + 1);

  const communicationBooks =
    await prisma.communicationBook.findMany({
      where: {
        academicYearId: selectedAcademicYearId,
        classId: selectedClass.id,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },

        // Restrict the lookup itself to this parent's children.
        ...(role === "parent"
          ? {
              student: {
                parentId: parentId!,
              },
            }
          : {}),
      },
      select: {
        studentId: true,
      },
    });

  const communicationBookStudentIds = new Set(
    communicationBooks.map((item) => item.studentId)
  );

  // ==========================================================
  // TABLE DATA
  // ==========================================================

  const tableData: CommunicationBookList[] =
    enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      studentId: enrollment.student.id,
      studentName: [
        enrollment.student.name,
        enrollment.student.middleName,
        enrollment.student.surname,
      ]
        .filter(Boolean)
        .join(" "),
      rollNumber: enrollment.rollNumber,
      hasCommunicationBook:
        communicationBookStudentIds.has(
          enrollment.student.id
        ),
    }));

  // ==========================================================
  // TABLE COLUMNS
  // ==========================================================

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
      header: "Status",
      accessor: "hasCommunicationBook",
    },
  ];

  // ==========================================================
  // RENDER ROW
  // ==========================================================

  const renderRow = (item: CommunicationBookList) => (
    <tr
      key={item.enrollmentId}
      className="border-b border-gray-200 text-sm hover:bg-gray-50"
    >
      <td className="px-4 py-3">
        {item.rollNumber}
      </td>

      <td className="px-4 py-3">
        <Link
          href={
            `/list/communication-book/${encodeURIComponent(item.studentId)}` +
            `?academicYearId=${selectedAcademicYearId}` +
            `&classId=${selectedClass.id}` +
            `&date=${encodeURIComponent(selectedDate)}`
          }
          className="font-medium text-lamaSky hover:underline"
        >
          {item.studentId}
        </Link>
      </td>

      <td className="px-4 py-3">
        {item.studentName}
      </td>

      <td className="px-4 py-3">
        {item.hasCommunicationBook ? (
          <span className="font-medium text-green-600">
            Recorded
          </span>
        ) : (
          <span className="text-gray-400">
            Not recorded
          </span>
        )}
      </td>
    </tr>
  );

  // ==========================================================
  // MAIN PAGE
  // ==========================================================

  return (
    <div className="m-4 mt-0 flex-1 rounded-md bg-white p-4">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">
          Communication Book
        </h1>

        <p className="text-sm text-gray-500">
          {selectedClass.grade.name} {selectedClass.name}
        </p>
      </div>

      <div className="mb-6">{filterForm}</div>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-gray-700">
          {role === "parent" ? "Your Children" : "Students"}
        </h2>

        <TableSearch />
      </div>

      <Table
        columns={columns}
        renderRow={renderRow}
        data={tableData}
      />

      <Pagination
        page={currentPage}
        count={count}
      />
    </div>
  );
};

export default CommunicationBookPage;