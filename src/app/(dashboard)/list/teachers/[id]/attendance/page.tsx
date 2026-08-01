import { prisma } from "@/lib/prisma";
import AttendanceForm from "@/components/AttendanceForm";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

const getTodayRange = () => {
  const today = new Date();

  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  return { start, end };
};

const AttendancePage = async ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // security
  if (role === "teacher" && userId !== id) {
    return <div className="p-4">Unauthorized</div>;
  }

  // not weekends
  const todayDay = new Date().getDay();
  if (todayDay === 0 || todayDay === 6) {
    return <div className="p-4">No attendance on weekends</div>;
  }

  // get teacher + class
  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      classes: {
        include: {
          students: true,
          lessons: true,
        },
      },
    },
  });

  if (!teacher || teacher.classes.length === 0) {
    return notFound();
  }

  const teacherClass = teacher.classes[0]; // simple version
  const lesson = teacherClass.lessons[0];

  if (!lesson) {
    return <div className="p-4">No lesson found</div>;
  }

  const { start, end } = getTodayRange();

  // existing attendance
  const existingAttendance = await prisma.attendance.findMany({
    where: {
      lessonId: lesson.id,
      date: {
        gte: start,
        lt: end,
      },
    },
  });

  return (
    <div className="p-4 bg-white rounded-md">
      <h1 className="text-xl font-semibold mb-4">
        Attendance - {teacherClass.name}
      </h1>

      <AttendanceForm
        students={teacherClass.students}
        lessonId={lesson.id}
        existingAttendance={existingAttendance}
      />
    </div>
  );
};

export default AttendancePage;