import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Semester } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import SupervisorResultTable from "@/components/SupervisorResultTable";

type PageProps = {
searchParams: Promise<{
academicYearId?: string;
semester?: string;
classId?: string;
subjectId?: string;
}>;
};

const SupervisorViewPage = async ({
searchParams,
}: PageProps) => {
const { userId, sessionClaims } = await auth();

if (!userId) {
redirect("/sign-in");
}

const role = (
sessionClaims?.metadata as {
role?: string;
}
)?.role;

/*

* Supervisor view is read-only.
*
* Admin is also allowed so that we can test
* the page while the supervisor workflow is
* being completed.
  */
  if (role !== "admin" && role !== "supervisor") {
  return (

   <div className="bg-white p-6 rounded-md m-4">
     <p className="text-red-500">
       You are not authorized to view results.
     </p>
   </div>

);


}

const params = await searchParams;

/*

* ---
* ACADEMIC YEAR
* ---

*/
const academicYears =
await prisma.academicYear.findMany({
orderBy: {
startDate: "desc",
},
});

if (academicYears.length === 0) {
return ( <div className="bg-white p-6 rounded-md m-4">
No academic year found. </div>
);
}

const requestedAcademicYearId =
params.academicYearId
? parseInt(params.academicYearId)
: undefined;

const selectedAcademicYear =
academicYears.find(
(year) =>
year.id === requestedAcademicYearId
) ??
academicYears.find(
(year) => year.isCurrent
) ??
academicYears[0];

/*

* ---
* SEMESTER
* ---

*/
const selectedSemester: Semester =
params.semester === "SEMESTER2"
? Semester.SEMESTER2
: Semester.SEMESTER1;

/*

* ---
* CLASSES
* ---
*
* Supervisor can view any class.
  */
  const classes =
  await prisma.class.findMany({
  include: {
  grade: true,
  },
  orderBy: {
  name: "asc",
  },
  });

if (classes.length === 0) {
return ( <div className="bg-white p-6 rounded-md m-4">
No classes found. </div>
);
}

const requestedClassId =
params.classId
? parseInt(params.classId)
: undefined;

const selectedClass =
classes.find(
(item) =>
item.id === requestedClassId
) ?? classes[0];

/*

* ---
* SUBJECTS
* ---
*
* Subject availability comes from SubjectSection.
*
* IMPORTANT:
* We do NOT use subject.gradeId.
  */
  const subjects =
  await prisma.subject.findMany({
  where: {
  sections: {
  some: {
  section:
  selectedClass.grade.section,
  },
  },
  },
  orderBy: {
  name: "asc",
  },
  });

if (subjects.length === 0) {
return ( <div className="bg-white p-6 rounded-md m-4"> <h1 className="text-lg font-semibold">
View Results </h1>

    <p className="text-gray-500 mt-2">
      No subjects are configured for this
      grade section.
    </p>
  </div>
);
}

const requestedSubjectId =
params.subjectId
? parseInt(params.subjectId)
: undefined;

const selectedSubject =
subjects.find(
(subject) =>
subject.id === requestedSubjectId
) ?? subjects[0];

/*

* ---
* ASSESSMENT DEFINITIONS
* ---
*
* Definitions belong to:
*
* academic year
* * grade
* * subject
* * semester
    */
    const assessments =
    await prisma.assessment.findMany({
    where: {
    academicYearId:
    selectedAcademicYear.id,

    gradeId:
    selectedClass.gradeId,

    subjectId:
    selectedSubject.id,

    semester:
    selectedSemester,
    },

  orderBy: {
  id: "asc",
  },
  });

/*

* ---
* STUDENT ENROLLMENTS
* ---
*
* This is the important architecture:
*
* DO NOT use Student.classId.
*
* Enrollment determines:
* * academic year
* * class
* * roll number
    */
    const enrollments =
    await prisma.studentEnrollment.findMany({
    where: {
    academicYearId:
    selectedAcademicYear.id,

    classId:
    selectedClass.id,
    },

  include: {
  student: {
  select: {
  id: true,
  name: true,
  surname: true,
  },
  },
  },

  orderBy: {
  rollNumber: "asc",
  },
  });

/*

* ---
* STUDENT ASSESSMENT SCORES
* ---

*/
const assessmentIds =
assessments.map(
(assessment) => assessment.id
);

const studentIds =
enrollments.map(
(enrollment) =>
enrollment.studentId
);

const studentAssessments =
assessmentIds.length > 0 &&
studentIds.length > 0
? await prisma.studentAssessment.findMany({
where: {
assessmentId: {
in: assessmentIds,
},


        studentId: {
          in: studentIds,
        },
      },

      select: {
        studentId: true,
        assessmentId: true,
        score: true,
      },
    })
  : [];

/*

* ---
* PREPARE STUDENT RESULT DATA
* ---

*/
const students =
enrollments.map((enrollment) => {
const scores: Record<
string,
number | null
> = {};

  assessments.forEach(
    (assessment) => {
      const result =
        studentAssessments.find(
          (item) =>
            item.studentId ===
              enrollment.studentId &&
            item.assessmentId ===
              assessment.id
        );

      scores[assessment.type] =
        result?.score ?? null;
    }
  );

  return {
    studentId:
      enrollment.studentId,

    rollNumber:
      enrollment.rollNumber,

    name:
      enrollment.student.name,

    surname:
      enrollment.student.surname,

    scores,
  };
});
/*

* ---
* DEBUG
* ---

*/
console.log(
"========== SUPERVISOR VIEW =========="
);

console.log(
"SUPERVISOR VIEW DATA:",
{
academicYearId:
selectedAcademicYear.id,

  academicYear:
    selectedAcademicYear.name,

  semester:
    selectedSemester,

  classId:
    selectedClass.id,

  className:
    selectedClass.name,

  gradeId:
    selectedClass.gradeId,

  gradeName:
    selectedClass.grade.name,

  subjectId:
    selectedSubject.id,

  subjectName:
    selectedSubject.name,

  assessmentCount:
    assessments.length,

  enrollmentCount:
    enrollments.length,

  scoreCount:
    studentAssessments.length,
}

);

/*

* ---
* PAGE
* ---

*/
return ( <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">

  {/* HEADER */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
    <div>
      <h1 className="text-lg font-semibold">
        View Results
      </h1>

      <p className="text-sm text-gray-500 mt-1">
        {selectedAcademicYear.name}
        {" · "}
        {selectedSemester ===
        Semester.SEMESTER1
          ? "Semester 1"
          : "Semester 2"}
        {" · "}
        {selectedClass.name}
        {" · "}
        {selectedSubject.name}
      </p>
    </div>

    <div className="px-3 py-1 rounded-md bg-gray-100 text-sm text-gray-600">
      Read Only
    </div>
  </div>

  {/* DETAILS */}
  <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">

    <div>
      <span className="text-gray-500">
        Academic Year:
      </span>{" "}
      <span className="font-medium">
        {selectedAcademicYear.name}
      </span>
    </div>

    <div>
      <span className="text-gray-500">
        Semester:
      </span>{" "}
      <span className="font-medium">
        {selectedSemester ===
        Semester.SEMESTER1
          ? "Semester 1"
          : "Semester 2"}
      </span>
    </div>

    <div>
      <span className="text-gray-500">
        Grade:
      </span>{" "}
      <span className="font-medium">
        {selectedClass.grade.name}
      </span>
    </div>

    <div>
      <span className="text-gray-500">
        Class:
      </span>{" "}
      <span className="font-medium">
        {selectedClass.name}
      </span>
    </div>

    <div>
      <span className="text-gray-500">
        Subject:
      </span>{" "}
      <span className="font-medium">
        {selectedSubject.name}
      </span>
    </div>
  </div>

  {/* NO ASSESSMENTS */}
  {assessments.length === 0 ? (
    <div className="mt-6 border rounded-md p-6 text-center text-gray-500">
      No assessment definitions have been
      created for this subject and semester.
    </div>
  ) : (
    <SupervisorResultTable
      students={students}
      assessments={assessments.map(
        (assessment) => ({
          id: assessment.id,
          type: assessment.type,
          category: assessment.category,
          maxScore: assessment.maxScore,
        })
      )}
    />
  )}
</div>
);
};

export default SupervisorViewPage;
