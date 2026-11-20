import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FormContainer from "@/components/FormContainer";
import { auth } from "@clerk/nextjs/server";
import {
  WEEKLY_PROGRESS_CATEGORIES,
  WEEKLY_PROGRESS_CRITERIA,
} from "@/lib/weeklyProgress";
import WeeklyProgressParentEditor from "@/components/WeeklyProgressParentEditor";

const getDateString = (date: Date) =>
  date.toISOString().slice(0, 10);

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

const getMonday = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const day = date.getUTCDay();

  const diff = day === 0 ? -6 : 1 - day;

  date.setUTCDate(date.getUTCDate() + diff);

  return getDateString(date);
};

const getFriday = (weekStart: string) => {
  const date = new Date(`${weekStart}T00:00:00.000Z`);

  // Monday + 4 days = Friday
  date.setUTCDate(date.getUTCDate() + 4);

  return getDateString(date);
};

const getTodayDateString = () => {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

const getRatingLabel = (rating: string) => {
  switch (rating) {
    case "EXCELLENT":
      return "Excellent";

    case "VERY_GOOD":
      return "Very Good";

    case "GOOD":
      return "Good";

    case "SATISFACTORY":
      return "Satisfactory";

    case "NEEDS_IMPROVEMENT":
      return "Needs Improvement";

    default:
      return rating;
  }
};

const WeeklyProgressPage = async ({
  params,
  searchParams,
}: {
  params: { studentId: string };
  searchParams: {
    weekStart?: string;
    date?: string;
    academicYearId?: string;
    classId?: string;
  };
}) => {
  const { userId, sessionClaims } = await auth();

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  if (!userId) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-md p-6 text-center text-red-500">
          You are not authorized to access this page.
        </div>
      </div>
    );
  }

  const studentId = params.studentId;

  // ----------------------------------------------------------
  // CURRENT ACADEMIC YEAR
  // ----------------------------------------------------------

  const currentAcademicYear =
    await prisma.academicYear.findFirst({
      where: {
        isCurrent: true,
      },
      select: {
        id: true,
      },
    });

  if (!currentAcademicYear) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-md p-6 text-center text-red-500">
          Current academic year not found.
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // STUDENT ENROLLMENT
  // ----------------------------------------------------------

  const enrollment =
    await prisma.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId,
          academicYearId: currentAcademicYear.id,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            surname: true,
             parent: {
              select: {
                clerkUserId: true,
              },
            },
          },
        },

        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },

        class: {
          select: {
            id: true,
            name: true,
            homeRoomTeacherId: true,
            grade: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

  if (!enrollment) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-md p-6 text-center text-red-500">
          Student enrollment not found.
        </div>
      </div>
    );
  }

  if (
  role === "parent" &&
  enrollment.student.parent?.clerkUserId !== userId
) {
  return (
    <div className="p-4">
      <div className="bg-white rounded-md p-6 text-center text-red-500">
        You are not authorized to access this student&apos;s report.
      </div>
    </div>
  );
}

  // ----------------------------------------------------------
  // ROLE AUTHORIZATION
  // ----------------------------------------------------------

  if (
    role !== "admin" &&
    role !== "teacher" &&
    role !== "parent"
  ) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-md p-6 text-center text-red-500">
          You are not authorized to access this page.
        </div>
      </div>
    );
  }

// ----------------------------------------------------------
// WEEK
// ----------------------------------------------------------

const requestedWeekStart =
  searchParams.weekStart &&
  /^\d{4}-\d{2}-\d{2}$/.test(
    searchParams.weekStart
  )
    ? searchParams.weekStart
    : searchParams.date &&
        /^\d{4}-\d{2}-\d{2}$/.test(
          searchParams.date
        )
      ? searchParams.date
      : getTodayDateString();

const weekStart = getMonday(requestedWeekStart);
const weekEnd = getFriday(weekStart);

