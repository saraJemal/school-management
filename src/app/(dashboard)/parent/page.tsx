import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const ParentPage = async () => {
  const { userId } = auth();

  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  if (!userId) {
    return (
      <div className="bg-white p-4 rounded-md">
        <p className="text-red-500">
          You are not authorized to access this page.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RESOLVE CLERK USER → DATABASE PARENT ID
  // ----------------------------------------------------------

  const parent = await prisma.parent.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      id: true,
    },
  });

  if (!parent) {
    return (
      <div className="bg-white p-4 rounded-md">
        <p className="text-red-500">
          Parent account not found.
        </p>
      </div>
    );
  }

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

  // ----------------------------------------------------------
  // LOAD PARENT'S STUDENTS
  // ----------------------------------------------------------

  const students = await prisma.student.findMany({
    where: {
      parentId: parent.id,
    },
    include: {
      enrollments: {
        where: currentAcademicYear
          ? {
              academicYearId: currentAcademicYear.id,
            }
          : undefined,
        include: {
          class: true,
        },
        take: 1,
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3 flex flex-col gap-4">
        {students.length === 0 ? (
          <div className="bg-white p-4 rounded-md">
            <h1 className="text-xl font-semibold">
              Student Schedule
            </h1>

            <p className="text-sm text-gray-500 mt-4">
              No student enrollment found for this parent.
            </p>
          </div>
        ) : (
          students.map((student) => {
            const enrollment = student.enrollments[0];
            const studentClass = enrollment?.class;

            return (
              <div
                className="w-full"
                key={student.id}
              >
                <div className="h-full bg-white p-4 rounded-md">
                  <h1 className="text-xl font-semibold">
                    Schedule (
                    {student.name} {student.surname}
                    )
                  </h1>

                  {studentClass ? (
                    <BigCalendarContainer
                      type="classId"
                      id={studentClass.id}
                    />
                  ) : (
                    <p className="text-sm text-gray-500 mt-4">
                      No current class enrollment found
                      for this student.
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default ParentPage;