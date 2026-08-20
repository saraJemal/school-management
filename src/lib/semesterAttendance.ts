import { prisma } from "./prisma";
import {
  getSemesterDateRange,
  type Semester,
} from "./semesterDates";

export const getSemesterAttendance = async (
  studentId: string,
  classId: number,
  academicYear: number,
  semester: Semester
) => {
  const { startDate, endDate } = getSemesterDateRange(
    academicYear,
    semester
  );

  const attendance = await prisma.attendance.findMany({
    where: {
      studentId,
      classId,
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    select: {
      date: true,
      present: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  let present = 0;
  let absent = 0;

  for (const record of attendance) {
    const dayOfWeek = record.date.getUTCDay();

    // Saturday = 6
    // Sunday = 0
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }

    if (record.present === true) {
      present++;
    } else {
      absent++;
    }
  }

  return {
    present,
    absent,
    recorded: present + absent,
  };
};