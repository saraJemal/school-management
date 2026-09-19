import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import Link from "next/link";
import { Prisma, Student, Class, Grade } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import FormContainer from "@/components/FormContainer";

type StudentList = Student & {
  enrollments: Array<{
    class: Class & {
      grade: Grade;
    };
  }>;
};

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // ----------------------------------------------------------
  // TABLE COLUMNS
  // ----------------------------------------------------------

  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Student ID",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    {
      header: "Grade",
      accessor: "grade",
      className: "hidden md:table-cell",
    },
    {
      header: "Phone",
      accessor: "phone",
      className: "hidden lg:table-cell",
    },
    {
      header: "Address",
      accessor: "address",
      className: "hidden lg:table-cell",
    },
    {
      header: "Actions",
      accessor: "actions",
    },
  ];

  // ----------------------------------------------------------
  // RENDER ROW
  // ----------------------------------------------------------

  const renderRow = (item: StudentList) => {
    const enrollment = item.enrollments[0];
    const studentClass = enrollment?.class;

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-200 text-sm hover:bg-red-100"
      >
        {/* INFO */}
        <td className="flex items-center gap-4 p-4">
          <Image
            src={item.img || "/noAvatar.png"}
            alt=""
            width={40}
            height={40}
            className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
          />

          <div className="flex flex-col">
            <h3 className="font-semibold">
              {item.name} {item.surname}
            </h3>

            <p className="text-xs text-gray-500">
              {studentClass?.name || "-"}
            </p>
          </div>
        </td>

        {/* STUDENT ID */}
        <td className="hidden md:table-cell">
          {item.id}
        </td>

        {/* GRADE */}
        <td className="hidden md:table-cell">
          {studentClass?.grade.name || "-"}
        </td>

        {/* PHONE */}
        <td className="hidden lg:table-cell">
          {item.phone}
        </td>

        {/* ADDRESS */}
        <td className="hidden lg:table-cell">
          {item.address}
        </td>

        {/* ACTIONS */}
        <td>
          <div className="flex items-center gap-2">
            <Link href={`/list/students/${item.id}`}>
              <button className="w-7 h-7 flex items-center justify-center rounded-full bg-saraSky">
                <Image
                  src="/view.png"
                  alt=""
                  width={16}
                  height={16}
                />
              </button>
            </Link>

            {role === "admin" && (
              <FormContainer
                table="student"
                type="delete"
                id={item.id}
              />
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ----------------------------------------------------------
  // SEARCH PARAMETERS
  // ----------------------------------------------------------

  const params = await searchParams;

  const { page, ...queryParams } = params;

  const p = page ? parseInt(page) : 1;

  // ----------------------------------------------------------
  // STUDENT QUERY
  // ----------------------------------------------------------

  const query: Prisma.StudentWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== "") {
        switch (key) {
          // --------------------------------------------------
          // STUDENT SEARCH
          // Search by:
          // - Student ID
          // - First name
          // - Surname
          // --------------------------------------------------

          case "search":
            query.OR = [
              {
                id: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                surname: {
                  contains: value,
                  mode: "insensitive",
                },
              },
            ];
            break;

          // --------------------------------------------------
          // IGNORE OLD TEACHER FILTER
          // --------------------------------------------------

          case "teacherId":
            break;

          default:
            break;
        }
      }
    }
  }

  // ----------------------------------------------------------
  // CURRENT ACADEMIC YEAR
  // ----------------------------------------------------------

  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: {
      isCurrent: true,
    },
  });

  // ----------------------------------------------------------
  // STUDENTS
  // ----------------------------------------------------------

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,

      include: {
        enrollments: {
          where: currentAcademicYear
            ? {
                academicYearId: currentAcademicYear.id,
              }
            : undefined,

          include: {
            class: {
              include: {
                grade: true,
              },
            },
          },

          take: 1,
        },
      },

      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),

    prisma.student.count({
      where: query,
    }),
  ]);

  // ----------------------------------------------------------
  // PAGE
  // ----------------------------------------------------------

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* ---------------------------------------------------- */}
      {/* TOP SECTION */}
      {/* ---------------------------------------------------- */}

      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Students
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {/* SEARCH */}
          <TableSearch />

          {/* EXISTING ACTIONS */}
          <div className="flex items-center gap-4 self-end">
            {/* EXISTING FILTER ICON */}
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar"
            >
              <Image
                src="/filter.png"
                alt="Filter"
                width={14}
                height={14}
              />
            </button>

            {/* EXISTING SORT ICON */}
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar"
            >
              <Image
                src="/sort.png"
                alt="Sort"
                width={14}
                height={14}
              />
            </button>

            {/* CREATE STUDENT */}
            {role === "admin" && (
              <FormContainer
                table="student"
                type="create"
              />
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TABLE */}
      {/* ---------------------------------------------------- */}

      <Table
        columns={columns}
        renderRow={renderRow}
        data={data}
      />

      {/* ---------------------------------------------------- */}
      {/* PAGINATION */}
      {/* ---------------------------------------------------- */}

      <Pagination
        page={p}
        count={count}
      />
    </div>
  );
};

export default StudentListPage;