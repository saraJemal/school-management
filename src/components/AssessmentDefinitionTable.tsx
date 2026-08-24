"use client";

import { useRouter, useSearchParams } from "next/navigation";
import FormModal from "@/components/FormModal";
type Subject = {
  id: number;
  name: string;
};

type Assessment = {
  id: number;
  subjectId: number;
  type: string;
  category: string;
  maxScore: number;
  weight: number;
};

type Props = {
 academicYearId: number;

  grades: {
    id: number;
    name: string;
  }[];
  selectedGradeId: number;
  selectedSemester: string;
  subjects: Subject[];
  assessments: Assessment[];
};

const assessmentTypes = [
  "CW1",
  "CW2",
  "HW1",
  "HW2",
  "WS1",
  "WS2",
  "PROJECT",
  "EXERCISE_BOOK",
  "Q1",
  "Q2",
  "TEST1",
  "TEST2",
  "MIDTERM",
  "FINAL",
];

const AssessmentDefinitionTable = ({
 academicYearId,
  grades,
  selectedGradeId,
  selectedSemester,
  subjects,
  assessments,
}: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleGradeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("gradeId", e.target.value);
    params.set("semester", selectedSemester);
    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  const handleSemesterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("gradeId", selectedGradeId.toString());
    params.set("semester", e.target.value);
    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  const getAssessment = (
    subjectId: number,
    type: string
  ) => {
    return assessments.find(
      (assessment) =>
        assessment.subjectId === subjectId &&
        assessment.type === type
    );
  };

  return (
    <div className="mt-6">

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">

        {/* GRADE */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Grade
          </label>

          <select
            value={selectedGradeId}
            onChange={handleGradeChange}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px]"
          >
            {grades.map((grade) => (
              <option
                key={grade.id}
                value={grade.id}
              >
                {grade.name}
              </option>
            ))}
          </select>
        </div>

        {/* SEMESTER */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Semester
          </label>

          <select
            value={selectedSemester}
            onChange={handleSemesterChange}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px]"
          >
            <option value="SEMESTER1">
              Semester 1
            </option>

            <option value="SEMESTER2">
              Semester 2
            </option>
          </select>
        </div>

      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full border-collapse">

          <thead>
            <tr className="bg-gray-100 border-b">

                <th className="p-3 text-left text-sm font-semibold whitespace-nowrap">
                Subject
                </th>

                {assessmentTypes.map((type) => (
                <th
                    key={type}
                    className="px-3 py-3 text-center text-xs font-semibold whitespace-nowrap border-l"
                >
                    {type}
                </th>
                ))}

                <th className="px-3 py-3 text-center text-sm font-semibold border-l">
                Actions
                </th>
                

            </tr>
            </thead>

          <tbody>
            {subjects.map((subject) => {
                const subjectAssessments = assessments.filter(
                (assessment) => assessment.subjectId === subject.id
                );

                return (
                <tr
                    key={subject.id}
                    className="border-b hover:bg-gray-50"
                >
                    <td className="p-3 text-sm font-medium whitespace-nowrap">
                    {subject.name}
                    </td>

                    {assessmentTypes.map((type) => {
                    const assessment = getAssessment(
                        subject.id,
                        type
                    );

                    return (
                        <td
                        key={type}
                        className="px-3 py-3 text-center border-l min-w-[85px]"
                        >
                        {assessment ? (
                            <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-medium">
                                {assessment.maxScore}
                            </span>

                            <span className="text-[10px] text-gray-500">
                                {assessment.weight}%
                            </span>
                            </div>
                        ) : (
                            <span className="text-gray-300">
                            —
                            </span>
                        )}
                        </td>
                    );
                    })}

                    {/* ACTIONS */}
                    <td className="px-3 py-3 border-l">
                    <div className="flex items-center justify-center gap-2">
                        <FormModal
                        table="assessmentRow"
                        type="update"
                        data={{
                            academicYearId,
                            gradeId: selectedGradeId,
                            subjectId: subject.id,
                            subjectName: subject.name,
                            semester: selectedSemester,
                            assessments: subjectAssessments,
                        }}
                        />

                        {subjectAssessments.length > 0 && (
                        <FormModal
                            table="assessmentRow"
                            type="delete"
                            data={{
                            academicYearId,
                            gradeId: selectedGradeId,
                            subjectId: subject.id,
                            subjectName: subject.name,
                            semester: selectedSemester,
                            assessments: subjectAssessments,
                            }}
                        />
                        )}
                    </div>
                    </td>
                </tr>
                );
            })}

            {subjects.length === 0 && (
                <tr>
                <td
                    colSpan={assessmentTypes.length + 2}
                    className="p-8 text-center text-gray-500"
                >
                    No subjects found for this grade.
                </td>
                </tr>
            )}
            </tbody>

        </table>
      </div>

    </div>
  );
};

export default AssessmentDefinitionTable;