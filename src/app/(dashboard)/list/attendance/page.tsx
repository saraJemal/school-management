import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import MonthlyAttendance from "@/components/MonthlyAttendance";

const AttendanceListPage = async () => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "teacher") {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-red-500">
          You are not authorized to manage attendance.
        </p>
      </div>
    );
  }

  const classes = await prisma.class.findMany({
    where:
      role === "teacher"
        ? {
            homeRoomTeacherId: userId!,
          }
        : undefined,
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <MonthlyAttendance
        classes={classes}
        role={role}
      />
    </div>
  );
};

export default AttendanceListPage;