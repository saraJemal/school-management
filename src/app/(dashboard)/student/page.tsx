import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendar from "@/components/EventCalendar";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const StudentPage = async () => {
  const { userId } = auth();

  const student = await prisma.student.findUnique({
    where: {
      clerkUserId: userId!,
    },
    select: {
      id: true,
      name: true,
      surname: true,
    },
  });

  const enrollment = student
    ? await prisma.studentEnrollment.findFirst({
        where: {
          studentId: student.id,
        },
        include: {
          class: true,
        },
        orderBy: {
          academicYearId: "desc",
        },
      })
    : null;

  const classItem = enrollment?.class;

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div className="h-full bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            Schedule ({classItem?.name ?? "No class"})
          </h1>

          {classItem ? (
            <BigCalendarContainer
              type="classId"
              id={classItem.id}
            />
          ) : (
            <p className="text-sm text-gray-500 mt-4">
              No class enrollment found.
            </p>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendar />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;