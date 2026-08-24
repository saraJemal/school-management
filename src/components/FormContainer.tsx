import { prisma } from "@/lib/prisma";
import FormModal from "./FormModal";
import { auth } from "@clerk/nextjs/server";
import { GradeSection } from "@prisma/client";

export type FormContainerProps = {
   table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "assessment"
    | "assessmentRow"
    | "attendance"
    | "event"
    | "announcement";
    type: "create" | "update" | "delete";
    data?:any;
    id?:number | string;
}

const FormContainer = async({table,type,data,id,}: FormContainerProps) => {

let relatedData= {}

const {userId, sessionClaims} = auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;
const currentUserId = userId;

if(type !=="delete"){
  switch (table) {
    case "subject":
      const subjectTeachers= await prisma.teacher.findMany({
        select:{ id:true, name:true, surname:true }, 
      });
      relatedData = {teachers: subjectTeachers };
      break;
    case "class":
      const classGrades= await prisma.grade.findMany({
        select:{ id:true, level:true }, 
      });
      const classTeachers= await prisma.teacher.findMany({
        select:{ id:true, name:true, surname:true }, 
      });
      relatedData = {teachers: classTeachers, grades: classGrades };
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
    case "student":
      const studentGrades = await prisma.grade.findMany({
        select: {
          id: true,
          level: true,
        },
        orderBy: {
          level: "asc",
        },
      });

      const studentClasses = await prisma.class.findMany({
        select: {
          id: true,
          name: true,
          capacity: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

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
        classes: studentClasses,
        grades: studentGrades,
        parents: studentParents,
      };

      break;


    // case "attendance":
    //   const attendanceStudents = await prisma.student.findMany({


    //     select: { id: true, name: true, surname: true },
    //   });

  case "attendance":
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
      });

      const attendanceClassIds = attendanceClasses.map(
        (classItem) => classItem.id
      );

      const attendanceStudents = await prisma.student.findMany({
        where: {
          classId: {
            in: attendanceClassIds,
          },
        },
        select: {
          id: true,
          name: true,
          surname: true,
          classId: true,
        },
      });

      relatedData = {
        classes: attendanceClasses,
        students: attendanceStudents,
      };

      break;

  case "lesson":
      const lessonsData = await prisma.lesson.findMany();

      const teachers = await prisma.teacher.findMany({
        select: { id: true, name: true, surname: true },
      });

      const subjects = await prisma.subject.findMany({
        select: { id: true, name: true },
      });

      const classes = await prisma.class.findMany({
        select: { id: true, name: true },
      });

      relatedData = { teachers, subjects, classes };
      break;
  case "parent":
      relatedData = {};
      break;
   case "assessment":
      const assessmentAcademicYears =
        await prisma.academicYear.findMany({
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            startDate: "desc",
          },
        });

      const assessmentGrades =
        await prisma.grade.findMany({
          select: {
            id: true,
            level: true,
            name: true,
          },
          orderBy: {
            level: "asc",
          },
        });

      const assessmentSubjects =
        await prisma.subject.findMany({
          where:
            role === "teacher"
              ? {
                  teachers: {
                    some: {
                      id: currentUserId!,
                    },
                  },
                }
              : undefined,
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            id: "asc",
          },
        });

      relatedData = {
        academicYears: assessmentAcademicYears,
        grades: assessmentGrades,
        subjects: assessmentSubjects,
      };

      break;

    default:
      break;
  }
}

  return(
    <div className="">
      <FormModal table={table} type={type} data={data} id={id} relatedData={relatedData}/>
    </div>
  );
};

export default FormContainer