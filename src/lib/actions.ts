"use server"
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { AcademicYearSchema, AdminSchema, AssessmentRowSchema, AttendanceSchema, ClassSchema, CommunicationBookSchema, LessonSchema, MessageSchema, ParentSchema, PerformanceAnalysisSchema, PromotionPolicySchema, ReportCardSchema, StudentEnrollmentSchema, StudentResultsSchema, StudentSchema, SubjectSchema, TeacherSchema, WeeklyProgressSchema, communicationBookSchema, performanceAnalysisSchema } from "./formValidationSchemas"
import { prisma } from "./prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { AssessmentCategory, AssessmentType, GradeSection, Semester, UserSex } from "@prisma/client";
import {
  calculateDailyActivityResult,
  calculateExamResult,
  calculateFinalResult,
  isRecordedScore,
  roundResult,
} from "@/lib/resultCalculation";

type CurrentState = {
  success:boolean; 
  error:boolean |string
};

export type PasswordResetState = {
  success: boolean;
  error: boolean | string;
  generatedPassword?: string;
};

export const createSubject = async(
  currentState: CurrentState,
  data:SubjectSchema
)=>{
  try{
    await prisma.subject.create({
      data:{
        name: data.name,
        teachers:{
          connect:data.teachers.map(teacherId=> ({id:teacherId})),
        }
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}
 //Update Subject

export const updateSubject = async(
  currentState: CurrentState,
  data:SubjectSchema
)=>{
  try{
    await prisma.subject.update({
      where:{
        id:data.id,
      },
      data:{
        name: data.name,
        teachers:{
          set:data.teachers.map(teacherId=>({id:teacherId})),
        },
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//Delete Subject

export const deleteSubject = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 
  try{
    await prisma.subject.delete({
      where:{
        id:parseInt(id),
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

// Class Action 

 // Create
export const createClass = async(
  currentState: CurrentState,
  data:ClassSchema
)=>{
  try{
    await prisma.class.create({
      data
    });

    //revalidatePath("/list/class")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}
 //Update 

export const updateClass = async(
  currentState: CurrentState,
  data:ClassSchema
)=>{
  try{
    await prisma.class.update({
      where:{
        id:data.id,
      },
      data
    });

    //revalidatePath("/list/class")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//Delete 

export const deleteClass = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 
  try{
    await prisma.class.delete({
      where:{
        id:parseInt(id),
      },
    });

    //revalidatePath("/list/class")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//------------------------ ASSESSMENT ROW ACTION -----------------------

export const createAssessmentRow = async (
  currentState: CurrentState,
  data: AssessmentRowSchema
) => {
  try {
    const { userId, sessionClaims } = auth();

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    if (!userId || role !== "admin") {
      return {
        success: false,
        error: true,
      };
    }

    /*
     * Verify that the selected subject belongs
     * to the selected grade's section.
     */
    const grade = await prisma.grade.findUnique({
      where: {
        id: data.gradeId,
      },
      select: {
        section: true,
      },
    });

    if (!grade) {
      return {
        success: false,
        error: true,
      };
    }

    const subjectBelongsToGradeSection =
      await prisma.subjectSection.findUnique({
        where: {
          subjectId_section: {
            subjectId: data.subjectId,
            section: grade.section,
          },
        },
      });

    if (!subjectBelongsToGradeSection) {
      console.log(
        "CREATE ASSESSMENT REJECTED: Subject does not belong to grade section",
        {
          subjectId: data.subjectId,
          gradeId: data.gradeId,
          section: grade.section,
        }
      );

      return {
        success: false,
        error: true,
      };
    }

    /*
     * Assessment types that belong to
     * CLASS_ACTIVITY category.
     */
    const classActivityTypes = new Set<AssessmentType>([
      AssessmentType.CW1,
      AssessmentType.CW2,
      AssessmentType.HW1,
      AssessmentType.HW2,
      AssessmentType.WS1,
      AssessmentType.WS2,
      AssessmentType.PROJECT,
      AssessmentType.EXERCISE_BOOK,
    ]);

    /*
     * Create all assessment definitions.
     */
    for (const [assessmentType, assessmentData] of Object.entries(
      data.assessments
    )) {
      const type = assessmentType as AssessmentType;

      const category = classActivityTypes.has(type)
        ? AssessmentCategory.CLASS_ACTIVITY
        : AssessmentCategory.EXAM;

      await prisma.assessment.create({
        data: {
          title: type,
          type,
          category,
          semester: data.semester,
          academicYearId: data.academicYearId,
          gradeId: data.gradeId,
          subjectId: data.subjectId,
          maxScore: assessmentData.maxScore,
          weight: assessmentData.weight,
        },
      });
    }

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("CREATE ASSESSMENT ROW ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};


export const updateAssessmentRow = async (
  currentState: CurrentState,
  data: AssessmentRowSchema
) => {
  try {
    const { userId, sessionClaims } = auth();

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    if (!userId || role !== "admin") {
      return {
        success: false,
        error: true,
      };
    }

    const grade = await prisma.grade.findUnique({
        where: {
          id: data.gradeId,
        },
        select: {
          section: true,
        },
      });

      if (!grade) {
        return {
          success: false,
          error: true,
        };
      }

      const subjectBelongsToGradeSection =
        await prisma.subjectSection.findUnique({
          where: {
            subjectId_section: {
              subjectId: data.subjectId,
              section: grade.section,
            },
          },
        });

      if (!subjectBelongsToGradeSection) {
        console.log(
          "UPDATE ASSESSMENT REJECTED: Subject does not belong to grade section",
          {
            subjectId: data.subjectId,
            gradeId: data.gradeId,
            section: grade.section,
          }
        );

        return {
          success: false,
          error: true,
        };
      }

    for (const [assessmentType, assessmentData] of Object.entries(
      data.assessments
    )) {
      const type = assessmentType as AssessmentType;

      const classActivityTypes = new Set<AssessmentType>([
        AssessmentType.CW1,
        AssessmentType.CW2,
        AssessmentType.HW1,
        AssessmentType.HW2,
        AssessmentType.WS1,
        AssessmentType.WS2,
        AssessmentType.PROJECT,
        AssessmentType.EXERCISE_BOOK,
      ]);

      const category = classActivityTypes.has(type)
        ? AssessmentCategory.CLASS_ACTIVITY
        : AssessmentCategory.EXAM;

      await prisma.assessment.upsert({
        where: {
          academicYearId_gradeId_subjectId_semester_type: {
            academicYearId: data.academicYearId,
            gradeId: data.gradeId,
            subjectId: data.subjectId,
            semester: data.semester,
            type,
          },
        },

        update: {
          title: type,
          category,
          maxScore: assessmentData.maxScore,
          weight: assessmentData.weight,
        },

        create: {
          title: type,
          type,
          category,
          semester: data.semester,
          academicYearId: data.academicYearId,
          gradeId: data.gradeId,
          subjectId: data.subjectId,
          maxScore: assessmentData.maxScore,
          weight: assessmentData.weight,
        },
      });
    }

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("UPDATE ASSESSMENT ROW ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};


export const deleteAssessmentRow = async (
      currentState: CurrentState,
      data: FormData
    ) => {
      try {
        const { userId, sessionClaims } = auth();

        const role = (sessionClaims?.metadata as {
          role?: string;
        })?.role;

        if (!userId || role !== "admin") {
          return {
            success: false,
            error: true,
          };
        }

        const academicYearId = Number(
          data.get("academicYearId")
        );

        const gradeId = Number(
          data.get("gradeId")
        );

        const subjectId = Number(
          data.get("subjectId")
        );

        const semester = data.get(
          "semester"
        ) as Semester;

        if (
          !academicYearId ||
          !gradeId ||
          !subjectId ||
          !semester
        ) {
          return {
            success: false,
            error: true,
          };
        }

        // Find all assessment definitions for this
        // academic year + grade + subject + semester
        const assessments =
          await prisma.assessment.findMany({
            where: {
              academicYearId,
              gradeId,
              subjectId,
              semester,
            },
            select: {
              id: true,
            },
          });

        const assessmentIds = assessments.map(
          (assessment) => assessment.id
        );

        // Delete student scores first because
        // StudentAssessment has a RESTRICT foreign key
        if (assessmentIds.length > 0) {
          await prisma.studentAssessment.deleteMany({
            where: {
              assessmentId: {
                in: assessmentIds,
              },
            },
          });

          // Now delete the assessment definitions
          await prisma.assessment.deleteMany({
            where: {
              id: {
                in: assessmentIds,
              },
            },
          });
        }

        return {
          success: true,
          error: false,
        };
      } catch (err) {
        console.log(
          "DELETE ASSESSMENT ROW ERROR:",
          err
        );

        return {
          success: false,
          error: true,
        };
      }
    };


    export const saveStudentResults = async (
      currentState: CurrentState,
      data: StudentResultsSchema
    ) => {
      try {
        const { userId, sessionClaims } = auth();

        const role = (sessionClaims?.metadata as {
          role?: string;
        })?.role;

        /*
        * Only admins and teachers can enter results.
        */
        if (
          !userId ||
          (role !== "admin" && role !== "teacher")
        ) {
          return {
            success: false,
            error: true,
          };
        }

        /*
        * Verify academic year.
        */
        const academicYear =
          await prisma.academicYear.findUnique({
            where: {
              id: data.academicYearId,
            },
          });

        if (!academicYear) {
          return {
            success: false,
            error: true,
          };
        }

        /*
        * Verify selected class.
        */
        const selectedClass =
          await prisma.class.findUnique({
            where: {
              id: data.classId,
            },
            select: {
              id: true,
              gradeId: true,
            },
          });

        if (!selectedClass) {
          return {
            success: false,
            error: true,
          };
        }

        /*
        * Verify selected subject.
        *
        * The subject must belong to the
        * selected grade section.
        */
        const grade =
          await prisma.grade.findUnique({
            where: {
              id: selectedClass.gradeId,
            },
            select: {
              section: true,
            },
          });

        if (!grade) {
          return {
            success: false,
            error: true,
          };
        }

        const subjectBelongsToGradeSection =
          await prisma.subjectSection.findUnique({
            where: {
              subjectId_section: {
                subjectId: data.subjectId,
                section: grade.section,
              },
            },
          });

        if (!subjectBelongsToGradeSection) {
          console.log(
            "SAVE RESULTS REJECTED: Subject does not belong to class grade section",
            {
              subjectId: data.subjectId,
              classId: data.classId,
              gradeId: selectedClass.gradeId,
              section: grade.section,
            }
          );

          return {
            success: false,
            error: true,
          };
        }

        /*
        * Teacher authorization.
        *
        * Admins can enter results for any
        * class/subject.
        *
        * Teachers must teach the selected
        * subject and selected class.
        */
        if (role === "teacher") {
          const teacherAuthorized =
            await prisma.lesson.findFirst({
              where: {
                teacherId: userId,
                classId: data.classId,
                subjectId: data.subjectId,
              },
              select: {
                id: true,
              },
            });

          if (!teacherAuthorized) {
            console.log(
              "SAVE RESULTS REJECTED: Teacher is not assigned to this class and subject",
              {
                userId,
                classId: data.classId,
                subjectId: data.subjectId,
              }
            );

            return {
              success: false,
              error: true,
            };
          }
        }

        /*
        * Get all assessments for:
        *
        * academic year
        * + grade
        * + subject
        * + semester
        */
        const assessments =
          await prisma.assessment.findMany({
            where: {
              academicYearId:
                data.academicYearId,

              gradeId:
                selectedClass.gradeId,

              subjectId:
                data.subjectId,

              semester:
                data.semester,
            },

            select: {
              id: true,
              type: true,
              maxScore: true,
            },
          });

        if (assessments.length === 0) {
          return {
            success: false,
            error: true,
          };
        }

        /*
        * Create quick lookup:
        *
        * CW1 → assessment record
        * CW2 → assessment record
        * etc.
        */
        const assessmentMap =
          new Map<
            AssessmentType,
            {
              id: number;
              type: AssessmentType;
              maxScore: number;
            }
          >();

        for (const assessment of assessments) {
          assessmentMap.set(
            assessment.type,
            assessment
          );
        }

        /*
        * Verify that the submitted students
        * are actually enrolled in the selected
        * class for the selected academic year.
        */
        const studentIds =
          Object.keys(data.results);

        const enrollments =
          await prisma.studentEnrollment.findMany({
            where: {
              academicYearId:
                data.academicYearId,

              classId:
                data.classId,

              studentId: {
                in: studentIds,
              },
            },

            select: {
              studentId: true,
            },
          });

        const enrolledStudentIds =
          new Set(
            enrollments.map(
              (enrollment) =>
                enrollment.studentId
            )
          );

        /*
        * Validate and save every score.
        */
        await prisma.$transaction(
          async (tx) => {
            for (const [
              studentId,
              studentResults,
            ] of Object.entries(
              data.results
            )) {
              /*
              * Student must belong to the
              * selected class/year.
              */
              if (
                !enrolledStudentIds.has(
                  studentId
                )
              ) {
                throw new Error(
                  `Student ${studentId} is not enrolled in the selected class.`
                );
              }

              for (const [
                assessmentType,
                score,
              ] of Object.entries(
                studentResults
              )as [string, number][]) {
                const type =
                  assessmentType as AssessmentType;

                const assessment =
                  assessmentMap.get(type);

                /*
                * Ignore unknown assessment types.
                */
                if (!assessment) {
                  continue;
                }

                /*
                * Score cannot exceed max score.
                */
                if (
                  score < 0 ||
                  score >
                    assessment.maxScore
                ) {
                  throw new Error(
                    `Invalid score for ${type}. Maximum score is ${assessment.maxScore}.`
                  );
                }

                /*
                * Create or update the
                * StudentAssessment record.
                */
                await tx.studentAssessment.upsert({
                  where: {
                    assessmentId_studentId: {
                      assessmentId:
                        assessment.id,
                      studentId,
                    },
                  },

                  update: {
                    score,
                  },

                  create: {
                    assessmentId:
                      assessment.id,
                    studentId,
                    score,
                  },
                });
              }
            }
          }
        );

        return {
          success: true,
          error: false,
        };
      } catch (err) {
        console.log(
          "SAVE STUDENT RESULTS ERROR:",
          err
        );

        return {
          success: false,
          error: true,
        };
      }
    };

    // =========================================================
// UPDATE REPORT CARD
// =========================================================
//
// Admin:
//   Can edit any report card.
//
// Teacher:
//   Can edit ONLY when they are the homeroom teacher
//   of the student's class for this academic year.
//
// Student / Parent:
//   Read-only.
//
// Results, rank, attendance, class size, subjects, etc.
// are NOT edited here. Those are calculated automatically
// by the report-card page.
// =========================================================

export const updateReportCard = async (
  currentState: CurrentState,
  data: ReportCardSchema
) => {
  const { userId, sessionClaims } = auth();

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  try {
    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    // ---------------------------------------------------------
    // VALIDATE REPORT CARD
    // ---------------------------------------------------------

    if (!data.id || data.id < 1) {
      return {
        success: false,
        error: "invalid-report-card",
      };
    }

    const reportCard =
      await prisma.reportCard.findUnique({
        where: {
          id: data.id,
        },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
        },
      });

    if (!reportCard) {
      return {
        success: false,
        error: "report-card-not-found",
      };
    }

    // ---------------------------------------------------------
    // STUDENT ENROLLMENT
    // ---------------------------------------------------------

    const enrollment =
      await prisma.studentEnrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId: reportCard.studentId,
            academicYearId: reportCard.academicYearId,
          },
        },
        select: {
          classId: true,
          class: {
            select: {
              id: true,
              gradeId: true,
              homeRoomTeacherId: true,
            },
          },
        },
      });

    if (!enrollment) {
      return {
        success: false,
        error: "student-enrollment-not-found",
      };
    }

    // ---------------------------------------------------------
    // TEACHER AUTHORIZATION
    // ---------------------------------------------------------

    let teacherId: string | null = null;

    if (role === "teacher") {
      const teacher =
        await prisma.teacher.findUnique({
          where: {
            clerkUserId: userId,
          },
          select: {
            id: true,
            name: true,
            middleName: true,
            surname: true,
          },
        });

      if (!teacher) {
        return {
          success: false,
          error: "teacher-not-found",
        };
      }

      // Teacher can edit only their homeroom class.
      if (
        enrollment.class.homeRoomTeacherId !==
        teacher.id
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }

      teacherId = teacher.id;
    }

    // ---------------------------------------------------------
    // TRANSACTION
    // ---------------------------------------------------------

    await prisma.$transaction(async (tx) => {
      // -------------------------------------------------------
      // SEMESTER 1
      // -------------------------------------------------------

      await tx.reportCardSemester.upsert({
        where: {
          reportCardId_semester: {
            reportCardId: reportCard.id,
            semester: "SEMESTER1",
          },
        },

        update: {
          conduct:
            data.conductSemester1?.trim() || null,

          comment:
            data.commentSemester1?.trim() || null,

          ...(teacherId
            ? {
                homeroomTeacherId: teacherId,
                homeroomTeacherSignature:
                  data.teacherSignatureSemester1 ||
                  null,
              }
            : {}),
        },

        create: {
          reportCardId: reportCard.id,
          semester: "SEMESTER1",

          conduct:
            data.conductSemester1?.trim() || null,

          comment:
            data.commentSemester1?.trim() || null,

          ...(teacherId
            ? {
                homeroomTeacherId: teacherId,
                homeroomTeacherSignature:
                  data.teacherSignatureSemester1 ||
                  null,
              }
            : {}),
        },
      });

      // -------------------------------------------------------
      // SEMESTER 2
      // -------------------------------------------------------

      await tx.reportCardSemester.upsert({
        where: {
          reportCardId_semester: {
            reportCardId: reportCard.id,
            semester: "SEMESTER2",
          },
        },

        update: {
          conduct:
            data.conductSemester2?.trim() || null,

          comment:
            data.commentSemester2?.trim() || null,

          ...(teacherId
            ? {
                homeroomTeacherId: teacherId,
                homeroomTeacherSignature:
                  data.teacherSignatureSemester2 ||
                  null,
              }
            : {}),
        },

        create: {
          reportCardId: reportCard.id,
          semester: "SEMESTER2",

          conduct:
            data.conductSemester2?.trim() || null,

          comment:
            data.commentSemester2?.trim() || null,

          ...(teacherId
            ? {
                homeroomTeacherId: teacherId,
                homeroomTeacherSignature:
                  data.teacherSignatureSemester2 ||
                  null,
              }
            : {}),
        },
      });

      // -------------------------------------------------------
      // BASIC SKILLS - SEMESTER 1
      // -------------------------------------------------------

      await tx.reportCardBasicSkill.upsert({
        where: {
          reportCardId_semester: {
            reportCardId: reportCard.id,
            semester: "SEMESTER1",
          },
        },

        update: {
          ...data.semester1Skills,
        },

        create: {
          reportCardId: reportCard.id,
          semester: "SEMESTER1",
          ...data.semester1Skills,
        },
      });

      // -------------------------------------------------------
      // BASIC SKILLS - SEMESTER 2
      // -------------------------------------------------------

      await tx.reportCardBasicSkill.upsert({
        where: {
          reportCardId_semester: {
            reportCardId: reportCard.id,
            semester: "SEMESTER2",
          },
        },

        update: {
          ...data.semester2Skills,
        },

        create: {
          reportCardId: reportCard.id,
          semester: "SEMESTER2",
          ...data.semester2Skills,
        },
      });

      // -------------------------------------------------------
      // MANAGING DIRECTOR SIGNATURE
      //
      // ONLY ADMIN CAN CHANGE THIS.
      // -------------------------------------------------------

      if (role === "admin") {
        await tx.reportCard.update({
          where: {
            id: reportCard.id,
          },
          data: {
            managingDirectorSignature:
              data.managingDirectorSignature ||
              null,
          },
        });
      }
    });

    // ---------------------------------------------------------
    // REFRESH
    // ---------------------------------------------------------

    revalidatePath(
      `/list/report-cards/${reportCard.studentId}`
    );

    revalidatePath("/list/report-cards");

    return {
      success: true,
      error: false,
    };
  } catch (error) {
    console.error(
      "UPDATE REPORT CARD ERROR:",
      error
    );

    return {
      success: false,
      error: true,
    };
  }
};

 // =========================================================
// DELETE REPORT CARD
// =========================================================
//
// Admin:
//   Can delete any report card.
//
// Teacher:
//   Can delete ONLY when they are the homeroom teacher
//   of the student's class for this academic year.
//
// Student / Parent:
//   Cannot delete.
//
// Related semester and basic-skill records are deleted
// together with the report card.
// =========================================================

export const deleteReportCard = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId, sessionClaims } = auth();

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  try {
    // ---------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    // ---------------------------------------------------------
    // VALIDATE REPORT CARD ID
    // ---------------------------------------------------------

    const idValue = data.get("id");

    const reportCardId = Number(idValue);

    if (!Number.isInteger(reportCardId) || reportCardId < 1) {
      return {
        success: false,
        error: "invalid-report-card",
      };
    }

    // ---------------------------------------------------------
    // FIND REPORT CARD
    // ---------------------------------------------------------

    const reportCard =
      await prisma.reportCard.findUnique({
        where: {
          id: reportCardId,
        },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
        },
      });

    if (!reportCard) {
      return {
        success: false,
        error: "report-card-not-found",
      };
    }

    // ---------------------------------------------------------
    // FIND STUDENT ENROLLMENT
    // ---------------------------------------------------------

    const enrollment =
      await prisma.studentEnrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId: reportCard.studentId,
            academicYearId: reportCard.academicYearId,
          },
        },
        select: {
          class: {
            select: {
              homeRoomTeacherId: true,
            },
          },
        },
      });

    if (!enrollment) {
      return {
        success: false,
        error: "student-enrollment-not-found",
      };
    }

    // ---------------------------------------------------------
    // TEACHER AUTHORIZATION
    // ---------------------------------------------------------

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
        return {
          success: false,
          error: "teacher-not-found",
        };
      }

      // Teacher can delete only report cards belonging
      // to their homeroom class.
      if (
        enrollment.class.homeRoomTeacherId !==
        teacher.id
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }
    }

    // ---------------------------------------------------------
    // DELETE
    // ---------------------------------------------------------

    await prisma.$transaction(async (tx) => {
      // Delete basic skills first.
      await tx.reportCardBasicSkill.deleteMany({
        where: {
          reportCardId: reportCard.id,
        },
      });

      // Delete semester records.
      await tx.reportCardSemester.deleteMany({
        where: {
          reportCardId: reportCard.id,
        },
      });

      // Finally delete the report card.
      await tx.reportCard.delete({
        where: {
          id: reportCard.id,
        },
      });
    });

    // ---------------------------------------------------------
    // REFRESH
    // ---------------------------------------------------------

    revalidatePath(
      `/list/report-cards/${reportCard.studentId}`
    );

    revalidatePath("/list/report-cards");

    return {
      success: true,
      error: false,
    };
  } catch (error) {
    console.error(
      "DELETE REPORT CARD ERROR:",
      error
    );

    return {
      success: false,
      error: true,
    };
  }
};
    //-----------------------ADMIN ACTIONS-------------------

  //-----------------------CREATE ADMIN-------------------

export const createAdmin = async (
  currentState: CurrentState,
  data: AdminSchema
) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  // Only an existing admin can create another admin
  if (!userId || role !== "admin") {
    console.log("CREATE ADMIN: unauthorized");

    return {
      success: false,
      error: "unauthorized",
    };
  }

  let clerkUserId: string | null = null;

  try {
    console.log("CREATE ADMIN: starting", {
      username: data.username,
    });

    // Get the next Admin number from PostgreSQL
    const sequenceResult = await prisma.$queryRaw<
      { next_id: bigint }[]
    >`
      SELECT nextval('admin_id_seq') AS next_id
    `;

    const nextNumber = Number(sequenceResult[0].next_id);

    // Generate school Admin ID
    const adminId = `ADM${String(nextNumber).padStart(3, "0")}`;

    console.log("CREATE ADMIN: generated ID", adminId);

    // Check username
    const existingUsername = await prisma.admin.findUnique({
      where: {
        username: data.username,
      },
    });

    if (existingUsername) {
      return {
        success: false,
        error: "admin-username-exists",
      };
    }

    // Create user in Clerk
    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: {
        role: "admin",
      },
    });

    clerkUserId = user.id;

    console.log("CREATE ADMIN: Clerk user created", user.id);

    // Create corresponding Prisma Admin
    await prisma.admin.create({
      data: {
        id: adminId,            // ADM001, ADM002, ...
        clerkUserId: user.id,   // Clerk ID
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
         isManagingDirector: data.isManagingDirector,
      },
    });

    console.log("CREATE ADMIN: Prisma admin created");

    revalidatePath("/list/admins");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error("CREATE ADMIN ERROR:", err);

    // Roll back Clerk user if Prisma creation failed
    if (clerkUserId) {
      try {
        await clerkClient.users.deleteUser(clerkUserId);
        console.log("CREATE ADMIN: Clerk user rolled back");
      } catch (cleanupError) {
        console.error(
          "FAILED TO CLEAN UP CLERK ADMIN:",
          cleanupError
        );
      }
    }

    return {
      success: false,
      error: true,
    };
  }
};

  //-----------------------UPDATE ADMIN-------------------

export const updateAdmin = async (
  currentState: CurrentState,
  data: AdminSchema
) => {
  const { sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  if (role !== "admin") {
    return {
      success: false,
      error: "unauthorized",
    };
  }

  if (!data.id) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    // Find the Admin using the database/school ID
    const existingAdmin = await prisma.admin.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!existingAdmin) {
      return {
        success: false,
        error: "admin-not-found",
      };
    }

    // The Clerk ID is stored separately in the database
    if (!existingAdmin.clerkUserId) {
      return {
        success: false,
        error: "clerk-user-not-linked",
      };
    }

    // Update the Clerk user using clerkUserId
    const user = await clerkClient.users.updateUser(
      existingAdmin.clerkUserId,
      {
        username: data.username,
        firstName: data.name,
        lastName: data.surname,
      }
    );

    // Update the database record using the database ID

    console.log("UPDATE ADMIN - isManagingDirector:", data.isManagingDirector);
    await prisma.admin.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
         isManagingDirector: data.isManagingDirector === true,
        clerkUserId: user.id,
      },
    });

    revalidatePath("/list/admins");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error("UPDATE ADMIN ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};


  //-----------------------DELETE ADMIN-------------------

export const deleteAdmin = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  if (role !== "admin") {
    return {
      success: false,
      error: "unauthorized",
    };
  }

  const id = data.get("id") as string;

  if (!id) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    // Prevent an admin from deleting themselves
    const { userId } = auth();

    // Find the admin using the database ID
    const existingAdmin = await prisma.admin.findUnique({
      where: {
        id,
      },
    });

    if (!existingAdmin) {
      return {
        success: false,
        error: "admin-not-found",
      };
    }

    // Prevent deleting yourself
    if (existingAdmin.clerkUserId === userId) {
      return {
        success: false,
        error: "cannot-delete-self",
      };
    }

    // Delete the Clerk account using clerkUserId
    if (existingAdmin.clerkUserId) {
      await clerkClient.users.deleteUser(
        existingAdmin.clerkUserId
      );
    }

    // Delete the database record using the database ID
    await prisma.admin.delete({
      where: {
        id,
      },
    });

    revalidatePath("/list/admins");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error("DELETE ADMIN ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};

//-----------------------TEACHER ACTION-------------------

// Create
export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  let clerkUserId: string | null = null;

  try {
    // Check supervisor section before creating the Clerk user
    if (data.supervisorSection) {
      const existingSupervisor =
        await prisma.sectionSupervisor.findUnique({
          where: { section: data.supervisorSection },
        });

      if (existingSupervisor) {
        return {
          success: false,
          error: "section-already-assigned",
        };
      }
    }

    // Create the authentication account in Clerk
    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: { role: "teacher" },
    });

    clerkUserId = user.id;

    // Generate the next school-controlled teacher ID
    const sequenceResult = await prisma.$queryRaw<
      { next_id: bigint }[]
    >`
      SELECT nextval('teacher_id_seq') AS next_id
    `;

    const nextNumber = Number(sequenceResult[0].next_id);
    const teacherId = `TCH${String(nextNumber).padStart(4, "0")}`;

    // Create the teacher using the school ID,
    // while keeping the Clerk ID separately
    await prisma.teacher.create({
      data: {
        id: teacherId,
        clerkUserId: user.id,
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,

        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },

        ...(data.supervisorSection
          ? {
              sectionSupervisor: {
                create: {
                  section: data.supervisorSection,
                },
              },
            }
          : {}),
      },
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("CREATE TEACHER ERROR:", err);

    // If database creation fails after Clerk creation,
    // remove the Clerk account so we don't leave an orphan account.
    if (clerkUserId) {
      try {
        await clerkClient.users.deleteUser(clerkUserId);
      } catch (rollbackError) {
        console.log("CLERK ROLLBACK ERROR:", rollbackError);
      }
    }

    return {
      success: false,
      error: true,
    };
  }
};


// Update
export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    // Find the teacher using the school-controlled ID
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id: data.id },
    });

    if (!existingTeacher) {
      return { success: false, error: true };
    }

    // Make sure the selected supervisor section is not already assigned
    // to another teacher
    if (data.supervisorSection) {
      const existingSupervisor =
        await prisma.sectionSupervisor.findUnique({
          where: { section: data.supervisorSection },
        });

      if (
        existingSupervisor &&
        existingSupervisor.teacherId !== data.id
      ) {
        return { success: false, error: true };
      }
    }

    // Every teacher should have a Clerk account
    if (!existingTeacher.clerkUserId) {
      return { success: false, error: true };
    }

    // Update the Clerk account using clerkUserId,
    // NOT the school database ID
    await clerkClient.users.updateUser(
      existingTeacher.clerkUserId,
      {
        username: data.username,
        ...(data.password !== "" &&
          data.password !== undefined && {
            password: data.password,
          }),
        firstName: data.name,
        lastName: data.surname,
      }
    );

    // Update the school database record using the school ID
    await prisma.teacher.update({
      where: { id: data.id },
      data: {
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,

        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    // Remove the teacher's previous supervisor assignment
    await prisma.sectionSupervisor.deleteMany({
      where: { teacherId: data.id },
    });

    // Create the new supervisor assignment if selected
    if (data.supervisorSection) {
      await prisma.sectionSupervisor.create({
        data: {
          section: data.supervisorSection,
          teacherId: data.id,
        },
      });
    }

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("UPDATE TEACHER ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};

//-----------------------DELETE TEACHER-------------------

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  if (!id) {
    return { success: false, error: true };
  }

  try {
    // Find the teacher using the school-controlled ID
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
    });

    if (!existingTeacher) {
      return { success: false, error: true };
    }

    // Remove supervisor assignment first
    await prisma.sectionSupervisor.deleteMany({
      where: { teacherId: id },
    });

    // Delete the Clerk account using the Clerk ID
    if (existingTeacher.clerkUserId) {
      await clerkClient.users.deleteUser(
        existingTeacher.clerkUserId
      );
    }

    // Delete the school database record using the school ID
    await prisma.teacher.delete({
      where: { id },
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("DELETE TEACHER ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};


//--------------------
// STUDENT ACTION
//--------------------

// Create

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  let clerkUserId: string | null = null;

  try {
    // ----------------------------------------------------------
    // Generate the next school-controlled Student ID
    // ----------------------------------------------------------

    const sequenceResult = await prisma.$queryRaw<
      { next_id: bigint }[]
    >`
      SELECT nextval('student_id_seq') AS next_id
    `;

    const nextNumber = Number(sequenceResult[0].next_id);

    // School-controlled Student ID
    const studentId = `STU${String(nextNumber).padStart(4, "0")}`;

    console.log("CREATE STUDENT: generated ID", studentId);

    // ----------------------------------------------------------
    // Create authentication account in Clerk
    // ----------------------------------------------------------

    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: {
        role: "student",
      },
    });

    clerkUserId = user.id;

    console.log("CREATE STUDENT: Clerk user created", user.id);

    // ----------------------------------------------------------
    // Create corresponding Student in Prisma
    // ----------------------------------------------------------

    await prisma.student.create({
      data: {
        id: studentId,
        clerkUserId: user.id,
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,

        // Parent is now connected through the Prisma relation.
        ...(data.parentId
          ? {
              parent: {
                connect: {
                  id: data.parentId,
                },
              },
            }
          : {}),
      },
    });

    console.log("CREATE STUDENT: Prisma student created", studentId);

    // ----------------------------------------------------------
    // Success
    // ----------------------------------------------------------

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error("CREATE STUDENT ERROR:", err);

    // ----------------------------------------------------------
    // Roll back Clerk user if Prisma creation fails
    // ----------------------------------------------------------

    if (clerkUserId) {
      try {
        await clerkClient.users.deleteUser(clerkUserId);

        console.log("CREATE STUDENT: Clerk user rolled back");
      } catch (rollbackError) {
        console.error(
          "CLERK STUDENT ROLLBACK ERROR:",
          rollbackError
        );
      }
    }

    return {
      success: false,
      error: true,
    };
  }
};


// Update
export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    // ----------------------------------------------------------
    // FIND STUDENT USING THE SCHOOL-CONTROLLED DATABASE ID
    // ----------------------------------------------------------

    const existingStudent = await prisma.student.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        error: true,
      };
    }

    // ----------------------------------------------------------
    // EVERY STUDENT SHOULD HAVE A LINKED CLERK ACCOUNT
    // ----------------------------------------------------------

    if (!existingStudent.clerkUserId) {
      return {
        success: false,
        error: "clerk-user-not-linked",
      };
    }

    // ----------------------------------------------------------
    // UPDATE CLERK USING THE SEPARATE CLERK ID
    // ----------------------------------------------------------

    await clerkClient.users.updateUser(
      existingStudent.clerkUserId,
      {
        username: data.username,

        ...(data.password !== "" &&
          data.password !== undefined && {
            password: data.password,
          }),

        firstName: data.name,
        lastName: data.surname,
      }
    );

    // ----------------------------------------------------------
    // UPDATE STUDENT IN PRISMA
    //
    // IMPORTANT:
    // Class and Grade are NOT updated here anymore.
    // They are managed through StudentEnrollment.
    // ----------------------------------------------------------

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        parentId: data.parentId || null,
      },
    });

    // revalidatePath("/list/students")

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error("UPDATE STUDENT ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};


// Delete
export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  if (!id) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    // Find Student using the school-controlled database ID
    const existingStudent = await prisma.student.findUnique({
      where: {
        id,
      },
    });

    if (!existingStudent) {
      return {
        success: false,
        error: "student-not-found",
      };
    }

    // Delete the Clerk account using the separate Clerk ID
    if (existingStudent.clerkUserId) {
      await clerkClient.users.deleteUser(
        existingStudent.clerkUserId
      );
    }

    // Delete the database record using the school-controlled ID
    await prisma.student.delete({
      where: {
        id,
      },
    });

    // revalidatePath("/list/students")

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error("DELETE STUDENT ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};


//--------------------------PARENT ACTION----------------

// Create
export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  let clerkUserId: string | null = null;

  try {
    // 1. Create authentication user in Clerk
    const user = await clerkClient.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      lastName: data.surname,
      publicMetadata: {
        role: "parent",
      },
    });

    clerkUserId = user.id;

    // 2. Generate school-controlled Parent ID
    const sequenceResult = await prisma.$queryRaw<
      { next_id: bigint }[]
    >`
      SELECT nextval('parent_id_seq') AS next_id
    `;

    const nextNumber = Number(sequenceResult[0].next_id);
    const parentId = `PAR${String(nextNumber).padStart(4, "0")}`;

    // 3. Create Parent in database
    await prisma.parent.create({
      data: {
        id: parentId,
        clerkUserId: user.id,
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("CREATE PARENT ERROR:", err);

    // Roll back Clerk user if database creation fails
    if (clerkUserId) {
      try {
        await clerkClient.users.deleteUser(clerkUserId);
      } catch (rollbackError) {
        console.log("CLERK ROLLBACK ERROR:", rollbackError);
      }
    }

    return {
      success: false,
      error: true,
    };
  }
};


// Update
export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    // Find Parent using the school-controlled database ID
    const existingParent = await prisma.parent.findUnique({
      where: {
        id: data.id,
      },
    });

    if (!existingParent) {
      return {
        success: false,
        error: true,
      };
    }

    // Use the separate Clerk ID for authentication updates
    if (!existingParent.clerkUserId) {
      return {
        success: false,
        error: true,
      };
    }

    await clerkClient.users.updateUser(
      existingParent.clerkUserId,
      {
        username: data.username,
        firstName: data.name,
        lastName: data.surname,
      }
    );

    // Update only database fields here.
    // Password belongs to Clerk, not the Parent table.
    await prisma.parent.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        middleName: data.middleName || null,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("UPDATE PARENT ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};


// Delete
export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  if (!id) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    // Find Parent using school-controlled database ID
    const existingParent = await prisma.parent.findUnique({
      where: {
        id,
      },
    });

    if (!existingParent) {
      return {
        success: false,
        error: true,
      };
    }

    // Delete Clerk account using clerkUserId
    if (existingParent.clerkUserId) {
      await clerkClient.users.deleteUser(
        existingParent.clerkUserId
      );
    }

    // Delete database record using school-controlled ID
    await prisma.parent.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("DELETE PARENT ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};



// ----------------------- RESET USER PASSWORD -----------------------

export const resetUserPassword = async (
  currentState: PasswordResetState,
  data: FormData
): Promise<PasswordResetState> => {
  try {
    // Only administrators can reset passwords
    const { userId, sessionClaims } = auth();

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    if (!userId || role !== "admin") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const table = data.get("table") as string;
    const id = data.get("id") as string;
    const mode = data.get("mode") as string;
    const password = data.get("password") as string;
    const confirmPassword = data.get("confirmPassword") as string;

    if (!table || !id) {
      return {
        success: false,
        error: "missing-data",
      };
    }

    if (!["admin", "teacher", "parent", "student"].includes(table)) {
      return {
        success: false,
        error: "invalid-user-type",
      };
    }

    let clerkUserId: string | null = null;

    // --------------------------------------------------
    // Find the user using OUR school database ID
    // --------------------------------------------------

    if (table === "admin") {
      const user = await prisma.admin.findUnique({
        where: { id },
        select: {
          clerkUserId: true,
        },
      });

      clerkUserId = user?.clerkUserId ?? null;
    }

    if (table === "teacher") {
      const user = await prisma.teacher.findUnique({
        where: { id },
        select: {
          clerkUserId: true,
        },
      });

      clerkUserId = user?.clerkUserId ?? null;
    }

    if (table === "parent") {
      const user = await prisma.parent.findUnique({
        where: { id },
        select: {
          clerkUserId: true,
        },
      });

      clerkUserId = user?.clerkUserId ?? null;
    }

    if (table === "student") {
      const user = await prisma.student.findUnique({
        where: { id },
        select: {
          clerkUserId: true,
        },
      });

      clerkUserId = user?.clerkUserId ?? null;
    }

    if (!clerkUserId) {
      return {
        success: false,
        error: "clerk-user-not-found",
      };
    }

    // --------------------------------------------------
    // Determine the new password
    // --------------------------------------------------

    let newPassword = "";

    if (mode === "generate") {
      // Generate a strong temporary password
      newPassword =
        crypto.randomBytes(12).toString("base64url") + "A1!";
    } else {
      if (!password || !confirmPassword) {
        return {
          success: false,
          error: "password-required",
        };
      }

      if (password !== confirmPassword) {
        return {
          success: false,
          error: "password-mismatch",
        };
      }

      if (password.length < 8) {
        return {
          success: false,
          error: "password-too-short",
        };
      }

      newPassword = password;
    }

    // --------------------------------------------------
    // Change password in Clerk
    // --------------------------------------------------

    await clerkClient.users.updateUser(clerkUserId, {
      password: newPassword,
    });

    return {
      success: true,
      error: false,
      generatedPassword:
        mode === "generate" ? newPassword : undefined,
    };
  } catch (err) {
    console.error("RESET USER PASSWORD ERROR:", err);

    return {
      success: false,
      error: true,
    };
  }
};

//--------------------------Attendance Action--------

//---------------CREATE-------------

export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only take attendance for their own classes
    if (role === "teacher") {
      const classItem = await prisma.class.findFirst({
        where: {
          id: data.classId,
          homeRoomTeacherId: userId!,
        },
      });

      if (!classItem) {
        return { success: false, error: true };
      }
    }

    // Make sure the student is enrolled in the selected class
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: data.studentId,
        classId: data.classId,
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      return { success: false, error: true };
    }

    await prisma.attendance.create({
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        classId: data.classId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

//--------------------------UPDATE-------------

export const updateAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only update attendance for their own classes
    if (role === "teacher") {
      const classItem = await prisma.class.findFirst({
        where: {
          id: data.classId,
          homeRoomTeacherId: userId!,
        },
      });

      if (!classItem) {
        return { success: false, error: true };
      }
    }

    // Make sure the student is enrolled in the selected class
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: data.studentId,
        classId: data.classId,
      },
      select: {
        id: true,
      },
    });

    if (!enrollment) {
      return { success: false, error: true };
    }

    await prisma.attendance.update({
      where: {
        id: data.id,
      },
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        classId: data.classId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


//--------------------------SAVE MONTHLY ATTENDANCE-------------

export const saveMonthlyAttendance = async (
  currentState: CurrentState,
  data: {
    classId: number;
    attendance: {
      studentId: string;
      date: string;
      present: boolean | null;
    }[];
  }
) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  console.log("SAVE MONTHLY ATTENDANCE RECEIVED:", {
    role,
    classId: data.classId,
    count: data.attendance.length,
    firstRecords: data.attendance.slice(0, 10),
  });

  try {
    // ----------------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------------

    if (!userId) {
      console.error(
        "SAVE MONTHLY ATTENDANCE: No authenticated user."
      );

      return {
        success: false,
        error: true,
      };
    }

    // ----------------------------------------------------------
    // ROLE AUTHORIZATION
    // ----------------------------------------------------------
    //
    // Only admin and teacher can save attendance.
    // Students are view-only.
    //

    if (role !== "admin" && role !== "teacher") {
      console.error(
        "SAVE MONTHLY ATTENDANCE: Unauthorized role:",
        role
      );

      return {
        success: false,
        error: true,
      };
    }

    // ----------------------------------------------------------
    // BASIC DATA VALIDATION
    // ----------------------------------------------------------

    if (!data.classId || !Number.isInteger(data.classId)) {
      console.error(
        "SAVE MONTHLY ATTENDANCE: Invalid class ID:",
        data.classId
      );

      return {
        success: false,
        error: true,
      };
    }

    if (!Array.isArray(data.attendance)) {
      console.error(
        "SAVE MONTHLY ATTENDANCE: Invalid attendance data."
      );

      return {
        success: false,
        error: true,
      };
    }

    // ----------------------------------------------------------
    // TEACHER AUTHORIZATION
    // ----------------------------------------------------------
    //
    // IMPORTANT:
    // Clerk userId is NOT the database Teacher ID.
    //
    // Clerk userId
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
        console.error(
          "SAVE MONTHLY ATTENDANCE: Teacher account not found:",
          userId
        );

        return {
          success: false,
          error: true,
        };
      }

      const classItem = await prisma.class.findFirst({
        where: {
          id: data.classId,
          homeRoomTeacherId: teacher.id,
        },
        select: {
          id: true,
        },
      });

      if (!classItem) {
        console.error(
          "SAVE MONTHLY ATTENDANCE: Teacher attempted unauthorized class access:",
          {
            teacherId: teacher.id,
            classId: data.classId,
          }
        );

        return {
          success: false,
          error: true,
        };
      }
    }

    // ----------------------------------------------------------
    // MAKE SURE ALL SUBMITTED STUDENTS ARE ENROLLED
    // IN THE SELECTED CLASS
    // ----------------------------------------------------------

    const students = await prisma.studentEnrollment.findMany({
      where: {
        classId: data.classId,
      },
      select: {
        studentId: true,
      },
    });

    const validStudentIds = new Set(
      students.map((student) => student.studentId)
    );

    for (const record of data.attendance) {
      if (!validStudentIds.has(record.studentId)) {
        console.error(
          "SAVE MONTHLY ATTENDANCE: Invalid student for class:",
          {
            studentId: record.studentId,
            classId: data.classId,
          }
        );

        return {
          success: false,
          error: true,
        };
      }
    }

    // ----------------------------------------------------------
    // NORMALIZE + DEDUPLICATE ATTENDANCE RECORDS
    // ----------------------------------------------------------
    //
    // Each student can have only ONE attendance record
    // for a particular CALENDAR DATE.
    //
    // Example:
    //
    // STU0021 | 2026-09-07 | 00:00
    // STU0021 | 2026-09-07 | 22:29
    //
    // are treated as the SAME day.
    //
    // We always normalize the date to:
    //
    // YYYY-MM-DDT00:00:00.000Z
    //
    // This matches the Prisma composite unique key:
    //
    // studentId + classId + date
    //
    // ----------------------------------------------------------

    const uniqueAttendance = new Map<
      string,
      {
        studentId: string;
        date: Date;
        present: boolean | null;
      }
    >();

    for (const record of data.attendance) {
      // --------------------------------------------------------
      // Validate date format
      // --------------------------------------------------------

      const datePart = String(record.date);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        console.error(
          "SAVE MONTHLY ATTENDANCE: Invalid attendance date:",
          record.date
        );

        return {
          success: false,
          error: true,
        };
      }

      // --------------------------------------------------------
      // Normalize to UTC midnight
      // --------------------------------------------------------

      const attendanceDate = new Date(
        `${datePart}T00:00:00.000Z`
      );

      if (Number.isNaN(attendanceDate.getTime())) {
        console.error(
          "SAVE MONTHLY ATTENDANCE: Invalid attendance date:",
          record.date
        );

        return {
          success: false,
          error: true,
        };
      }

      // --------------------------------------------------------
      // EXCLUDE WEEKENDS
      // --------------------------------------------------------
      //
      // Sunday = 0
      // Saturday = 6
      //
      // Weekend attendance must never be saved.
      //

      const dayOfWeek = attendanceDate.getUTCDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        console.log(
          "SAVE MONTHLY ATTENDANCE: Weekend skipped:",
          {
            studentId: record.studentId,
            date: datePart,
            dayOfWeek,
          }
        );

        continue;
      }

      // --------------------------------------------------------
      // CREATE UNIQUE CALENDAR-DAY KEY
      // --------------------------------------------------------

      const key =
        `${record.studentId}_${data.classId}_${datePart}`;

      // --------------------------------------------------------
      // Keep one record per student/class/date.
      //
      // If the same date appears more than once in the submitted
      // data, the last submitted value is retained.
      // --------------------------------------------------------

      uniqueAttendance.set(key, {
        studentId: record.studentId,
        date: attendanceDate,
        present: record.present,
      });
    }

    console.log(
      "NORMALIZED UNIQUE ATTENDANCE RECORDS:",
      uniqueAttendance.size
    );

    // ----------------------------------------------------------
    // SAVE ATTENDANCE
    // ----------------------------------------------------------

    await prisma.$transaction(
      Array.from(uniqueAttendance.values()).map((record) => {
        // ------------------------------------------------------
        // NULL = NOT RECORDED
        // ------------------------------------------------------

        if (record.present === null) {
          return prisma.attendance.deleteMany({
            where: {
              studentId: record.studentId,
              classId: data.classId,
              date: record.date,
            },
          });
        }

        // ------------------------------------------------------
        // TRUE = PRESENT
        // FALSE = ABSENT
        // ------------------------------------------------------

        return prisma.attendance.upsert({
          where: {
            studentId_classId_date: {
              studentId: record.studentId,
              classId: data.classId,
              date: record.date,
            },
          },
          update: {
            present: record.present,
          },
          create: {
            studentId: record.studentId,
            classId: data.classId,
            date: record.date,
            present: record.present,
          },
        });
      })
    );

    console.log(
      "MONTHLY ATTENDANCE TRANSACTION COMPLETED"
    );

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error(
      "SAVE MONTHLY ATTENDANCE ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};
//--------------------------DELETE-------------

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.attendance.delete({
      where: {
        id: parseInt(id),
        ...(role === "teacher"
          ? {
              class: {
                homeRoomTeacherId: userId!,
              },
            }
          : {}),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


//--------------------------LESSON ACTION----------------

// CREATE
export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// UPDATE
export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await prisma.lesson.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// DELETE
export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.lesson.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


//--------------------------RESULT ACTION----------------

// SAVE RESULT DRAFT

export const saveResultDraft = async (data: {
  academicYearId: number;
  classId: number;
  subjectId: number;
  semester: Semester;
  scores: {
    studentId: string;
    assessmentId: number;
    score: number | null;
  }[];
}) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  try {
    // --------------------------------------------------
    // 1. Only teachers can enter results
    // --------------------------------------------------
    if (role !== "teacher" || !userId) {
      return {
        success: false,
        error: true,
        message: "Only teachers can enter results.",
      };
    }

    // --------------------------------------------------
    // 2. Convert Clerk user ID -> Teacher database ID
    // --------------------------------------------------
    const teacher = await prisma.teacher.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      return {
        success: false,
        error: true,
        message: "Teacher account was not found.",
      };
    }

    // This is the school's Teacher.id.
    // It is NOT the Clerk user ID.
    const id = teacher.id;

    // --------------------------------------------------
    // 3. Make sure the academic year exists
    // --------------------------------------------------
    const academicYear =
      await prisma.academicYear.findUnique({
        where: {
          id: data.academicYearId,
        },
        select: {
          id: true,
        },
      });

    if (!academicYear) {
      return {
        success: false,
        error: true,
        message: "Academic year was not found.",
      };
    }

    // --------------------------------------------------
    // 4. Load the selected class
    //
    // IMPORTANT:
    // gradeId comes from Class, NOT Subject.
    // --------------------------------------------------
    const selectedClass = await prisma.class.findUnique({
      where: {
        id: data.classId,
      },
      select: {
        id: true,
        gradeId: true,
      },
    });

    if (!selectedClass) {
      return {
        success: false,
        error: true,
        message: "Class was not found.",
      };
    }

    // --------------------------------------------------
    // 5. SERVER-SIDE TEACHER AUTHORIZATION
    //
    // A teacher may save results ONLY when a Lesson
    // exists connecting:
    //
    //   Teacher.id
    //        +
    //   selected class
    //        +
    //   selected subject
    //
    // IMPORTANT:
    // Use Lesson.teacherId.
    // Do NOT use homeRoomTeacherId here.
    // --------------------------------------------------
    const lesson = await prisma.lesson.findFirst({
      where: {
        teacherId: id,
        classId: data.classId,
        subjectId: data.subjectId,
      },
      select: {
        id: true,
      },
    });

    if (!lesson) {
      return {
        success: false,
        error: true,
        message:
          "You are not assigned to teach this subject in this class.",
      };
    }

    // --------------------------------------------------
    // 6. Find the result submission for this exact result
    // --------------------------------------------------
    let submission =
      await prisma.resultSubmission.findUnique({
        where: {
          academicYearId_classId_subjectId_semester: {
            academicYearId: data.academicYearId,
            classId: data.classId,
            subjectId: data.subjectId,
            semester: data.semester,
          },
        },
      });

    // --------------------------------------------------
    // 7. Submitted results are locked
    // --------------------------------------------------
    if (submission?.status === "SUBMITTED") {
      return {
        success: false,
        error: true,
        message:
          "This result has already been submitted and is locked.",
      };
    }

    // --------------------------------------------------
    // 8. Get assessment definitions for the exact:
    //
    // Academic Year
    // + Class Grade
    // + Subject
    // + Semester
    // --------------------------------------------------
    const assessments =
      await prisma.assessment.findMany({
        where: {
          academicYearId: data.academicYearId,
          gradeId: selectedClass.gradeId,
          subjectId: data.subjectId,
          semester: data.semester,
        },
        select: {
          id: true,
          maxScore: true,
        },
      });

    const assessmentMap = new Map(
      assessments.map((assessment) => [
        assessment.id,
        assessment,
      ])
    );

    // --------------------------------------------------
    // 9. Get students actually enrolled in this class
    //    for this academic year
    // --------------------------------------------------
    const enrollments =
      await prisma.studentEnrollment.findMany({
        where: {
          academicYearId: data.academicYearId,
          classId: data.classId,
        },
        select: {
          studentId: true,
        },
      });

    const enrolledStudentIds = new Set(
      enrollments.map(
        (enrollment) => enrollment.studentId
      )
    );

    // --------------------------------------------------
    // 10. Validate every submitted score
    // --------------------------------------------------
    for (const item of data.scores) {
      // Student must belong to this class
      // for this academic year.
      if (!enrolledStudentIds.has(item.studentId)) {
        return {
          success: false,
          error: true,
          message:
            "A student in the submitted data is not enrolled in this class.",
        };
      }

      // Assessment must belong to this exact result.
      const assessment = assessmentMap.get(
        item.assessmentId
      );

      if (!assessment) {
        return {
          success: false,
          error: true,
          message:
            "An invalid assessment was submitted.",
        };
      }

      // Empty input means remove the existing score.
      if (item.score === null) {
        continue;
      }

      // Score must be a valid number within the
      // assessment's raw maximum score.
      if (
        !Number.isFinite(item.score) ||
        item.score < 0 ||
        item.score > assessment.maxScore
      ) {
        return {
          success: false,
          error: true,
          message:
            `Score must be between 0 and ${assessment.maxScore}.`,
        };
      }
    }

    // --------------------------------------------------
    // 11. Save everything inside one transaction
    // --------------------------------------------------
    await prisma.$transaction(async (tx) => {
      // ------------------------------------------------
      // Re-check teacher authorization INSIDE the
      // transaction immediately before modifying data.
      //
      // This keeps the write protected even if this
      // action is called directly without using the page.
      // ------------------------------------------------
      const authorizedLesson =
        await tx.lesson.findFirst({
          where: {
            teacherId: id,
            classId: data.classId,
            subjectId: data.subjectId,
          },
          select: {
            id: true,
          },
        });

      if (!authorizedLesson) {
        throw new Error(
          "UNAUTHORIZED_RESULT_TEACHER"
        );
      }

      // -----------------------------------------------
      // Re-check submission lock immediately before
      // modifying scores.
      // -----------------------------------------------
      const currentSubmission =
        await tx.resultSubmission.findUnique({
          where: {
            academicYearId_classId_subjectId_semester: {
              academicYearId: data.academicYearId,
              classId: data.classId,
              subjectId: data.subjectId,
              semester: data.semester,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

      if (
        currentSubmission?.status === "SUBMITTED"
      ) {
        throw new Error(
          "RESULT_ALREADY_SUBMITTED"
        );
      }

      // -----------------------------------------------
      // Create the submission record if this is the
      // first time the result is saved.
      // -----------------------------------------------
      let submissionId =
        currentSubmission?.id;

      if (!submissionId) {
        const newSubmission =
          await tx.resultSubmission.create({
            data: {
              academicYearId: data.academicYearId,
              classId: data.classId,
              subjectId: data.subjectId,
              semester: data.semester,
              status: "DRAFT",
            },
            select: {
              id: true,
            },
          });

        submissionId = newSubmission.id;
      }

      // -----------------------------------------------
      // Save all scores.
      // -----------------------------------------------
      for (const item of data.scores) {
        // Empty input removes an existing score.
        if (item.score === null) {
          await tx.studentAssessment.deleteMany({
            where: {
              studentId: item.studentId,
              assessmentId: item.assessmentId,
            },
          });

          continue;
        }

        // Save or update the raw score.
        await tx.studentAssessment.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: item.assessmentId,
              studentId: item.studentId,
            },
          },
          update: {
            score: item.score,
          },
          create: {
            assessmentId: item.assessmentId,
            studentId: item.studentId,
            score: item.score,
          },
        });
      }

      // -----------------------------------------------
      // Keep the result in DRAFT status.
      // -----------------------------------------------
      await tx.resultSubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: "DRAFT",
        },
      });
    });

    // --------------------------------------------------
    // 12. Success
    // --------------------------------------------------
    return {
      success: true,
      error: false,
      message: "Results saved as draft.",
    };
  } catch (err) {
    // --------------------------------------------------
    // Expected authorization/locking failures
    // --------------------------------------------------
    if (
      err instanceof Error &&
      err.message ===
        "UNAUTHORIZED_RESULT_TEACHER"
    ) {
      return {
        success: false,
        error: true,
        message:
          "You are not assigned to teach this subject in this class.",
      };
    }

    if (
      err instanceof Error &&
      err.message ===
        "RESULT_ALREADY_SUBMITTED"
    ) {
      return {
        success: false,
        error: true,
        message:
          "This result has already been submitted and is locked.",
      };
    }

    console.error(
      "SAVE RESULT DRAFT ERROR:",
      err
    );

    return {
      success: false,
      error: true,
      message: "Failed to save results.",
    };
  }
};


