import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import FormContainer from "@/components/FormContainer";
import { LocalDate } from "@/components/LocalDate";
import Performance from "@/components/Performance";
import StudentAttendanceCard from "@/components/StudentAttendanceCard";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Class, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const SingleStudentPage = async ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const { sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // ----------------------------------------------------------
  // LOAD STUDENT
  // ----------------------------------------------------------

  const student = await prisma.student.findUnique({
    where: {
      id,
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          surname: true,
          phone: true,
        },
      },
    },
  });

  if (!student) {
    return notFound();
  }

  // ----------------------------------------------------------
  // LOAD STUDENT'S CURRENT ENROLLMENT
  // ----------------------------------------------------------
  //
  // Student.classId and Student.gradeId no longer exist.
  // The student's class is determined through StudentEnrollment.
  //
  // The most recent academic-year enrollment is treated as the
  // current enrollment.
  // ----------------------------------------------------------

  const enrollment = await prisma.studentEnrollment.findFirst({
    where: {
      studentId: student.id,
    },
    include: {
      class: {
        include: {
          _count: {
            select: {
              lessons: true,
            },
          },
        },
      },
    },
    orderBy: {
      academicYearId: "desc",
    },
  });

  if (!enrollment) {
    return notFound();
  }

  const studentClass = enrollment.class;

  // ----------------------------------------------------------
  // STUDENT DATA USED BY FORM CONTAINER
  // ----------------------------------------------------------
  //
  // FormContainer still receives the Student record itself.
  // The enrollment/class data is kept separate because class
  // information no longer belongs to Student.
  // ----------------------------------------------------------

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* Left */}
      <div className="w-full xl:w-2/3">
        {/* Top */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* User Info Card */}
          <div className="bg-badirStar py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={student.img || "/noAvatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>

            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">
                  {student.name + " " + student.surname}
                </h1>

                {role === "admin" && (
                  <div className="flex items-center gap-2">
                    <FormContainer
                      table="student"
                      type="update"
                      data={student}
                    />

                    <FormContainer
                      table="student"
                      type="resetPassword"
                      id={student.id}
                      data={student}
                    />
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500">
                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
              </p>

              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w1/3 flex items-center gap-2">
                  <Image
                    src="/blood.png"
                    alt=""
                    width={14}
                    height={14}
                  />
                  <span>{student.bloodType}</span>
                </div>

                <div className="w-full md:w-1/3 lg:w-full 2xl:w1/3 flex items-center gap-2">
                  <Image
                    src="/date.png"
                    alt=""
                    width={14}
                    height={14}
                  />
                  <span>
                    <LocalDate
                      time={student.birthday}
                      type="datetime"
                    />
                  </span>
                </div>

                <div className="w-full md:w-1/3 lg:w-full 2xl:w1/3 flex items-center gap-2">
                  <Image
                    src="/mail.png"
                    alt=""
                    width={14}
                    height={14}
                  />
                  <span>{student.email || "-"}</span>
                </div>

                <div className="w-full md:w-1/3 lg:w-full 2xl:w1/3 flex items-center gap-2">
                  <Image
                    src="/phone.png"
                    alt=""
                    width={14}
                    height={14}
                  />
                  <span>{student.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Small Cards */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* Attendance */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />

              <Suspense fallback="loading...">
                <StudentAttendanceCard id={student.id} />
              </Suspense>
            </div>

            {/* Grade */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />

              <div>
                <h1 className="text-xl font-semibold">
                  {studentClass.name.charAt(0)}th
                </h1>

                <span className="text-sm text-gray-400">
                  Grade
                </span>
              </div>
            </div>

            {/* Lessons */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />

              <div>
                <h1 className="text-xl font-semibold">
                  {studentClass._count.lessons}
                </h1>

                <span className="text-sm text-gray-400">
                  Lessons
                </span>
              </div>
            </div>

            {/* Class */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />

              <div>
                <h1 className="text-xl font-semibold">
                  {studentClass.name}
                </h1>

                <span className="text-sm text-gray-400">
                  Class
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1>Student&apos;s Schedule</h1>

          <BigCalendarContainer
            type="classId"
            id={studentClass.id}
          />
        </div>
      </div>

      {/* Right */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">
            Shortcuts
          </h1>

          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-saraSkyLight"
              href={`/list/lessons?classId=${studentClass.id}`}
            >
              Student&apos;s Lessons
            </Link>

            <Link
              className="p-3 rounded-md bg-saraSkyLight"
              href={`/list/teachers?classId=${studentClass.id}`}
            >
              Student&apos;s Teachers
            </Link>

            <Link
              className="p-3 rounded-md bg-saraYellowLight"
              href={`/list/exams?classId=${studentClass.id}`}
            >
              Student&apos;s Exams
            </Link>

            <Link
              className="p-3 rounded-md bg-saraSkyLight"
              href={`/list/assignments?classId=${studentClass.id}`}
            >
              Student&apos;s Assignments
            </Link>

            <Link
              className="p-3 rounded-md bg-saraSkyLight"
              href={`/list/results?studentId=${student.id}`}
            >
              Student&apos;s Results
            </Link>
          </div>
        </div>

        <Performance />

        <Announcements />
      </div>
    </div>
  );
};

export default SingleStudentPage;