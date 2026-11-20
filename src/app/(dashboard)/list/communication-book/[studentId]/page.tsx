import FormContainer from "@/components/FormContainer";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

type PageProps = {
  params: {
    studentId: string;
  };
  searchParams: {
    academicYearId?: string;
    classId?: string;
    date?: string;
  };
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const toDateInputValue = (date: Date) =>
  date.toISOString().slice(0, 10);

const getTodayDateString = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

const normalizeDateString = (
  value?: string
) => {
  if (
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  return getTodayDateString();
};
export default async function CommunicationBookHistoryPage({
  params,
  searchParams,
}: PageProps) {
  // ------------------------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------------------------

  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role = sessionClaims?.metadata?.role as
    | "admin"
    | "teacher"
    | "parent"
    | undefined;

  if (
    role !== "admin" &&
    role !== "teacher" &&
    role !== "parent"
  ) {
    redirect("/");
  }

  // ------------------------------------------------------------
  // STUDENT + EARLY ACCESS CHECK
  // ------------------------------------------------------------

  const student = await prisma.student.findUnique({
    where: {
      id: params.studentId,
    },
    include: {
      parent: true,
    },
  });

  if (!student) {
    redirect("/list/communication-book");
  }

  // Parents can only access their own children.
  // Check this before loading enrollment or history data.
  if (
    role === "parent" &&
    student.parent?.clerkUserId !== userId
  ) {
    redirect("/list/communication-book");
  }


  // ------------------------------------------------------------
  // ACADEMIC YEARS
  // ------------------------------------------------------------

  const academicYears = await prisma.academicYear.findMany({
    orderBy: {
      startDate: "desc",
    },
  });

  if (academicYears.length === 0) {
    return (
      <div className="p-6">
        <p className="text-red-500">
          No academic year has been configured.
        </p>
      </div>
    );
  }

  const requestedAcademicYearId = searchParams.academicYearId
    ? Number(searchParams.academicYearId)
    : null;

  const selectedAcademicYear =
    academicYears.find(
      (academicYear) =>
        academicYear.id === requestedAcademicYearId
    ) ??
    academicYears.find(
      (academicYear) => academicYear.isCurrent
    ) ??
    academicYears[0];

  // ------------------------------------------------------------
  // STUDENT ENROLLMENT
  // ------------------------------------------------------------

  const enrollment =
    await prisma.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: student.id,
          academicYearId: selectedAcademicYear.id,
        },
      },
      include: {
        class: {
          include: {
            grade: true,
            homeRoomTeacher: true,
          },
        },
        academicYear: true,
      },
    });

  if (!enrollment) {
    return (
      <div className="p-6">
        <Link
          href="/list/communication-books"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Communication Book
        </Link>

        <div className="mt-6 rounded-md border bg-white p-6">
          <h1 className="text-lg font-semibold">
            Communication Book History
          </h1>

          <p className="mt-3 text-sm text-red-500">
            This student is not enrolled for{" "}
            {selectedAcademicYear.name}.
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // ROLE / PERMISSION CHECKS
  // ------------------------------------------------------------

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

    teacherId = teacher?.id ?? null;
  }

  const isActiveTeacher =
    role === "teacher" &&
    teacherId !== null &&
    enrollment.class.homeRoomTeacherId === teacherId;

  // Do not allow teachers to view students outside
  // their assigned homeroom class.
  if (role === "teacher" && !isActiveTeacher) {
    redirect("/list/communication-book");
  }

  const canManageTeacherRecord =
    role === "admin" || isActiveTeacher;

 // ------------------------------------------------------------
// SELECTED DATE
// ------------------------------------------------------------
//
// Communication Book dates are calendar dates.
// Keep the selected date as YYYY-MM-DD.
// Do NOT convert it to a JavaScript Date here.
// This prevents UTC/local-timezone shifting.
// ------------------------------------------------------------

const selectedDate = normalizeDateString(
  searchParams.date
);

  // ------------------------------------------------------------
  // COMMUNICATION BOOK HISTORY
  // ------------------------------------------------------------


const communicationBooks =
  await prisma.communicationBook.findMany({
    where: {
      studentId: student.id,
      academicYearId: selectedAcademicYear.id,
    },
    include: {
      subjects: {
        include: {
          subject: true,
        },
        orderBy: {
          subject: {
            name: "asc",
          },
        },
      },
      class: {
        include: {
          grade: true,
        },
      },
      academicYear: true,
    },
    orderBy: {
      date: "desc",
    },
  });

// ------------------------------------------------------------
// SELECTED COMMUNICATION BOOK
// ------------------------------------------------------------
//
// Compare database calendar date directly with the
// YYYY-MM-DD selected date.
// ------------------------------------------------------------

const selectedCommunicationBook =
  communicationBooks.find(
    (communicationBook) =>
      communicationBook.date
        .toISOString()
        .slice(0, 10) === selectedDate
  ) ?? null;
  // ------------------------------------------------------------
  // PARENT INFORMATION
  // ------------------------------------------------------------

  const teacherName =
  selectedCommunicationBook?.teacherName ??
  (enrollment.class.homeRoomTeacher
    ? `${enrollment.class.homeRoomTeacher.name} ${
        enrollment.class.homeRoomTeacher.surname ?? ""
      }`.trim()
    : "");

  const parentName =
    selectedCommunicationBook?.parentName ??
    (student.parent
      ? `${student.parent.name} ${
          student.parent.surname ?? ""
        }`.trim()
      : "");

  // ------------------------------------------------------------
  // DATE HISTORY
  // ------------------------------------------------------------

  const historyDates = communicationBooks.map(
    (communicationBook) => ({
      id: communicationBook.id,
      date: communicationBook.date,
    })
  );

  return (
    <div className="flex-1 p-4 flex flex-col gap-4">
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Communication Book History
          </h1>

          <p className="text-sm text-gray-500">
            View the daily Communication Book for this
            student.
          </p>
        </div>

        <Link
          href={`/list/communication-book?academicYearId=${selectedAcademicYear.id}&classId=${enrollment.classId}&date=${selectedDate}`}
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Back
        </Link>
      </div>

      {/* ======================================================
          STUDENT INFORMATION
      ====================================================== */}

      <div className="rounded-md border bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div>
            <p className="text-xs text-gray-500">
              Student ID
            </p>

            <p className="font-semibold">
              {student.id}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Student Name
            </p>

            <p className="font-semibold">
              {student.name}{" "}
              {student.middleName
                ? `${student.middleName} `
                : ""}
              {student.surname ?? ""}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Grade
            </p>

            <p className="font-semibold">
              {enrollment.class.grade.name}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Class
            </p>

            <p className="font-semibold">
              {enrollment.class.name}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Academic Year
            </p>

            <p className="font-semibold">
              {selectedAcademicYear.name}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          DATE SELECTOR
      ====================================================== */}

      <div className="rounded-md border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">
              Daily History
            </h2>

            <p className="text-sm text-gray-500">
              Select a saved Communication Book date.
            </p>
          </div>

          <form method="GET">
            <input
              type="hidden"
              name="academicYearId"
              value={selectedAcademicYear.id}
            />

            <input
              type="hidden"
              name="classId"
              value={enrollment.classId}
            />

            <input
              type="date"
              name="date"
              defaultValue={selectedDate}
              className="rounded-md border px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="ml-2 rounded-md bg-badirBlue px-4 py-2 text-sm text-white hover:bg-badirBlue/80"
            >
              View
            </button>
          </form>
        </div>

        {historyDates.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {historyDates.map((history) => {
              const historyDate =
                toDateInputValue(history.date);

              return (
                <Link
                  key={history.id}
                  href={`/list/communication-book/${student.id}?academicYearId=${selectedAcademicYear.id}&classId=${enrollment.classId}&date=${historyDate}`}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    historyDate === selectedDate
                      ? "bg-gray-800 text-white"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {formatDate(history.date)}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================
          RECORD ACTIONS
      ====================================================== */}

      <div className="flex items-center justify-between">
        <div>
          {selectedCommunicationBook ? (
            <p className="text-sm text-green-600">
              Communication Book recorded for{" "}
              {formatDate(selectedCommunicationBook.date)}.
            </p>
          ) : (
            <p className="text-sm text-gray-500">
                No Communication Book has been recorded for{" "}
                {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString(
                  "en-GB",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "UTC",
                  }
                )}.
              </p>
          )}
        </div>

        {canManageTeacherRecord &&
          selectedCommunicationBook && (
            <div className="flex items-center gap-2">
              <FormContainer
                table="communicationBook"
                type="update"
                data={{
                  communicationBook:
                    selectedCommunicationBook,
                }}
              />

              <FormContainer
                table="communicationBook"
                type="delete"
                id={selectedCommunicationBook.id}
              />
            </div>
          )}

        {canManageTeacherRecord &&
          !selectedCommunicationBook && (
            <FormContainer
              table="communicationBook"
              type="create"
              data={{
                studentId: student.id,
                academicYearId:
                  selectedAcademicYear.id,
                classId: enrollment.classId,
                date: selectedDate,
              }}
            />
          )}

          {/* Parent can edit only their own child's response */}
          {role === "parent" && selectedCommunicationBook && (
            <FormContainer
              table="communicationBook"
              type="update"
              mode="parent"
              id={selectedCommunicationBook.id}
              data={{
                communicationBook: selectedCommunicationBook,
              }}
            />
          )}

      </div>

      {/* ======================================================
          PHYSICAL COMMUNICATION BOOK
      ====================================================== */}

      {selectedCommunicationBook && (
        <div className="rounded-md border bg-white p-6">
          <div className="mx-auto max-w-6xl border border-black bg-white p-6 text-black">
            {/* ------------------------------------------------
                SCHOOL HEADER
            ------------------------------------------------ */}

            <div className="border-b-2 border-black pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <p className="text-lg font-bold">
                    Badir Academy
                  </p>
                </div>

                <div className="flex justify-center">
                  <Image
                    src="/badirLogo.png"
                    alt="School Logo"
                    width={80}
                    height={80}
                    className="object-contain"
                  />
                </div>

                <div className="flex-1 text-center">
                  <p
                    className="text-lg font-bold"
                    dir="rtl"
                  >
                    በድር አካዳሚ
                  </p>
                </div>
              </div>

              <h2 className="mt-3 text-center text-xl font-bold">
                COMMUNICATION BOOK
              </h2>
            </div>

            {/* ------------------------------------------------
                DAILY INFORMATION
            ------------------------------------------------ */}

            <div className="mt-4 grid grid-cols-3 border border-black">
              <div className="border-r border-black p-2">
                <span className="font-bold">Date:</span>{" "}
                {formatDate(
                  selectedCommunicationBook.date
                )}
              </div>

              <div className="border-r border-black p-2">
                <span className="font-bold">
                  Daily Word:
                </span>{" "}
                {selectedCommunicationBook.dailyWord ??
                  ""}
              </div>

              <div className="p-2">
                <span className="font-bold">
                  Character Trait:
                </span>{" "}
                {selectedCommunicationBook.characterTrait ??
                  ""}
              </div>
            </div>

            {/* ------------------------------------------------
                STUDENT INFORMATION
            ------------------------------------------------ */}

            <div className="mt-4 grid grid-cols-5 border border-black">
              <div className="border-r border-black p-2">
                <span className="font-bold">
                  Student ID:
                </span>{" "}
                {student.id}
              </div>

              <div className="border-r border-black p-2">
                <span className="font-bold">
                  Student Name:
                </span>{" "}
                {student.name}{" "}
                {student.middleName
                  ? `${student.middleName} `
                  : ""}
                {student.surname ?? ""}
              </div>

              <div className="border-r border-black p-2">
                <span className="font-bold">
                  Grade:
                </span>{" "}
                {enrollment.class.grade.name}
              </div>

              <div className="border-r border-black p-2">
                <span className="font-bold">
                  Class:
                </span>{" "}
                {enrollment.class.name}
              </div>

              <div className="p-2">
                <span className="font-bold">
                  Academic Year:
                </span>{" "}
                {selectedAcademicYear.name}
              </div>
            </div>

            {/* ------------------------------------------------
                SUBJECT TABLE
            ------------------------------------------------ */}

            <div className="mt-4">
              <table className="w-full border-collapse border border-black text-sm">
                <thead>
                  <tr>
                    <th className="border border-black p-2 text-left">
                      Subject
                    </th>

                    <th className="border border-black p-2 text-left">
                      Homework / Instruction
                    </th>

                    <th className="border border-black p-2 text-left">
                      ASP
                    </th>

                    <th className="border border-black p-2 text-left">
                      Parent Signature
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {selectedCommunicationBook.subjects.map(
                    (item) => (
                      <tr key={item.id}>
                        <td className="border border-black p-2 font-medium">
                          {item.subject.name}
                        </td>

                        <td className="border border-black p-2 whitespace-pre-wrap">
                          {item.homeworkInstruction ??
                            ""}
                        </td>

                        <td className="border border-black p-2 whitespace-pre-wrap">
                          {item.asp ?? ""}
                        </td>

                        <td className="border border-black p-2">
                          {item.parentSignature ? (
                            <Image
                              src={
                                item.parentSignature
                              }
                              alt="Parent Signature"
                              width={140}
                              height={50}
                              className="h-[45px] w-auto object-contain"
                            />
                          ) : (
                            <div className="h-[45px]" />
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {selectedCommunicationBook.subjects
                    .length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="border border-black p-4 text-center"
                      >
                        No homework or ASP has been
                        recorded for this day.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ------------------------------------------------
                TEACHER SECTION
            ------------------------------------------------ */}

            <div className="mt-4 border border-black">
              <div className="border-b border-black bg-gray-50 p-2 font-bold">
                Teacher Section
              </div>

              <div className="grid grid-cols-3">
                <div className="border-r border-black p-3">
                  <p className="font-bold">
                    Teacher Comment
                  </p>

                  <p className="mt-2 min-h-[80px] whitespace-pre-wrap">
                    {selectedCommunicationBook.teacherComment ??
                      ""}
                  </p>
                </div>

                <div className="border-r border-black p-3">
                  <p className="font-bold">
                    Teacher Name
                  </p>

                  <p className="mt-2">
                    {teacherName}
                  </p>
                </div>

                <div className="p-3">
                  <p className="font-bold">
                    Teacher Signature
                  </p>

                  <div className="mt-2 h-[60px]">
                    {selectedCommunicationBook.teacherSignature ? (
                      <Image
                        src={
                          selectedCommunicationBook.teacherSignature
                        }
                        alt="Teacher Signature"
                        width={180}
                        height={60}
                        className="h-[55px] w-auto object-contain"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------
                PARENT SECTION
            ------------------------------------------------ */}

            <div className="mt-4 border border-black">
              <div className="border-b border-black bg-gray-50 p-2 font-bold">
                Parent Section
              </div>

              <div className="grid grid-cols-3">
                <div className="border-r border-black p-3">
                  <p className="font-bold">
                    Parent Comment
                  </p>

                  <p className="mt-2 min-h-[80px] whitespace-pre-wrap">
                    {selectedCommunicationBook.parentComment ??
                      ""}
                  </p>
                </div>

                <div className="border-r border-black p-3">
                  <p className="font-bold">
                    Parent Name
                  </p>

                  <p className="mt-2">
                    {parentName}
                  </p>
                </div>

                <div className="p-3">
                  <p className="font-bold">
                    Parent Signature
                  </p>

                  <div className="mt-2 h-[60px]">
                    {selectedCommunicationBook.parentSignature ? (
                      <Image
                        src={
                          selectedCommunicationBook.parentSignature
                        }
                        alt="Parent Signature"
                        width={180}
                        height={60}
                        className="h-[55px] w-auto object-contain"
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          WEEKLY PROGRESS
      ====================================================== */}

      <div className="flex justify-end">
        <Link
          href={`/list/communication-book/${student.id}/weekly-progress?academicYearId=${selectedAcademicYear.id}&classId=${enrollment.classId}&date=${selectedDate}`}
          className="rounded-md border px-4 py-2 text-sm bg-badirBlue hover:bg-gray-100"
        >
          Weekly Progress
        </Link>
      </div>
    </div>
  );
}