//--------------------------SUBMIT RESULT-----------------------

export const submitResult = async (data: {
  academicYearId: number;
  classId: number;
  subjectId: number;
  semester: Semester;
}) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role;

  if (role !== "teacher" || !userId) {
    return {
      success: false,
      message: "Unauthorized.",
    };
  }

  try {
    // --------------------------------------------------
    // 1. Get teacher DB ID from Clerk ID
    // --------------------------------------------------

    const teacher = await prisma.teacher.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!teacher) {
      return {
        success: false,
        message: "Teacher record not found.",
      };
    }

    const id = teacher.id;

    // --------------------------------------------------
    // 2. Check academic year
    // --------------------------------------------------

    const academicYear =
      await prisma.academicYear.findUnique({
        where: {
          id: data.academicYearId,
        },
      });

    if (!academicYear) {
      return {
        success: false,
        message: "Academic year not found.",
      };
    }

    // --------------------------------------------------
    // 3. Check class
    // --------------------------------------------------

    const selectedClass =
      await prisma.class.findUnique({
        where: {
          id: data.classId,
        },
        select: {
          id: true,
          name: true,
          gradeId: true,
        },
      });

    if (!selectedClass) {
      return {
        success: false,
        message: "Class not found.",
      };
    }

    // --------------------------------------------------
    // 4. Verify teacher teaches this subject in this class
    // --------------------------------------------------

    const lesson = await prisma.lesson.findFirst({
      where: {
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: id,
      },
      select: {
        id: true,
      },
    });

    if (!lesson) {
      return {
        success: false,
        message:
          "You are not authorized to submit results for this class and subject.",
      };
    }

    // --------------------------------------------------
    // 5. Find the result submission
    // --------------------------------------------------

    const submission =
      await prisma.resultSubmission.findUnique({
        where: {
          academicYearId_classId_subjectId_semester: {
            academicYearId: data.academicYearId,
            classId: data.classId,
            subjectId: data.subjectId,
            semester: data.semester,
          },
        },
      });

    if (!submission) {
      return {
        success: false,
        message:
          "Please save the results as a draft before submitting.",
      };
    }

    // --------------------------------------------------
    // 6. Already submitted?
    // --------------------------------------------------

    if (submission.status === "SUBMITTED") {
      return {
        success: false,
        message: "These results have already been submitted.",
      };
    }

    // --------------------------------------------------
    // 7. Make sure assessments exist
    // --------------------------------------------------

    const assessments =
      await prisma.assessment.findMany({
        where: {
          academicYearId: data.academicYearId,
          gradeId: selectedClass.gradeId,
          subjectId: data.subjectId,
          semester: data.semester,
        },
        select: {
          id: true,
        },
      });

    if (assessments.length === 0) {
      return {
        success: false,
        message:
          "No assessments were found for this class, subject, and semester.",
      };
    }

    // --------------------------------------------------
    // 8. Make sure students exist
    // --------------------------------------------------

    const enrollments =
      await prisma.studentEnrollment.findMany({
        where: {
          academicYearId: data.academicYearId,
          classId: data.classId,
        },
        select: {
          studentId: true,
        },
      });

    if (enrollments.length === 0) {
      return {
        success: false,
        message:
          "No students were found in this class.",
      };
    }

    // --------------------------------------------------
    // 9. Submit WITHOUT requiring every mark
    // --------------------------------------------------
    //
    // Missing StudentAssessment records are allowed.
    // They will be treated as 0 when calculating results.
    //
    // The teacher is explicitly confirming this on the
    // client before this action is called.
    //

    await prisma.resultSubmission.update({
      where: {
        id: submission.id,
      },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedById: id,
      },
    });

    return {
      success: true,
      message:
        "Results submitted successfully. They are now locked.",
    };
  } catch (error) {
    console.error("SUBMIT RESULT ERROR:", error);

    return {
      success: false,
      message:
        "Failed to submit results. Please try again.",
    };
  }
};

