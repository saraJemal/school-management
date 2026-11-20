
import { PrismaClient, UserSex, Day, GradeSection } from "@prisma/client";

const prisma = new PrismaClient();

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("Seeding...");

  // ------------------ ADMINS
  await prisma.admin.createMany({
  data: [
    {
      id: "admin1",
      username: "admin1",
      name: "Admin",
      surname: "One",
    },
    {
      id: "admin2",
      username: "admin2",
      name: "Admin",
      surname: "Two",
    },
  ],
  skipDuplicates: true,
});


  // ------------------ GRADES

  const gradeData: {
    level: number;
    name: string;
    section: GradeSection;
  }[] = [
    { level: 1, name: "KG1", section: "KG" },
    { level: 2, name: "KG2", section: "KG" },
    { level: 3, name: "KG3", section: "KG" },

    { level: 4, name: "Grade 1", section: "PRIMARY" },
    { level: 5, name: "Grade 2", section: "PRIMARY" },
    { level: 6, name: "Grade 3", section: "PRIMARY" },
    { level: 7, name: "Grade 4", section: "PRIMARY" },

    { level: 8, name: "Grade 5", section: "MIDDLE" },
    { level: 9, name: "Grade 6", section: "MIDDLE" },
    { level: 10, name: "Grade 7", section: "MIDDLE" },
    { level: 11, name: "Grade 8", section: "MIDDLE" },

    { level: 12, name: "Grade 9", section: "SECONDARY" },
    { level: 13, name: "Grade 10", section: "SECONDARY" },

    { level: 14, name: "Grade 11", section: "PREPARATORY" },
    { level: 15, name: "Grade 12", section: "PREPARATORY" },
  ];

  await prisma.grade.createMany({
    data: gradeData,
    skipDuplicates: true,
  });

  const grades = await prisma.grade.findMany({
    orderBy: {
      level: "asc",
    },
  });

  console.log("Grades done");

  // ------------------ CLASSES
  //
  // One class per grade.
  //
  // KG:
  //   KG1A, KG2A, KG3A
  //
  // Grades:
  //   1A, 2A, 3A ... 12A
  //
  // The class name is intentionally short.
  // The grade is already available through Class.grade.

  const classData = grades.map((grade) => {
    const className =
      grade.level <= 3
        ? `${grade.name}A`
        : `${grade.level - 3}A`;

    return {
      name: className,
      gradeId: grade.id,
      capacity: 20,
    };
  });

  await prisma.class.createMany({
    data: classData,
    skipDuplicates: true,
  });

  const classes = await prisma.class.findMany({
    orderBy: {
      grade: {
        level: "asc",
      },
    },
    include: {
      grade: true,
    },
  });

  console.log("Classes done");

  // ------------------ EVENTS

  await prisma.event.createMany({
    data: Array.from({ length: 10 }).map((_, i) => {
      const baseDate = new Date();

      baseDate.setHours(0, 0, 0, 0);

      const startTime = new Date(baseDate);
      startTime.setDate(baseDate.getDate() + i);

      const startHour = 8 + (i % 6);
      startTime.setHours(startHour, 0, 0, 0);

      const durationHours = 1 + (i % 2);

      const endTime = new Date(startTime);
      endTime.setHours(
        startHour + durationHours,
        0,
        0,
        0
      );

      return {
        title: `Event ${i + 1}`,
        description: `School event scheduled for class activities #${i + 1}`,
        startTime,
        endTime,
        classId: classes[i % classes.length].id,
      };
    }),
    skipDuplicates: true,
  });

  // ------------------ ANNOUNCEMENTS

  await prisma.announcement.createMany({
    data: Array.from({ length: 10 }).map((_, i) => {
      const date = new Date();

      date.setDate(date.getDate() - (i % 7));

      return {
        title: `Announcement ${i + 1}`,
        description: `Important notice for class regarding update #${i + 1}`,
        date,
        classId: classes[i % classes.length].id,
      };
    }),
    skipDuplicates: true,
  });

  // ------------------ SUBJECTS

  const subjectData = [
    { name: "Amharic" },
    { name: "A/Oromoo" },
    { name: "Eng" },
    { name: "Math" },
    { name: "Science" },
    { name: "Citizen/Gadaa" },
    { name: "Art" },
    { name: "IT" },
    { name: "HPE" },
    { name: "Terbiya" },
    { name: "SOC" },
    { name: "CTE" },
    { name: "Gi/ge/B/safuu" },
    { name: "E.Com" },
    { name: "Biology" },
    { name: "Physics" },
    { name: "Chemistry" },
    { name: "History" },
    { name: "Geography" },
    { name: "Civics" },
  ];

  await prisma.subject.createMany({
    data: subjectData,
    skipDuplicates: true,
  });

  const subjects = await prisma.subject.findMany();

  // ------------------ SUBJECT SECTIONS
//
// Subjects shared by all grades in the same
// GradeSection.

await prisma.subjectSection.deleteMany({});

