import { prisma } from "@/lib/prisma";
import AttendanceChart from "./AttendanceChart";
import Image from "next/image";

const AttendanceChartContainer = async () => {
  const today = new Date();

  // Calculate the start of the current week (Monday).
  const lastMonday = new Date(today);
  const dayOfWeek = today.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  lastMonday.setDate(today.getDate() - daysSinceMonday);
  lastMonday.setHours(0, 0, 0, 0);

  // Calculate the start of next Monday to exclude later weeks.
  const nextMonday = new Date(lastMonday);
  nextMonday.setDate(lastMonday.getDate() + 7);

  const resData = await prisma.attendance.findMany({
    where: {
      date: {
        gte: lastMonday,
        lt: nextMonday,
      },
    },
    select: {
      date: true,
      present: true,
    },
  });

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const attendanceMap: {
    [key: string]: { present: number; absent: number };
  } = {
    Mon: { present: 0, absent: 0 },
    Tue: { present: 0, absent: 0 },
    Wed: { present: 0, absent: 0 },
    Thu: { present: 0, absent: 0 },
    Fri: { present: 0, absent: 0 },
  };

  // Count each record against its actual attendance date.
  resData.forEach((item) => {
    const itemDate = new Date(item.date);
    const itemDayOfWeek = itemDate.getDay();

    // Monday-Friday only.
    if (itemDayOfWeek >= 1 && itemDayOfWeek <= 5) {
      const dayName = daysOfWeek[itemDayOfWeek - 1];

      if (item.present) {
        attendanceMap[dayName].present += 1;
      } else {
        attendanceMap[dayName].absent += 1;
      }
    }
  });

  const data = daysOfWeek.map((day) => ({
    name: day,
    present: attendanceMap[day].present,
    absent: attendanceMap[day].absent,
  }));

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Attendance</h1>
        <Image
          src="/moreDark.png"
          alt=""
          width={20}
          height={20}
        />
      </div>

      <AttendanceChart data={data} />
    </div>
  );
};

export default AttendanceChartContainer;