// =========================================================
// RESET RESULT SUBMISSION
// =========================================================
//
// Supervisor/Admin action:
// SUBMITTED -> DRAFT
//
// The actual student scores are NOT deleted.
//
// Reset:
// 1. Unlocks the submission.
// 2. Clears submittedAt.
// 3. Invalidates the previously saved Overall Analysis.
//
// The individual Performance Analysis assessment records
// are preserved.
// =========================================================

export const resetResultSubmission = async (
  submissionId: number
) => {
  const { userId, sessionClaims } = auth();

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  try {
    // User must be logged in.
    if (!userId) {
      return {
        success: false,
        error: true,
      };
    }

    // Only admins and section supervisors can reset.
    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: true,
      };
    }

    /*
     * ---------------------------------------------------------
     * Find the submitted result
     * ---------------------------------------------------------
     */
    const submission =
      await prisma.resultSubmission.findUnique({
        where: {
          id: submissionId,
        },
        select: {
          id: true,
          status: true,

          class: {
            select: {
              grade: {
                select: {
                  section: true,
                },
              },
            },
          },
        },
      });

    if (!submission) {
      return {
        success: false,
        error: true,
      };
    }

    /*
     * Only SUBMITTED results can be reset.
     */
    if (submission.status !== "SUBMITTED") {
      return {
        success: false,
        error: true,
      };
    }

    /*
     * ---------------------------------------------------------
     * ADMIN
     * ---------------------------------------------------------
     *
     * Admin can reset any submitted result.
     */
    if (role === "admin") {
      await prisma.$transaction([
        /*
         * Invalidate the previously saved Overall Analysis
         * for this exact ResultSubmission.
         *
         * The individual assessment analyses are preserved.
         */
        prisma.performanceAnalysis.deleteMany({
          where: {
            resultSubmissionId: submissionId,
            assessmentScope: "OVERALL",
          },
        }),

        /*
         * Return the result submission to DRAFT.
         *
         * Student scores remain untouched.
         */
        prisma.resultSubmission.update({
          where: {
            id: submissionId,
          },
          data: {
            status: "DRAFT",
            submittedAt: null,
          },
        }),
      ]);

      return {
        success: true,
        error: false,
      };
    }

    /*
     * ---------------------------------------------------------
     * TEACHER / SECTION SUPERVISOR
     * ---------------------------------------------------------
     *
     * Clerk user ID must first be converted to the
     * database Teacher.id.
     */
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
      return {
        success: false,
        error: true,
      };
    }

    /*
     * Verify that this teacher is actually a
     * section supervisor.
     */
    const supervisor =
      await prisma.sectionSupervisor.findUnique({
        where: {
          teacherId: teacher.id,
        },
        select: {
          section: true,
        },
      });

    if (!supervisor) {
      return {
        success: false,
        error: true,
      };
    }

    /*
     * The submission's class must belong to the
     * supervisor's section.
     */
    if (
      submission.class.grade.section !==
      supervisor.section
    ) {
      return {
        success: false,
        error: true,
      };
    }

    /*
     * ---------------------------------------------------------
     * RESET
     * ---------------------------------------------------------
     *
     * Invalidate only the Overall Analysis belonging
     * to this exact ResultSubmission.
     *
     * Individual assessment analyses remain untouched.
     *
     * Student result scores remain untouched.
     */
    await prisma.$transaction([
      prisma.performanceAnalysis.deleteMany({
        where: {
          resultSubmissionId: submissionId,
          assessmentScope: "OVERALL",
        },
      }),

      prisma.resultSubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: "DRAFT",
          submittedAt: null,
        },
      }),
    ]);

    return {
      success: true,
      error: false,
    };
  } catch (error) {
    console.error(
      "RESET RESULT SUBMISSION ERROR:",
      error
    );

    return {
      success: false,
      error: true,
    };
  }
};


