import { prisma } from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";
import { GradeSection } from "@prisma/client";

export type FormContainerProps = {
  table:
    | "admin"
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "assessmentRow"
    | "studentEnrollment"
    | "attendance"
    | "event"
    | "announcement"
    | "reportCard";
  type: "create" | "update" | "delete" | "resetPassword";
  data?: any;
  id?: number | string;
};

const FormContainer = async ({
  table,
  type,
  data,
  id,
}: FormContainerProps) => {
  let relatedData = {};

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;

  if (type !== "delete") {
    switch (table) {
      case "admin":
        relatedData = {};
        break;

      case "subject":
        const subjectTeachers = await prisma.teacher.findMany({
          select: {
            id: true,
            name: true,
            surname: true,
          },
        });

        relatedData = {
          teachers: subjectTeachers,
        };
        break;

      case "class":
        const classGrades = await prisma.grade.findMany({
          select: {
            id: true,
            level: true,
          },
        });

        const classTeachers = await prisma.teacher.findMany({
          select: {
            id: true,
            name: true,
            surname: true,
          },
        });

        relatedData = {
          teachers: classTeachers,
          grades: classGrades,
        };
        break;

      case "teacher":
        const teacherSubjects = await prisma.subject.findMany({
          select: {
            id: true,
            name: true,
          },
        });

        const supervisorSections = Object.values(GradeSection);

        relatedData = {
          subjects: teacherSubjects,
          supervisorSections,
        };

        break;

      // ----------------------------------------------------------
      // STUDENT
      // ----------------------------------------------------------
      // Student no longer selects grade/class during creation.
      // Academic placement is handled by StudentEnrollment.
      case "student":
        const studentParents = await prisma.parent.findMany({
          select: {
            id: true,
            name: true,
            surname: true,
            phone: true,
          },
          orderBy: {
            name: "asc",
          },
          take: 100,
        });

        relatedData = {
          parents: studentParents,
        };

        break;

      // ----------------------------------------------------------
      // ATTENDANCE
      // ----------------------------------------------------------

      case "attendance": {
        const attendanceClasses = await prisma.class.findMany({
          where: {
            ...(role === "teacher"
              ? {
                  homeRoomTeacherId: userId!,
                }
              : {}),
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: "asc",
          },
        });

        const attendanceClassIds = attendanceClasses.map(
          (classItem) => classItem.id
        );

        const attendanceEnrollments =
          await prisma.studentEnrollment.findMany({
            where: {
              classId: {
                in: attendanceClassIds,
              },
            },
            select: {
              studentId: true,
              classId: true,
              student: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                },
              },
            },
            orderBy: {
              rollNumber: "asc",
            },
          });

        const attendanceStudents = attendanceEnrollments.map(
          (enrollment) => ({
            id: enrollment.student.id,
            name: enrollment.student.name,
            surname: enrollment.student.surname,
            classId: enrollment.classId,
          })
        );

        relatedData = {
          classes: attendanceClasses,
          students: attendanceStudents,
        };

        break;
      }


      // ----------------------------------------------------------
      // LESSON
      // ----------------------------------------------------------
      case "lesson":
        const lessonsData = await prisma.lesson.findMany();

        const teachers = await prisma.teacher.findMany({
          select: {
            id: true,
            name: true,
            surname: true,
          },
        });

        const subjects = await prisma.subject.findMany({
          select: {
            id: true,
            name: true,
          },
        });

        const classes = await prisma.class.findMany({
          select: {
            id: true,
            name: true,
          },
        });

        relatedData = {
          teachers,
          subjects,
          classes,
        };

        break;

      case "parent":
        relatedData = {};
        break;

      // ----------------------------------------------------------
      // ASSESSMENT ROW
      // ----------------------------------------------------------
      case "assessmentRow": {
        const assessmentRowAcademicYears =
          await prisma.academicYear.findMany({
            select: {
              id: true,
              name: true,
            },
            orderBy: {
              startDate: "desc",
            },
          });

        const assessmentRowGrades =
          await prisma.grade.findMany({
            select: {
              id: true,
              level: true,
              name: true,
              section: true,
            },
            orderBy: {
              level: "asc",
            },
          });

        const selectedGradeForAssessment =
          assessmentRowGrades.find(
            (grade) => grade.id === data?.gradeId
          );

        const assessmentRowSubjects =
          await prisma.subject.findMany({
            select: {
              id: true,
              name: true,
              sections: {
                select: {
                  section: true,
                },
              },
            },
            orderBy: {
              name: "asc",
            },
          });

        relatedData = {
          academicYears: assessmentRowAcademicYears,
          grades: assessmentRowGrades,
          subjects: assessmentRowSubjects,
        };

        break;
      }

      // ----------------------------------------------------------
      // STUDENT ENROLLMENT
      // ----------------------------------------------------------
      case "studentEnrollment": {
        const enrollmentAcademicYears =
          await prisma.academicYear.findMany({
            select: {
              id: true,
              name: true,
              isCurrent: true,
            },
            orderBy: {
              startDate: "desc",
            },
          });

        const enrollmentGrades =
          await prisma.grade.findMany({
            select: {
              id: true,
              level: true,
              name: true,
              section: true,
            },
            orderBy: {
              level: "asc",
            },
          });

        const enrollmentClasses =
          await prisma.class.findMany({
            select: {
              id: true,
              name: true,
              capacity: true,
              gradeId: true,
            },
            orderBy: {
              name: "asc",
            },
          });

        // --------------------------------------------------------
        // IMPORTANT:
        // Student no longer has gradeId.
        // We only need student identity here.
        // The student's grade is determined by the selected
        // StudentEnrollment class.
        // --------------------------------------------------------
        const enrollmentStudents =
          await prisma.student.findMany({
            select: {
              id: true,
              name: true,
              surname: true,
            },
            orderBy: [
              {
                name: "asc",
              },
              {
                surname: "asc",
              },
            ],
          });

        const existingEnrollments =
          await prisma.studentEnrollment.findMany({
            select: {
              studentId: true,
              academicYearId: true,
              classId: true,
              rollNumber: true,
            },
          });

        relatedData = {
          academicYears: enrollmentAcademicYears,
          grades: enrollmentGrades,
          classes: enrollmentClasses,
          students: enrollmentStudents,
          enrollments: existingEnrollments,
        };

        break;
      }

      case "reportCard": {
        const reportCardGrades =
          await prisma.grade.findMany({
            select: {
              id: true,
              level: true,
              name: true,
              section: true,
            },
            orderBy: {
              level: "asc",
            },
          });

        relatedData = {
          grades: reportCardGrades,
          role,
          currentUserId,
        };

        break;
      }

      default:
        break;
    }
  }

  return (
    <div className="">
      <FormModal
        table={table}
        type={type}
        data={data}
        id={id}
        relatedData={relatedData}
      />
    </div>
  );
};

export default FormContainer;