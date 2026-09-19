"use client";

type Assessment = {
  id: number;
  type: string;
  category: string;
  maxScore: number;
};

type StudentResult = {
  studentId: string;
  rollNumber: number | null;
  name: string;
  surname: string;
  scores: Record<string, number | null>;
};

type Props = {
  assessments: Assessment[];
  students: StudentResult[];
};

const CLASS_ACTIVITY_TYPES = [
  "CW1",
  "CW2",
  "HW1",
  "HW2",
  "WS1",
  "WS2",
  "PROJECT",
  "EXERCISE_BOOK",
];

const EXAM_TYPES = [
  "Q1",
  "Q2",
  "TEST1",
  "TEST2",
  "MIDTERM",
  "FINAL",
];

function getRawTotal(
  student: StudentResult,
  assessments: Assessment[]
): number {
  return assessments.reduce((total, assessment) => {
    const score = student.scores[assessment.type];

    return total + (score ?? 0);
  }, 0);
}

function getMaxTotal(assessments: Assessment[]): number {
  return assessments.reduce((total, assessment) => {
    return total + assessment.maxScore;
  }, 0);
}

function convertToCategoryTotal(
  rawTotal: number,
  rawMaxTotal: number,
  categoryMaximum: number
): number {
  if (rawMaxTotal <= 0) {
    return 0;
  }

  return (rawTotal / rawMaxTotal) * categoryMaximum;
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function SupervisorResultTable({
  assessments,
  students,
}: Props) {
  const classActivityAssessments = assessments.filter((assessment) =>
    CLASS_ACTIVITY_TYPES.includes(assessment.type)
  );

  const examAssessments = assessments.filter((assessment) =>
    EXAM_TYPES.includes(assessment.type)
  );

  const classActivityMax = getMaxTotal(classActivityAssessments);
  const examMax = getMaxTotal(examAssessments);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-100">
            <th className="border px-3 py-2 text-left">
              Roll No
            </th>

            <th className="border px-3 py-2 text-left">
              Student
            </th>

            {classActivityAssessments.map((assessment) => (
              <th
                key={assessment.id}
                className="border px-3 py-2 text-center"
              >
                {assessment.type}
                <div className="text-xs font-normal text-gray-500">
                  /{assessment.maxScore}
                </div>
              </th>
            ))}

            <th className="border px-3 py-2 text-center">
              Activities
              <div className="text-xs font-normal text-gray-500">
                /30
              </div>
            </th>

            {examAssessments.map((assessment) => (
              <th
                key={assessment.id}
                className="border px-3 py-2 text-center"
              >
                {assessment.type}
                <div className="text-xs font-normal text-gray-500">
                  /{assessment.maxScore}
                </div>
              </th>
            ))}

            <th className="border px-3 py-2 text-center">
              Tests
              <div className="text-xs font-normal text-gray-500">
                /70
              </div>
            </th>

            <th className="border px-3 py-2 text-center">
              Total
              <div className="text-xs font-normal text-gray-500">
                /100
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => {
            const classActivityRaw = roundToTwo(
              getRawTotal(
                student,
                classActivityAssessments
              )
            );

            const examRaw = roundToTwo(
              getRawTotal(
                student,
                examAssessments
              )
            );

            const classActivityTotal = roundToTwo(
              convertToCategoryTotal(
                classActivityRaw,
                classActivityMax,
                30
              )
            );

            const examTotal = roundToTwo(
              convertToCategoryTotal(
                examRaw,
                examMax,
                70
              )
            );

            const finalTotal = roundToTwo(
              classActivityTotal + examTotal
            );

            return (
              <tr
                key={student.studentId}
                className="border-b"
              >
                <td className="border px-3 py-2">
                  {student.rollNumber ?? "-"}
                </td>

                <td className="border px-3 py-2 font-medium">
                  {student.name} {student.surname}
                </td>

                {classActivityAssessments.map(
                  (assessment) => {
                    const score =
                      student.scores[assessment.type];

                    return (
                      <td
                        key={assessment.id}
                        className="border px-3 py-2 text-center"
                      >
                        {score !== null &&
                        score !== undefined
                          ? `${score.toFixed(2)}/${assessment.maxScore}`
                          : `-/${assessment.maxScore}`}
                      </td>
                    );
                  }
                )}

                <td className="border px-3 py-2 text-center font-medium">
                  {classActivityRaw.toFixed(2)}/
                  {classActivityMax.toFixed(2)}{" "}
                  <span className="text-gray-500">
                    ({classActivityTotal.toFixed(2)}/30)
                  </span>
                </td>

                {examAssessments.map((assessment) => {
                  const score =
                    student.scores[assessment.type];

                  return (
                    <td
                      key={assessment.id}
                      className="border px-3 py-2 text-center"
                    >
                      {score !== null &&
                      score !== undefined
                        ? `${score.toFixed(2)}/${assessment.maxScore}`
                        : `-/${assessment.maxScore}`}
                    </td>
                  );
                })}

                <td className="border px-3 py-2 text-center font-medium">
                  {examRaw.toFixed(2)}/
                  {examMax.toFixed(2)}{" "}
                  <span className="text-gray-500">
                    ({examTotal.toFixed(2)}/70)
                  </span>
                </td>

                <td className="border px-3 py-2 text-center font-bold">
                  {finalTotal.toFixed(2)}/100
                </td>
              </tr>
            );
          })}

          {students.length === 0 && (
            <tr>
              <td
                colSpan={
                  2 +
                  classActivityAssessments.length +
                  1 +
                  examAssessments.length +
                  2
                }
                className="border px-3 py-8 text-center text-gray-500"
              >
                No students found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