// ---------------------------------------------------------
// CREATE STUDENT ENROLLMENT
// ---------------------------------------------------------

export const createStudentEnrollment = async (
  currentState: CurrentState,
  data: StudentEnrollmentSchema
) => {
  try {
    // -----------------------------------------------------
    // ADMIN CHECK
    // -----------------------------------------------------

    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const role = sessionClaims?.metadata?.role;

    if (role !== "admin") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    // -----------------------------------------------------
    // CHECK STUDENT
    // -----------------------------------------------------

    const student = await prisma.student.findUnique({
      where: {
        id: data.studentId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      return {
        success: false,
        error: "student-not-found",
      };
    }

    // -----------------------------------------------------
    // CHECK ACADEMIC YEAR
    // -----------------------------------------------------

    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id: data.academicYearId,
      },
      select: {
        id: true,
      },
    });

    if (!academicYear) {
      return {
        success: false,
        error: "academic-year-not-found",
      };
    }

    // -----------------------------------------------------
    // CHECK CLASS + GET ITS GRADE
    // -----------------------------------------------------

    const classItem = await prisma.class.findUnique({
      where: {
        id: data.classId,
      },
      select: {
        id: true,
        capacity: true,
        gradeId: true,
      },
    });

    if (!classItem) {
      return {
        success: false,
        error: "class-not-found",
      };
    }
    

    // -----------------------------------------------------
    // CHECK IF STUDENT IS ALREADY ENROLLED
    // IN THIS ACADEMIC YEAR
    // -----------------------------------------------------

    const existingEnrollment =
      await prisma.studentEnrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId: data.studentId,
            academicYearId: data.academicYearId,
          },
        },
      });

    if (existingEnrollment) {
      return {
        success: false,
        error: "student-already-enrolled",
      };
    }

    // -----------------------------------------------------
    // CHECK CLASS CAPACITY
    //
    // IMPORTANT:
    // Capacity is based on enrollments for the selected
    // academic year, not Student.classId.
    // -----------------------------------------------------

    const enrolledCount =
      await prisma.studentEnrollment.count({
        where: {
          classId: data.classId,
          academicYearId: data.academicYearId,
        },
      });

    if (enrolledCount >= classItem.capacity) {
      return {
        success: false,
        error: "class-full",
      };
    }

    // -----------------------------------------------------
    // AUTOMATIC ROLL NUMBER
    //
    // Every class starts from 1.
    // A new academic year starts again from 1.
    // -----------------------------------------------------

    const lastEnrollment =
      await prisma.studentEnrollment.findFirst({
        where: {
          classId: data.classId,
          academicYearId: data.academicYearId,
        },
        orderBy: {
          rollNumber: "desc",
        },
        select: {
          rollNumber: true,
        },
      });

    const rollNumber =
      (lastEnrollment?.rollNumber ?? 0) + 1;

    // -----------------------------------------------------
    // CREATE ENROLLMENT
    // -----------------------------------------------------

    await prisma.studentEnrollment.create({
      data: {
        studentId: data.studentId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        rollNumber,
      },
    });

    revalidatePath("/list/student-enrollments");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error(
      "CREATE STUDENT ENROLLMENT ERROR:",
      err
    );

    // Unique constraint:
    // [studentId, academicYearId]
    // OR
    // [classId, academicYearId, rollNumber]
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "P2002"
    ) {
      return {
        success: false,
        error: "enrollment-conflict",
      };
    }

    return {
      success: false,
      error: true,
    };
  }
};

// ---------------------------------------------------------
// UPDATE STUDENT ENROLLMENT
// ---------------------------------------------------------

export const updateStudentEnrollment = async (
  currentState: CurrentState,
  data: StudentEnrollmentSchema
) => {
  try {
    const { sessionClaims } = auth();

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    if (role !== "admin") {
      return {
        success: false,
        error: true,
      };
    }

    if (!data.id) {
      return {
        success: false,
        error: true,
      };
    }

    // ---------------------------------------------------------
    // EXISTING ENROLLMENT
    // ---------------------------------------------------------

    const existingEnrollment =
      await prisma.studentEnrollment.findUnique({
        where: {
          id: data.id,
        },
        include: {
          student: true,
          class: true,
        },
      });

    if (!existingEnrollment) {
      return {
        success: false,
        error: true,
      };
    }

    // ---------------------------------------------------------
    // STUDENT CANNOT BE CHANGED
    // ---------------------------------------------------------

    if (data.studentId !== existingEnrollment.studentId) {
      return {
        success: false,
        error: true,
      };
    }

    // ---------------------------------------------------------
    // ACADEMIC YEAR CANNOT BE CHANGED
    // ---------------------------------------------------------

    if (
      data.academicYearId !==
      existingEnrollment.academicYearId
    ) {
      return {
        success: false,
        error: true,
      };
    }

    // ---------------------------------------------------------
    // VALIDATE ROLL NUMBER
    // ---------------------------------------------------------

    if (
      data.rollNumber == null ||
      !Number.isInteger(data.rollNumber) ||
      data.rollNumber < 1
    ) {
      return {
        success: false,
        error: "invalid-roll-number",
      };
    }

    // ---------------------------------------------------------
    // TARGET CLASS
    // ---------------------------------------------------------

    const targetClass = await prisma.class.findUnique({
      where: {
        id: data.classId,
      },
    });

    if (!targetClass) {
      return {
        success: false,
        error: "class-not-found",
      };
    }

    // ---------------------------------------------------------
    // CLASS CHANGE
    // ---------------------------------------------------------

    const classChanged =
      existingEnrollment.classId !== data.classId;

    // ---------------------------------------------------------
    // CAPACITY
    // ---------------------------------------------------------

    if (classChanged) {
      const enrolledCount =
        await prisma.studentEnrollment.count({
          where: {
            academicYearId:
              existingEnrollment.academicYearId,

            classId: data.classId,

            NOT: {
              id: existingEnrollment.id,
            },
          },
        });

      if (enrolledCount >= targetClass.capacity) {
        return {
          success: false,
          error: "class-full",
        };
      }
    }

    // ---------------------------------------------------------
    // CHECK ROLL NUMBER CONFLICT
    // ---------------------------------------------------------

    const rollNumberConflict =
      await prisma.studentEnrollment.findFirst({
        where: {
          academicYearId:
            existingEnrollment.academicYearId,

          classId: data.classId,

          rollNumber: data.rollNumber,

          NOT: {
            id: existingEnrollment.id,
          },
        },
      });

    if (rollNumberConflict) {
      return {
        success: false,
        error: "enrollment-conflict",
      };
    }

    // ---------------------------------------------------------
    // UPDATE ENROLLMENT
    // ---------------------------------------------------------

    await prisma.studentEnrollment.update({
      where: {
        id: existingEnrollment.id,
      },
      data: {
        classId: data.classId,
        rollNumber: data.rollNumber,
      },
    });

    // ---------------------------------------------------------
    // REVALIDATE
    // ---------------------------------------------------------

    revalidatePath("/list/student-enrollments");

    return {
      success: true,
      error: false,
    };
  } catch (err: any) {
    console.log(
      "UPDATE STUDENT ENROLLMENT ERROR:",
      err
    );

    if (err?.code === "P2002") {
      return {
        success: false,
        error: "enrollment-conflict",
      };
    }

    return {
      success: false,
      error: true,
    };
  }
};
// ---------------------------------------------------------
// DELETE STUDENT ENROLLMENT
// ---------------------------------------------------------

