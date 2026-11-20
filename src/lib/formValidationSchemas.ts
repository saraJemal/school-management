import z from "zod";
import {
  Day,
  AssessmentType,
  AssessmentCategory,
  Semester,
  GradeSection,
} from "@prisma/client";

export const subjectSchema = z.object({
  id: z.coerce.number().optional(),
  name: z
  .string()
  .min(1, { message: "Subject name is required!" }),
  teachers:z.array(z.string()), //teacher ids
});

export type SubjectSchema = z.infer<typeof subjectSchema>; 

export const classSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, { message: "Class name is required!" }),
  capacity: z.coerce.number().min(1, { message: "Capacity name is required!" }),
  gradeId: z.coerce.number().min(1, { message: "Grade id is required!" }),
  homeRoomTeacherId: z.coerce.string().optional(),
  
});

export type ClassSchema = z.infer<typeof classSchema>; 

// ---------------- ASSESSMENT SCHEMA ----------------

export const assessmentSchema = z.object({
  id: z.coerce.number().optional(),

  title: z
    .string()
    .min(1, { message: "Assessment title is required!" }),

  type: z.nativeEnum(AssessmentType, {
    message: "Assessment type is required!",
  }),

  category: z.nativeEnum(AssessmentCategory, {
    message: "Assessment category is required!",
  }),

  semester: z.nativeEnum(Semester, {
    message: "Semester is required!",
  }),

  academicYearId: z.coerce
    .number()
    .min(1, { message: "Academic year is required!" }),

  gradeId: z.coerce
  .number()
  .min(1, { message: "Grade is required!" }),

  subjectId: z.coerce
    .number()
    .min(1, { message: "Subject is required!" }),

  maxScore: z.coerce
    .number()
    .positive({ message: "Maximum score must be greater than 0!" }),

  weight: z.coerce
    .number()
    .positive({ message: "Weight must be greater than 0!" }),
});

export type AssessmentSchema = z.infer<typeof assessmentSchema>;

export const assessmentRowSchema = z.object({
      academicYearId: z.coerce
        .number()
        .min(1, {
          message: "Academic year is required!",
        }),

      gradeId: z.coerce
        .number()
        .min(1, {
          message: "Grade is required!",
        }),

      subjectId: z.coerce
        .number()
        .min(1, {
          message: "Subject is required!",
        }),

      semester: z.nativeEnum(Semester, {
        message: "Semester is required!",
      }),

      assessments: z.record(
      z.string(),
      z.object({
        maxScore: z.coerce
          .number()
          .positive({
            message:
              "Maximum score must be greater than 0!",
          }),

        weight: z.coerce
          .number()
          .positive({
            message:
              "Weight must be greater than 0!",
          }),
      })
    ),
});

export type AssessmentRowSchema = z.infer<typeof assessmentRowSchema>;

export const studentResultsSchema = z.object({
  academicYearId: z.coerce
    .number()
    .min(1, {
      message: "Academic year is required!",
    }),

  semester: z.nativeEnum(Semester, {
    message: "Semester is required!",
  }),

  classId: z.coerce
    .number()
    .min(1, {
      message: "Class is required!",
    }),

  subjectId: z.coerce
    .number()
    .min(1, {
      message: "Subject is required!",
    }),

   results: z.record(
    z.string(),
    z.record(
      z.string(),
      z.coerce
        .number()
        .min(0, {
          message: "Score cannot be negative!",
        })
        .optional()
    )
  ),
});

export type StudentResultsSchema = z.infer<typeof studentResultsSchema>;

// =========================================================
// REPORT CARD
// =========================================================

