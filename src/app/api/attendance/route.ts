import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || (role !== "admin" && role !== "teacher")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const classId = Number(searchParams.get("classId"));
    const month = searchParams.get("month");

    if (!classId || !month) {
      return NextResponse.json(
        { error: "Class and month are required" },
        { status: 400 }
      );
    }

    // Teachers can only access their home-room class.
    if (role === "teacher") {
      const classItem = await prisma.class.findFirst({
        where: {
          id: classId,
          homeRoomTeacherId: userId,
        },
      });

      if (!classItem) {
        return NextResponse.json(
          { error: "Unauthorized class access" },
          { status: 403 }
        );
      }
    }

    const [year, monthNumber] = month
      .split("-")
      .map(Number);

    if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
      return NextResponse.json(
        { error: "Invalid month" },
        { status: 400 }
      );
    }

    const startDate = new Date(
      year,
      monthNumber - 1,
      1
    );

    const endDate = new Date(
      year,
      monthNumber,
      1
    );

    const [students, attendance] = await prisma.$transaction([
      prisma.student.findMany({
        where: {
          classId,
        },
        select: {
          id: true,
          name: true,
          surname: true,
          classId: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.attendance.findMany({
        where: {
          classId,
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

    const attendanceFormatted = attendance.map((record) => {
      const year = record.date.getFullYear();
      const month = String(record.date.getMonth() + 1).padStart(2, "0");
      const day = String(record.date.getDate()).padStart(2, "0");

      return {
        studentId: record.studentId,
        date: `${year}-${month}-${day}`,
        present: record.present,
      };
    });

    return NextResponse.json({
      students,
      attendance: attendanceFormatted,
    });
  } catch (error) {
    console.error("Failed to load attendance:", error);

    return NextResponse.json(
      { error: "Failed to load attendance" },
      { status: 500 }
    );
  }
}