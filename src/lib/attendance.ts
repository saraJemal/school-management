import { prisma } from "@/lib/prisma";

// ==========================================================
// TYPES
// ==========================================================

export type AttendanceDateValue =
  | Date
  | string;

export type AttendanceRecord = {
  date: AttendanceDateValue;
  present: boolean;
};

export type AttendanceSummary = {
  present: number;
  absent: number;
  recorded: number;
  percentage: number;
};

export type SemesterAttendanceSummary = {
  semester1: AttendanceSummary;
  semester2: AttendanceSummary;
  annual: AttendanceSummary;
};

// ==========================================================
// GET UTC DATE KEY
// ==========================================================
//
// Attendance is treated as a CALENDAR DATE.
//
// These are all considered the same attendance day:
//
// 2026-09-07T00:00:00.000Z
// 2026-09-07T17:03:48.371Z
// 2026-09-07T22:29:36.825Z
//
// Result:
//
// 2026-09-07
//
// ==========================================================

export const getAttendanceDateKey = (
  value: AttendanceDateValue
): string => {
  if (typeof value === "string") {
    // API/client attendance dates are expected
    // to be YYYY-MM-DD.
    const datePart = value.slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid attendance date: ${String(value)}`
    );
  }

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(
      2,
      "0"
    ),
    String(date.getUTCDate()).padStart(
      2,
      "0"
    ),
  ].join("-");
};

// ==========================================================
// CONVERT DATE KEY TO UTC DATE
// ==========================================================

export const attendanceDateKeyToDate = (
  dateKey: string
): Date => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateKey
    )
  ) {
    throw new Error(
      `Invalid attendance date key: ${dateKey}`
    );
  }

  const date = new Date(
    `${dateKey}T00:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid attendance date: ${dateKey}`
    );
  }

  return date;
};

// ==========================================================
// CHECK WHETHER A DATE IS A WEEKEND
// ==========================================================

export const isAttendanceWeekend = (
  value: AttendanceDateValue
): boolean => {
  const dateKey =
    getAttendanceDateKey(value);

  const date =
    attendanceDateKeyToDate(dateKey);

  const day = date.getUTCDay();

  // Sunday = 0
  // Saturday = 6

  return day === 0 || day === 6;
};

// ==========================================================
// CALCULATE ATTENDANCE SUMMARY
// ==========================================================
//
// Shared pure calculation.
//
// Used by:
// - Monthly Attendance
// - Report Card
//
// Rules:
//
// - Saturday and Sunday do not count.
// - Multiple records for one calendar date count once.
// - true  = Present.
// - false = Absent.
// - Only recorded days count toward percentage.
//
// ==========================================================

export const calculateAttendanceSummary = (
  records: AttendanceRecord[]
): AttendanceSummary => {
  const uniqueDays = new Map<
    string,
    boolean
  >();

  for (const record of records) {
    const dateKey =
      getAttendanceDateKey(
        record.date
      );

    // ------------------------------------------------------
    // WEEKENDS DO NOT COUNT
    // ------------------------------------------------------

    if (
      isAttendanceWeekend(dateKey)
    ) {
      continue;
    }

    // ------------------------------------------------------
    // ONE RECORD PER CALENDAR DAY
    // ------------------------------------------------------
    //
    // If old duplicate records exist, the last
    // record encountered is retained.
    //
    // The save action prevents new duplicates.
    //

    uniqueDays.set(
      dateKey,
      record.present
    );
  }

  let present = 0;
  let absent = 0;

  for (const presentValue of uniqueDays.values()) {
    if (presentValue === true) {
      present++;
    } else if (presentValue === false) {
      absent++;
    }
  }

  const recorded =
    present + absent;

  const percentage =
    recorded > 0
      ? Number(
          (
            (present / recorded) *
            100
          ).toFixed(2)
        )
      : 0;

  return {
    present,
    absent,
    recorded,
    percentage,
  };
};

// ==========================================================
// CALCULATE STUDENT SEMESTER ATTENDANCE
// ==========================================================
//
// SERVER-SIDE FUNCTION.
//
// This function retrieves saved attendance from Prisma,
// then uses the SAME calculateAttendanceSummary()
// used by the client-side attendance calculations.
//
// ==========================================================

export const calculateStudentSemesterAttendance =
  async ({
    studentId,
    classId,
    academicYearId,
    semesterBoundary,
  }: {
    studentId: string;
    classId: number;
    academicYearId: number;
    semesterBoundary: Date;
  }): Promise<SemesterAttendanceSummary> => {
    // ------------------------------------------------------
    // GET ACADEMIC YEAR
    // ------------------------------------------------------

    const academicYear =
      await prisma.academicYear.findUnique({
        where: {
          id: academicYearId,
        },
        select: {
          startDate: true,
          endDate: true,
        },
      });

    if (!academicYear) {
      throw new Error(
        "Academic year not found."
      );
    }

    // ------------------------------------------------------
    // GET STUDENT ATTENDANCE
    // ------------------------------------------------------

    const attendance =
      await prisma.attendance.findMany({
        where: {
          studentId,
          classId,
          date: {
            gte: academicYear.startDate,
            lte: academicYear.endDate,
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

    // ------------------------------------------------------
    // SPLIT INTO SEMESTERS
    // ------------------------------------------------------

    const semester1Records =
      attendance.filter(
        (record) =>
          new Date(record.date) <=
          semesterBoundary
      );

    const semester2Records =
      attendance.filter(
        (record) =>
          new Date(record.date) >
          semesterBoundary
      );

    // ------------------------------------------------------
    // CALCULATE USING SHARED RULES
    // ------------------------------------------------------

    const semester1 =
      calculateAttendanceSummary(
        semester1Records
      );

    const semester2 =
      calculateAttendanceSummary(
        semester2Records
      );

    // ------------------------------------------------------
    // ANNUAL SUMMARY
    // ------------------------------------------------------

    const annualPresent =
      semester1.present +
      semester2.present;

    const annualAbsent =
      semester1.absent +
      semester2.absent;

    const annualRecorded =
      semester1.recorded +
      semester2.recorded;

    const annualPercentage =
      annualRecorded > 0
        ? Number(
            (
              (annualPresent /
                annualRecorded) *
              100
            ).toFixed(2)
          )
        : 0;

    const annual: AttendanceSummary =
      {
        present: annualPresent,
        absent: annualAbsent,
        recorded: annualRecorded,
        percentage:
          annualPercentage,
      };

    return {
      semester1,
      semester2,
      annual,
    };
  };