export const reportCardSchema = z.object({
  id: z.coerce
    .number()
    .min(1, { message: "Report card is required!" }),

  // ---------------------------------------------------------
  // EDITABLE: CONDUCT
  // ---------------------------------------------------------
  conductSemester1: z
    .enum(["A", "B", "C", "D", "E"])
    .optional()
    .or(z.literal("")),

  conductSemester2: z
    .enum(["A", "B", "C", "D", "E"])
    .optional()
    .or(z.literal("")),

  // ---------------------------------------------------------
  // EDITABLE: HOMEROOM TEACHER COMMENTS
  // ---------------------------------------------------------
  commentSemester1: z.string().optional(),

  commentSemester2: z.string().optional(),

  // ---------------------------------------------------------
  // EDITABLE: DIGITAL SIGNATURES
  // ---------------------------------------------------------
  teacherSignatureSemester1: z.string().optional(),

  teacherSignatureSemester2: z.string().optional(),

  managingDirectorSignature: z.string().optional(),

  // ---------------------------------------------------------
  // EDITABLE: BASIC SKILLS
  // ---------------------------------------------------------
  semester1Skills: z.object({
    reading: z.string().optional(),
    writing: z.string().optional(),
    spelling: z.string().optional(),
    comprehension: z.string().optional(),
    computation: z.string().optional(),
    punctuality: z.string().optional(),
    uniform: z.string().optional(),
    materialHandling: z.string().optional(),
    direction: z.string().optional(),
    completion: z.string().optional(),
    englishUse: z.string().optional(),
    workEthics: z.string().optional(),
    skills: z.string().optional(),
    overallProgress: z.string().optional(),
  }),

  semester2Skills: z.object({
    reading: z.string().optional(),
    writing: z.string().optional(),
    spelling: z.string().optional(),
    comprehension: z.string().optional(),
    computation: z.string().optional(),
    punctuality: z.string().optional(),
    uniform: z.string().optional(),
    materialHandling: z.string().optional(),
    direction: z.string().optional(),
    completion: z.string().optional(),
    englishUse: z.string().optional(),
    workEthics: z.string().optional(),
    skills: z.string().optional(),
    overallProgress: z.string().optional(),
  }),
});

export type ReportCardSchema = z.infer<typeof reportCardSchema>;

export const teacherSchema = z.object({
  id:z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Username must be at least 3 characters long!" })
  .max(20, { message: "Username must be at most 20 characters long!" }),
  email: z
  .string()
  .email({ message: "Invalid email address!" })
  .optional().or(z.literal("")),
  password: z.string().min(8, { message: "Password must be at least 8 characters long!" }).optional().or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  middleName: z.string().optional(),
  surname: z.string().min(1, { message: "Last name is required!" }),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "bloodType is required!" }),
  birthday: z.coerce.date({ message: "birth date is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "gender is required!" }),
  subjects: z.array(z.string()).optional(), // subject ids
 supervisorSection: z
  .nativeEnum(GradeSection)
  .optional()
  .or(z.literal("")),
});

export type TeacherSchema = z.infer<typeof teacherSchema>; 


export const studentSchema = z.object({
  id:z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Username must be at least 3 characters long!" })
  .max(20, { message: "Username must be at most 20 characters long!" }),
  email: z
  .string()
  .email({ message: "Invalid email address!" })
  .optional().or(z.literal("")),
  password: z.string().min(8, { message: "Password must be at least 8 characters long!" }).optional().or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  middleName: z.string().optional(),
  surname: z.string().min(1, { message: "Last name is required!" }),
  phone: z.string().optional(),
  address: z.string(),
  img: z.string().optional(),
  bloodType: z.string().min(1, { message: "bloodType is required!" }),
  birthday: z.coerce.date({ message: "birth date is required!" }),
  sex: z.enum(["MALE", "FEMALE"], { message: "gender is required!" }),
  parentId: z.string().optional(),
});

export type StudentSchema = z.infer<typeof studentSchema>; 


export const attendanceSchema = z.object({
  id: z.number().optional(),
  date: z.coerce.date(),
  present: z.coerce.boolean(),
  studentId: z.string().min(1, "Student is required"),
  classId: z.coerce.number({ message: "Class is required" }),
});

export type AttendanceSchema = z.infer<typeof attendanceSchema>;


const parseTime = (time: string) => {
  const [h, m] = time.split(":");

  const d = new Date();
  d.setHours(Number(h));
  d.setMinutes(Number(m));
  d.setSeconds(0);
  d.setMilliseconds(0);

  return d;
};

