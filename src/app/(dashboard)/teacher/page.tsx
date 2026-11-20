import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const TeacherPage = async () => {
  const { userId } = auth();

  if (!userId) {
    return null;
  }

  const teacher = await prisma.teacher.findUnique({
    where: {
      clerkUserId: userId,
    },
    select: {
      id: true,
    },
  });

  if (!teacher) {
    return (
      <div className="p-4">
        Teacher record not found.
      </div>
    );
  }

  return (
  <div className="flex-1 min-w-0 p-4 flex flex-col xl:flex-row gap-4">
    {/* LEFT: Schedule */}
    <div className="w-full min-w-0 xl:w-2/3">
      <div className="bg-white p-4 rounded-md">
        <h1 className="text-xl font-semibold mb-4">Schedule</h1>
        <BigCalendarContainer
          type="teacherId"
          id={teacher.id}
        />
      </div>
    </div>

    {/* RIGHT: Announcements */}
    <div className="w-full min-w-0 xl:w-1/3 flex flex-col gap-8">
      <Announcements />
    </div>
  </div>
);
};

export default TeacherPage;