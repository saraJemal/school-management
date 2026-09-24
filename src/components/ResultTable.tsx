"use client";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  calculateDailyActivityResult,
  calculateExamResult,
  calculateFinalResult,
  roundResult,
} from "@/lib/resultCalculation";

type Student = {
  studentId: string;
  rollNumber: number;
  name: string;
  surname: string | null;
  scores: Record<string, number | null>;
};

type AssessmentDefinition = {
  type: string;
  category: "CLASS_ACTIVITY" | "EXAM";
  maxScore: number;
  weight: number;
};

type Props = {
  academicYears: {
    id: number;
    name: string;
  }[];

  selectedAcademicYearId: number;

  selectedSemester: string;

  classes: {
    id: number;
    name: string;
    gradeName: string;
  }[];

  selectedClassId: number;

  subjects: {
    id: number;
    name: string;
  }[];

  selectedSubjectId: number | undefined;

  students: Student[];

  assessments: AssessmentDefinition[];
};

const ResultTable = ({
  academicYears,
  selectedAcademicYearId,
  selectedSemester,
  classes,
  selectedClassId,
  subjects,
  selectedSubjectId,
  students,
  assessments,
}: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = (
    key: string,
    value: string
  ) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    params.set(key, value);
    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  const handleAcademicYearChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateParams(
      "academicYearId",
      e.target.value
    );
  };

  const handleSemesterChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateParams(
      "semester",
      e.target.value
    );
  };

  const handleClassChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const params = new URLSearchParams(
      searchParams.toString()
    );

    // Change the class.
    params.set(
      "classId",
      e.target.value
    );

    // The previous subject belongs to
    // the old class, so remove it.
    params.delete("subjectId");

    // Always start from page 1.
    params.set("page", "1");

    router.push(`?${params.toString()}`);
  };

  const handleSubjectChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    updateParams(
      "subjectId",
      e.target.value
    );
  };

  /*
   * =====================================================
   * ASSESSMENT GROUPS
   * =====================================================
   *
   * CLASS ACTIVITIES
   *   CW1
   *   CW2
   *   HW1
   *   HW2
   *   WS1
   *   WS2
   *   PROJECT
   *   EXERCISE_BOOK
   *
   * TESTS / EXAMS
   *   Q1
   *   Q2
   *   TEST1
   *   TEST2
   *   MIDTERM
   *   FINAL
   *
   * Individual assessment columns display
   * RAW SCORE / MAX SCORE only.
   *
   * The actual category and final calculations
   * are now handled by the shared resultCalculation
   * utility so the exact same calculation can be
   * reused by the student report card.
   */

  const classActivityAssessments =
    assessments.filter(
      (assessment) =>
        assessment.category ===
        "CLASS_ACTIVITY"
    );

  const examAssessments =
    assessments.filter(
      (assessment) =>
        assessment.category === "EXAM"
    );

  /*
   * =====================================================
   * RAW CATEGORY MAXIMUMS
   * =====================================================
   *
   * These are only used for displaying the raw
   * category totals in this table.
   *
   * They are NOT used to calculate the final result.
   * Final result calculation is centralized in
   * resultCalculation.ts.
   */

  const classActivityMaxScore =
    classActivityAssessments.reduce(
      (total, assessment) =>
        total + assessment.maxScore,
      0
    );

  const examMaxScore =
    examAssessments.reduce(
      (total, assessment) =>
        total + assessment.maxScore,
      0
    );

  /*
   * =====================================================
   * RAW SCORE DISPLAY
   * =====================================================
   */

  const formatRawScore = (
    value: number
  ) => {
    return value.toFixed(2);
  };

  const formatResult = (
    value: number
  ) => {
    return roundResult(value).toFixed(2);
  };

  /*
   * =====================================================
   * RAW DAILY ACTIVITY TOTAL
   * =====================================================
   *
   * This is only the raw sum displayed in the
   * "Raw Score" column.
   *
   * It is intentionally separate from the final
   * /30 calculation.
   */

  const calculateDailyActivityRawTotal = (
    student: Student
  ) => {
    return classActivityAssessments.reduce(
      (total, assessment) =>
        total +
        (student.scores[
          assessment.type
        ] ?? 0),
      0
    );
  };

  /*
   * =====================================================
   * RAW TEST TOTAL
   * =====================================================
   *
   * This is only the raw sum displayed in the
   * "Raw Score" column.
   *
   * It is intentionally separate from the final
   * /70 calculation.
   */

  const calculateExamRawTotal = (
    student: Student
  ) => {
    return examAssessments.reduce(
      (total, assessment) =>
        total +
        (student.scores[
          assessment.type
        ] ?? 0),
      0
    );
  };

  return (
    <div className="mt-6">

      {/* =================================================
          FILTERS
          ================================================= */}

      <div className="flex flex-col md:flex-row gap-4 mb-6">

        {/* ACADEMIC YEAR */}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Academic Year
          </label>

          <select
            value={
              selectedAcademicYearId
            }
            onChange={
              handleAcademicYearChange
            }
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px]"
          >
            {academicYears.map(
              (year) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                </option>
              )
            )}
          </select>
        </div>

        {/* SEMESTER */}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Semester
          </label>

          <select
            value={selectedSemester}
            onChange={
              handleSemesterChange
            }
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

        {/* CLASS */}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Class
          </label>

          <select
            value={selectedClassId}
            onChange={
              handleClassChange
            }
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px]"
          >
            {classes.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              )
            )}
          </select>
        </div>

        {/* SUBJECT */}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Subject
          </label>

          <select
            value={
              selectedSubjectId ?? ""
            }
            onChange={
              handleSubjectChange
            }
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px]"
          >
            {subjects.map(
              (subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.name}
                </option>
              )
            )}
          </select>
        </div>

      </div>

      {/* =================================================
          TABLE
          ================================================= */}

      <div className="overflow-x-auto border rounded-md">

        <table className="w-full border-collapse">

          <thead>

            {/* =================================================
                CATEGORY GROUP HEADER
                ================================================= */}

            <tr className="bg-gray-100 border-b">

              {/* STUDENT INFORMATION */}

              <th
                rowSpan={2}
                className="sticky left-0 z-20 bg-gray-100 p-3 text-left text-sm font-semibold whitespace-nowrap"
              >
                Roll No.
              </th>

              <th
                rowSpan={2}
                className="sticky left-[75px] z-20 bg-gray-100 p-3 text-left text-sm font-semibold whitespace-nowrap"
              >
                Student
              </th>

              {/* CLASS ACTIVITIES GROUP */}

              {classActivityAssessments.length >
                0 && (
                <th
                  colSpan={
                    classActivityAssessments.length +
                    2
                  }
                  className="px-3 py-3 text-center text-sm font-semibold border-l"
                >
                  Class Activities
                </th>
              )}

              {/* TESTS GROUP */}

              {examAssessments.length >
                0 && (
                <th
                  colSpan={
                    examAssessments.length +
                    2
                  }
                  className="px-3 py-3 text-center text-sm font-semibold border-l"
                >
                  Tests
                </th>
              )}

              {/* FINAL TOTAL */}

              <th
                rowSpan={2}
                className="px-3 py-3 text-center text-sm font-semibold border-l min-w-[100px] whitespace-nowrap"
              >
                Total /100
              </th>

            </tr>

            {/* =================================================
                ASSESSMENT HEADERS
                ================================================= */}

            <tr className="bg-gray-100 border-b">

              {/* CLASS ACTIVITY ASSESSMENTS */}

              {classActivityAssessments.map(
                (assessment) => (
                  <th
                    key={`class-${assessment.type}`}
                    className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-l min-w-[80px]"
                  >
                    <div>
                      {assessment.type}
                    </div>

                    <div className="text-[10px] font-normal text-gray-500 mt-1">
                      Max:{" "}
                      {formatRawScore(
                        assessment.maxScore
                      )}
                    </div>
                  </th>
                )
              )}

              {/* RAW DAILY TOTAL */}

              {classActivityAssessments.length >
                0 && (
                <>
                  <th className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-l min-w-[110px]">
                    <div>
                      Raw Score
                    </div>

                    <div className="text-[10px] font-normal text-gray-500 mt-1">
                      /{" "}
                      {formatRawScore(
                        classActivityMaxScore
                      )}
                    </div>
                  </th>

                  {/* DAILY /30 */}

                  <th className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-l min-w-[100px]">
                    Daily /30
                  </th>
                </>
              )}

              {/* TEST ASSESSMENTS */}

              {examAssessments.map(
                (assessment) => (
                  <th
                    key={`exam-${assessment.type}`}
                    className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-l min-w-[80px]"
                  >
                    <div>
                      {assessment.type}
                    </div>

                    <div className="text-[10px] font-normal text-gray-500 mt-1">
                      Max:{" "}
                      {formatRawScore(
                        assessment.maxScore
                      )}
                    </div>
                  </th>
                )
              )}

              {/* RAW TEST TOTAL */}

              {examAssessments.length >
                0 && (
                <>
                  <th className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-l min-w-[110px]">
                    <div>
                      Raw Score
                    </div>

                    <div className="text-[10px] font-normal text-gray-500 mt-1">
                      /{" "}
                      {formatRawScore(
                        examMaxScore
                      )}
                    </div>
                  </th>

                  {/* TESTS /70 */}

                  <th className="px-2 py-2 text-center text-xs font-semibold whitespace-nowrap border-l min-w-[100px]">
                    Tests /70
                  </th>
                </>
              )}

            </tr>

          </thead>

          <tbody>

            {students.map(
              (student) => {

                /*
                 * =================================================
                 * RAW TOTALS
                 * =================================================
                 *
                 * Used only for the raw-score display.
                 */

                const dailyRawTotal =
                  calculateDailyActivityRawTotal(
                    student
                  );

                const examRawTotal =
                  calculateExamRawTotal(
                    student
                  );

                /*
                 * =================================================
                 * SHARED RESULT CALCULATION
                 * =================================================
                 *
                 * These three values now come from the
                 * shared utility.
                 *
                 * This is important because the student
                 * report card will use these exact same
                 * functions.
                 */

                const dailyResult =
                  roundResult(
                    calculateDailyActivityResult(
                      assessments,
                      student.scores
                    )
                  );

                const examResult =
                  roundResult(
                    calculateExamResult(
                      assessments,
                      student.scores
                    )
                  );

                const finalResult =
                  roundResult(
                    calculateFinalResult(
                      assessments,
                      student.scores
                    )
                  );

                return (
                  <tr
                    key={
                      student.studentId
                    }
                    className="border-b hover:bg-gray-50"
                  >

                    {/* ROLL NUMBER */}

                    <td className="sticky left-0 z-10 bg-white p-3 text-sm font-medium whitespace-nowrap">
                      {
                        student.rollNumber
                      }
                    </td>

                    {/* STUDENT */}

                    <td className="sticky left-[75px] z-10 bg-white p-3 text-sm whitespace-nowrap">
                      {
                        student.name
                      }{" "}
                      {
                        student.surname
                      }
                    </td>

                    {/* =================================================
                        CLASS ACTIVITY RAW SCORES
                        ================================================= */}

                    {classActivityAssessments.map(
                      (assessment) => {

                        const score =
                          student.scores[
                            assessment.type
                          ];

                        return (
                          <td
                            key={`class-${student.studentId}-${assessment.type}`}
                            className="px-2 py-2 text-center border-l min-w-[80px]"
                          >
                            {score !==
                              null &&
                            score !==
                              undefined ? (
                              <>
                                {formatRawScore(
                                  score
                                )}

                                <span className="text-gray-400">
                                  {" "}
                                  /{" "}
                                  {formatRawScore(
                                    assessment.maxScore
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-300">
                                —
                              </span>
                            )}
                          </td>
                        );
                      }
                    )}

                    {/* =================================================
                        RAW DAILY ACTIVITY TOTAL
                        ================================================= */}

                    {classActivityAssessments.length >
                      0 && (
                      <>
                        <td className="px-2 py-2 text-center border-l min-w-[110px] font-medium">
                          {formatRawScore(
                            dailyRawTotal
                          )}{" "}
                          <span className="text-gray-400">
                            /{" "}
                            {formatRawScore(
                              classActivityMaxScore
                            )}
                          </span>
                        </td>

                        {/* DAILY /30 */}

                        <td className="px-2 py-2 text-center border-l min-w-[100px] font-medium">
                          {formatResult(
                            dailyResult
                          )}
                        </td>
                      </>
                    )}

                    {/* =================================================
                        TEST RAW SCORES
                        ================================================= */}

                    {examAssessments.map(
                      (assessment) => {

                        const score =
                          student.scores[
                            assessment.type
                          ];

                        return (
                          <td
                            key={`exam-${student.studentId}-${assessment.type}`}
                            className="px-2 py-2 text-center border-l min-w-[80px]"
                          >
                            {score !==
                              null &&
                            score !==
                              undefined ? (
                              <>
                                {formatRawScore(
                                  score
                                )}

                                <span className="text-gray-400">
                                  {" "}
                                  /{" "}
                                  {formatRawScore(
                                    assessment.maxScore
                                  )}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-300">
                                —
                              </span>
                            )}
                          </td>
                        );
                      }
                    )}

                    {/* =================================================
                        RAW TEST TOTAL
                        ================================================= */}

                    {examAssessments.length >
                      0 && (
                      <>
                        <td className="px-2 py-2 text-center border-l min-w-[110px] font-medium">
                          {formatRawScore(
                            examRawTotal
                          )}{" "}
                          <span className="text-gray-400">
                            /{" "}
                            {formatRawScore(
                              examMaxScore
                            )}
                          </span>
                        </td>

                        {/* TESTS /70 */}

                        <td className="px-2 py-2 text-center border-l min-w-[100px] font-medium">
                          {formatResult(
                            examResult
                          )}
                        </td>
                      </>
                    )}

                    {/* =================================================
                        FINAL TOTAL /100
                        ================================================= */}

                    <td className="px-2 py-2 text-center border-l min-w-[100px] font-semibold">
                      {formatResult(
                        finalResult
                      )}
                    </td>

                  </tr>
                );
              }
            )}

            {students.length ===
              0 && (
              <tr>
                <td
                  colSpan={
                    3 +
                    classActivityAssessments.length +
                    2 +
                    examAssessments.length +
                    2
                  }
                  className="p-8 text-center text-gray-500"
                >
                  No students are
                  enrolled in this
                  class for the
                  selected academic
                  year.
                </td>
              </tr>
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default ResultTable;