export const lessonSchema = z
  .object({
    id: z.number().optional(),

    name: z.string().min(1),

    day: z.nativeEnum(Day),

    startTime: z.preprocess(
      (val) => (typeof val === "string" ? parseTime(val) : val),
      z.date()
    ),

    endTime: z.preprocess(
      (val) => (typeof val === "string" ? parseTime(val) : val),
      z.date()
    ),

    subjectId: z.coerce.number(),
    classId: z.coerce.number(),

    teacherId: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

export type LessonSchema = z.infer<typeof lessonSchema>;


//----------------PARENT SCHEMAS----------------

export const parentSchema = z.object({
  id:z.string().optional(),
  username: z
  .string()
  .min(3, { message: "Username must be at least 3 characters long!" })
  .max(20, { message: "Username must be at most 20 characters long!" }),
  email: z
  .string()
  .email({ message: "Invalid email address!" })
  .optional().or(z.literal("")),
  password: z.string().min(8, { message: "Password must be at least 8 characters long!" }).optional().or(z.literal("")),
  name: z.string().min(1, { message: "First name is required!" }),
  middleName: z.string().optional(),
  surname: z.string().min(1, { message: "Last name is required!" }),
  phone: z.string(),
  address: z.string(),
});

export type ParentSchema = z.infer<typeof parentSchema>; 

//----------------Admin Schema----------------
export const adminSchema = z.object({
  id: z.string().optional(),

  username: z
    .string()
    .min(3, {
      message: "Username must be at least 3 characters long!",
    })
    .max(20, {
      message: "Username must be at most 20 characters long!",
    }),

  name: z
    .string()
    .min(2, {
      message: "First name must be at least 2 characters long!",
    })
    .max(30, {
      message: "First name must be at most 30 characters long!",
    }),

  middleName: z.string().optional(),

  surname: z
    .string()
    .min(2, {
      message: "Last name must be at least 2 characters long!",
    })
    .max(30, {
      message: "Last name must be at most 30 characters long!",
    }),

  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long!",
    })
    .or(z.literal(""))
    .optional(),

  isManagingDirector: z.boolean().default(false),
});

export type AdminSchema = z.infer<typeof adminSchema>;


 //------------------StudentEnrollmentSchema---------------------------

export const StudentEnrollmentSchema = z.object({
  id: z.coerce.number().optional(),

  studentId: z.string().min(1, "Student is required"),

  academicYearId: z.coerce
    .number()
    .positive("Academic year is required"),

  classId: z.coerce
    .number()
    .positive("Class is required"),

  rollNumber: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
});

export type StudentEnrollmentSchema = z.infer<typeof StudentEnrollmentSchema>;

//------------------Promotion Policy Schema---------------------------

export const promotionPolicySchema = z.object({
  id: z.coerce.number().optional(),

  academicYearId: z.coerce.number().min(1, {
    message: "Academic year is required!",
  }),

  section: z.enum([
    "KG",
    "PRIMARY",
    "MIDDLE",
    "SECONDARY",
    "PREPARATORY",
  ], {
    message: "Section is required!",
  }),

  promotionMinimumAverage: z.coerce
    .number()
    .min(0, {
      message: "Promotion minimum average cannot be less than 0!",
    })
    .max(100, {
      message: "Promotion minimum average cannot exceed 100!",
    }),

  detentionMaximumAverage: z.coerce
    .number()
    .min(0, {
      message: "Detention maximum average cannot be less than 0!",
    })
    .max(100, {
      message: "Detention maximum average cannot exceed 100!",
    }),
});

export type PromotionPolicySchema = z.infer<typeof promotionPolicySchema>;

//------------------Academic Year Schema---------------------------

export const academicYearSchema = z
  .object({
    id: z.coerce.number().optional(),

    name: z
      .string()
      .min(1, {
        message: "Academic year name is required!",
      })
      .regex(/^\d{4}\/\d{4}$/, {
        message: "Use the format YYYY/YYYY, for example 2026/2027.",
      }),

    startDate: z.coerce.date({
      message: "Academic year start date is required!",
    }),

    endDate: z.coerce.date({
      message: "Academic year end date is required!",
    }),

    semester1StartDate: z.coerce.date({
      message: "Semester 1 start date is required!",
    }),

    semester1EndDate: z.coerce.date({
      message: "Semester 1 end date is required!",
    }),

    semester2StartDate: z.coerce.date({
      message: "Semester 2 start date is required!",
    }),

    semester2EndDate: z.coerce.date({
      message: "Semester 2 end date is required!",
    }),

    isCurrent: z.coerce.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.startDate >= data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message:
          "Academic year end date must be after the start date.",
      });
    }

    if (data.semester1StartDate >= data.semester1EndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semester1EndDate"],
        message:
          "Semester 1 end date must be after its start date.",
      });
    }

    if (data.semester2StartDate >= data.semester2EndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semester2EndDate"],
        message:
          "Semester 2 end date must be after its start date.",
      });
    }

    if (data.semester1StartDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semester1StartDate"],
        message:
          "Semester 1 cannot start before the academic year.",
      });
    }

    if (data.semester1EndDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semester1EndDate"],
        message:
          "Semester 1 cannot end after the academic year.",
      });
    }

    if (data.semester2StartDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semester2StartDate"],
        message:
          "Semester 2 cannot start before the academic year.",
      });
    }

    if (data.semester2EndDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semester2EndDate"],
        message:
          "Semester 2 cannot end after the academic year.",
      });
    }

    if (data.semester1EndDate >= data.semester2StartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["semester2StartDate"],
        message:
          "Semester 2 must start after Semester 1 ends.",
      });
    }
  });

