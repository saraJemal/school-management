import { Day, PrismaClient, UserSex } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // ADMIN
  await prisma.admin.create({
    data: {
      id: "admin1",
      username: "admin1",
    },
  });
  await prisma.admin.create({
    data: {
      id: "admin2",
      username: "admin2",
    },
  });

  // GRADE
  for (let i = 1; i <= 6; i++) {
    await prisma.grade.create({
      data: {
        level: i,
      },
    });
  }

  // CLASS
  for (let i = 1; i <= 6; i++) {
    await prisma.class.create({
      data: {
        name: `${i}A`, 
        gradeId: i, 
        capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
      },
    });
  }

  // SUBJECT
  const subjectData = [
    { name: "Mathematics" },
    { name: "Science" },
    { name: "English" },
    { name: "History" },
    { name: "Geography" },
    { name: "Physics" },
    { name: "Chemistry" },
    { name: "Biology" },
    { name: "Computer Science" },
    { name: "Art" },
  ];

  for (const subject of subjectData) {
    await prisma.subject.create({ data: subject });
  }

  // TEACHER
  for (let i = 1; i <= 15; i++) {
    await prisma.teacher.create({
      data: {
        id: `teacher${i}`, // Unique ID for the teacher
        username: `teacher${i}`,
        name: `TName${i}`,
        surname: `TSurname${i}`,
        email: `teacher${i}@example.com`,
        phone: `123-456-789${i}`,
        address: `Address${i}`,
        bloodType: "A+",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        subjects: { connect: [{ id: (i % 10) + 1 }] }, 
        classes: { connect: [{ id: (i % 6) + 1 }] }, 
        birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 30)),
      },
    });
  }

  // LESSON
  for (let i = 1; i <= 30; i++) {
    await prisma.lesson.create({
      data: {
        name: `Lesson${i}`, 
        day: Day[
          Object.keys(Day)[
            Math.floor(Math.random() * Object.keys(Day).length)
          ] as keyof typeof Day
        ], 
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
        endTime: new Date(new Date().setHours(new Date().getHours() + 3)), 
        subjectId: (i % 10) + 1, 
        classId: (i % 6) + 1, 
        teacherId: `teacher${(i % 15) + 1}`, 
      },
    });
  }

  // PARENT
  for (let i = 1; i <= 25; i++) {
    await prisma.parent.create({
      data: {
        id: `parentId${i}`,
        username: `parentId${i}`,
        name: `PName ${i}`,
        surname: `PSurname ${i}`,
        email: `parent${i}@example.com`,
        phone: `123-456-789${i}`,
        address: `Address${i}`,
      },
    });
  }

  // STUDENT
  for (let i = 1; i <= 50; i++) {
    await prisma.student.create({
      data: {
        id: `student${i}`, 
        username: `student${i}`, 
        name: `SName${i}`,
        surname: `SSurname ${i}`,
        email: `student${i}@example.com`,
        phone: `987-654-321${i}`,
        address: `Address${i}`,
        bloodType: "O-",
        sex: i % 2 === 0 ? UserSex.MALE : UserSex.FEMALE,
        parentId: `parentId${Math.ceil(i / 2) % 25 || 25}`, 
        gradeId: (i % 6) + 1, 
        classId: (i % 6) + 1, 
        birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 10)),
      },
    });
  }

  // EXAM
  for (let i = 1; i <= 10; i++) {
    await prisma.exam.create({
      data: {
        title: `Exam ${i}`, 
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)), 
        lessonId: (i % 30) + 1, 
      },
    });
  }

  // ASSIGNMENT
  for (let i = 1; i <= 10; i++) {
    await prisma.assignment.create({
      data: {
        title: `Assignment ${i}`, 
        startDate: new Date(new Date().setHours(new Date().getHours() + 1)), 
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), 
        lessonId: (i % 30) + 1, 
      },
    });
  }

  // RESULT
  for (let i = 1; i <= 10; i++) {
    await prisma.result.create({
      data: {
        score: 90, 
        studentId: `student${i}`, 
        ...(i <= 5 ? { examId: i } : { assignmentId: i - 5 }), 
      },
    });
  }

  // ATTENDANCE
  for (let i = 1; i <= 10; i++) {
    await prisma.attendance.create({
      data: {
        date: new Date(), 
        present: true, 
        studentId: `student${i}`, 
        lessonId: (i % 30) + 1, 
      },
    });
  }

  // EVENT
  for (let i = 1; i <= 5; i++) {
    await prisma.event.create({
      data: {
        title: `Event ${i}`, 
        description: `Description for Event ${i}`, 
        startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)), 
        classId: (i % 5) + 1, 
      },
    });
  }

  // ANNOUNCEMENT
  for (let i = 1; i <= 5; i++) {
    await prisma.announcement.create({
      data: {
        title: `Announcement ${i}`, 
        description: `Description for Announcement ${i}`, 
        date: new Date(), 
        classId: (i % 5) + 1, 
      },
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });



// import { PrismaClient, UserSex, Day } from "@prisma/client";

// const prisma = new PrismaClient();

// const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// const toDateOnly = (d: Date) =>
//   new Date(d.toISOString().split("T")[0]);

// async function main() {
//   console.log("Seeding...");

//   // ------------------ ADMINS (2)
//   await prisma.admin.createMany({
//     data: [
//       { id: "admin1", username: "admin1" },
//       { id: "admin2", username: "admin2" },
//     ],
//   });

//   // ------------------ GRADES (6)
//   const grades = await Promise.all(
//     Array.from({ length: 6 }).map((_, i) =>
//       prisma.grade.create({ data: { level: i + 1 } })
//     )
//   );

//   // ------------------ CLASSES (6)
//   const classes = await Promise.all(
//     grades.map((grade, i) =>
//       prisma.class.create({
//         data: {
//           name: `Class-${i + 1}`,
//           capacity: 50,
//           gradeId: grade.id,
//         },
//       })
//     )
//   );

//   // SUBJECT
//   const subjectData = [
//     { name: "Mathematics" },
//     { name: "Science" },
//     { name: "English" },
//     { name: "History" },
//     { name: "Geography" },
//     { name: "Physics" },
//     { name: "Chemistry" },
//     { name: "Biology" },
//     { name: "Computer Science" },
//     { name: "Art" },
//   ];

//   for (const subject of subjectData) {
//     await prisma.subject.create({ data: subject });
//   }

//   // ------------------ TEACHERS (15)
//   const teachers = await Promise.all(
//     Array.from({ length: 15 }).map((_, i) =>
//       prisma.teacher.create({
//         data: {
//           id: `teacher${i + 1}`,
//           username: `teacher${i + 1}`,
//           name: `Teacher${i + 1}`,
//           surname: "Smith",
//           address: "School",
//           bloodType: "O+",
//           sex: random([UserSex.MALE, UserSex.FEMALE]),
//           birthday: new Date(`1980-01-${(i % 28) + 1}`),
//         },
//       })
//     )
//   );

//   // ------------------ LESSONS (30)
//   const lessons = await Promise.all(
//     Array.from({ length: 30 }).map((_, i) =>
//       prisma.lesson.create({
//         data: {
//           name: `Lesson-${i + 1}`,
//           day: random(Object.values(Day)),
//           startTime: new Date(`2026-08-01T0${i % 8}:00:00`),
//           endTime: new Date(`2026-08-01T0${(i % 8) + 1}:00:00`),
//           subjectId: random(subjectData).id,
//           classId: random(classes).id,
//           teacherId: random(teachers).id,
//         },
//       })
//     )
//   );

//   // ------------------ PARENTS (25)
//   const parents = await Promise.all(
//     Array.from({ length: 25 }).map((_, i) =>
//       prisma.parent.create({
//         data: {
//           id: `parent${i + 1}`,
//           username: `parent${i + 1}`,
//           name: `Parent${i + 1}`,
//           surname: "Family",
//           phone: `90000000${i + 1}`, // unique
//           address: "City",
//         },
//       })
//     )
//   );

//   // ------------------ STUDENTS (50)
//   const students = await Promise.all(
//     Array.from({ length: 50 }).map((_, i) =>
//       prisma.student.create({
//         data: {
//           id: `student${i + 1}`,
//           username: `student${i + 1}`,
//           name: `Student${i + 1}`,
//           surname: "Test",
//           address: "City",
//           bloodType: "A+",
//           sex: random([UserSex.MALE, UserSex.FEMALE]),
//           parentId: parents[i % parents.length].id,
//           classId: random(classes).id,
//           gradeId: random(grades).id,
//           birthday: new Date(`2010-01-${(i % 28) + 1}`),
//         },
//       })
//     )
//   );

//   // ------------------ EXAMS (10)
//   const exams = await Promise.all(
//     Array.from({ length: 10 }).map((_, i) =>
//       prisma.exam.create({
//         data: {
//           title: `Exam-${i + 1}`,
//           startTime: new Date(),
//           endTime: new Date(),
//           lessonId: random(lessons).id,
//         },
//       })
//     )
//   );

//   // ------------------ ASSIGNMENTS (10)
//   const assignments = await Promise.all(
//     Array.from({ length: 10 }).map((_, i) =>
//       prisma.assignment.create({
//         data: {
//           title: `Assignment-${i + 1}`,
//           startDate: new Date(),
//           dueDate: new Date(),
//           lessonId: random(lessons).id,
//         },
//       })
//     )
//   );

//   // ------------------ RESULTS (10)
//   await prisma.result.createMany({
//     data: Array.from({ length: 10 }).map((_, i) => ({
//       score: Math.floor(Math.random() * 100),
//       studentId: students[i].id,
//       examId: exams[i]?.id ?? null,
//       assignmentId: null,
//     })),
//   });

//   // ------------------ ATTENDANCE (10)  NO DUPLICATES
//   const used = new Set();

//   const attendanceData = [];

//   for (let i = 0; i < 10; i++) {
//     let student = random(students);
//     let lesson = random(lessons);
//     let date = toDateOnly(new Date());

//     let key = `${student.id}-${lesson.id}-${date.toISOString()}`;

//     if (used.has(key)) continue;

//     used.add(key);

//     attendanceData.push({
//       studentId: student.id,
//       lessonId: lesson.id,
//       date,
//       present: Math.random() > 0.2,
//     });
//   }

//   await prisma.attendance.createMany({
//     data: attendanceData,
//     skipDuplicates: true,
//   });

//   console.log(" Done seeding");
// }

// main()
//   .catch(console.error)
//   .finally(() => prisma.$disconnect());