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
  role?: string;

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
  role,
  grades,
  selectedGradeId,
  selectedSemester,
  subjects,
  assessments,
}: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  /*
   * ----------------------------------------------------------
   * PERMISSIONS
   * ----------------------------------------------------------
   *
   * Assessment definitions can be created, edited, and deleted
   * ONLY by admin.
   *
   * Teacher, student, and parent are READ-ONLY.
   */
  const canEdit = role === "admin";

  /*
   * ----------------------------------------------------------
   * GRADE CHANGE
   * ----------------------------------------------------------
   *
   * The server already controls which grades are available.
   * Therefore students/parents cannot access another grade
   * merely by changing the URL.
   */
  const handleGradeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set(
      "gradeId",
      e.target.value
    );

    params.set(
      "semester",
      selectedSemester
    );

    params.set("page", "1");

    router.push(
      `?${params.toString()}`
    );
  };

  /*
   * ----------------------------------------------------------
   * SEMESTER CHANGE
   * ----------------------------------------------------------
   */
  const handleSemesterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set(
      "gradeId",
      selectedGradeId.toString()
    );

    params.set(
      "semester",
      e.target.value
    );

    params.set("page", "1");

    router.push(
      `?${params.toString()}`
    );
  };

  /*
   * ----------------------------------------------------------
   * FIND ASSESSMENT
   * ----------------------------------------------------------
   */
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

  /*
   * ----------------------------------------------------------
   * UI
   * ----------------------------------------------------------
   */
  return (
    <div className="mt-6">

      {/* FILTERS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">

        {/* GRADE */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Grade
          </label>

          {grades.length === 1 ? (
            /*
             * Student with one enrolled grade, or a parent with
             * one child's grade: display the grade without giving
             * an unnecessary selector.
             */
            <div className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px] bg-gray-50">
              {grades[0].name}
            </div>
          ) : (
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
          )}
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

              <th className="sticky left-0 z-20 bg-gray-100 p-3 text-left text-sm font-semibold whitespace-nowrap">
                Subject
              </th>

              {assessmentTypes.map(
                (type) => (
                  <th
                    key={type}
                    className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-l"
                  >
                    {type}
                  </th>
                )
              )}

              {canEdit && (
                <th className="px-2 py-2 text-center text-sm font-semibold border-l">
                  Actions
                </th>
              )}

            </tr>
          </thead>

          <tbody>
            {subjects.map(
              (subject) => {
                const subjectAssessments =
                  assessments.filter(
                    (assessment) =>
                      assessment.subjectId ===
                      subject.id
                  );

                return (
                  <tr
                    key={subject.id}
                    className="border-b hover:bg-gray-50"
                  >

                    {/* SUBJECT */}
                    <td className="sticky left-0 z-10 bg-white p-2 text-sm font-medium whitespace-nowrap border-r">
                      {subject.name}
                    </td>

                    {/* ASSESSMENTS */}
                    {assessmentTypes.map(
                      (type) => {
                        const assessment =
                          getAssessment(
                            subject.id,
                            type
                          );

                        return (
                          <td
                            key={type}
                            className="px-2 py-2 text-center border-l min-w-[70px]"
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
                      }
                    )}

                    {/* ADMIN ACTIONS ONLY */}
                    {canEdit && (
                      <td className="px-2 py-2 border-l">
                        <div className="flex items-center justify-center gap-2">

                          {/* EDIT */}
                          <FormModal
                            table="assessmentRow"
                            type="update"
                            data={{
                              academicYearId,
                              gradeId:
                                selectedGradeId,
                              subjectId:
                                subject.id,
                              subjectName:
                                subject.name,
                              semester:
                                selectedSemester,
                              assessments:
                                subjectAssessments,
                            }}
                          />

                          {/* DELETE */}
                          {subjectAssessments.length >
                            0 && (
                            <FormModal
                              table="assessmentRow"
                              type="delete"
                              data={{
                                academicYearId,
                                gradeId:
                                  selectedGradeId,
                                subjectId:
                                  subject.id,
                                subjectName:
                                  subject.name,
                                semester:
                                  selectedSemester,
                                assessments:
                                  subjectAssessments,
                              }}
                            />
                          )}

                        </div>
                      </td>
                    )}

                  </tr>
                );
              }
            )}

            {subjects.length === 0 && (
              <tr>
                <td
                  colSpan={
                    assessmentTypes.length +
                    (canEdit ? 2 : 1)
                  }
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