export type AcademicYearSchema = z.infer< typeof academicYearSchema>;

//------------------Communication Book Schema---------------------------


export const communicationBookSchema = z.object({
  id: z.coerce.number().optional(),

  studentId: z.string().min(1, {
    message: "Student is required!",
  }),

  academicYearId: z.coerce.number().min(1, {
    message: "Academic year is required!",
  }),

  classId: z.coerce.number().min(1, {
    message: "Class is required!",
  }),

  date: z.coerce.date(),

  dailyWord: z.string().optional(),

  characterTrait: z.string().optional(),

  teacherComment: z.string().optional(),

  teacherName: z.string().optional(),

  teacherSignature: z.string().optional(),

  parentComment: z.string().optional(),

  parentName: z.string().optional(),

  parentSignature: z.string().optional(),

  subjects: z.array(
    z.object({
      id: z.coerce.number().optional(),

      subjectId: z.coerce.number().min(1, {
        message: "Subject is required!",
      }),

      homeworkInstruction: z.string().optional(),

      asp: z.string().optional(),

      parentSignature: z.string().optional(),
    })
  ),
});

export type CommunicationBookSchema = z.infer<
  typeof communicationBookSchema
>;

//---------------------Weekly Progress Schema------------------------

export const weeklyProgressSchema = z.object({
  id: z.coerce.number().optional(),

  studentId: z.string().min(1, {
    message: "Student is required!",
  }),

  academicYearId: z.coerce.number().min(1, {
    message: "Academic year is required!",
  }),

  classId: z.coerce.number().min(1, {
    message: "Class is required!",
  }),

  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Week start is required!",
  }),

  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Week end is required!",
  }),

  teacherComment: z.string().optional(),
  teacherName: z.string().optional(),
  teacherSignature: z.string().optional(),

  parentComment: z.string().optional(),
  parentName: z.string().optional(),
  parentSignature: z.string().optional(),

  // ----------------------------------------------------------
  // WEEKLY PROGRESS ITEMS
  //
  // Exactly 11 criteria:
  //
  // 1. Academic Performance
  // 2. Behaviour Evaluation
  // 3-11. Socialization and Work Ethics
  // ----------------------------------------------------------

  items: z
    .array(
      z.object({
        id: z.coerce.number().optional(),

        criterion: z.string().min(1, {
          message: "Criterion is required!",
        }),

        category: z.string().min(1, {
          message: "Category is required!",
        }),

        rating: z.enum([
          "EXCELLENT",
          "VERY_GOOD",
          "GOOD",
          "SATISFACTORY",
          "NEEDS_IMPROVEMENT",
        ]),
      })
    )
    .length(11, {
      message:
        "Weekly Progress must contain exactly 11 evaluation criteria.",
    }),
});

export type WeeklyProgressSchema = z.infer<
  typeof weeklyProgressSchema
>;

//-----------------------------Message Schema----------------------------

export const messageSchema = z.object({
  id: z.coerce.number().optional(),

  recipientIds: z
    .array(z.string())
    .min(1, { message: "At least one recipient is required!" }),

  subject: z
    .string()
    .trim()
    .min(1, { message: "Subject is required!" })
    .max(200, { message: "Subject is too long!" }),

  body: z
    .string()
    .trim()
    .min(1, { message: "Message body is required!" }),
});

export type MessageSchema = z.infer<typeof messageSchema>;

//------------------Performance Analysis Schema---------------------------

