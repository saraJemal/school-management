import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { LocalDate } from "./LocalDate";

const Announcements = async () => {
  const { userId, sessionClaims } = await auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  // Class IDs associated with the current user.
  let classIds: number[] = [];

  // ----------------------------------------------------------
  // TEACHER
  // Clerk user ID is different from the database teacher ID.
  // ----------------------------------------------------------
  if (role === "teacher" && userId) {
    const teacher = await prisma.teacher.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (teacher) {
      const lessons = await prisma.lesson.findMany({
        where: {
          teacherId: teacher.id,
        },
        select: {
          classId: true,
        },
      });

      classIds = [
        ...new Set(lessons.map((lesson) => lesson.classId)),
      ];
    }
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

      classIds = [
        ...new Set(enrollments.map((enrollment) => enrollment.classId)),
      ];
    }
  }

  // ----------------------------------------------------------
  // PARENT
  // Resolve the parent database ID before looking up children.
  // ----------------------------------------------------------
  if (role === "parent" && userId) {
    const parent = await prisma.parent.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (parent) {
      const students = await prisma.student.findMany({
        where: {
          parentId: parent.id,
        },
        select: {
          id: true,
        },
      });

      const studentIds = students.map((student) => student.id);

      if (studentIds.length > 0) {
        const enrollments = await prisma.studentEnrollment.findMany({
          where: {
            studentId: {
              in: studentIds,
            },
          },
          select: {
            classId: true,
          },
        });

        classIds = [
          ...new Set(enrollments.map((enrollment) => enrollment.classId)),
        ];
      }
    }
  }


  // ----------------------------------------------------------
  // GET ANNOUNCEMENTS
  // Admin: all announcements.
  // Other roles: school-wide announcements plus announcements
  // for classes associated with their lessons/enrollments.
  // ----------------------------------------------------------
  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: {
      date: "desc",
    },
    ...(role === "admin"
      ? {}
      : {
          where: {
            OR: [
              // School-wide announcements
              {
                classId: null,
              },

              // Announcements for associated classes
              ...(classIds.length > 0
                ? [
                    {
                      classId: {
                        in: classIds,
                      },
                    },
                  ]
                : []),
            ],
          },
        }),
  });

  const announcementColors = [
    "bg-saraSkyLight",
    "bg-saraPurpleLight",
    "bg-saraYellowLight",
  ];

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <span className="text-xs text-gray-400">View All</span>
      </div>

      <div className="flex flex-col gap-4 mt-4">
        {data.length === 0 && (
          <p className="text-sm text-gray-400">
            No announcements available.
          </p>
        )}

        {data.map((announcement, index) => (
          <div
            key={announcement.id}
            className={`${announcementColors[index]} rounded-md p-4`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">
                {announcement.title}
              </h2>

              <span className="shrink-0 text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                <LocalDate time={announcement.date} type="date" />
              </span>
            </div>

            <p className="text-sm text-gray-400 mt-1">
              {announcement.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Announcements;