import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import MonthlyAttendance from "@/components/MonthlyAttendance";

const AttendanceListPage = async () => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-red-500">
          You are not authorized to manage attendance.
        </p>
      </div>
    );
  }

  if (
    role !== "admin" &&
    role !== "teacher" &&
    role !== "student" &&
    role !== "parent"
  ) {
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-red-500">
          You are not authorized to view attendance.
        </p>
      </div>
    );
  }

  // ----------------------------------------------------------
  // ADMIN
  // ----------------------------------------------------------

  if (role === "admin") {
    const classes = await prisma.class.findMany({
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
  }

  // ----------------------------------------------------------
  // TEACHER
  // ----------------------------------------------------------
  //
  // Clerk user ID
  //      ↓
  // Teacher.clerkUserId
  //      ↓
  // Teacher.id
  //      ↓
  // Class.homeRoomTeacherId
  //

  if (role === "teacher") {
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
        <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
          <p className="text-red-500">
            Teacher account not found.
          </p>
        </div>
      );
    }

    const classes = await prisma.class.findMany({
      where: {
        homeRoomTeacherId: teacher.id,
      },
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
  }

  // ----------------------------------------------------------
  // STUDENT
  // ----------------------------------------------------------

  if (role === "student") {
    const student = await prisma.student.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return (
        <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
          <p className="text-red-500">
            Student account not found.
          </p>
        </div>
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
      return (
        <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
          <p className="text-red-500">
            Current academic year not found.
          </p>
        </div>
      );
    }

    const enrollment =
      await prisma.studentEnrollment.findFirst({
        where: {
          studentId: student.id,
          academicYearId: currentAcademicYear.id,
        },
        select: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    const classes = enrollment?.class
      ? [enrollment.class]
      : [];

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <MonthlyAttendance
          classes={classes}
          role={role}
        />
      </div>
    );
  }

  // ----------------------------------------------------------
  // PARENT
  // ----------------------------------------------------------
  //
  // Clerk user ID
  //      ↓
  // Parent.clerkUserId
  //      ↓
  // Parent.id
  //      ↓
  // Student.parentId
  //      ↓
  // StudentEnrollment
  //      ↓
  // Child's class/classes
  //

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
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-red-500">
          Parent account not found.
        </p>
      </div>
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
    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <p className="text-red-500">
          Current academic year not found.
        </p>
      </div>
    );
  }

  const children =
    await prisma.studentEnrollment.findMany({
      where: {
        academicYearId: currentAcademicYear.id,
        student: {
          parentId: parent.id,
        },
      },
      select: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  // Remove duplicate classes if a parent has
  // multiple children in the same class.
  const uniqueClasses = Array.from(
    new Map(
      children.map((enrollment) => [
        enrollment.class.id,
        enrollment.class,
      ])
    ).values()
  ).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <MonthlyAttendance
        classes={uniqueClasses}
        role={role}
      />
    </div>
  );
};

export default AttendanceListPage;