export const performanceAnalysisSchema = z
  .object({
    id: z.preprocess(
      (value) =>
        value === "" ||
        value === null ||
        value === undefined
          ? undefined
          : value,
      z.coerce.number().positive().optional()
    ),

    academicYearId: z.preprocess(
      (value) =>
        value === "" ||
        value === null ||
        value === undefined
          ? undefined
          : value,
      z.coerce.number().positive({
        message: "Academic year is required!",
      })
    ),

    semester: z.enum(
      ["SEMESTER1", "SEMESTER2"],
      {
        message: "Semester is required!",
      }
    ),

    level: z.enum(
      ["CLASS", "GRADE", "SECTION", "SCHOOL"],
      {
        message: "Analysis level is required!",
      }
    ),

    section: z.preprocess(
      (value) =>
        value === "" ||
        value === null ||
        value === undefined
          ? undefined
          : value,
      z
        .enum([
          "KG",
          "PRIMARY",
          "MIDDLE",
          "SECONDARY",
          "PREPARATORY",
        ])
        .optional()
    ),

    gradeId: z.preprocess(
      (value) =>
        value === "" ||
        value === null ||
        value === undefined
          ? undefined
          : value,
      z.coerce.number().positive().optional()
    ),

    classId: z.preprocess(
      (value) =>
        value === "" ||
        value === null ||
        value === undefined
          ? undefined
          : value,
      z.coerce.number().positive().optional()
    ),

    subjectId: z.preprocess(
      (value) =>
        value === "" ||
        value === null ||
        value === undefined
          ? undefined
          : value,
      z.coerce.number().positive({
        message: "Subject is required!",
      })
    ),

    assessmentScope: z.enum(
      ["ASSESSMENT", "OVERALL"],
      {
        message: "Assessment scope is required!",
      }
    ),

    assessmentType: z.preprocess(
      (value) =>
        value === "" ||
        value === null ||
        value === undefined
          ? undefined
          : value,
      z
        .enum([
          "Q1",
          "Q2",
          "TEST1",
          "TEST2",
          "MIDTERM",
          "FINAL",
        ])
        .optional()
    ),
  })
  .superRefine((data, ctx) => {
    /*
     * ------------------------------------------------------------
     * CLASS LEVEL
     * ------------------------------------------------------------
     *
     * Class analysis needs:
     *   Section
     *   Grade
     *   Class
     *   Subject
     */

    if (data.level === "CLASS") {
      if (!data.section) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["section"],
          message:
            "Section is required for class analysis!",
        });
      }

      if (!data.gradeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gradeId"],
          message:
            "Grade is required for class analysis!",
        });
      }

      if (!data.classId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["classId"],
          message:
            "Class is required for class analysis!",
        });
      }
    }

    /*
     * ------------------------------------------------------------
     * GRADE LEVEL
     * ------------------------------------------------------------
     *
     * Grade analysis needs:
     *   Section
     *   Grade
     *   Subject
     *
     * Class must NOT be required.
     */

    if (data.level === "GRADE") {
      if (!data.section) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["section"],
          message:
            "Section is required for grade analysis!",
        });
      }

      if (!data.gradeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gradeId"],
          message:
            "Grade is required for grade analysis!",
        });
      }
    }

    /*
     * ------------------------------------------------------------
     * SECTION LEVEL
     * ------------------------------------------------------------
     *
     * Section analysis needs:
     *   Section
     *   Subject
     *
     * Grade and Class must NOT be required.
     */

    if (data.level === "SECTION") {
      if (!data.section) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["section"],
          message:
            "Section is required for section analysis!",
        });
      }
    }

    /*
     * ------------------------------------------------------------
     * SCHOOL LEVEL
     * ------------------------------------------------------------
     *
     * School analysis needs only:
     *   Subject
     *
     * Section, Grade and Class must NOT be required.
     */

    if (data.level === "SCHOOL") {
      // No section/grade/class validation.
    }

    /*
     * ------------------------------------------------------------
     * ASSESSMENT SCOPE
     * ------------------------------------------------------------
     */

    if (
      data.assessmentScope === "ASSESSMENT" &&
      !data.assessmentType
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assessmentType"],
        message:
          "Assessment type is required!",
      });
    }

    /*
     * ------------------------------------------------------------
     * OVERALL SCOPE
     * ------------------------------------------------------------
     *
     * Overall analysis represents the final /100 result,
     * so it must not contain an individual assessment type.
     */

    if (
      data.assessmentScope === "OVERALL" &&
      data.assessmentType
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assessmentType"],
        message:
          "Assessment type must be empty for overall analysis!",
      });
    }
  });

export type PerformanceAnalysisSchema = z.infer<
  typeof performanceAnalysisSchema
>;
