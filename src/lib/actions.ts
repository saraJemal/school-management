"use server"
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { AdminSchema, AssessmentRowSchema, AssessmentSchema, AttendanceSchema, ClassSchema, LessonSchema, ParentSchema, ReportCardSchema, StudentEnrollmentSchema, StudentResultsSchema, StudentSchema, SubjectSchema, TeacherSchema } from "./formValidationSchemas"
import { prisma } from "./prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { success } from "zod";
import { AssessmentCategory, AssessmentType, Semester } from "@prisma/client";

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
    // -----------------------------------------------------
    // 1. Authentication
    // -----------------------------------------------------

    if (!userId) {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    // -----------------------------------------------------
    // 2. Only admin and teacher can edit report cards
    // -----------------------------------------------------

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: "unauthorized",
      };
    }

    // -----------------------------------------------------
    // 3. Validate the report-card ID
    // -----------------------------------------------------

    if (!data.id || data.id < 1) {
      return {
        success: false,
        error: "invalid-report-card",
      };
    }

    // -----------------------------------------------------
    // 4. Find the report card
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // 5. Find the student's enrollment
    //
    // The student's class comes from StudentEnrollment.
    // We NEVER use Student.classId.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // 6. Teacher authorization
    //
    // IMPORTANT:
    // Report-card editing is homeroom responsibility.
    //
    // Therefore this is intentionally different from
    // ResultEntry authorization, which uses Lesson.teacherId.
    // -----------------------------------------------------

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
        enrollment.class.homeRoomTeacherId !==
        teacher.id
      ) {
        return {
          success: false,
          error: "unauthorized",
        };
      }
    }

    // -----------------------------------------------------
    // 7. Determine the allowed promotion/detention grades
    // -----------------------------------------------------

    const currentGrade =
      await prisma.grade.findUnique({
        where: {
          id: enrollment.class.gradeId,
        },
        select: {
          id: true,
          level: true,
        },
      });

    if (!currentGrade) {
      return {
        success: false,
        error: "grade-not-found",
      };
    }

    // Promotion is ONLY the next grade.
    const nextGrade =
      await prisma.grade.findUnique({
        where: {
          level: currentGrade.level + 1,
        },
        select: {
          id: true,
          level: true,
        },
      });

    // -----------------------------------------------------
    // 8. Validate promotion/detention
    // -----------------------------------------------------

    if (
      data.promotedGradeId !== undefined &&
      data.promotedGradeId !== 0 &&
      data.promotedGradeId !== nextGrade?.id
    ) {
      return {
        success: false,
        error: "invalid-promotion-grade",
      };
    }

    if (
      data.detainedGradeId !== undefined &&
      data.detainedGradeId !== 0 &&
      data.detainedGradeId !== currentGrade.id
    ) {
      return {
        success: false,
        error: "invalid-detention-grade",
      };
    }

    // A student cannot simultaneously be promoted
    // and detained.
    if (
      data.promotedGradeId &&
      data.promotedGradeId > 0 &&
      data.detainedGradeId &&
      data.detainedGradeId > 0
    ) {
      return {
        success: false,
        error: "invalid-promotion-status",
      };
    }

    // -----------------------------------------------------
    // 9. Normalize empty grade selections
    // -----------------------------------------------------

    const promotedGradeId =
      data.promotedGradeId &&
      data.promotedGradeId > 0
        ? data.promotedGradeId
        : null;

    const detainedGradeId =
      data.detainedGradeId &&
      data.detainedGradeId > 0
        ? data.detainedGradeId
        : null;

    // -----------------------------------------------------
    // 10. Update everything in one transaction
    // -----------------------------------------------------

    await prisma.$transaction(async (tx) => {
      await tx.reportCard.update({
        where: {
          id: reportCard.id,
        },
        data: {
          conductSemester1:
            data.conductSemester1?.trim() || null,

          conductSemester2:
            data.conductSemester2?.trim() || null,

          commentSemester1:
            data.commentSemester1?.trim() || null,

          commentSemester2:
            data.commentSemester2?.trim() || null,

          parentNameSemester1:
            data.parentNameSemester1?.trim() || null,

          parentNameSemester2:
            data.parentNameSemester2?.trim() || null,

          promotedGradeId,
          detainedGradeId,
        },
      });

      // ---------------------------------------------------
      // Semester 1 Basic Skills
      // ---------------------------------------------------

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

      // ---------------------------------------------------
      // Semester 2 Basic Skills
      // ---------------------------------------------------

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
    });

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
        surname: data.surname,
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
        ...(data.password !== "" &&
          data.password !== undefined && {
            password: data.password,
          }),
      }
    );

    // Update the database record using the database ID
    await prisma.admin.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
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
    // SAVE ATTENDANCE
    // ----------------------------------------------------------

    console.log(
      "CHECKING STUDENT1 AUGUST 3:",
      data.attendance.filter(
        (record) =>
          record.studentId === "student1" &&
          record.date === "2026-08-03"
      )
    );

    await prisma.$transaction(
      data.attendance.map((record) => {
        // ------------------------------------------------------
        // YYYY-MM-DD → UTC date
        // ------------------------------------------------------

        const attendanceDate = new Date(
          `${record.date}T00:00:00.000Z`
        );

        // ------------------------------------------------------
        // NULL = NOT RECORDED
        // ------------------------------------------------------

        if (record.present === null) {
          return prisma.attendance.deleteMany({
            where: {
              studentId: record.studentId,
              classId: data.classId,
              date: attendanceDate,
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
              date: attendanceDate,
            },
          },
          update: {
            present: record.present,
          },
          create: {
            studentId: record.studentId,
            classId: data.classId,
            date: attendanceDate,
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
// Reset only unlocks the submission so the teacher
// can correct the results and submit them again.
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
      await prisma.resultSubmission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: "DRAFT",
          submittedAt: null,
        },
      });

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
     */
    await prisma.resultSubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "DRAFT",
        submittedAt: null,
      },
    });

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

