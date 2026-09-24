import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  getAttendanceDateKey,
  isAttendanceWeekend,
} from "@/lib/attendance";

export async function GET(request: Request) {
  const { userId, sessionClaims } = auth();

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  // ----------------------------------------------------------
  // AUTHENTICATION
  // ----------------------------------------------------------

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ----------------------------------------------------------
  // ROLE AUTHORIZATION
  // ----------------------------------------------------------

  if (
    role !== "admin" &&
    role !== "teacher" &&
    role !== "student" &&
    role !== "parent"
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } =
      new URL(request.url);

    const requestedClassId = Number(
      searchParams.get("classId")
    );

    const month =
      searchParams.get("month");

    // --------------------------------------------------------
    // MONTH VALIDATION
    // --------------------------------------------------------

    if (!month) {
      return NextResponse.json(
        {
          error: "Month is required",
        },
        { status: 400 }
      );
    }

    const monthMatch =
      /^(\d{4})-(\d{2})$/.exec(
        month
      );

    if (!monthMatch) {
      return NextResponse.json(
        {
          error: "Invalid month",
        },
        { status: 400 }
      );
    }

    const year = Number(
      monthMatch[1]
    );

    const monthNumber = Number(
      monthMatch[2]
    );

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return NextResponse.json(
        {
          error: "Invalid month",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // UTC MONTH RANGE
    // --------------------------------------------------------
    //
    // Attendance dates are normalized to UTC midnight.
    //
    // Therefore the API also uses UTC boundaries.
    //
    // --------------------------------------------------------

    const startDate = new Date(
      Date.UTC(
        year,
        monthNumber - 1,
        1
      )
    );

    const endDate = new Date(
      Date.UTC(
        year,
        monthNumber,
        1
      )
    );

    // --------------------------------------------------------
    // ACCESS VARIABLES
    // --------------------------------------------------------

    let classId =
      requestedClassId;

    let allowedStudentIds:
      | string[]
      | null = null;

    // --------------------------------------------------------
    // STUDENT
    // --------------------------------------------------------

    if (role === "student") {
      const student =
        await prisma.student.findUnique({
          where: {
            clerkUserId: userId,
          },
          select: {
            id: true,
          },
        });

      if (!student) {
        return NextResponse.json(
          {
            error:
              "Student account not found",
          },
          { status: 404 }
        );
      }

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
        return NextResponse.json(
          {
            error:
              "Current academic year not found",
          },
          { status: 404 }
        );
      }

      const enrollment =
        await prisma.studentEnrollment.findFirst(
          {
            where: {
              studentId: student.id,
              academicYearId:
                currentAcademicYear.id,
            },
            select: {
              classId: true,
            },
          }
        );

      if (!enrollment) {
        return NextResponse.json(
          {
            error:
              "Student is not currently enrolled",
          },
          { status: 404 }
        );
      }

      // Never trust the classId
      // supplied by the browser.
      classId = enrollment.classId;

      allowedStudentIds = [
        student.id,
      ];
    }

    // --------------------------------------------------------
    // TEACHER
    // --------------------------------------------------------

    if (role === "teacher") {
      const teacher =
        await prisma.teacher.findUnique({
          where: {
            clerkUserId: userId,
          },
          select: {
            id: true,
          },
        });

      if (!teacher) {
        return NextResponse.json(
          {
            error:
              "Teacher account not found",
          },
          { status: 404 }
        );
      }

      const classItem =
        await prisma.class.findFirst({
          where: {
            id: classId,
            homeRoomTeacherId:
              teacher.id,
          },
          select: {
            id: true,
          },
        });

      if (!classItem) {
        return NextResponse.json(
          {
            error:
              "Unauthorized class access",
          },
          { status: 403 }
        );
      }
    }

    // --------------------------------------------------------
    // PARENT
    // --------------------------------------------------------

    if (role === "parent") {
      const parent =
        await prisma.parent.findUnique({
          where: {
            clerkUserId: userId,
          },
          select: {
            id: true,
          },
        });

      if (!parent) {
        return NextResponse.json(
          {
            error:
              "Parent account not found",
          },
          { status: 404 }
        );
      }

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
        return NextResponse.json(
          {
            error:
              "Current academic year not found",
          },
          { status: 404 }
        );
      }

      const childEnrollments =
        await prisma.studentEnrollment.findMany(
          {
            where: {
              academicYearId:
                currentAcademicYear.id,
              student: {
                parentId: parent.id,
              },
            },
            select: {
              studentId: true,
              classId: true,
            },
          }
        );

      if (
        childEnrollments.length ===
        0
      ) {
        return NextResponse.json({
          students: [],
          attendance: [],
        });
      }

      const childClassIds =
        new Set(
          childEnrollments.map(
            (enrollment) =>
              enrollment.classId
          )
        );

      if (
        !childClassIds.has(classId)
      ) {
        return NextResponse.json(
          {
            error:
              "Unauthorized class access",
          },
          { status: 403 }
        );
      }

      allowedStudentIds =
        childEnrollments
          .filter(
            (enrollment) =>
              enrollment.classId ===
              classId
          )
          .map(
            (enrollment) =>
              enrollment.studentId
          );
    }

    // --------------------------------------------------------
    // CLASS VALIDATION
    // --------------------------------------------------------

    if (
      !classId ||
      !Number.isInteger(classId)
    ) {
      return NextResponse.json(
        {
          error: "Class is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------------
    // LOAD STUDENTS + ATTENDANCE
    // --------------------------------------------------------

    const [
      enrollments,
      attendance,
    ] = await prisma.$transaction([
      prisma.studentEnrollment.findMany({
        where: {
          classId,

          ...(allowedStudentIds
            ? {
                studentId: {
                  in: allowedStudentIds,
                },
              }
            : {}),
        },

        select: {
          student: {
            select: {
              id: true,
              name: true,
              surname: true,
            },
          },
        },

        orderBy: {
          student: {
            name: "asc",
          },
        },
      }),

      prisma.attendance.findMany({
        where: {
          classId,

          ...(allowedStudentIds
            ? {
                studentId: {
                  in: allowedStudentIds,
                },
              }
            : {}),

          date: {
            gte: startDate,
            lt: endDate,
          },
        },

        select: {
          studentId: true,
          date: true,
          present: true,
        },

        orderBy: {
          date: "asc",
        },
      }),
    ]);

    // --------------------------------------------------------
    // FORMAT STUDENTS
    // --------------------------------------------------------

    const students =
      enrollments.map(
        (enrollment) => ({
          id: enrollment.student.id,
          name: enrollment.student.name,
          surname:
            enrollment.student.surname,
        })
      );

    // --------------------------------------------------------
    // FORMAT + NORMALIZE ATTENDANCE
    // --------------------------------------------------------
    //
    // The database may contain old duplicate records.
    //
    // Example:
    //
    // STU0021 | 2026-09-07 00:00
    // STU0021 | 2026-09-07 22:29
    //
    // Both become:
    //
    // STU0021 | 2026-09-07
    //
    // Only one record is returned to the client.
    //
    // --------------------------------------------------------

    const uniqueAttendance =
      new Map<
        string,
        {
          studentId: string;
          date: string;
          present: boolean;
        }
      >();

    for (const record of attendance) {
      const dateKey =
        getAttendanceDateKey(
          record.date
        );

      // Never return weekends
      // as attendance records.
      if (
        isAttendanceWeekend(
          record.date
        )
      ) {
        continue;
      }

      const key =
        `${record.studentId}|${dateKey}`;

      uniqueAttendance.set(
        key,
        {
          studentId:
            record.studentId,
          date: dateKey,
          present:
            record.present,
        }
      );
    }

    const attendanceFormatted =
      Array.from(
        uniqueAttendance.values()
      );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json({
      students,
      attendance:
        attendanceFormatted,
    });
  } catch (error) {
    console.error(
      "Failed to load attendance:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load attendance",
      },
      { status: 500 }
    );
  }
}