const sectionSubjects = {
  KG: [
    "Amharic",
    "A/Oromoo",
    "Eng",
    "Math",
    "Science",
    "Art",
    "HPE",
  ],

  PRIMARY: [
    "Amharic",
    "A/Oromoo",
    "Eng",
    "Math",
    "Science",
    "Gi/ge/B/safuu",
    "Art",
    "HPE",
    "Terbiya",
    "E.Com",
    "IT",
  ],

  MIDDLE: [
    "Amharic",
    "A/Oromoo",
    "Eng",
    "Math",
    "Science",
    "Citizen/Gadaa",
    "Art",
    "IT",
    "HPE",
    "Terbiya",
    "SOC",
    "CTE",
  ],

  SECONDARY: [
    "Amharic",
    "A/Oromoo",
    "Eng",
    "Math",
    "Biology",
    "Physics",
    "Chemistry",
    "History",
    "Geography",
    "Civics",
    "IT",
    "HPE",
    "Terbiya",
  ],

  PREPARATORY: [
    "Amharic",
    "A/Oromoo",
    "Eng",
    "Math",
    "Biology",
    "Physics",
    "Chemistry",
    "History",
    "Geography",
    "Civics",
    "IT",
    "HPE",
    "Terbiya",
  ],
} as const;

for (const [section, subjectNames] of Object.entries(sectionSubjects)) {
  for (const subjectName of subjectNames) {
    const subject = subjects.find(
      (s) => s.name === subjectName
    );

    if (!subject) {
      console.warn(`Subject not found: ${subjectName}`);
      continue;
    }

    await prisma.subjectSection.upsert({
      where: {
        subjectId_section: {
          subjectId: subject.id,
          section: section as any,
        },
      },
      update: {},
      create: {
        subjectId: subject.id,
        section: section as any,
      },
    });
  }
}

console.log("Subject sections done");

  // ------------------ TEACHERS

for (let i = 0; i < 14; i++) {
  const teacherId = `TCH${String(i + 1).padStart(4, "0")}`;

  await prisma.teacher.upsert({
    where: {
      id: teacherId,
    },
    update: {},
    create: {
      id: teacherId,
      username: `teacher${i + 1}`,
      name: `TName${i + 1}`,
      surname: `TSurname${i + 1}`,
      email: `teacher${i + 1}@example.com`,
      phone: `123-456-789${i + 1}`,
      address: `Address${i + 1}`,
      bloodType: "O+",
      sex: random([
        UserSex.MALE,
        UserSex.FEMALE,
      ]),
      subjects: {
        connect: [
          {
            id: subjects[i % subjects.length].id,
          },
        ],
      },
      classes: {
        connect: [
          {
            id: classes[i % classes.length].id,
          },
        ],
      },
      birthday: new Date(
        new Date().setFullYear(
          new Date().getFullYear() - 30
        )
      ),
    },
  });
}
const teachers = await prisma.teacher.findMany();

  console.log("Teachers done");

// ------------------ LESSONS

await prisma.lesson.deleteMany({
  where: {
    name: {
      startsWith: "Lesson-",
    },
  },
});

await prisma.lesson.createMany({
  data: Array.from({ length: 30 }).map((_, i) => {
    const day = [
      Day.MONDAY,
      Day.TUESDAY,
      Day.WEDNESDAY,
      Day.THURSDAY,
      Day.FRIDAY,
    ][i % 5];

    const startHour = 8 + (i % 8);

    const startTime = new Date();
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startHour + 1, 0, 0, 0);

    return {
      name: `Lesson-${i + 1}`,
      day,
      startTime,
      endTime,
      subjectId: subjects[i % subjects.length].id,
      classId: classes[i % classes.length].id,
      teacherId: teachers[i % teachers.length].id,
    };
  }),
});

console.log("Lessons recreated with corrected weekdays and times");
  // ------------------ PARENTS
  await prisma.parent.createMany({
    data: Array.from({ length: 25 }).map(
      (_, i) => ({
        id: `PAR${String(i + 1).padStart(4, "0")}`,
        username: `parentId${i + 1}`,
        name: `PName${i + 1}`,
        surname: `PSurname${i + 1}`,
        email: `parent${i + 1}@example.com`,
        phone: `123-456-789${i + 1}`,
        address: `Address${i + 1}`,
      })
    ),
    skipDuplicates: true,
  });

  const parents = await prisma.parent.findMany();

  console.log("Parents done");

  // ------------------ STUDENTS
//
// IMPORTANT:
// Students are assigned through StudentEnrollment.
//
// The class determines the grade.
// Student itself no longer stores classId or gradeId.
//

const studentData = Array.from({ length: 50 }).map((_, i) => {
  const classRecord = classes[i % classes.length];

  return {
    id: `STU${String(i + 1).padStart(4, "0")}`,
    username: `student${i + 1}`,

    // Clerk account will be connected later.
    // Seeded students intentionally have no Clerk user yet.
    clerkUserId: null,

    name: `SName${i + 1}`,
    surname: `SSurname${i + 1}`,
    email: `student${i + 1}@example.com`,
    phone: `987-654-321${i + 1}`,
    address: `Address${i + 1}`,
    bloodType: "O+",

    sex: random([
      UserSex.MALE,
      UserSex.FEMALE,
    ]),

    parentId:
      parents[
        Math.floor(i / 2) % parents.length
      ].id,

    birthday: new Date(
      new Date().setFullYear(
        new Date().getFullYear() - 10
      )
    ),
  };
});