export const deleteStudentEnrollment = async (
  currentState: CurrentState,
  data: FormData
) => {
  try {
    // -----------------------------------------------------
    // ADMIN CHECK
    // -----------------------------------------------------

    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const role = sessionClaims?.metadata?.role;

    if (role !== "admin") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const id = data.get("id") as string;

    if (!id) {
      return {
        success: false,
        error: "enrollment-id-required",
      };
    }

    // -----------------------------------------------------
    // DELETE ONLY THE ENROLLMENT
    //
    // The Student record itself is NOT deleted.
    // -----------------------------------------------------

    await prisma.studentEnrollment.delete({
      where: {
        id: Number(id),
      },
    });

    revalidatePath("/list/student-enrollments");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error(
      "DELETE STUDENT ENROLLMENT ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};

 // Create Promotion Policy
export const createPromotionPolicy = async (
  currentState: CurrentState,
  data: PromotionPolicySchema
) => {
  try {
    await prisma.promotionPolicy.create({
      data: {
        academicYearId: data.academicYearId,
        section: data.section,
        promotionMinimumAverage: data.promotionMinimumAverage,
        detentionMaximumAverage: data.detentionMaximumAverage,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


// Update Promotion Policy
export const updatePromotionPolicy = async (
  currentState: CurrentState,
  data: PromotionPolicySchema
) => {
  try {
    await prisma.promotionPolicy.update({
      where: {
        id: data.id,
      },
      data: {
        academicYearId: data.academicYearId,
        section: data.section,
        promotionMinimumAverage: data.promotionMinimumAverage,
        detentionMaximumAverage: data.detentionMaximumAverage,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


// Delete Promotion Policy
export const deletePromotionPolicy = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.promotionPolicy.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

//----------------------------Academic Year Actions-----------------------------

export const createAcademicYear = async (
  currentState: CurrentState,
  data: AcademicYearSchema
) => {
  try {
    await prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.academicYear.updateMany({
          data: {
            isCurrent: false,
          },
        });
      }

      await tx.academicYear.create({
        data: {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          semester1StartDate:
            data.semester1StartDate,
          semester1EndDate:
            data.semester1EndDate,
          semester2StartDate:
            data.semester2StartDate,
          semester2EndDate:
            data.semester2EndDate,
          isCurrent: data.isCurrent,
        },
      });
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(err);

    return {
      success: false,
      error: true,
    };
  }
};

export const updateAcademicYear = async (
  currentState: CurrentState,
  data: AcademicYearSchema
) => {
  try {
    if (!data.id) {
      return {
        success: false,
        error: true,
      };
    }

    await prisma.$transaction(async (tx) => {
      if (data.isCurrent) {
        await tx.academicYear.updateMany({
          where: {
            id: {
              not: data.id,
            },
          },
          data: {
            isCurrent: false,
          },
        });
      }

      await tx.academicYear.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          semester1StartDate:
            data.semester1StartDate,
          semester1EndDate:
            data.semester1EndDate,
          semester2StartDate:
            data.semester2StartDate,
          semester2EndDate:
            data.semester2EndDate,
          isCurrent: data.isCurrent,
        },
      });
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(err);

    return {
      success: false,
      error: true,
    };
  }
};

export const deleteAcademicYear = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.academicYear.delete({
      where: {
        id: parseInt(id),
      },
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(err);

    return {
      success: false,
      error: true,
    };
  }
};

// ============================================================================
// COMMUNICATION BOOK - SHARED SAVE LOGIC
// ============================================================================

const saveCommunicationBook = async (
  data: CommunicationBookSchema
) => {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return {
      success: false,
      error: "unauthorized",
    };
  }

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  if (role !== "admin" && role !== "teacher") {
    return {
      success: false,
      error: "unauthorized",
    };
  }

  // ----------------------------------------------------------
  // STUDENT ENROLLMENT
  // ----------------------------------------------------------

  const enrollment =
    await prisma.studentEnrollment.findUnique({
      where: {
        studentId_academicYearId: {
          studentId: data.studentId,
          academicYearId: data.academicYearId,
        },
      },
      select: {
        studentId: true,
        academicYearId: true,
        classId: true,
        rollNumber: true,
        class: {
          select: {
            id: true,
            name: true,
            homeRoomTeacherId: true,
            grade: {
              select: {
                id: true,
                name: true,
                level: true,
                section: true,
              },
            },
          },
        },
      },
    });

  if (!enrollment) {
    return {
      success: false,
      error: "student-enrollment-not-found",
    };
  }

  if (enrollment.classId !== data.classId) {
    return {
      success: false,
      error: "invalid-student-class",
    };
  }

  // ----------------------------------------------------------
  // TEACHER AUTHORIZATION
  // ----------------------------------------------------------

  let teacherId: string | undefined;

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
      return {
        success: false,
        error: "teacher-not-found",
      };
    }

    teacherId = teacher.id;

    if (
      enrollment.class.homeRoomTeacherId !==
      teacher.id
    ) {
      return {
        success: false,
        error: "unauthorized",
      };
    }
  }

  // ----------------------------------------------------------
  // ACADEMIC YEAR
  // ----------------------------------------------------------

  const academicYear =
    await prisma.academicYear.findUnique({
      where: {
        id: data.academicYearId,
      },
      select: {
        id: true,
      },
    });

  if (!academicYear) {
    return {
      success: false,
      error: "academic-year-not-found",
    };
  }

  // ----------------------------------------------------------
  // ONLY SAVE SUBJECTS THAT HAVE HOMEWORK OR ASP
  // ----------------------------------------------------------

  const subjectsToSave = data.subjects.filter(
    (subject) =>
      Boolean(
        subject.homeworkInstruction?.trim()
      ) ||
      Boolean(subject.asp?.trim())
  );

  // ----------------------------------------------------------
  // DUPLICATE SUBJECT VALIDATION
  // ----------------------------------------------------------

  const submittedSubjectIds =
    subjectsToSave.map(
      (subject) => subject.subjectId
    );

  if (
    new Set(submittedSubjectIds).size !==
    submittedSubjectIds.length
  ) {
    return {
      success: false,
      error: "duplicate-subject",
    };
  }

  // ----------------------------------------------------------
  // SUBJECT VALIDATION
  // ----------------------------------------------------------

  const subjects =
    submittedSubjectIds.length > 0
      ? await prisma.subject.findMany({
          where: {
            id: {
              in: submittedSubjectIds,
            },
          },
          select: {
            id: true,
            name: true,
            sections: {
              select: {
                section: true,
              },
            },
          },
        })
      : [];

  if (
    subjects.length !==
    submittedSubjectIds.length
  ) {
    return {
      success: false,
      error: "subject-not-found",
    };
  }

  const gradeSection =
    enrollment.class.grade.section;

  const invalidSubject =
    subjects.find(
      (subject) =>
        !subject.sections.some(
          (subjectSection) =>
            subjectSection.section ===
            gradeSection
        )
    );

  if (invalidSubject) {
    return {
      success: false,
      error: "invalid-subject-for-grade",
    };
  }

  // ----------------------------------------------------------
  // TRANSACTION
  // ----------------------------------------------------------

  try {
    const communicationBookId =
      await prisma.$transaction(
        async (tx) => {
          let id: number;

          // ----------------------------------------------------
          // EXISTING RECORD
          // ----------------------------------------------------

          let existingSubjects:
            {
              subjectId: number;
              parentSignature: string | null;
            }[] = [];

          if (data.id) {
            const existing =
              await tx.communicationBook.findUnique({
                where: {
                  id: data.id,
                },
                select: {
                  id: true,
                  studentId: true,
                  academicYearId: true,
                  classId: true,
                  subjects: {
                    select: {
                      subjectId: true,
                      parentSignature: true,
                    },
                  },
                },
              });

            if (!existing) {
              throw new Error(
                "COMMUNICATION_BOOK_NOT_FOUND"
              );
            }

            if (
              existing.studentId !==
                data.studentId ||
              existing.academicYearId !==
                data.academicYearId ||
              existing.classId !== data.classId
            ) {
              throw new Error(
                "COMMUNICATION_BOOK_CONTEXT_CANNOT_CHANGE"
              );
            }

            existingSubjects =
              existing.subjects;

            // --------------------------------------------------
            // TEACHER UPDATE
            //
            // Parent-controlled fields are intentionally
            // preserved. They are changed only by the parent
            // update action.
            // --------------------------------------------------

            const updated =
              await tx.communicationBook.update({
                where: {
                  id: data.id,
                },
                data: {
                  date: data.date,

                  dailyWord:
                    data.dailyWord?.trim() ||
                    null,

                  characterTrait:
                    data.characterTrait?.trim() ||
                    null,

                  teacherComment:
                    data.teacherComment?.trim() ||
                    null,

                  teacherName:
                    data.teacherName?.trim() ||
                    null,

                  teacherSignature:
                    data.teacherSignature?.trim() ||
                    null,

                  // DO NOT update:
                  // parentComment
                  // parentName
                  // parentSignature
                },
                select: {
                  id: true,
                },
              });

            id = updated.id;
          } else {
            // --------------------------------------------------
            // CREATE
            // --------------------------------------------------

            const created =
              await tx.communicationBook.create({
                data: {
                  studentId:
                    data.studentId,

                  academicYearId:
                    data.academicYearId,

                  classId:
                    data.classId,

                  date: data.date,

                  dailyWord:
                    data.dailyWord?.trim() ||
                    null,

                  characterTrait:
                    data.characterTrait?.trim() ||
                    null,

                  teacherComment:
                    data.teacherComment?.trim() ||
                    null,

                  teacherName:
                    data.teacherName?.trim() ||
                    null,

                  teacherSignature:
                    data.teacherSignature?.trim() ||
                    null,

                  // Parent fields start empty.
                  parentComment: null,
                  parentName: null,
                  parentSignature: null,
                },

                select: {
                  id: true,
                },
              });

            id = created.id;
          }

          // ----------------------------------------------------
          // EXISTING PARENT SIGNATURES
          // ----------------------------------------------------

          const parentSignatureMap =
            new Map<number, string | null>();

          for (const item of existingSubjects) {
            parentSignatureMap.set(
              item.subjectId,
              item.parentSignature
            );
          }

          // ----------------------------------------------------
          // REPLACE DAILY SUBJECT CONTENT
          //
          // Only subjects containing Homework or ASP survive.
          // Parent signatures are restored for subjects that
          // remain in the book.
          // ----------------------------------------------------

          await tx.communicationBookSubject.deleteMany({
            where: {
              communicationBookId: id,
            },
          });

          if (subjectsToSave.length > 0) {
            await tx.communicationBookSubject.createMany(
              {
                data: subjectsToSave.map(
                  (subject) => ({
                    communicationBookId: id,

                    subjectId:
                      subject.subjectId,

                    homeworkInstruction:
                      subject.homeworkInstruction?.trim() ||
                      null,

                    asp:
                      subject.asp?.trim() ||
                      null,

                    parentSignature:
                      parentSignatureMap.get(
                        subject.subjectId
                      ) ?? null,
                  })
                ),
              }
            );
          }

          return id;
        }
      );

    revalidatePath(
      "/list/communication-books"
    );

    return {
      success: true,
      error: false,
      id: communicationBookId,
    };
  } catch (err: any) {
    console.log(
      "COMMUNICATION BOOK SAVE ERROR:",
      err
    );

    if (
      err?.message ===
      "COMMUNICATION_BOOK_NOT_FOUND"
    ) {
      return {
        success: false,
        error: "communication-book-not-found",
      };
    }

    if (
      err?.message ===
      "COMMUNICATION_BOOK_CONTEXT_CANNOT_CHANGE"
    ) {
      return {
        success: false,
        error:
          "communication-book-context-cannot-change",
      };
    }

    if (err?.code === "P2002") {
      return {
        success: false,
        error:
          "communication-book-already-exists",
      };
    }

    return {
      success: false,
      error: true,
    };
  }
};

// ============================================================================
// CREATE COMMUNICATION BOOK
// ============================================================================

export const createCommunicationBook = async (
  currentState: CurrentState,
  formData: FormData
) => {
  try {
    const rawData = {
      id: undefined,

      studentId:
        String(formData.get("studentId") ?? ""),

      academicYearId:
        formData.get("academicYearId"),

      classId:
        formData.get("classId"),

      date:
        formData.get("date"),

      dailyWord:
        String(formData.get("dailyWord") ?? ""),

      characterTrait:
        String(
          formData.get("characterTrait") ?? ""
        ),

      teacherComment:
        String(
          formData.get("teacherComment") ?? ""
        ),

      teacherName:
        String(
          formData.get("teacherName") ?? ""
        ),

      teacherSignature:
        String(
          formData.get("teacherSignature") ?? ""
        ),

      parentComment:
        String(
          formData.get("parentComment") ?? ""
        ),

      parentName:
        String(
          formData.get("parentName") ?? ""
        ),

      parentSignature:
        String(
          formData.get("parentSignature") ?? ""
        ),

      subjects: JSON.parse(
        String(formData.get("subjects") ?? "[]")
      ),
    };

    const validatedData =
      communicationBookSchema.safeParse(rawData);

    if (!validatedData.success) {
      console.log(
        "COMMUNICATION BOOK VALIDATION ERROR:",
        validatedData.error.flatten()
      );

      return {
        success: false,
        error: true,
      };
    }

    return await saveCommunicationBook(
      validatedData.data
    );
  } catch (err) {
    console.log(
      "CREATE COMMUNICATION BOOK ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};

// ============================================================================
// UPDATE COMMUNICATION BOOK
// ============================================================================

export const updateCommunicationBook = async (
  currentState: CurrentState,
  formData: FormData
) => {
  try {
    const rawId = formData.get("id");

    const rawData = {
      id: rawId,

      studentId:
        String(formData.get("studentId") ?? ""),

      academicYearId:
        formData.get("academicYearId"),

      classId:
        formData.get("classId"),

      date:
        formData.get("date"),

      dailyWord:
        String(formData.get("dailyWord") ?? ""),

      characterTrait:
        String(
          formData.get("characterTrait") ?? ""
        ),

      teacherComment:
        String(
          formData.get("teacherComment") ?? ""
        ),

      teacherName:
        String(
          formData.get("teacherName") ?? ""
        ),

      teacherSignature:
        String(
          formData.get("teacherSignature") ?? ""
        ),

      parentComment:
        String(
          formData.get("parentComment") ?? ""
        ),

      parentName:
        String(
          formData.get("parentName") ?? ""
        ),

      parentSignature:
        String(
          formData.get("parentSignature") ?? ""
        ),

      subjects: JSON.parse(
        String(formData.get("subjects") ?? "[]")
      ),
    };

    const validatedData =
      communicationBookSchema.safeParse(rawData);

    if (!validatedData.success) {
      console.log(
        "COMMUNICATION BOOK UPDATE VALIDATION ERROR:",
        validatedData.error.flatten()
      );

      return {
        success: false,
        error: true,
      };
    }

    if (!validatedData.data.id) {
      return {
        success: false,
        error: true,
      };
    }

    return await saveCommunicationBook(
      validatedData.data
    );
  } catch (err) {
    console.log(
      "UPDATE COMMUNICATION BOOK ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};

// ============================================================================
// DELETE COMMUNICATION BOOK
// ============================================================================

export const deleteCommunicationBook = async (
  currentState: CurrentState,
  formData: FormData
) => {
  const rawId = formData.get("id");

  const id = Number(rawId);

  if (!id || Number.isNaN(id)) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    const { userId, sessionClaims } =
      await auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const role = (
      sessionClaims?.metadata as {
        role?: string;
      }
    )?.role;

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    // ------------------------------------------------------------------------
    // Find Communication Book and its homeroom teacher
    // ------------------------------------------------------------------------

    const communicationBook =
      await prisma.communicationBook.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          class: {
            select: {
              homeRoomTeacherId: true,
            },
          },
        },
      });

    if (!communicationBook) {
      return {
        success: false,
        error: "communication-book-not-found",
      };
    }

    // ------------------------------------------------------------------------
    // Teacher authorization
    // ------------------------------------------------------------------------

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
        return {
          success: false,
          error: "teacher-not-found",
        };
      }

      if (
        communicationBook.class
          .homeRoomTeacherId !== teacher.id
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }
    }

    // ------------------------------------------------------------------------
    // Delete
    // ------------------------------------------------------------------------

    await prisma.communicationBook.delete({
      where: {
        id,
      },
    });

    revalidatePath(
      "/list/communication-book"
    );

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(
      "DELETE COMMUNICATION BOOK ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};


export const updateCommunicationBookParent = async (
  currentState: CurrentState,
  formData: FormData
) => {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const rawId = formData.get("id");
    const id = Number(rawId);

    if (!id || Number.isNaN(id)) {
      return {
        success: false,
        error: true,
      };
    }

    const communicationBook =
      await prisma.communicationBook.findUnique({
        where: { id },
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              parent: {
                select: {
                  id: true,
                  clerkUserId: true,
                  name: true,
                  surname: true,
                },
              },
            },
          },
        },
      });

    if (!communicationBook) {
      return {
        success: false,
        error: "communication-book-not-found",
      };
    }

    // Only the authenticated parent linked to this student may edit.
    const parent = communicationBook.student.parent;

    if (!parent || parent.clerkUserId !== userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const parentComment = String(
      formData.get("parentComment") ?? ""
    ).trim();

    const parentSignature = String(
      formData.get("parentSignature") ?? ""
    ).trim();

    // Always use the name of the authenticated student's linked parent.
    const parentName =
      `${parent.name} ${parent.surname ?? ""}`.trim();

    let subjectSignatures: {
      subjectId: number;
      parentSignature: string;
    }[];

    try {
      const parsed: unknown = JSON.parse(
        String(formData.get("subjectSignatures") ?? "[]")
      );

      if (!Array.isArray(parsed)) {
        return {
          success: false,
          error: true,
        };
      }

      subjectSignatures = parsed.filter(
        (item): item is {
          subjectId: number;
          parentSignature: string;
        } =>
          item !== null &&
          typeof item === "object" &&
          Number.isInteger(Number(item.subjectId)) &&
          Number(item.subjectId) > 0 &&
          typeof item.parentSignature === "string"
      );
    } catch {
      return {
        success: false,
        error: true,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.communicationBook.update({
        where: { id },
        data: {
          parentComment: parentComment || null,
          parentName: parentName || null,
          parentSignature: parentSignature || null,
        },
      });

      // Only subjects with homework/instruction or ASP may receive
      // parent signatures through this action.
      const existingSubjects =
        await tx.communicationBookSubject.findMany({
          where: {
            communicationBookId: id,
            OR: [
              {
                homeworkInstruction: {
                  not: null,
                },
              },
              {
                asp: {
                  not: null,
                },
              },
            ],
          },
          select: {
            subjectId: true,
            homeworkInstruction: true,
            asp: true,
          },
        });

      const eligibleSubjectIds = new Set(
        existingSubjects
          .filter(
            (subject) =>
              Boolean(subject.homeworkInstruction?.trim()) ||
              Boolean(subject.asp?.trim())
          )
          .map((subject) => subject.subjectId)
      );

      // Ignore duplicate IDs and update only eligible subjects
      // belonging to this communication book.
      const processedSubjectIds = new Set<number>();

      for (const item of subjectSignatures) {
        const subjectId = Number(item.subjectId);

        if (
          !eligibleSubjectIds.has(subjectId) ||
          processedSubjectIds.has(subjectId)
        ) {
          continue;
        }

        processedSubjectIds.add(subjectId);

        await tx.communicationBookSubject.update({
          where: {
            communicationBookId_subjectId: {
              communicationBookId: id,
              subjectId,
            },
          },
          data: {
            parentSignature:
              item.parentSignature.trim() || null,
          },
        });
      }
    });

    revalidatePath("/list/communication-books");
    revalidatePath(
      `/list/communication-book/${communicationBook.studentId}`
    );

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(
      "UPDATE COMMUNICATION BOOK PARENT ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};


//--------------------------WEEKLY PROGRESS ACTION----------------

// CREATE
const getExpectedWeekEnd = (weekStart: string) => {
  const date = new Date(`${weekStart}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + 4);

  return date;
};

export const createWeeklyProgress = async (
  currentState: CurrentState,
  data: WeeklyProgressSchema
) => {
  try {
    const { userId, sessionClaims } = auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    // Only admin and teacher can create a weekly progress report.
    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const enrollment =
      await prisma.studentEnrollment.findUnique({
        where: {
          studentId_academicYearId: {
            studentId: data.studentId,
            academicYearId: data.academicYearId,
          },
        },
        include: {
          class: {
            select: {
              homeRoomTeacherId: true,
            },
          },
        },
      });

    if (!enrollment) {
      return {
        success: false,
        error: "student-enrollment-not-found",
      };
    }

    // The supplied class must match the student's enrollment.
    if (enrollment.classId !== data.classId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    // ------------------------------------------------------
    // TEACHER AUTHORIZATION
    // ------------------------------------------------------

    if (role === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

      if (
        !teacher ||
        enrollment.class.homeRoomTeacherId !== teacher.id
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }
    }

    // ------------------------------------------------------
    // DATE HANDLING
    // ------------------------------------------------------


    const weekStart = new Date(
  `${data.weekStart}T00:00:00.000Z`
);

const weekEnd = getExpectedWeekEnd(data.weekStart);

if (
  data.weekEnd !==
  weekEnd.toISOString().slice(0, 10)
) {
  return {
    success: false,
    error: "invalid-week-range",
  };
}

    // ------------------------------------------------------
    // DUPLICATE CHECK
    // ------------------------------------------------------

    const existing =
      await prisma.weeklyProgressReport.findUnique({
        where: {
          studentId_academicYearId_weekStart: {
            studentId: data.studentId,
            academicYearId: data.academicYearId,
            weekStart,
          },
        },
      });

    if (existing) {
      return {
        success: false,
        error: "weekly-progress-already-exists",
      };
    }

    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    await prisma.weeklyProgressReport.create({
      data: {
        studentId: data.studentId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        weekStart,
        weekEnd,

        teacherComment:
          data.teacherComment?.trim() || null,

        teacherName:
          data.teacherName?.trim() || null,

        teacherSignature:
          data.teacherSignature || null,

        parentComment:
          data.parentComment?.trim() || null,

        parentName:
          data.parentName?.trim() || null,

        parentSignature:
          data.parentSignature || null,

        items: {
          create: data.items.map((item) => ({
            criterion: item.criterion,
            category: item.category,
            rating: item.rating,
          })),
        },
      },
    });

    revalidatePath(
      `/list/communication-book/${data.studentId}/weekly-progress`
    );

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(err);

    return {
      success: false,
      error: true,
    };
  }
};


// UPDATE
export const updateWeeklyProgress = async (
  currentState: CurrentState,
  data: WeeklyProgressSchema
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
    };
  }

  try {
    const { userId, sessionClaims } = auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    const existing =
      await prisma.weeklyProgressReport.findUnique({
        where: {
          id: data.id,
        },
        include: {
          student: {
            include: {
              parent: {
                select: {
                  clerkUserId: true,
                },
              },
            },
          },
          class: {
            select: {
              homeRoomTeacherId: true,
            },
          },
        },
      });

    if (!existing) {
      return {
        success: false,
        error: "weekly-progress-not-found",
      };
    }

    // ------------------------------------------------------
    // TEACHER
    // ------------------------------------------------------

    if (role === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

      if (
        !teacher ||
        existing.class.homeRoomTeacherId !== teacher.id
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }

      await prisma.$transaction([
        prisma.weeklyProgressReport.update({
          where: {
            id: data.id,
          },
          data: {
           weekEnd: getExpectedWeekEnd(data.weekStart),

            teacherComment:
              data.teacherComment?.trim() || null,

            teacherName:
              data.teacherName?.trim() || null,

            teacherSignature:
              data.teacherSignature || null,

            // Teacher cannot modify parent fields.
            parentComment:
              existing.parentComment,

            parentName:
              existing.parentName,

            parentSignature:
              existing.parentSignature,
          },
        }),

        prisma.weeklyProgressItem.deleteMany({
          where: {
            weeklyProgressReportId: data.id,
          },
        }),

        prisma.weeklyProgressItem.createMany({
          data: data.items.map((item) => ({
            weeklyProgressReportId: data.id!,
            criterion: item.criterion,
            category: item.category,
            rating: item.rating,
          })),
        }),
      ]);
    }

    // ------------------------------------------------------
    // PARENT
    // ------------------------------------------------------

    else if (role === "parent") {
      if (
        existing.student.parent?.clerkUserId !==
        userId
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }

      await prisma.weeklyProgressReport.update({
        where: {
          id: data.id,
        },
        data: {
          // Parent cannot modify teacher fields.
          teacherComment:
            existing.teacherComment,

          teacherName:
            existing.teacherName,

          teacherSignature:
            existing.teacherSignature,

          parentComment:
            data.parentComment?.trim() || null,

          parentName:
            data.parentName?.trim() || null,

          parentSignature:
            data.parentSignature || null,
        },
      });
    }

    // ------------------------------------------------------
    // ADMIN
    // ------------------------------------------------------

    else if (role === "admin") {
      // Admin can edit EVERYTHING:
      // - ratings
      // - teacher comment/name/signature
      // - parent comment/name/signature

      await prisma.$transaction([
        prisma.weeklyProgressReport.update({
          where: {
            id: data.id,
          },
          data: {
            weekEnd: new Date(
              `${data.weekEnd}T00:00:00.000Z`
            ),

            teacherComment:
              data.teacherComment?.trim() || null,

            teacherName:
              data.teacherName?.trim() || null,

            teacherSignature:
              data.teacherSignature || null,

            parentComment:
              data.parentComment?.trim() || null,

            parentName:
              data.parentName?.trim() || null,

            parentSignature:
              data.parentSignature || null,
          },
        }),

        prisma.weeklyProgressItem.deleteMany({
          where: {
            weeklyProgressReportId: data.id,
          },
        }),

        prisma.weeklyProgressItem.createMany({
          data: data.items.map((item) => ({
            weeklyProgressReportId: data.id!,
            criterion: item.criterion,
            category: item.category,
            rating: item.rating,
          })),
        }),
      ]);
    }

    // ------------------------------------------------------
    // OTHER ROLES
    // ------------------------------------------------------

    else {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    revalidatePath(
      `/list/communication-book/${existing.studentId}/weekly-progress`
    );

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(err);

    return {
      success: false,
      error: true,
    };
  }
};


// DELETE
export const deleteWeeklyProgress = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const { userId, sessionClaims } = auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    // Only admin and teacher can delete.
    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const report =
      await prisma.weeklyProgressReport.findUnique({
        where: {
          id: parseInt(id),
        },
        include: {
          class: {
            select: {
              homeRoomTeacherId: true,
            },
          },
        },
      });

    if (!report) {
      return {
        success: false,
        error: "weekly-progress-not-found",
      };
    }

    // ------------------------------------------------------
    // TEACHER DELETE AUTHORIZATION
    // ------------------------------------------------------

    if (role === "teacher") {
      const teacher = await prisma.teacher.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

      if (
        !teacher ||
        report.class.homeRoomTeacherId !== teacher.id
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }
    }

    // Admin can delete any Weekly Progress report.
    await prisma.weeklyProgressReport.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath(
      `/list/communication-book/${report.studentId}/weekly-progress`
    );

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(err);

    return {
      success: false,
      error: true,
    };
  }
};

// ---------------------------------------------------------
// SAVE WEEKLY PROGRESS PARENT SECTION
// Reuses the existing WeeklyProgressForm.
// ---------------------------------------------------------

export const updateWeeklyProgressParent = async (
  reportId: number,
  parentComment: string,
  parentSignature: string | null
) => {
  try {
    const { userId, sessionClaims } = auth();

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    if (role !== "parent") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    if (!Number.isInteger(reportId) || reportId <= 0) {
      return {
        success: false,
        error: "invalid-report",
      };
    }

    const report =
      await prisma.weeklyProgressReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              parent: {
                select: {
                  clerkUserId: true,
                  name: true,
                  surname: true,
                },
              },
            },
          },
        },
      });

    if (!report) {
      return {
        success: false,
        error: "weekly-progress-not-found",
      };
    }

    const parent = report.student.parent;

    if (!parent || parent.clerkUserId !== userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const parentName = [
      parent.name,
      parent.surname,
    ]
      .filter(Boolean)
      .join(" ");

    await prisma.weeklyProgressReport.update({
      where: { id: report.id },
      data: {
        parentComment: parentComment.trim() || null,
        parentName: parentName || null,
        parentSignature: parentSignature || null,
      },
    });

    revalidatePath(
      `/list/communication-book/${report.studentId}/weekly-progress`
    );

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.error(
      "Failed to save Weekly Progress parent section:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};

// =====================================================
// MESSAGE ACTIONS
// =====================================================

// CREATE MESSAGE
export const createMessage = async (
  currentState: CurrentState,
  data: MessageSchema
) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (
      !userId ||
      (role !== "admin" && role !== "teacher")
    ) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    let senderAdminId: string | null = null;
    let senderTeacherId: string | null = null;

    // -------------------------------------------------
    // FIND SENDER
    // -------------------------------------------------

    if (role === "admin") {
      const admin = await prisma.admin.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

      if (!admin) {
        return {
          success: false,
          error: "sender-not-found",
        };
      }

      senderAdminId = admin.id;
    }

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
        return {
          success: false,
          error: "sender-not-found",
        };
      }

      senderTeacherId = teacher.id;
    }

    // -------------------------------------------------
    // CLEAN RECIPIENTS
    // -------------------------------------------------

    const recipientIds = [
      ...new Set(
        data.recipientIds
          .map((recipient) => recipient.trim())
          .filter(Boolean)
      ),
    ];

    if (recipientIds.length === 0) {
      return {
        success: false,
        error: "no-recipients",
      };
    }

    const adminIds = recipientIds
      .filter((recipient) => recipient.startsWith("admin:"))
      .map((recipient) =>
        recipient.substring("admin:".length)
      );

    const teacherIds = recipientIds
      .filter((recipient) =>
        recipient.startsWith("teacher:")
      )
      .map((recipient) =>
        recipient.substring("teacher:".length)
      );

    if (
      adminIds.length + teacherIds.length !==
      recipientIds.length
    ) {
      return {
        success: false,
        error: "invalid-recipient",
      };
    }

    // -------------------------------------------------
    // VALIDATE ADMIN RECIPIENTS
    // -------------------------------------------------

    if (adminIds.length > 0) {
      const admins = await prisma.admin.findMany({
        where: {
          id: {
            in: adminIds,
          },
        },
        select: {
          id: true,
        },
      });

      const existingAdminIds = new Set(
        admins.map((admin) => admin.id)
      );

      if (
        !adminIds.every((id) =>
          existingAdminIds.has(id)
        )
      ) {
        return {
          success: false,
          error: "recipient-not-found",
        };
      }
    }

    // -------------------------------------------------
    // VALIDATE TEACHER RECIPIENTS
    // -------------------------------------------------

    if (teacherIds.length > 0) {
      const teachers = await prisma.teacher.findMany({
        where: {
          id: {
            in: teacherIds,
          },
        },
        select: {
          id: true,
        },
      });

      const existingTeacherIds = new Set(
        teachers.map((teacher) => teacher.id)
      );

      if (
        !teacherIds.every((id) =>
          existingTeacherIds.has(id)
        )
      ) {
        return {
          success: false,
          error: "recipient-not-found",
        };
      }
    }

    // -------------------------------------------------
    // PREVENT SELF MESSAGE
    // -------------------------------------------------

    if (
      (role === "admin" &&
        adminIds.includes(senderAdminId!)) ||
      (role === "teacher" &&
        teacherIds.includes(senderTeacherId!))
    ) {
      return {
        success: false,
        error: "cannot-message-self",
      };
    }

    // -------------------------------------------------
    // CREATE MESSAGE + RECIPIENTS
    // -------------------------------------------------

    await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          senderAdminId,
          senderTeacherId,
          subject: data.subject.trim(),
          body: data.body.trim(),
        },
      });

      if (adminIds.length > 0) {
        await tx.messageRecipient.createMany({
          data: adminIds.map((adminId) => ({
            messageId: message.id,
            adminId,
          })),
        });
      }

      if (teacherIds.length > 0) {
        await tx.messageRecipient.createMany({
          data: teacherIds.map((teacherId) => ({
            messageId: message.id,
            teacherId,
          })),
        });
      }
    });

    //revalidatePath("/list/messages");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("CREATE MESSAGE ERROR:", err);

    return {
      success: false,
      error: "message-create-failed",
    };
  }
};


// =====================================================
// UPDATE MESSAGE
// =====================================================

export const updateMessage = async (
  currentState: CurrentState,
  data: MessageSchema
) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (
      !userId ||
      (role !== "admin" && role !== "teacher")
    ) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    if (!data.id) {
      return {
        success: false,
        error: "message-not-found",
      };
    }

    let senderAdminId: string | null = null;
    let senderTeacherId: string | null = null;

    // -------------------------------------------------
    // FIND CURRENT USER
    // -------------------------------------------------

    if (role === "admin") {
      const admin = await prisma.admin.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

      if (!admin) {
        return {
          success: false,
          error: "sender-not-found",
        };
      }

      senderAdminId = admin.id;
    }

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
        return {
          success: false,
          error: "sender-not-found",
        };
      }

      senderTeacherId = teacher.id;
    }

    // -------------------------------------------------
    // FIND MESSAGE AND VERIFY OWNERSHIP
    // -------------------------------------------------

    const message = await prisma.message.findFirst({
      where: {
        id: data.id,
        ...(role === "admin"
          ? {
              senderAdminId,
            }
          : {
              senderTeacherId,
            }),
      },
      select: {
        id: true,
      },
    });

    if (!message) {
      return {
        success: false,
        error: "message-not-found",
      };
    }

    // -------------------------------------------------
    // CLEAN RECIPIENTS
    // -------------------------------------------------

    const recipientIds = [
      ...new Set(
        data.recipientIds
          .map((recipient) => recipient.trim())
          .filter(Boolean)
      ),
    ];

    if (recipientIds.length === 0) {
      return {
        success: false,
        error: "no-recipients",
      };
    }

    const adminIds = recipientIds
      .filter((recipient) => recipient.startsWith("admin:"))
      .map((recipient) =>
        recipient.substring("admin:".length)
      );

    const teacherIds = recipientIds
      .filter((recipient) =>
        recipient.startsWith("teacher:")
      )
      .map((recipient) =>
        recipient.substring("teacher:".length)
      );

    if (
      adminIds.length + teacherIds.length !==
      recipientIds.length
    ) {
      return {
        success: false,
        error: "invalid-recipient",
      };
    }

    // -------------------------------------------------
    // VALIDATE RECIPIENTS
    // -------------------------------------------------

    if (adminIds.length > 0) {
      const admins = await prisma.admin.findMany({
        where: {
          id: {
            in: adminIds,
          },
        },
        select: {
          id: true,
        },
      });

      const existingAdminIds = new Set(
        admins.map((admin) => admin.id)
      );

      if (
        !adminIds.every((id) =>
          existingAdminIds.has(id)
        )
      ) {
        return {
          success: false,
          error: "recipient-not-found",
        };
      }
    }

    if (teacherIds.length > 0) {
      const teachers = await prisma.teacher.findMany({
        where: {
          id: {
            in: teacherIds,
          },
        },
        select: {
          id: true,
        },
      });

      const existingTeacherIds = new Set(
        teachers.map((teacher) => teacher.id)
      );

      if (
        !teacherIds.every((id) =>
          existingTeacherIds.has(id)
        )
      ) {
        return {
          success: false,
          error: "recipient-not-found",
        };
      }
    }

    // -------------------------------------------------
    // PREVENT SELF MESSAGE
    // -------------------------------------------------

    if (
      (role === "admin" &&
        adminIds.includes(senderAdminId!)) ||
      (role === "teacher" &&
        teacherIds.includes(senderTeacherId!))
    ) {
      return {
        success: false,
        error: "cannot-message-self",
      };
    }

    // -------------------------------------------------
    // UPDATE MESSAGE
    // -------------------------------------------------

    await prisma.$transaction(async (tx) => {
      await tx.message.update({
        where: {
          id: message.id,
        },
        data: {
          subject: data.subject.trim(),
          body: data.body.trim(),
        },
      });

      await tx.messageRecipient.deleteMany({
        where: {
          messageId: message.id,
        },
      });

      if (adminIds.length > 0) {
        await tx.messageRecipient.createMany({
          data: adminIds.map((adminId) => ({
            messageId: message.id,
            adminId,
            isRead: false,
          })),
        });
      }

      if (teacherIds.length > 0) {
        await tx.messageRecipient.createMany({
          data: teacherIds.map((teacherId) => ({
            messageId: message.id,
            teacherId,
            isRead: false,
          })),
        });
      }
    });

    //revalidatePath("/list/messages");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("UPDATE MESSAGE ERROR:", err);

    return {
      success: false,
      error: "message-update-failed",
    };
  }
};


// =====================================================
// DELETE MESSAGE
// =====================================================

export const deleteMessage = async (
  currentState: CurrentState,
  data: FormData
) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (
      !userId ||
      (role !== "admin" && role !== "teacher")
    ) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    const id = data.get("id") as string;

    if (!id) {
      return {
        success: false,
        error: "message-not-found",
      };
    }

    let currentUserDbId: string | null = null;

    if (role === "admin") {
      const admin = await prisma.admin.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

      if (!admin) {
        return {
          success: false,
          error: "sender-not-found",
        };
      }

      currentUserDbId = admin.id;
    }

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
        return {
          success: false,
          error: "sender-not-found",
        };
      }

      currentUserDbId = teacher.id;
    }

    // -------------------------------------------------
    // ONLY THE SENDER CAN DELETE THE MESSAGE
    // -------------------------------------------------

    const message = await prisma.message.findFirst({
      where: {
        id: parseInt(id),
        ...(role === "admin"
          ? {
              senderAdminId: currentUserDbId,
            }
          : {
              senderTeacherId: currentUserDbId,
            }),
      },
      select: {
        id: true,
      },
    });

    if (!message) {
      return {
        success: false,
        error: "message-not-found",
      };
    }

    await prisma.message.delete({
      where: {
        id: message.id,
      },
    });

    //revalidatePath("/list/messages");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("DELETE MESSAGE ERROR:", err);

    return {
      success: false,
      error: "message-delete-failed",
    };
  }
};


// =====================================================
// MARK MESSAGE AS READ
// =====================================================

export const markMessageAsRead = async (
  currentState: CurrentState,
  messageRecipientId: number
) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (
      !userId ||
      (role !== "admin" && role !== "teacher")
    ) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    let adminId: string | null = null;
    let teacherId: string | null = null;

    if (role === "admin") {
      const admin = await prisma.admin.findUnique({
        where: {
          clerkUserId: userId,
        },
        select: {
          id: true,
        },
      });

      if (!admin) {
        return {
          success: false,
          error: "recipient-not-found",
        };
      }

      adminId = admin.id;
    }

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
        return {
          success: false,
          error: "recipient-not-found",
        };
      }

      teacherId = teacher.id;
    }

    const recipient =
      await prisma.messageRecipient.findFirst({
        where: {
          id: messageRecipientId,
          ...(role === "admin"
            ? {
                adminId,
              }
            : {
                teacherId,
              }),
        },
        select: {
          id: true,
          isRead: true,
        },
      });

    if (!recipient) {
      return {
        success: false,
        error: "message-not-found",
      };
    }

    if (recipient.isRead) {
      return {
        success: true,
        error: false,
      };
    }

    await prisma.messageRecipient.update({
      where: {
        id: recipient.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    revalidatePath("/list/messages");

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log("MARK MESSAGE AS READ ERROR:", err);

    return {
      success: false,
      error: "message-read-failed",
    };
  }
};



// ============================================================
// PERFORMANCE ANALYSIS
// ============================================================

const performanceAnalysisAssessmentTypes = [
  "Q1",
  "Q2",
  "TEST1",
  "TEST2",
  "MIDTERM",
  "FINAL",
] as const;

type PerformanceAnalysisAssessmentType =
  (typeof performanceAnalysisAssessmentTypes)[number];

type PerformanceCategory =
  | "EXCELLENT"
  | "VERY_GOOD"
  | "AVERAGE"
  | "POOR"
  | "FAIL";

// ============================================================
// PERFORMANCE CATEGORY
// ============================================================

const getPerformanceCategory = (
  normalizedScore: number
): PerformanceCategory => {
  if (normalizedScore >= 9) return "EXCELLENT";
  if (normalizedScore > 7) return "VERY_GOOD";
  if (normalizedScore > 6) return "AVERAGE";
  if (normalizedScore >= 5) return "POOR";
  return "FAIL";
};

// ============================================================
// BUILD PERFORMANCE ANALYSIS SUMMARY
// ============================================================

type PerformanceAnalysisSummaryData = {
  totalStudents: number;
  totalMale: number;
  totalFemale: number;

  excellentMale: number;
  excellentFemale: number;
  excellentTotal: number;

  veryGoodMale: number;
  veryGoodFemale: number;
  veryGoodTotal: number;

  averageMale: number;
  averageFemale: number;
  averageTotal: number;

  poorMale: number;
  poorFemale: number;
  poorTotal: number;

  failMale: number;
  failFemale: number;
  failTotal: number;
};

const buildPerformanceAnalysisSummary = (
  students: Array<{
    sex: UserSex | null;
    normalizedScore: number;
    category: PerformanceCategory;
  }>
): PerformanceAnalysisSummaryData => {
  const summary: PerformanceAnalysisSummaryData = {
    totalStudents: students.length,

    totalMale: 0,
    totalFemale: 0,

    excellentMale: 0,
    excellentFemale: 0,
    excellentTotal: 0,

    veryGoodMale: 0,
    veryGoodFemale: 0,
    veryGoodTotal: 0,

    averageMale: 0,
    averageFemale: 0,
    averageTotal: 0,

    poorMale: 0,
    poorFemale: 0,
    poorTotal: 0,

    failMale: 0,
    failFemale: 0,
    failTotal: 0,
  };

  for (const student of students) {
    if (student.sex === "MALE") {
      summary.totalMale++;
    }

    if (student.sex === "FEMALE") {
      summary.totalFemale++;
    }

    switch (student.category) {
      case "EXCELLENT":
        summary.excellentTotal++;

        if (student.sex === "MALE") {
          summary.excellentMale++;
        }

        if (student.sex === "FEMALE") {
          summary.excellentFemale++;
        }

        break;

      case "VERY_GOOD":
        summary.veryGoodTotal++;

        if (student.sex === "MALE") {
          summary.veryGoodMale++;
        }

        if (student.sex === "FEMALE") {
          summary.veryGoodFemale++;
        }

        break;

      case "AVERAGE":
        summary.averageTotal++;

        if (student.sex === "MALE") {
          summary.averageMale++;
        }

        if (student.sex === "FEMALE") {
          summary.averageFemale++;
        }

        break;

      case "POOR":
        summary.poorTotal++;

        if (student.sex === "MALE") {
          summary.poorMale++;
        }

        if (student.sex === "FEMALE") {
          summary.poorFemale++;
        }

        break;

      case "FAIL":
        summary.failTotal++;

        if (student.sex === "MALE") {
          summary.failMale++;
        }

        if (student.sex === "FEMALE") {
          summary.failFemale++;
        }

        break;
    }
  }

  return summary;
};

// ============================================================
// PARSE PERFORMANCE ANALYSIS FORM DATA
// ============================================================

const parsePerformanceAnalysisFormData = (
  input: FormData | PerformanceAnalysisSchema
): PerformanceAnalysisSchema => {
  if (input instanceof FormData) {
    const raw = Object.fromEntries(input.entries());

    return performanceAnalysisSchema.parse({
      ...raw,

      id:
        raw.id === ""
          ? undefined
          : raw.id,

      section:
        raw.section === ""
          ? undefined
          : raw.section,

      gradeId:
        raw.gradeId === ""
          ? undefined
          : raw.gradeId,

      classId:
        raw.classId === ""
          ? undefined
          : raw.classId,

      assessmentType:
        raw.assessmentType === ""
          ? undefined
          : raw.assessmentType,
    });
  }

  return performanceAnalysisSchema.parse(input);
};

// ============================================================
// REBUILD PERFORMANCE ANALYSIS
// ============================================================

const rebuildPerformanceAnalysis = async (
  data: PerformanceAnalysisSchema,
  userId: string,
  role: string,
  existingAnalysis?: {
    id: number;
    createdByAdminId: string | null;
    createdByTeacherId: string | null;
    assessmentScope: string;
    resultSubmissionId: number | null;
  },
  saveOverallSummary = false
) => {
  // ==========================================================
  // RESOLVE CREATOR
  // ==========================================================

  let createdByAdminId: string | null = null;
  let createdByTeacherId: string | null = null;

  if (role === "admin") {
    const admin = await prisma.admin.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!admin) {
      return {
        success: false,
        error: true,
      };
    }

    createdByAdminId =
      existingAnalysis?.createdByAdminId ?? admin.id;
  }

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
      return {
        success: false,
        error: true,
      };
    }

    createdByTeacherId =
      existingAnalysis?.createdByTeacherId ?? teacher.id;
  }

  // ==========================================================
  // GET ACADEMIC YEAR
  // ==========================================================

  const academicYear =
    await prisma.academicYear.findUnique({
      where: {
        id: data.academicYearId,
      },
      select: {
        id: true,
        name: true,
      },
    });

  if (!academicYear) {
    return {
      success: false,
      error: true,
    };
  }

  // ==========================================================
  // GET SUBJECT
  // ==========================================================

  const subject =
    await prisma.subject.findUnique({
      where: {
        id: data.subjectId,
      },
      select: {
        id: true,
        name: true,
      },
    });

  if (!subject) {
    return {
      success: false,
      error: true,
    };
  }

  // ==========================================================
  // RESOLVE SECTION / GRADE / CLASS NAMES
  // ==========================================================

  let selectedSectionName: string | null = null;
  let selectedGradeName: string | null = null;
  let selectedClassName: string | null = null;

  if (data.section) {
    selectedSectionName = data.section;
  }

  if (data.gradeId) {
    const grade =
      await prisma.grade.findUnique({
        where: {
          id: data.gradeId,
        },
        select: {
          id: true,
          name: true,
          section: true,
        },
      });

    if (!grade) {
      return {
        success: false,
        error: true,
      };
    }

    selectedGradeName = grade.name;

    if (!selectedSectionName && grade.section) {
      selectedSectionName = grade.section;
    }
  }

  if (data.classId) {
    const schoolClass =
      await prisma.class.findUnique({
        where: {
          id: data.classId,
        },
        select: {
          id: true,
          name: true,
          gradeId: true,
        },
      });

    if (!schoolClass) {
      return {
        success: false,
        error: true,
      };
    }

    selectedClassName = schoolClass.name;

    if (
      data.gradeId &&
      schoolClass.gradeId !== data.gradeId
    ) {
      return {
        success: false,
        error: true,
      };
    }

    if (!selectedGradeName) {
      const classGrade =
        await prisma.grade.findUnique({
          where: {
            id: schoolClass.gradeId,
          },
          select: {
            id: true,
            name: true,
            section: true,
          },
        });

      if (classGrade) {
        selectedGradeName = classGrade.name;

        if (!selectedSectionName) {
          selectedSectionName =
            classGrade.section;
        }
      }
    }
  }

  // ==========================================================
  // TEACHER ACCESS CHECK
  // ==========================================================

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
      return {
        success: false,
        error: true,
      };
    }

    // A teacher can create/update a CLASS analysis only
    // when the teacher actually teaches that class/subject.
    if (
      data.level === "CLASS" &&
      data.classId
    ) {
      const teacherLesson =
        await prisma.lesson.findFirst({
          where: {
            teacherId: teacher.id,
            classId: data.classId,
            subjectId: data.subjectId,
          },
          select: {
            id: true,
          },
        });

      if (!teacherLesson) {
        return {
          success: false,
          error: true,
        };
      }
    }

    // For higher-level analysis, verify that the teacher
    // teaches at least one matching class for the subject.
    if (data.level !== "CLASS") {
      const teacherLesson =
        await prisma.lesson.findFirst({
          where: {
            teacherId: teacher.id,
            subjectId: data.subjectId,

            ...(data.gradeId
              ? {
                  class: {
                    gradeId: data.gradeId,
                  },
                }
              : {}),

            ...(data.section
              ? {
                  class: {
                    grade: {
                      section:
                        data.section as GradeSection,
                    },
                  },
                }
              : {}),
          },
          select: {
            id: true,
          },
        });

      if (!teacherLesson) {
        return {
          success: false,
          error: true,
        };
      }
    }
  }

  // ==========================================================
  // OVERALL ANALYSIS
  //
  // CLASS:
  //   - real CLASS-level Overall record
  //   - exact ResultSubmission can be linked when explicitly
  //     saved
  //
  // GRADE / SECTION / SCHOOL:
  //   - snapshot at the selected level
  //   - aggregate summary is stored
  //   - resultSubmissionId remains NULL
  //
  // IMPORTANT:
  // No higher-level Overall is converted into CLASS.
  // ==========================================================

  let resultSubmissionId: number | undefined;

  if (
    data.assessmentScope === "OVERALL"
  ) {
    if (data.level === "CLASS") {
      if (!data.classId) {
        return {
          success: false,
          error: true,
        };
      }

      const submission =
        await prisma.resultSubmission.findUnique({
          where: {
            academicYearId_classId_subjectId_semester: {
              academicYearId:
                data.academicYearId,

              classId:
                data.classId,

              subjectId:
                data.subjectId,

              semester:
                data.semester,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

      if (!submission) {
        return {
          success: false,
          error: true,
        };
      }

      // Live Overall analysis is allowed while the submission
      // is DRAFT.
      //
      // Only explicit Save Overall Analysis may permanently
      // attach the PerformanceAnalysis to the submitted
      // ResultSubmission.
      if (saveOverallSummary) {
        if (submission.status !== "SUBMITTED") {
          return {
            success: false,
            error: true,
          };
        }

        resultSubmissionId =
          submission.id;
      }
    }

    // GRADE / SECTION / SCHOOL intentionally do not resolve
    // a ResultSubmission.
    //
    // Their resultSubmissionId remains undefined and is saved
    // as NULL.
  }

  // ==========================================================
  // DETERMINE ASSESSMENT TYPES
  // ==========================================================

  const requestedAssessmentTypes:
    PerformanceAnalysisAssessmentType[] =
    data.assessmentScope === "ASSESSMENT"
      ? [
          data.assessmentType as
            PerformanceAnalysisAssessmentType,
        ]
      : [
          ...performanceAnalysisAssessmentTypes,
        ];

  // ==========================================================
  // GET ASSESSMENTS
  //
  // ASSESSMENT:
  //   Only the requested Q/Test/Midterm/Final type.
  //
  // OVERALL:
  //   ALL assessment definitions are loaded, including
  //   CLASS_ACTIVITY, because the existing result calculation
  //   needs:
  //
  //   Daily Activities = /30
  //   Tests/Exams      = /70
  //   Final Result     = /100
  // ==========================================================

  const assessments =
    await prisma.assessment.findMany({
      where: {
        academicYearId:
          data.academicYearId,

        subjectId:
          data.subjectId,

        semester:
          data.semester,

        ...(data.gradeId
          ? {
              gradeId:
                data.gradeId,
            }
          : {}),

        ...(data.assessmentScope === "ASSESSMENT"
          ? {
              type: {
                in: requestedAssessmentTypes,
              },
            }
          : {}),
      },

      select: {
        id: true,
        type: true,
        title: true,
        maxScore: true,
        weight: true,
        category: true,
        gradeId: true,

        grade: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        id: "asc",
      },
    });

  if (assessments.length === 0) {
    return {
      success: false,
      error: true,
    };
  }

  // ==========================================================
  // EXISTING RESULT CALCULATION DEFINITIONS
  // ==========================================================

  const assessmentDefinitions =
    assessments.map(
      (assessment) => ({
        type:
          assessment.type,

        category:
          assessment.category,

        maxScore:
          assessment.maxScore,

        weight:
          assessment.weight,
      })
    );

  // ==========================================================
  // GET AUTHORITATIVE STUDENT ENROLLMENTS
  //
  // StudentEnrollment -> Class -> Grade
  // ==========================================================

  const enrollments =
    await prisma.studentEnrollment.findMany({
      where: {
        academicYearId:
          data.academicYearId,

        ...(data.classId
          ? {
              classId:
                data.classId,
            }
          : {}),

        ...(data.gradeId ||
        data.section
          ? {
              class: {
                ...(data.gradeId
                  ? {
                      gradeId:
                        data.gradeId,
                    }
                  : {}),

                ...(data.section
                  ? {
                      grade: {
                        section:
                          data.section as GradeSection,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },

      select: {
        studentId: true,
        rollNumber: true,

        student: {
          select: {
            id: true,
            name: true,
            sex: true,
          },
        },

        class: {
          select: {
            id: true,
            name: true,

            grade: {
              select: {
                id: true,
                name: true,
                section: true,
              },
            },
          },
        },
      },

      orderBy: [
        {
          classId: "asc",
        },
        {
          rollNumber: "asc",
        },
      ],
    });

  if (enrollments.length === 0) {
    return {
      success: false,
      error: true,
    };
  }

  // ==========================================================
  // GET STUDENT ASSESSMENTS
  //
  // 0 is a recorded score.
  // Missing record is unrecorded.
  // ==========================================================

  const studentIds =
    enrollments.map(
      (enrollment) =>
        enrollment.studentId
    );

  const assessmentIds =
    assessments.map(
      (assessment) =>
        assessment.id
    );

  const studentAssessments =
    await prisma.studentAssessment.findMany({
      where: {
        studentId: {
          in: studentIds,
        },

        assessmentId: {
          in: assessmentIds,
        },
      },

      select: {
        studentId: true,
        assessmentId: true,
        score: true,
      },
    });

  // ==========================================================
  // BUILD SCORE MAP
  // ==========================================================

  const scoreMap = new Map<
    string,
    number | null
  >();

  for (
    const studentAssessment of
      studentAssessments
  ) {
    scoreMap.set(
      `${studentAssessment.studentId}-${studentAssessment.assessmentId}`,
      studentAssessment.score
    );
  }

  // ==========================================================
  // BUILD ASSESSMENT DEFINITIONS FOR SNAPSHOT
  // ==========================================================

  const assessmentDefinitionData =
    assessments.map(
      (assessment) => ({
        assessmentId:
          assessment.id,

        gradeId:
          assessment.gradeId,

        gradeName:
          assessment.grade?.name ??
          null,

        assessmentType:
          assessment.type,

        assessmentTitle:
          assessment.title,

        maxScore:
          assessment.maxScore,

        weight:
          assessment.weight,

        category:
          assessment.category,
      })
    );

  // ==========================================================
  // BUILD STUDENT SNAPSHOTS
  //
  // ASSESSMENT:
  //   Save individual student snapshots.
  //
  // OVERALL:
  //   Do not save individual PerformanceAnalysisStudent rows.
  //   Use the calculated students only to build the aggregate
  //   PerformanceAnalysisSummary.
  // ==========================================================

  const studentSnapshotData:
    Array<{
      studentId: string;
      studentName: string;
      sex: UserSex;
      gradeName: string;
      className: string;
      rollNumber: number;
      score: number;
      maxScore: number;
      normalizedScore: number;
      category: PerformanceCategory;
    }> = [];

  const overallStudents:
    Array<{
      sex: UserSex | null;
      normalizedScore: number;
      category: PerformanceCategory;
    }> = [];


// ==========================================================
// CALCULATE STUDENTS
// ==========================================================

for (const enrollment of enrollments) {
  // ========================================================
  // INDIVIDUAL ASSESSMENT ANALYSIS
  //
  // IMPORTANT:
  //
  // For CLASS / GRADE / SECTION / SCHOOL analysis, the
  // assessment must belong to the student's actual grade.
  //
  // This is especially important for SECTION and SCHOOL,
  // because those levels contain students from multiple
  // grades and each grade has its own Q1/Q2/TEST/etc.
  // ========================================================

  if (
    data.assessmentScope ===
    "ASSESSMENT"
  ) {
    const studentGradeId =
      enrollment.class.grade?.id;

    if (!studentGradeId) {
      continue;
    }

    /*
     * Find the assessment for THIS student's grade and
     * the requested assessment type.
     *
     * CLASS:
     *   This resolves to the same assessment that was
     *   previously used.
     *
     * GRADE:
     *   The selected grade is already enforced by the
     *   enrollment query.
     *
     * SECTION / SCHOOL:
     *   Each student's own grade is used, preventing a
     *   Grade 1 assessment from being applied to Grade 2,
     *   Grade 3, etc.
     */
    const selectedAssessment =
      assessments.find(
        (assessment) =>
          assessment.type ===
            data.assessmentType &&
          assessment.gradeId ===
            studentGradeId
      );

    if (!selectedAssessment) {
      continue;
    }

    const selectedScore =
      scoreMap.get(
        `${enrollment.studentId}-${selectedAssessment.id}`
      );

    /*
     * Missing score means the assessment was not recorded
     * for this student.
     *
     * Do NOT convert missing into zero.
     */
    if (
      !isRecordedScore(
        selectedScore
      )
    ) {
      continue;
    }

    const maxScore =
      selectedAssessment.maxScore;

    if (
      !maxScore ||
      maxScore <= 0
    ) {
      continue;
    }

    const normalizedScore =
      roundResult(
        (selectedScore /
          maxScore) *
          10
      );

    const category =
      getPerformanceCategory(
        normalizedScore
      );

    studentSnapshotData.push({
      studentId:
        enrollment.studentId,

      studentName:
        enrollment.student.name,

      sex:
        enrollment.student.sex,

      gradeName:
        enrollment.class.grade?.name ??
        selectedGradeName ??
        "",

      className:
        enrollment.class.name,

      rollNumber:
        enrollment.rollNumber,

      score:
        selectedScore,

      maxScore,

      normalizedScore,

      category,
    });

    /*
     * Do not execute Overall logic for an Assessment
     * analysis.
     */
    continue;
  }

  // ========================================================
  // OVERALL ANALYSIS
  //
  // Uses the existing result calculation:
  //
  // Daily Activities = /30
  // Tests/Exams      = /70
  // Final Result     = /100
  //
  // IMPORTANT:
  // Overall is intentionally kept separate from the
  // Assessment snapshot logic above.
  // ========================================================

  /*
   * For Overall, scores are collected by assessment type.
   *
   * CLASS Overall:
   *   all assessments belong to one grade.
   *
   * Higher-level Overall:
   *   the current architecture stores only the aggregate
   *   summary, not individual PerformanceAnalysisStudent
   *   rows.
   *
   * We therefore preserve the existing Overall behavior
   * here.
   */
  const scores: Record<
    string,
    number | null | undefined
  > = {};

  for (
    const assessment of assessments
  ) {
    const recordedScore =
      scoreMap.get(
        `${enrollment.studentId}-${assessment.id}`
      );

    if (
      isRecordedScore(
        recordedScore
      )
    ) {
      scores[assessment.type] =
        recordedScore;
    } else if (
      scores[assessment.type] ===
      undefined
    ) {
      scores[assessment.type] =
        undefined;
    }
  }

  /*
   * For Overall, check ALL assessments.
   *
   * CLASS_ACTIVITY is intentionally included.
   */
  const hasAnyRecordedAssessment =
    assessments.some(
      (assessment) =>
        isRecordedScore(
          scoreMap.get(
            `${enrollment.studentId}-${assessment.id}`
          )
        )
    );

  if (
    !hasAnyRecordedAssessment
  ) {
    continue;
  }

  /*
   * Overall final score uses the existing result
   * calculation system.
   */
  const finalScore =
    roundResult(
      calculateFinalResult(
        assessmentDefinitions,
        scores
      )
    );

  const normalizedScore =
    roundResult(
      finalScore / 10
    );

  const category =
    getPerformanceCategory(
      normalizedScore
    );

  overallStudents.push({
    sex:
      enrollment.student.sex,

    normalizedScore,

    category,
  });
}
  // ==========================================================
  // BUILD OVERALL SUMMARY
  // ==========================================================

  const overallSummary =
    data.assessmentScope ===
    "OVERALL"
      ? buildPerformanceAnalysisSummary(
          overallStudents
        )
      : null;

  // ==========================================================
  // SET DISPLAY INFORMATION
  // ==========================================================

  let assessmentTitle:
    | string
    | null = null;

  let assessmentMaxScore:
    | number
    | null = null;

  let assessmentWeight:
    | number
    | null = null;

  if (
    data.assessmentScope ===
    "ASSESSMENT"
  ) {
    const selectedAssessment =
      assessments.find(
        (assessment) =>
          assessment.type ===
          data.assessmentType
      );

    if (!selectedAssessment) {
      return {
        success: false,
        error: true,
      };
    }

    assessmentTitle =
      selectedAssessment.title;

    assessmentMaxScore =
      selectedAssessment.maxScore;

    assessmentWeight =
      selectedAssessment.weight;
  }

  if (
    data.assessmentScope ===
    "OVERALL"
  ) {
    assessmentTitle =
      "Overall Performance";

    assessmentMaxScore = 100;
    assessmentWeight = 100;
  }

  // ==========================================================
  // UPDATE EXISTING PERFORMANCE ANALYSIS
  // ==========================================================

  if (existingAnalysis) {
    await prisma.$transaction(
      async (tx) => {
        // ----------------------------------------------------
        // Remove previous child records
        // ----------------------------------------------------

        await tx.performanceAnalysisAssessment.deleteMany({
          where: {
            performanceAnalysisId:
              existingAnalysis.id,
          },
        });

        await tx.performanceAnalysisStudent.deleteMany({
          where: {
            performanceAnalysisId:
              existingAnalysis.id,
          },
        });

        await tx.performanceAnalysisSummary.deleteMany({
          where: {
            performanceAnalysisId:
              existingAnalysis.id,
          },
        });

        // ----------------------------------------------------
        // IMPORTANT RESULT SUBMISSION BEHAVIOR
        //
        // For a CLASS Overall:
        //   saveOverallSummary=true means permanently link
        //   to the exact submitted ResultSubmission.
        //
        // For GRADE / SECTION / SCHOOL:
        //   resultSubmissionId stays NULL.
        //
        // For ordinary updates:
        //   do not accidentally preserve a stale submission
        //   link if the analysis is being rebuilt live.
        // ----------------------------------------------------

        let updateResultSubmissionId:
          | number
          | null = null;

        if (
          data.assessmentScope ===
            "OVERALL" &&
          data.level === "CLASS" &&
          saveOverallSummary &&
          resultSubmissionId
        ) {
          updateResultSubmissionId =
            resultSubmissionId;
        }

        // ----------------------------------------------------
        // Update parent record
        // ----------------------------------------------------

        await tx.performanceAnalysis.update({
          where: {
            id:
              existingAnalysis.id,
          },

          data: {
            academicYearId:
              data.academicYearId,

            semester:
              data.semester,

            level:
              data.level,

            section:
              data.section
                ? (data.section as GradeSection)
                : null,

            gradeId:
              data.gradeId ??
              null,

            classId:
              data.classId ??
              null,

            subjectId:
              data.subjectId,

            assessmentScope:
              data.assessmentScope,

            assessmentType:
              data.assessmentType,

            sectionName:
              selectedSectionName,

            gradeName:
              selectedGradeName,

            className:
              selectedClassName,

            subjectName:
              subject.name,

            assessmentTitle,

            assessmentMaxScore,

            assessmentWeight,

            resultSubmissionId:
              updateResultSubmissionId,

            createdByAdminId:
              existingAnalysis.createdByAdminId,

            createdByTeacherId:
              existingAnalysis.createdByTeacherId,
          },
        });

        // ----------------------------------------------------
        // Save assessment definitions
        // ----------------------------------------------------

        if (
          assessmentDefinitionData.length >
          0
        ) {
          await tx.performanceAnalysisAssessment.createMany({
            data:
              assessmentDefinitionData.map(
                (assessment) => ({
                  performanceAnalysisId:
                    existingAnalysis.id,

                  assessmentId:
                    assessment.assessmentId,

                  gradeId:
                    assessment.gradeId,

                  gradeName:
                    assessment.gradeName,

                  assessmentType:
                    assessment.assessmentType,

                  assessmentTitle:
                    assessment.assessmentTitle,

                  maxScore:
                    assessment.maxScore,

                  weight:
                    assessment.weight,

                  category:
                    assessment.category,
                })
              ),
          });
        }

        // ----------------------------------------------------
        // Save student snapshots only for ASSESSMENT
        // ----------------------------------------------------

        if (
          data.assessmentScope ===
          "ASSESSMENT"
        ) {
          if (
            studentSnapshotData.length >
            0
          ) {
            await tx.performanceAnalysisStudent.createMany({
              data:
                studentSnapshotData.map(
                  (student) => ({
                    performanceAnalysisId:
                      existingAnalysis.id,

                    studentId:
                      student.studentId,

                    studentName:
                      student.studentName,

                    sex:
                      student.sex,

                    gradeName:
                      student.gradeName,

                    className:
                      student.className,

                    rollNumber:
                      student.rollNumber,

                    score:
                      student.score,

                    maxScore:
                      student.maxScore,

                    normalizedScore:
                      student.normalizedScore,

                    category:
                      student.category,
                  })
                ),
            });
          }
        }

        // ----------------------------------------------------
        // Save Overall aggregate summary
        //
        // CLASS:
        //   Only when explicitly saved after SUBMITTED.
        //
        // GRADE / SECTION / SCHOOL:
        //   Always save the aggregate snapshot.
        //   resultSubmissionId remains NULL.
        // ----------------------------------------------------

        const shouldSaveOverallSummary =
          data.assessmentScope ===
            "OVERALL" &&
          overallSummary &&
          (
            data.level !== "CLASS" ||
            (
              data.level ===
                "CLASS" &&
              saveOverallSummary &&
              data.classId &&
              resultSubmissionId
            )
          );

        if (
          shouldSaveOverallSummary &&
          overallSummary
        ) {
          await tx.performanceAnalysisSummary.create({
            data: {
              performanceAnalysisId:
                existingAnalysis.id,

              totalStudents:
                overallSummary.totalStudents,

              totalMale:
                overallSummary.totalMale,

              totalFemale:
                overallSummary.totalFemale,

              excellentMale:
                overallSummary.excellentMale,

              excellentFemale:
                overallSummary.excellentFemale,

              excellentTotal:
                overallSummary.excellentTotal,

              veryGoodMale:
                overallSummary.veryGoodMale,

              veryGoodFemale:
                overallSummary.veryGoodFemale,

              veryGoodTotal:
                overallSummary.veryGoodTotal,

              averageMale:
                overallSummary.averageMale,

              averageFemale:
                overallSummary.averageFemale,

              averageTotal:
                overallSummary.averageTotal,

              poorMale:
                overallSummary.poorMale,

              poorFemale:
                overallSummary.poorFemale,

              poorTotal:
                overallSummary.poorTotal,

              failMale:
                overallSummary.failMale,

              failFemale:
                overallSummary.failFemale,

              failTotal:
                overallSummary.failTotal,
            },
          });
        }
      }
    );
  } else {
    // ========================================================
    // CREATE NEW PERFORMANCE ANALYSIS
    // ========================================================

    await prisma.$transaction(
      async (tx) => {
        const createdAnalysis =
          await tx.performanceAnalysis.create({
            data: {
              academicYearId:
                data.academicYearId,

              semester:
                data.semester,

              level:
                data.level,

              section:
                data.section
                  ? (data.section as GradeSection)
                  : null,

              gradeId:
                data.gradeId ??
                null,

              classId:
                data.classId ??
                null,

              subjectId:
                data.subjectId,

              assessmentScope:
                data.assessmentScope,

              assessmentType:
                data.assessmentType,

              sectionName:
                selectedSectionName,

              gradeName:
                selectedGradeName,

              className:
                selectedClassName,

              subjectName:
                subject.name,

              assessmentTitle,

              assessmentMaxScore,

              assessmentWeight,

              createdByAdminId,

              createdByTeacherId,

              // Higher-level Overall analyses are snapshots
              // and therefore do not receive a ResultSubmission.
              //
              // A CLASS Overall receives a submission link only
              // during the explicit Save Overall action.
              resultSubmissionId:
                data.assessmentScope ===
                  "OVERALL" &&
                data.level ===
                  "CLASS" &&
                saveOverallSummary &&
                resultSubmissionId
                  ? resultSubmissionId
                  : null,
            },
          });

        // ----------------------------------------------------
        // Save assessment definitions
        // ----------------------------------------------------

        if (
          assessmentDefinitionData.length >
          0
        ) {
          await tx.performanceAnalysisAssessment.createMany({
            data:
              assessmentDefinitionData.map(
                (assessment) => ({
                  performanceAnalysisId:
                    createdAnalysis.id,

                  assessmentId:
                    assessment.assessmentId,

                  gradeId:
                    assessment.gradeId,

                  gradeName:
                    assessment.gradeName,

                  assessmentType:
                    assessment.assessmentType,

                  assessmentTitle:
                    assessment.assessmentTitle,

                  maxScore:
                    assessment.maxScore,

                  weight:
                    assessment.weight,

                  category:
                    assessment.category,
                })
              ),
          });
        }

        // ----------------------------------------------------
        // Save student snapshots only for ASSESSMENT
        // ----------------------------------------------------

        if (
          data.assessmentScope ===
          "ASSESSMENT"
        ) {
          if (
            studentSnapshotData.length >
            0
          ) {
            await tx.performanceAnalysisStudent.createMany({
              data:
                studentSnapshotData.map(
                  (student) => ({
                    performanceAnalysisId:
                      createdAnalysis.id,

                    studentId:
                      student.studentId,

                    studentName:
                      student.studentName,

                    sex:
                      student.sex,

                    gradeName:
                      student.gradeName,

                    className:
                      student.className,

                    rollNumber:
                      student.rollNumber,

                    score:
                      student.score,

                    maxScore:
                      student.maxScore,

                    normalizedScore:
                      student.normalizedScore,

                    category:
                      student.category,
                  })
                ),
            });
          }
        }

        // ----------------------------------------------------
        // Save Overall aggregate summary
        //
        // CLASS:
        //   Only explicit Save Overall after SUBMITTED.
        //
        // GRADE / SECTION / SCHOOL:
        //   Save the aggregate snapshot immediately.
        // ----------------------------------------------------

        const shouldSaveOverallSummary =
          data.assessmentScope ===
            "OVERALL" &&
          overallSummary &&
          (
            data.level !== "CLASS" ||
            (
              data.level ===
                "CLASS" &&
              saveOverallSummary &&
              data.classId &&
              resultSubmissionId
            )
          );

        if (
          shouldSaveOverallSummary &&
          overallSummary
        ) {
          await tx.performanceAnalysisSummary.create({
            data: {
              performanceAnalysisId:
                createdAnalysis.id,

              totalStudents:
                overallSummary.totalStudents,

              totalMale:
                overallSummary.totalMale,

              totalFemale:
                overallSummary.totalFemale,

              excellentMale:
                overallSummary.excellentMale,

              excellentFemale:
                overallSummary.excellentFemale,

              excellentTotal:
                overallSummary.excellentTotal,

              veryGoodMale:
                overallSummary.veryGoodMale,

              veryGoodFemale:
                overallSummary.veryGoodFemale,

              veryGoodTotal:
                overallSummary.veryGoodTotal,

              averageMale:
                overallSummary.averageMale,

              averageFemale:
                overallSummary.averageFemale,

              averageTotal:
                overallSummary.averageTotal,

              poorMale:
                overallSummary.poorMale,

              poorFemale:
                overallSummary.poorFemale,

              poorTotal:
                overallSummary.poorTotal,

              failMale:
                overallSummary.failMale,

              failFemale:
                overallSummary.failFemale,

              failTotal:
                overallSummary.failTotal,
            },
          });
        }
      }
    );
  }

  // ==========================================================
  // SUCCESS
  // ==========================================================

  return {
    success: true,
    error: false,
  };
};

// ============================================================
// CREATE PERFORMANCE ANALYSIS
// ============================================================

export const createPerformanceAnalysis = async (
  currentState: CurrentState,
  formData:
    | FormData
    | PerformanceAnalysisSchema
) => {
  try {
    const {
      userId,
      sessionClaims,
    } = auth();

    const role =
      (
        sessionClaims?.metadata as {
          role?: string;
        }
      )?.role;

    if (
      !userId ||
      (
        role !== "admin" &&
        role !== "teacher"
      )
    ) {
      return {
        success: false,
        error: true,
      };
    }

    const data =
      parsePerformanceAnalysisFormData(
        formData
      );

    return await rebuildPerformanceAnalysis(
      data,
      userId,
      role
    );
  } catch (err) {
    console.log(
      "CREATE PERFORMANCE ANALYSIS ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};

// ============================================================
// UPDATE PERFORMANCE ANALYSIS
// ============================================================

export const updatePerformanceAnalysis = async (
  currentState: CurrentState,
  formData:
    | FormData
    | PerformanceAnalysisSchema
) => {
  try {
    const {
      userId,
      sessionClaims,
    } = auth();

    const role =
      (
        sessionClaims?.metadata as {
          role?: string;
        }
      )?.role;

    if (
      !userId ||
      (
        role !== "admin" &&
        role !== "teacher"
      )
    ) {
      return {
        success: false,
        error: true,
      };
    }

    const data =
      parsePerformanceAnalysisFormData(
        formData
      );

    if (!data.id) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // GET EXISTING ANALYSIS
    // ========================================================

    const existingAnalysis =
      await prisma.performanceAnalysis.findUnique({
        where: {
          id: data.id,
        },

        select: {
          id: true,
          createdByAdminId: true,
          createdByTeacherId: true,
          assessmentScope: true,
          resultSubmissionId: true,
        },
      });

    if (!existingAnalysis) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // TEACHER OWNERSHIP CHECK
    // ========================================================

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

      if (
        !teacher ||
        existingAnalysis.createdByTeacherId !==
          teacher.id
      ) {
        return {
          success: false,
          error: true,
        };
      }
    }

    // ========================================================
    // REBUILD
    // ========================================================

    return await rebuildPerformanceAnalysis(
      data,
      userId,
      role,
      existingAnalysis
    );
  } catch (err) {
    console.log(
      "UPDATE PERFORMANCE ANALYSIS ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};

// ============================================================
// SAVE CLASS-LEVEL OVERALL PERFORMANCE ANALYSIS
//
// This is the ONLY operation that permanently links a CLASS
// Overall Analysis to the exact submitted ResultSubmission.
//
// GRADE / SECTION / SCHOOL Overall snapshots cannot be saved
// through this action.
// ============================================================

export const saveOverallPerformanceAnalysis = async (
  formData: FormData
) => {
  try {
    const {
      userId,
      sessionClaims,
    } = auth();

    const role =
      (
        sessionClaims?.metadata as {
          role?: string;
        }
      )?.role;

    if (
      !userId ||
      (
        role !== "admin" &&
        role !== "teacher"
      )
    ) {
      return {
        success: false,
        error: true,
      };
    }

    const analysisId =
      Number(formData.get("id"));

    if (
      !Number.isInteger(analysisId) ||
      analysisId <= 0
    ) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // GET EXISTING ANALYSIS
    // ========================================================

    const existingAnalysis =
      await prisma.performanceAnalysis.findUnique({
        where: {
          id: analysisId,
        },

        select: {
          id: true,

          academicYearId: true,
          semester: true,

          level: true,

          section: true,
          gradeId: true,
          classId: true,
          subjectId: true,

          assessmentScope: true,

          createdByAdminId: true,
          createdByTeacherId: true,

          resultSubmissionId: true,
        },
      });

    if (!existingAnalysis) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // ONLY CLASS OVERALL CAN BE PERMANENTLY SAVED
    // ========================================================

    if (
      existingAnalysis.assessmentScope !==
        "OVERALL" ||
      existingAnalysis.level !==
        "CLASS" ||
      !existingAnalysis.classId
    ) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // TEACHER OWNERSHIP
    // ========================================================

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

      if (
        !teacher ||
        existingAnalysis.createdByTeacherId !==
          teacher.id
      ) {
        return {
          success: false,
          error: true,
        };
      }
    }

    // ========================================================
    // GET EXACT RESULT SUBMISSION
    // ========================================================

    const submission =
      await prisma.resultSubmission.findUnique({
        where: {
          academicYearId_classId_subjectId_semester: {
            academicYearId:
              existingAnalysis.academicYearId,

            classId:
              existingAnalysis.classId,

            subjectId:
              existingAnalysis.subjectId!,

            semester:
              existingAnalysis.semester,
          },
        },

        select: {
          id: true,
          status: true,
        },
      });

    if (
      !submission ||
      submission.status !==
        "SUBMITTED"
    ) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // REBUILD AND PERMANENTLY SAVE
    // ========================================================

    const data:
      PerformanceAnalysisSchema = {
      id:
        existingAnalysis.id,

      academicYearId:
        existingAnalysis.academicYearId,

      semester:
        existingAnalysis.semester,

      level:
        existingAnalysis.level,

      section:
        existingAnalysis.section ??
        undefined,

      gradeId:
        existingAnalysis.gradeId ??
        undefined,

      classId:
        existingAnalysis.classId ??
        undefined,

      subjectId:
        existingAnalysis.subjectId!,

      assessmentScope:
        "OVERALL",

      assessmentType:
        undefined,
    };

    return await rebuildPerformanceAnalysis(
      data,
      userId,
      role,
      {
        id:
          existingAnalysis.id,

        createdByAdminId:
          existingAnalysis.createdByAdminId,

        createdByTeacherId:
          existingAnalysis.createdByTeacherId,

        assessmentScope:
          existingAnalysis.assessmentScope,

        resultSubmissionId:
          existingAnalysis.resultSubmissionId,
      },
      true
    );
  } catch (err) {
    console.log(
      "SAVE OVERALL PERFORMANCE ANALYSIS ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};

// ============================================================
// DELETE PERFORMANCE ANALYSIS
// ============================================================

export const deletePerformanceAnalysis = async (
  currentState: CurrentState,
  formData:
    | FormData
    | PerformanceAnalysisSchema
) => {
  try {
    const {
      userId,
      sessionClaims,
    } = auth();

    const role =
      (
        sessionClaims?.metadata as {
          role?: string;
        }
      )?.role;

    if (
      !userId ||
      (
        role !== "admin" &&
        role !== "teacher"
      )
    ) {
      return {
        success: false,
        error: true,
      };
    }

    const data =
      parsePerformanceAnalysisFormData(
        formData
      );

    if (!data.id) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // GET EXISTING ANALYSIS
    // ========================================================

    const existingAnalysis =
      await prisma.performanceAnalysis.findUnique({
        where: {
          id: data.id,
        },

        select: {
          id: true,
          createdByAdminId: true,
          createdByTeacherId: true,
        },
      });

    if (!existingAnalysis) {
      return {
        success: false,
        error: true,
      };
    }

    // ========================================================
    // TEACHER OWNERSHIP CHECK
    // ========================================================

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

      if (
        !teacher ||
        existingAnalysis.createdByTeacherId !==
          teacher.id
      ) {
        return {
          success: false,
          error: true,
        };
      }
    }

    // ========================================================
    // DELETE
    //
    // Child records are removed by the existing Prisma
    // relations/cascade configuration.
    // ========================================================

    await prisma.performanceAnalysis.delete({
      where: {
        id:
          existingAnalysis.id,
      },
    });

    return {
      success: true,
      error: false,
    };
  } catch (err) {
    console.log(
      "DELETE PERFORMANCE ANALYSIS ERROR:",
      err
    );

    return {
      success: false,
      error: true,
    };
  }
};