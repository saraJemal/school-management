import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import { Attendance, Class, Lesson, Prisma, Subject, Teacher, Student } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { LocalDate } from "@/components/LocalDate";
import { auth } from "@clerk/nextjs/server";
import FormContainer from "@/components/FormContainer";

type AttendanceList = Attendance & {
  student: Student;
  lesson: {
    subject: Subject;
    class: Class;
    teacher: Teacher;
  };
};

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  //  Columns (same pattern as exam)
  const columns = [
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Present",
      accessor: "present",
    },
    ...(role === "admin" || role === "teacher"
      ? [
          {
            header: "Actions",
            accessor: "actions",
          },
        ]
      : []),
  ];

  //  Row renderer
  const renderRow = (item: AttendanceList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-200 text-sm hover:bg-red-100"
    >
      <td className="flex items-center gap-4 p-4">
        {item.student.name} {item.student.surname}
      </td>
      <td>{item.lesson.subject.name}</td>
      <td>{item.lesson.class.name}</td>
      <td className="hidden md:table-cell">
        {item.lesson.teacher.name + " " + item.lesson.teacher.surname}
      </td>
      <td className="hidden md:table-cell">
        <LocalDate time={item.date} type="date" />
      </td>
      <td>{item.present ? "Yes" : "No"}</td>

      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="attendance" type="update" data={item} />
              <FormContainer table="attendance" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );

  //  Pagination
  const params = await searchParams;
  const { page, ...queryParams } = params;
  const p = page ? parseInt(page) : 1;

  //  Query
  const query: Prisma.AttendanceWhereInput = {};
  query.lesson = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.lesson.classId = parseInt(value);
            break;
          case "teacherId":
            query.lesson.teacherId = value;
            break;
          case "search":
            query.lesson.subject = {
              name: { contains: value, mode: "insensitive" },
            };
            break;
          default:
            break;
        }
      }
    }
  }

  //  Role filtering (same logic as exam)
  switch (role) {
    case "admin":
      break;

    case "teacher":
      query.lesson.teacherId = currentUserId!;
      break;

    case "student":
      query.studentId = currentUserId!;
      break;

    case "parent":
      query.student = {
        parentId: currentUserId!,
      };
      break;

    default:
      break;
  }

  //  Fetch data
  const [data, count] = await prisma.$transaction([
    prisma.attendance.findMany({
      where: query,
      include: {
        student: {
          select: { name: true, surname: true },
        },
        lesson: {
          select: {
            subject: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
            class: { select: { name: true } },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),
    prisma.attendance.count({ where: query }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Attendance
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>

            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>

            {(role === "admin" || role === "teacher") && (
              <FormContainer table="attendance" type="create" />
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <Table columns={columns} renderRow={renderRow} data={data} />

      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AttendanceListPage;