await prisma.student.createMany({
  data: studentData,
  skipDuplicates: true,
});

const students = await prisma.student.findMany();

console.log("Students done");


    // ------------------ ACADEMIC YEAR
  await prisma.academicYear.createMany({
    data: [
      {
        name: "2026/2027",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2027-07-31"),

        semester1StartDate: new Date("2026-09-15"),
        semester1EndDate: new Date("2027-02-05"),

        semester2StartDate: new Date("2027-02-08"),
        semester2EndDate: new Date("2027-06-30"),

        isCurrent: true,
      },
    ],
    skipDuplicates: true,
  });

  const academicYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
  });

  if (!academicYear) {
    throw new Error("Current academic year was not found.");
  }

  
  // ------------------ STUDENT ENROLLMENTS
//
// Each student gets a roll number within
// their class for the current academic year.
//
// The class assignment is preserved from the
// original seed logic:
//
//   classes[i % classes.length]
//
// Roll numbers restart from 1 for each class.
//

const classRollNumbers = new Map<number, number>();

const enrollmentData = studentData.map((student, i) => {
  const classRecord = classes[i % classes.length];

  const currentRollNumber =
    (classRollNumbers.get(classRecord.id) ?? 0) + 1;

  classRollNumbers.set(
    classRecord.id,
    currentRollNumber
  );

  return {
    studentId: student.id,
    academicYearId: academicYear.id,
    classId: classRecord.id,
    rollNumber: currentRollNumber,
  };
});

await prisma.studentEnrollment.createMany({
  data: enrollmentData,
  skipDuplicates: true,
});

console.log("Student enrollments done");
  

  // ------------------ STUDENT ASSESSMENTS
//
// Seed scores as values between 0 and the assessment's raw maximum.
//
// Student grade is determined through:
//
// Student
//   → StudentEnrollment
//     → Class
//       → Grade
//
// This replaces the old student.gradeId relationship.
//

const studentEnrollments =
  await prisma.studentEnrollment.findMany({
    where: {
      academicYearId: academicYear.id,
    },
    include: {
      class: true,
    },
  });

const seededAssessments =
  await prisma.assessment.findMany({
    orderBy: {
      id: "asc",
    },
  });

for (const assessment of seededAssessments) {
  const classStudents = studentEnrollments.filter(
    (enrollment) =>
      enrollment.class.gradeId === assessment.gradeId
  );

  await prisma.studentAssessment.createMany({
    data: classStudents.map((enrollment) => ({
      assessmentId: assessment.id,
      studentId: enrollment.studentId,
      score: Number(
        (Math.random() * assessment.maxScore).toFixed(2)
      ),
    })),
    skipDuplicates: true,
  });
}

console.log("Student assessments done");

// ------------------ ATTENDANCE
//
// Attendance class is determined through
// StudentEnrollment.
//

await prisma.attendance.createMany({
  data: studentEnrollments
    .slice(0, 50)
    .map((enrollment) => ({
      date: new Date(),
      present: Math.random() > 0.2,
      studentId: enrollment.studentId,
      classId: enrollment.classId,
    })),
  skipDuplicates: true,
});

console.log("Attendance done");

  // ============================================================
// SYNCHRONIZE SCHOOL USER ID SEQUENCES
// ============================================================

await prisma.$executeRaw`
  SELECT setval(
    'admin_id_seq',
    COALESCE(
      (
        SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
        FROM "Admin"
        WHERE id ~ '^ADM[0-9]+$'
      ),
      1
    ),
    EXISTS (
      SELECT 1
      FROM "Admin"
      WHERE id ~ '^ADM[0-9]+$'
    )
  )
`;

await prisma.$executeRaw`
  SELECT setval(
    'teacher_id_seq',
    COALESCE(
      (
        SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
        FROM "Teacher"
        WHERE id ~ '^TCH[0-9]+$'
      ),
      1
    ),
    EXISTS (
      SELECT 1
      FROM "Teacher"
      WHERE id ~ '^TCH[0-9]+$'
    )
  )
`;

await prisma.$executeRaw`
  SELECT setval(
    'student_id_seq',
    COALESCE(
      (
        SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
        FROM "Student"
        WHERE id ~ '^STU[0-9]+$'
      ),
      1
    ),
    EXISTS (
      SELECT 1
      FROM "Student"
      WHERE id ~ '^STU[0-9]+$'
    )
  )
`;

await prisma.$executeRaw`
  SELECT setval(
    'parent_id_seq',
    COALESCE(
      (
        SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
        FROM "Parent"
        WHERE id ~ '^PAR[0-9]+$'
      ),
      1
    ),
    EXISTS (
      SELECT 1
      FROM "Parent"
      WHERE id ~ '^PAR[0-9]+$'
    )
  )
`;

console.log("School user ID sequences synchronized.");

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });