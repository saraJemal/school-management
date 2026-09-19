import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { LocalDate } from "./LocalDate";

const Announcements = async () => {
  const { userId, sessionClaims } = await auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  let roleCondition = {};

  // ----------------------------------------------------------
  // TEACHER
  // ----------------------------------------------------------
  if (role === "teacher" && userId) {
    roleCondition = {
      class: {
        lessons: {
          some: {
            teacherId: userId,
          },
        },
      },
    };
  }

  // ----------------------------------------------------------
  // STUDENT
  // ----------------------------------------------------------
  if (role === "student" && userId) {
    const student = await prisma.student.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (student) {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          studentId: student.id,
        },
        select: {
          classId: true,
        },
      });

      const classIds = enrollments.map(
        (enrollment) => enrollment.classId
      );

      roleCondition =
        classIds.length > 0
          ? {
              classId: {
                in: classIds,
              },
            }
          : {
              classId: -1,
            };
    } else {
      roleCondition = {
        classId: -1,
      };
    }
  }

  // ----------------------------------------------------------
  // PARENT
  // ----------------------------------------------------------
  if (role === "parent" && userId) {
    const students = await prisma.student.findMany({
      where: {
        parentId: userId,
      },
      select: {
        id: true,
      },
    });

    const studentIds = students.map((student) => student.id);

    const enrollments =
      studentIds.length > 0
        ? await prisma.studentEnrollment.findMany({
            where: {
              studentId: {
                in: studentIds,
              },
            },
            select: {
              classId: true,
            },
          })
        : [];

    const classIds = enrollments.map(
      (enrollment) => enrollment.classId
    );

    roleCondition =
      classIds.length > 0
        ? {
            classId: {
              in: classIds,
            },
          }
        : {
            classId: -1,
          };
  }

  // ----------------------------------------------------------
  // GET ANNOUNCEMENTS
  // ----------------------------------------------------------
  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: {
      date: "desc",
    },
    where: {
      ...(role !== "admin" && {
        OR: [
          // School-wide announcements
          {
            classId: null,
          },

          // Role-specific class announcements
          roleCondition,
        ],
      }),
    },
  });

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <span className="text-xs text-gray-400">View All</span>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {data[0] && (
          <div className="bg-lamaSkyLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[0].title}</h2>

              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                <LocalDate time={data[0].date} type="date" />
              </span>
            </div>

            <p className="text-sm text-gray-400 mt-1">
              {data[0].description}
            </p>
          </div>
        )}

        {data[1] && (
          <div className="bg-lamaPurpleLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[1].title}</h2>

              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                <LocalDate time={data[1].date} type="date" />
              </span>
            </div>

            <p className="text-sm text-gray-400 mt-1">
              {data[1].description}
            </p>
          </div>
        )}

        {data[2] && (
          <div className="bg-lamaYellowLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{data[2].title}</h2>

              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                <LocalDate time={data[2].date} type="date" />
              </span>
            </div>

            <p className="text-sm text-gray-400 mt-1">
              {data[2].description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
