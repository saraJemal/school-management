import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Semester } from "@prisma/client";
import ResetResultButton from "@/components/ResetResultButton";



type PageProps = {
  searchParams: Promise<{
    academicYearId?: string;
    semester?: string;
  }>;
};

export default async function SupervisorResultsPage({
  searchParams,
}: PageProps) {
  const { userId, sessionClaims } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  // Only admins and teachers can access this page.
  if (role !== "admin" && role !== "teacher") {
    redirect("/");
  }

  const params = await searchParams;

  /*
   * ---------------------------------------------------------
   * Academic years
   * ---------------------------------------------------------
   */
  const academicYears = await prisma.academicYear.findMany({
    orderBy: {
      startDate: "desc",
    },
    select: {
      id: true,
      name: true,
      isCurrent: true,
    },
  });

  if (academicYears.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">
          Supervisor Results
        </h1>

        <p className="mt-4 text-gray-500">
          No academic years were found.
        </p>
      </div>
    );
  }

  const selectedAcademicYear =
    academicYears.find(
      (year) => year.id === Number(params.academicYearId)
    ) ??
    academicYears.find((year) => year.isCurrent) ??
    academicYears[0];

  /*
   * ---------------------------------------------------------
   * Semester
   * ---------------------------------------------------------
   */
  const selectedSemester: Semester =
    params.semester === "SEMESTER2"
      ? "SEMESTER2"
      : "SEMESTER1";

  /*
   * ---------------------------------------------------------
   * Determine supervisor section
   * ---------------------------------------------------------
   */

  let supervisorSection = null;

  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
        name: true,
        surname: true,
      },
    });

    if (!teacher) {
      redirect("/");
    }

    const supervisor =
      await prisma.sectionSupervisor.findUnique({
        where: {
          teacherId: teacher.id,
        },
        select: {
          section: true,
        },
      });

    if (!supervisor) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-semibold">
            Supervisor Results
          </h1>

          <div className="mt-6 rounded-md border bg-white p-6">
            <p className="text-gray-500">
              You are not assigned as a section supervisor.
            </p>
          </div>
        </div>
      );
    }

    supervisorSection = supervisor.section;
  }

  /*
   * ---------------------------------------------------------
   * Fetch submitted results
   * ---------------------------------------------------------
   *
   * Admin:
   *   Can see submitted results from all sections.
   *
   * Section Supervisor:
   *   Can see submitted results only from their section.
   */
  const submissions =
    await prisma.resultSubmission.findMany({
      where: {
        academicYearId: selectedAcademicYear.id,
        semester: selectedSemester,
        status: "SUBMITTED",

        ...(role === "teacher" && supervisorSection
          ? {
              class: {
                grade: {
                  section: supervisorSection,
                },
              },
            }
          : {}),
      },

      orderBy: {
        submittedAt: "desc",
      },

      select: {
        id: true,
        status: true,
        submittedAt: true,
        submittedById: true,

        class: {
          select: {
            id: true,
            name: true,

            grade: {
              select: {
                id: true,
                name: true,
                section: true,
              },
            },
          },
        },

        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  /*
   * ---------------------------------------------------------
   * Get submitting teachers
   * ---------------------------------------------------------
   *
   * ResultSubmission.submittedById stores Teacher.id.
   */
  const submittedByIds = [
    ...new Set(
      submissions
        .map((submission) => submission.submittedById)
        .filter((id): id is string => !!id)
    ),
  ];

  const submitters =
    submittedByIds.length > 0
      ? await prisma.teacher.findMany({
          where: {
            id: {
              in: submittedByIds,
            },
          },
          select: {
            id: true,
            name: true,
            surname: true,
          },
        })
      : [];

  const teacherMap = new Map(
    submitters.map((teacher) => [
      teacher.id,
      teacher,
    ])
  );

  /*
   * ---------------------------------------------------------
   * Page
   * ---------------------------------------------------------
   */
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Supervisor Results
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Review submitted results and return them to teachers
          for correction when necessary.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <form
          method="GET"
          className="flex flex-wrap items-end gap-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <select
              name="academicYearId"
              defaultValue={String(
                selectedAcademicYear.id
              )}
              className="rounded-md border px-3 py-2"
            >
              {academicYears.map((year) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Semester
            </label>

            <select
              name="semester"
              defaultValue={selectedSemester}
              className="rounded-md border px-3 py-2"
            >
              <option value="SEMESTER1">
                Semester 1
              </option>

              <option value="SEMESTER2">
                Semester 2
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-white"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Section */}
      {role === "teacher" && supervisorSection && (
        <div className="mb-6 rounded-md border bg-gray-50 p-4">
          <span className="text-sm text-gray-500">
            Section
          </span>

          <div className="font-medium">
            {supervisorSection}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3">
                Grade
              </th>

              <th className="px-4 py-3">
                Class
              </th>

              <th className="px-4 py-3">
                Subject
              </th>

              <th className="px-4 py-3">
                Teacher
              </th>

              <th className="px-4 py-3">
                Submitted
              </th>

              <th className="px-4 py-3">
                Status
              </th>

              <th className="px-4 py-3">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {submissions.map((submission) => {
              const teacher = submission.submittedById
                ? teacherMap.get(
                    submission.submittedById
                  )
                : null;

              return (
                <tr
                  key={submission.id}
                  className="border-b last:border-b-0"
                >
                  <td className="px-4 py-3">
                    {submission.class.grade.name}
                  </td>

                  <td className="px-4 py-3">
                    {submission.class.name}
                  </td>

                  <td className="px-4 py-3">
                    {submission.subject.name}
                  </td>

                  <td className="px-4 py-3">
                    {teacher
                      ? `${teacher.name} ${teacher.surname}`
                      : "Unknown"}
                  </td>

                  <td className="px-4 py-3">
                    {submission.submittedAt
                      ? new Date(
                          submission.submittedAt
                        ).toLocaleString()
                      : "-"}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      Submitted
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      
                        <Link
                          href={`/list/supervisor-results/view?academicYearId=${selectedAcademicYear.id}&semester=${selectedSemester}&classId=${submission.class.id}&subjectId=${submission.subject.id}`}
                          className="rounded-md border px-3 py-1.5 text-xs"
                        >
                          View
                        </Link>


                      
                    <ResetResultButton
                      submissionId={submission.id}
                    />
                    

                    </div>
                  </td>
                </tr>
              );
            })}

            {submissions.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  No submitted results found for the selected
                  academic year and semester.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}