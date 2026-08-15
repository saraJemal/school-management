
import { PrismaClient, UserSex, Day } from "@prisma/client";

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
  await prisma.grade.createMany({
    data: Array.from({ length: 6 }).map((_, i) => ({
    level: i + 1,
    name: `Level ${i + 1}`,
  })),
    skipDuplicates: true,
  });

  const grades = await prisma.grade.findMany();

  // ------------------ CLASSES
  await prisma.class.createMany({
    data: grades.map((grade, i) => ({
      name: `${i + 1}A`,
      gradeId: i+1,
      capacity: Math.floor(Math.random() * (20 - 15 + 1)) + 15,
      
    })),
    skipDuplicates: true,
  });

  const classes = await prisma.class.findMany();

  //--------------------EVENTS
   await prisma.event.createMany({
  data: Array.from({ length: 10 }).map((_, i) => {
    const baseDate = new Date();

    // Spread events across upcoming days
    const dayOffset = i; // next 10 days

    // Realistic school event hours (8 AM – 4 PM)
    const startHour = 8 + (i % 6); // varies between 8–13
    const durationHours = 1 + (i % 2); // 1–2 hour events

    const startTime = new Date(baseDate);
    startTime.setDate(baseDate.getDate() + dayOffset);
    startTime.setHours(startHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(startHour + durationHours);

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
    { name: "Math" },
    { name: "Science" },
    { name: "English" },
    { name: "History" },
    { name: "Geography" },
    { name: "Physics" },
    { name: "Chemistry" },
    { name: "Biology" },
    { name: "Computer" },
    { name: "Art" },
  ];

  await prisma.subject.createMany({
    data: subjectData,
    skipDuplicates: true,
  });

  const subjects = await prisma.subject.findMany();

  // ------------------ TEACHERS
  
  for (let i = 0; i < 14; i++) {
  await prisma.teacher.create({
    data: {
      id: `teacher${i + 1}`,
      username: `teacher${i + 1}`,
      name: `TName${i + 1}`,
      surname: `TSurname${i+1}`,
      email: `teacher${i+1}@example.com`,
      phone: `123-456-789${i+1}`,
      address: `Address${i+1}`,
      bloodType: "O+",
      sex: random([UserSex.MALE, UserSex.FEMALE]),
      subjects: {
        connect: [{ id: subjects[i % subjects.length].id }]
      },
      classes: {
        connect: [{ id: classes[i % classes.length].id }]
      },
      birthday: new Date(new Date().setFullYear(new Date().getFullYear() - 30)),
    },
  });
}

  const teachers = await prisma.teacher.findMany();

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

  // ------------------ EXAMS
  await prisma.exam.createMany({
    data: Array.from({ length: 10 }).map((_, i) => ({
      title: `Exam-${i + 1}`,
      startTime: new Date(new Date().setHours(new Date().getHours() + 1)), 
        endTime: new Date(new Date().setHours(new Date().getHours() + 2)), 
        lessonId: lessons[i % lessons.length].id, 
    })),
    skipDuplicates: true,
  });

  const exams = await prisma.exam.findMany();

  // ------------------ ASSIGNMENTS
  await prisma.assignment.createMany({
    data: Array.from({ length: 10 }).map((_, i) => ({
      title: `Assignment-${i + 1}`,
      startDate: new Date(new Date().setHours(new Date().getHours() + 1)), 
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), 
      lessonId: lessons[i % lessons.length].id,
    })),
    skipDuplicates: true,
  });
  
  // ------------------ RESULTS
  await prisma.result.createMany({
    data: Array.from({ length: 10 }).map((_, i) => ({
      score: 90,
      studentId: `student${i+1}`,
      ...(i+1 <= 5 ? { examId: i+1 } : { assignmentId: i - 4 }), 
    })),
    skipDuplicates: true,
  });

  // ------------------ ATTENDANCE
  await prisma.attendance.createMany({
    data: Array.from({ length: 50 }).map((_, i) => ({
      date: new Date(),
      present: Math.random() > 0.2,
      studentId: `student${i+1}`,
      lessonId: lessons[i % lessons.length].id,
    })),
    skipDuplicates: true,
  });

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