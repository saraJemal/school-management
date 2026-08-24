
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
      { id: "admin1", username: "admin1" },
      { id: "admin2", username: "admin2" },
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
  
  await prisma.class.createMany({
    data: grades.map((grade) => ({
      name: `${grade.name}A`,
      gradeId: grade.id,
      capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
    })),
    skipDuplicates: true,
  });

  const classes = await prisma.class.findMany({
    orderBy: {
      id: "asc",
    },
  });

  console.log("Classes done");
  //--------------------EVENTS

  await prisma.event.createMany({
    data: Array.from({ length: 10 }).map((_, i) => {
      const baseDate = new Date();

      // Start from today's local calendar date.
      baseDate.setHours(0, 0, 0, 0);

      // Event 1 = today
      // Event 2 = tomorrow
      // Event 3 = the day after tomorrow
      const startTime = new Date(baseDate);
      startTime.setDate(baseDate.getDate() + i);

      // School hours: 8 AM onward
      const startHour = 8 + (i % 6);
      startTime.setHours(startHour, 0, 0, 0);

      const durationHours = 1 + (i % 2);

      const endTime = new Date(startTime);
      endTime.setHours(startHour + durationHours, 0, 0, 0);

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

//-------------------ANNOUNCEMENTS
 await prisma.announcement.createMany({
  data: Array.from({ length: 10 }).map((_, i) => {
    const date = new Date();

    // Spread announcements over past few days
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

  for (const [section, subjectNames] of Object.entries(
    sectionSubjects
  )) {
    for (const subjectName of subjectNames) {
      const subject = subjects.find(
        (s) => s.name === subjectName
      );

      if (!subject) {
        console.warn(
          `Subject not found: ${subjectName}`
        );
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
  await prisma.teacher.upsert({
    where: {
      id: `teacher${i + 1}`,
    },
    update: {},
    create: {
      id: `teacher${i + 1}`,
      username: `teacher${i + 1}`,
      name: `TName${i + 1}`,
      surname: `TSurname${i + 1}`,
      email: `teacher${i + 1}@example.com`,
      phone: `123-456-789${i + 1}`,
      address: `Address${i + 1}`,
      bloodType: "O+",
      sex: random([UserSex.MALE, UserSex.FEMALE]),
      subjects: {
        connect: [{ id: subjects[i % subjects.length].id }],
      },
      classes: {
        connect: [{ id: classes[i % classes.length].id }],
      },
      birthday: new Date(
        new Date().setFullYear(new Date().getFullYear() - 30)
      ),
    },
  });
}

const teachers = await prisma.teacher.findMany();

console.log("Teachers done");
  // ------------------ LESSONS
  await prisma.lesson.createMany({
    data: Array.from({ length: 30 }).map((_, i) => ({
      name: `Lesson-${i + 1}`,
      day: Day[
          Object.keys(Day)[
            Math.floor(Math.random() * Object.keys(Day).length)
          ] as keyof typeof Day
        ], 
      startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
      endTime: new Date(new Date().setHours(new Date().getHours() + 3)), 
      subjectId: subjects[i % subjects.length].id, 
      classId: classes[i % classes.length].id, 
      teacherId: teachers[i % teachers.length].id,
    })),
    skipDuplicates: true,
  });

  const lessons = await prisma.lesson.findMany();

  console.log("Lessons done");

  // ------------------ PARENTS
  await prisma.parent.createMany({
    data: Array.from({ length: 25 }).map((_, i) => ({
      id: `parentId${i + 1}`,
      username: `parentId${i + 1}`,
      name: `PName${i + 1}`,
      surname: `PSurname${i + 1}`,
      email: `parent${i+1}@example.com`,
      phone: `123-456-789${i+1}`,
      address: `Address${i+1}`,
    })),
    skipDuplicates: true,
  });

  const parents = await prisma.parent.findMany();

  console.log("Parents done");

  // ------------------ STUDENTS
  await prisma.student.createMany({
    data: Array.from({ length: 50 }).map((_, i) => ({
      id: `student${i + 1}`,
      username: `student${i + 1}`,
      name: `SName${i + 1}`,
      surname: `SSurname${i + 1}`,
      email: `student${i+1}@example.com`,
      phone: `987-654-321${i+1}`,
      address: `Address${i + 1}`,
      bloodType: "O+",
      sex: random([UserSex.MALE, UserSex.FEMALE]),
      parentId: parents[Math.floor(i / 2) % parents.length].id,
      gradeId: grades[i % grades.length].id,
      classId: classes[i % classes.length].id,
      birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
    })),
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

    const classRollNumbers = new Map<number, number>();

    const enrollmentData = students.map((student) => {
      const currentRollNumber =
        (classRollNumbers.get(student.classId) ?? 0) + 1;

      classRollNumbers.set(student.classId, currentRollNumber);

      return {
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: student.classId,
        rollNumber: currentRollNumber,
      };
    });

    await prisma.studentEnrollment.createMany({
      data: enrollmentData,
      skipDuplicates: true,
    });

  // ------------------ ASSESSMENTS
  //
  // IMPORTANT:
  // These are RAW weights.
  //
  // Class activities:
  //   CW1            5
  //   CW2            5
  //   HW1            5
  //   HW2            5
  //   WS1           10
  //   WS2           10
  //   PROJECT       10
  //   EXERCISE_BOOK  5
  //   ----------------
  //   RAW TOTAL      55
  //
  // The raw 55 is later converted to 30%.
  //
  // Exams/tests:
  //   Q1             5
  //   Q2             5
  //   TEST1         10
  //   TEST2         10
  //   MIDTERM       15
  //   FINAL         30
  //   ----------------
  //   RAW TOTAL      75
  //
  // The raw 75 is later converted to 70%.
  //
  // Final = actual class activity 30% + actual exam/test 70%.

  const assessmentDefinitions = [
    // CLASS ACTIVITIES - raw total = 55
    {
      type: "CW1",
      category: "CLASS_ACTIVITY",
      maxScore: 5,
      weight: 5,
    },
    {
      type: "CW2",
      category: "CLASS_ACTIVITY",
      maxScore: 5,
      weight: 5,
    },
    {
      type: "HW1",
      category: "CLASS_ACTIVITY",
      maxScore: 5,
      weight: 5,
    },
    {
      type: "HW2",
      category: "CLASS_ACTIVITY",
      maxScore: 5,
      weight: 5,
    },
    {
      type: "WS1",
      category: "CLASS_ACTIVITY",
      maxScore: 10,
      weight: 10,
    },
    {
      type: "WS2",
      category: "CLASS_ACTIVITY",
      maxScore: 10,
      weight: 10,
    },
    {
      type: "PROJECT",
      category: "CLASS_ACTIVITY",
      maxScore: 10,
      weight: 10,
    },
    {
      type: "EXERCISE_BOOK",
      category: "CLASS_ACTIVITY",
      maxScore: 5,
      weight: 5,
    },

    // EXAMS / TESTS - raw total = 75
    {
      type: "Q1",
      category: "EXAM",
      maxScore: 5,
      weight: 5,
    },
    {
      type: "Q2",
      category: "EXAM",
      maxScore: 5,
      weight: 5,
    },
    {
      type: "TEST1",
      category: "EXAM",
      maxScore: 10,
      weight: 10,
    },
    {
      type: "TEST2",
      category: "EXAM",
      maxScore: 10,
      weight: 10,
    },
    {
      type: "MIDTERM",
      category: "EXAM",
      maxScore: 15,
      weight: 15,
    },
    {
      type: "FINAL",
      category: "EXAM",
      maxScore: 30,
      weight: 30,
    },
  ];

const assessments: any[] = [];

for (const grade of grades) {
  // Get only subjects assigned to this grade's section.
  const gradeSubjects =
    await prisma.subject.findMany({
      where: {
        sections: {
          some: {
            section: grade.section,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

  for (const subject of gradeSubjects) {
    for (const definition of assessmentDefinitions) {
      const assessment =
        await prisma.assessment.upsert({
          where: {
            academicYearId_gradeId_subjectId_semester_type: {
              academicYearId: academicYear.id,
              gradeId: grade.id,
              subjectId: subject.id,
              semester: "SEMESTER1",
              type: definition.type as any,
            },
          },

          update: {},

          create: {
            title: `${definition.type} - ${subject.name} - Grade ${grade.level}`,
            type: definition.type as any,
            category: definition.category as any,
            semester: "SEMESTER1",
            academicYearId: academicYear.id,
            gradeId: grade.id,
            subjectId: subject.id,
            maxScore: definition.maxScore,
            weight: definition.weight,
          },
        });

      assessments.push(assessment);
    }
  }
}

console.log("Assessments done");


  // ------------------ STUDENT ASSESSMENTS
  //
  // Seed scores as values between 0 and the assessment's raw maximum.
  // This gives us realistic test data while preserving the raw weights.

  for (const assessment of assessments) {
    const classStudents = students.filter(
      (student) => student.gradeId === assessment.gradeId
    );

    await prisma.studentAssessment.createMany({
      data: classStudents.map((student) => ({
        assessmentId: assessment.id,
        studentId: student.id,
        score: Number(
          (Math.random() * assessment.maxScore).toFixed(2)
        ),
      })),
      skipDuplicates: true,
    });
  }

  console.log("Student assessments done");

  // ------------------ ATTENDANCE
await prisma.attendance.createMany({
  data: Array.from({ length: 50 }).map((_, i) => ({
    date: new Date(),
    present: Math.random() > 0.2,
    studentId: students[i % students.length].id,
    classId: students[i % students.length].classId,
  })),
  skipDuplicates: true,
});
console.log("Attendance done");

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