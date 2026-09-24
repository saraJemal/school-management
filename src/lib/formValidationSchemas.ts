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
    .or(z.literal("")),
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