const weekStartDate = new Date(
  `${weekStart}T00:00:00.000Z`
);

  // ----------------------------------------------------------
  // WEEKLY PROGRESS HISTORY
  // ----------------------------------------------------------

  const weeklyProgressReports =
    await prisma.weeklyProgressReport.findMany({
      where: {
        studentId,
        academicYearId: enrollment.academicYearId,
      },
      include: {
        items: true,
      },
      orderBy: {
        weekStart: "desc",
      },
    });

  const selectedReport =
    weeklyProgressReports.find(
      (report) =>
        getDateString(report.weekStart) ===
        weekStart
    ) ?? null;

  // ----------------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------------

  const backUrl =
    `/list/communication-book/${studentId}`;

  const previousWeek = (() => {
    const date = new Date(
      `${weekStart}T00:00:00.000Z`
    );

    date.setUTCDate(date.getUTCDate() - 7);

    return getDateString(date);
  })();

  const nextWeek = (() => {
    const date = new Date(
      `${weekStart}T00:00:00.000Z`
    );

    date.setUTCDate(date.getUTCDate() + 7);

    return getDateString(date);
  })();

  // ----------------------------------------------------------
  // CREATE DATA
  //
  // The form itself initializes the rating values.
  // We provide the complete 11-criterion structure.
  // ----------------------------------------------------------

  const createItems = WEEKLY_PROGRESS_CRITERIA.map(
    (item) => ({
      criterion: item.criterion,
      category: item.category,
    })
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* ======================================================
          TOP NAVIGATION
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <Link
          href={backUrl}
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Communication Book
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`?weekStart=${previousWeek}`}
            className="px-3 py-2 border rounded-md text-sm whitespace-nowrap"
          >
            Previous Week
          </Link>

          <Link
            href={`?weekStart=${nextWeek}`}
            className="px-3 py-2 border rounded-md text-sm whitespace-nowrap"
          >
            Next Week
          </Link>
        </div>
      </div>

      {/* ======================================================
          STUDENT INFORMATION
      ====================================================== */}

      <div className="border rounded-md p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Student ID
            </p>

            <p className="font-semibold break-words">
              {enrollment.student.id}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Student Name
            </p>

            <p className="font-semibold break-words">
              {enrollment.student.name}{" "}
              {enrollment.student.surname}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Grade
            </p>

            <p className="font-semibold break-words">
              {enrollment.class.grade.name}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Class
            </p>

            <p className="font-semibold break-words">
              {enrollment.class.name}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Academic Year
            </p>

            <p className="font-semibold break-words">
              {enrollment.academicYear.name}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================
          WEEK SELECTOR
      ====================================================== */}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <label className="text-xs text-gray-500">
            Week Start
          </label>

          <form className="mt-2 flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              name="weekStart"
              defaultValue={weekStart}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            />

            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-badirStar text-sm"
            >
              View Week
            </button>
          </form>
        </div>

        <div className="text-sm text-gray-600">
          <span className="font-medium">
            Week:
          </span>{" "}
          {formatDate(weekStartDate)} –{" "}
          {formatDate(
            new Date(
              `${weekEnd}T00:00:00.000Z`
            )
          )}
        </div>
      </div>

      {/* ======================================================
          WEEKLY REPORT HISTORY
      ====================================================== */}

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">
          Weekly Progress History
        </h2>

        <div className="flex flex-wrap gap-2">
          {weeklyProgressReports.length === 0 ? (
            <span className="text-sm text-gray-500">
              No weekly progress reports recorded yet.
            </span>
          ) : (
            weeklyProgressReports.map((report) => {
              const reportWeekStart =
                getDateString(report.weekStart);

              return (
                <Link
                  key={report.id}
                  href={`?weekStart=${reportWeekStart}`}
                  className={`px-3 py-2 rounded-md border text-sm ${
                    reportWeekStart === weekStart
                      ? "bg-badirStar font-semibold"
                      : "bg-white"
                  }`}
                >
                  {reportWeekStart}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================
          REPORT ACTIONS
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">
          Weekly Progress Report
        </h2>

        <div className="flex items-center gap-2">
          {selectedReport ? (
            <>
              {(role === "admin" || role === "teacher") && (
                <FormContainer
                  table="weeklyProgress"
                  type="update"
                  data={selectedReport}
                />
              )}

              {(role === "admin" || role === "teacher") && (
                <FormContainer
                  table="weeklyProgress"
                  type="delete"
                  id={selectedReport.id}
                />
              )}
            </>
          ) : (
            (role === "admin" || role === "teacher") && (
              <FormContainer
                table="weeklyProgress"
                type="create"
                data={{
                  studentId,
                  academicYearId: enrollment.academicYearId,
                  classId: enrollment.classId,
                  weekStart,
                  weekEnd,
                  items: createItems,
                }}
              />
            )
          )}
        </div>
      </div>

      {/* ======================================================
          PHYSICAL WEEKLY PROGRESS REPORT
      ====================================================== */}

      <div className="border-2 border-gray-800 p-3 sm:p-6">
        {/* --------------------------------------------------
            HEADER
        -------------------------------------------------- */}

        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold">
            WEEKLY PROGRESS REPORT
          </h1>

          <div className="flex items-center justify-center gap-3 sm:gap-6 mt-3">
            <span className="font-semibold text-sm sm:text-base">
              Badir Academy
            </span>

            <Image
              src="/badirLogo.png"
              alt="Badir Academy"
              width={60}
              height={60}
              className="object-contain"
            />

            <span className="font-semibold text-sm sm:text-base">
              በድር አካዳሚ
            </span>
          </div>
        </div>

        {/* --------------------------------------------------
            STUDENT INFORMATION
        -------------------------------------------------- */}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 border p-3 sm:p-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Student ID
            </p>

            <p className="font-semibold break-words">
              {enrollment.student.id}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Student Name
            </p>

            <p className="font-semibold break-words">
              {enrollment.student.name}{" "}
              {enrollment.student.surname}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Grade
            </p>

            <p className="font-semibold break-words">
              {enrollment.class.grade.name}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Class
            </p>

            <p className="font-semibold break-words">
              {enrollment.class.name}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Academic Year
            </p>

            <p className="font-semibold break-words">
              {enrollment.academicYear.name}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Week Start
            </p>

            <p className="font-semibold break-words">
              {formatDate(
                new Date(
                  `${weekStart}T00:00:00.000Z`
                )
              )}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Week End
            </p>

            <p className="font-semibold break-words">
              {formatDate(
                new Date(
                  `${weekEnd}T00:00:00.000Z`
                )
              )}
            </p>
          </div>
        </div>

        {/* --------------------------------------------------
            EVALUATION TABLE
        -------------------------------------------------- */}

        <div className="mt-6 w-full overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse border border-gray-800 text-sm table-fixed">
            <thead>
              <tr>
                <th className="border border-gray-800 p-3 text-left align-top w-[70%] sm:w-[75%] break-words">
                  Evaluation Criteria
                </th>

                <th className="border border-gray-800 p-3 text-center w-[30%] sm:w-[25%] whitespace-nowrap">
                  Rating
                </th>
              </tr>
            </thead>

            <tbody>
              {/* --------------------------------------------
                  ACADEMIC PERFORMANCE
              -------------------------------------------- */}

              <tr>
                <td
                  colSpan={2}
                  className="border border-gray-800 p-3 font-bold bg-gray-100"
                >
                  {
                    WEEKLY_PROGRESS_CATEGORIES
                      .ACADEMIC_PERFORMANCE
                  }
                </td>
              </tr>

              {selectedReport?.items
                ?.filter(
                  (item) =>
                    item.category ===
                    WEEKLY_PROGRESS_CATEGORIES
                      .ACADEMIC_PERFORMANCE
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td className="border border-gray-800 p-3 align-top break-words whitespace-normal">
                      {item.criterion}
                    </td>

                    <td className="border border-gray-800 p-3 text-center align-top whitespace-nowrap">
                      {getRatingLabel(item.rating)}
                    </td>
                  </tr>
                ))}

              {/* --------------------------------------------
                  BEHAVIOUR EVALUATION
              -------------------------------------------- */}

              <tr>
                <td
                  colSpan={2}
                  className="border border-gray-800 p-3 font-bold bg-gray-100"
                >
                  {
                    WEEKLY_PROGRESS_CATEGORIES
                      .BEHAVIOUR_EVALUATION
                  }
                </td>
              </tr>

              {selectedReport?.items
                ?.filter(
                  (item) =>
                    item.category ===
                    WEEKLY_PROGRESS_CATEGORIES
                      .BEHAVIOUR_EVALUATION
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td className="border border-gray-800 p-3 align-top break-words whitespace-normal">
                      {item.criterion}
                    </td>

                    <td className="border border-gray-800 p-3 text-center align-top whitespace-nowrap">
                      {getRatingLabel(item.rating)}
                    </td>
                  </tr>
                ))}

              {/* --------------------------------------------
                  SOCIALIZATION AND WORK ETHICS
              -------------------------------------------- */}

              <tr>
                <td
                  colSpan={2}
                  className="border border-gray-800 p-3 font-bold bg-gray-100"
                >
                  {
                    WEEKLY_PROGRESS_CATEGORIES
                      .SOCIALIZATION_AND_WORK_ETHICS
                  }
                </td>
              </tr>

              {selectedReport?.items
                ?.filter(
                  (item) =>
                    item.category ===
                    WEEKLY_PROGRESS_CATEGORIES
                      .SOCIALIZATION_AND_WORK_ETHICS
                )
                .map((item) => (
                  <tr key={item.id}>
                    <td className="border border-gray-800 p-3 align-top break-words whitespace-normal">
                      {item.criterion}
                    </td>

                    <td className="border border-gray-800 p-3 text-center align-top whitespace-nowrap">
                      {getRatingLabel(item.rating)}
                    </td>
                  </tr>
                ))}

              {!selectedReport && (
                <tr>
                  <td
                    colSpan={2}
                    className="border border-gray-800 p-8 text-center text-gray-500"
                  >
                    No weekly progress report has
                    been recorded for this week.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --------------------------------------------------
            TEACHER / PARENT
        -------------------------------------------------- */}

        {selectedReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* TEACHER */}

            <div className="border p-4 min-w-0">
              <h3 className="font-semibold mb-3">
                Teacher
              </h3>

              <p className="break-words">
                <span className="font-medium">
                  Comment:
                </span>{" "}
                {selectedReport.teacherComment ||
                  "—"}
              </p>

              <p className="mt-2 break-words">
                <span className="font-medium">
                  Name:
                </span>{" "}
                {selectedReport.teacherName || "—"}
              </p>

              {selectedReport.teacherSignature && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">
                    Signature
                  </p>

                  <img
                    src={
                      selectedReport.teacherSignature
                    }
                    alt="Teacher signature"
                    className="h-20 max-w-full object-contain"
                  />
                </div>
              )}
            </div>

            {/* PARENT */}

            {role === "parent" ? (
              <WeeklyProgressParentEditor
                reportId={selectedReport.id}
                initialComment={selectedReport.parentComment || ""}
                initialSignature={selectedReport.parentSignature}
                parentName={selectedReport.parentName || ""}
              />
            ) : (
              <div className="border p-4 min-w-0">
                <h3 className="font-semibold mb-3">
                  Parent
                </h3>

                <p className="break-words">
                  <span className="font-medium">Comment:</span>{" "}
                  {selectedReport.parentComment || "—"}
                </p>

                <p className="mt-2 break-words">
                  <span className="font-medium">Name:</span>{" "}
                  {selectedReport.parentName || "—"}
                </p>

                {selectedReport.parentSignature && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Signature
                    </p>

                    <img
                      src={selectedReport.parentSignature}
                      alt="Parent signature"
                      className="h-20 max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyProgressPage;