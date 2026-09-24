"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Semester } from "@prisma/client";
import {
  saveResultDraft,
  submitResult,
} from "@/lib/actions";

type Assessment = {
  id: number;
  type: string;
  category: "CLASS_ACTIVITY" | "EXAM";
  maxScore: number;
  weight: number;
};

type Student = {
  studentId: string;
  rollNumber: number;
  name: string;
  surname: string | null;
};

type ResultEntryTableProps = {
  academicYearId: number;
  classId: number;
  subjectId: number;
  semester: Semester;
  assessments: Assessment[];
  students: Student[];
  locked: boolean;
  initialScores: Record<string, number>;
};

const ResultEntryTable = ({
  academicYearId,
  classId,
  subjectId,
  semester,
  assessments,
  students,
  locked,
  initialScores,
}: ResultEntryTableProps) => {
  const router = useRouter();

  const [scores, setScores] = useState<
    Record<string, string>
  >(() => {
    const converted: Record<string, string> = {};

    Object.entries(initialScores).forEach(
      ([key, value]) => {
        converted[key] = String(value);
      }
    );

    return converted;
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const classActivities = assessments.filter(
    (assessment) =>
      assessment.category === "CLASS_ACTIVITY"
  );

  const exams = assessments.filter(
    (assessment) => assessment.category === "EXAM"
  );

  // --------------------------------------------------
  // Raw maximums
  // --------------------------------------------------

  const classActivityRawMax =
    classActivities.reduce(
      (total, assessment) =>
        total + assessment.maxScore,
      0
    );

  const examRawMax = exams.reduce(
    (total, assessment) =>
      total + assessment.maxScore,
    0
  );

  // --------------------------------------------------
  // Final category targets
  // --------------------------------------------------

  const DAILY_ACTIVITY_TARGET = 30;
  const EXAM_TARGET = 70;

  // --------------------------------------------------
  // Get individual score
  // --------------------------------------------------

  const getScore = (
    studentId: string,
    assessmentId: number
  ) => {
    return (
      scores[
        `${studentId}_${assessmentId}`
      ] ?? ""
    );
  };

  // --------------------------------------------------
  // Update individual raw score
  // --------------------------------------------------

  const updateScore = (
    studentId: string,
    assessmentId: number,
    value: string
  ) => {
    if (locked) return;

    setScores((previous) => ({
      ...previous,
      [`${studentId}_${assessmentId}`]: value,
    }));
  };

  // --------------------------------------------------
  // Calculate raw class activity total
  // --------------------------------------------------

  const calculateClassActivityRaw = (
    student: Student
  ) => {
    return classActivities.reduce(
      (total, assessment) => {
        const value = getScore(
          student.studentId,
          assessment.id
        );

        const score =
          value.trim() === ""
            ? 0
            : Number(value);

        return (
          total +
          (Number.isFinite(score) ? score : 0)
        );
      },
      0
    );
  };

  // --------------------------------------------------
  // Calculate raw exam total
  // --------------------------------------------------

  const calculateExamRaw = (
    student: Student
  ) => {
    return exams.reduce(
      (total, assessment) => {
        const value = getScore(
          student.studentId,
          assessment.id
        );

        const score =
          value.trim() === ""
            ? 0
            : Number(value);

        return (
          total +
          (Number.isFinite(score) ? score : 0)
        );
      },
      0
    );
  };

  // --------------------------------------------------
  // Convert Class Activities -> /30
  // --------------------------------------------------

  const calculateDaily = (
    student: Student
  ) => {
    const raw =
      calculateClassActivityRaw(student);

    if (classActivityRawMax === 0) {
      return 0;
    }

    return (
      (raw / classActivityRawMax) *
      DAILY_ACTIVITY_TARGET
    );
  };

  // --------------------------------------------------
  // Convert Tests -> /70
  // --------------------------------------------------

  const calculateTests = (
    student: Student
  ) => {
    const raw =
      calculateExamRaw(student);

    if (examRawMax === 0) {
      return 0;
    }

    return (
      (raw / examRawMax) *
      EXAM_TARGET
    );
  };

  // --------------------------------------------------
  // Final /100
  // --------------------------------------------------

  const calculateTotal = (
    student: Student
  ) => {
    return (
      calculateDaily(student) +
      calculateTests(student)
    );
  };

  // --------------------------------------------------
  // SAVE DRAFT
  // --------------------------------------------------

  const handleSave = async () => {
    if (locked || saving || submitting) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const scoreData = Object.entries(
        scores
      ).map(([key, value]) => {
        const [
          studentId,
          assessmentIdString,
        ] = key.split("_");

        return {
          studentId,
          assessmentId:
            Number(assessmentIdString),
          score:
            value.trim() === ""
              ? null
              : Number(value),
        };
      });

      const result =
        await saveResultDraft({
          academicYearId,
          classId,
          subjectId,
          semester,
          scores: scoreData,
        });

      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save results."
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // SUBMIT RESULT
  // --------------------------------------------------

  const handleSubmit = async () => {
    if (locked || saving || submitting) return;

    let missingMarksCount = 0;

    for (const student of students) {
      for (const assessment of assessments) {
        const key = `${student.studentId}_${assessment.id}`;
        const value = scores[key];

        if (
          value === undefined ||
          value === null ||
          value.trim() === "" ||
          !Number.isFinite(Number(value))
        ) {
          missingMarksCount++;
        }
      }
    }

    let confirmationMessage =
      "Are you sure you want to submit these results?\n\n";

    if (missingMarksCount > 0) {
      confirmationMessage +=
        `There are ${missingMarksCount} assessment mark(s) that have not been entered.\n\n` +
        "Any assessment mark that has not been entered will be treated as 0.\n\n" +
        "Do you want to submit the results as they are?";
    } else {
      confirmationMessage +=
        "All assessment marks have been entered.\n\n" +
        "Once submitted, the results will be locked and you will no longer be able to edit them.\n\n" +
        "Do you want to continue?";
    }

    const confirmed = window.confirm(
      confirmationMessage
    );

    if (!confirmed) return;

    setSubmitting(true);
    setMessage("");

    try {
      const result = await submitResult({
        academicYearId,
        classId,
        subjectId,
        semester,
      });

      if (!result.success) {
        setMessage(result.message);
        return;
      }

      setMessage(result.message);

      router.refresh();
    } catch (error) {
      console.error("SUBMIT ERROR:", error);

      setMessage(
        "Failed to submit results. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="w-full">

      {/* ==================================================
          TABLE
      ================================================== */}

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full border-collapse text-sm">

          <thead>
            <tr className="bg-gray-100 border-b">

              {/* Roll */}
              <th
                rowSpan={2}
                className="border p-2 text-center whitespace-nowrap"
              >
                Roll
              </th>

              {/* Student */}
              <th
                rowSpan={2}
                className="border p-2 text-left whitespace-nowrap"
              >
                Student
              </th>

              {/* Class Activities */}
              <th
                colSpan={
                  classActivities.length + 2
                }
                className="border p-2 text-center"
              >
                Class Activities
              </th>

              {/* Tests */}
              <th
                colSpan={
                  exams.length + 2
                }
                className="border p-2 text-center"
              >
                Tests
              </th>

              {/* Total */}
              <th
                rowSpan={2}
                className="border p-2 text-center whitespace-nowrap"
              >
                Total /100
              </th>
            </tr>

            <tr className="bg-gray-50">

              {/* Class Activity assessments */}
              {classActivities.map(
                (assessment) => (
                  <th
                    key={assessment.id}
                    className="border p-2 text-center whitespace-nowrap"
                  >
                    {assessment.type} /
                    {assessment.maxScore}
                  </th>
                )
              )}

              {/* Class Activity Raw */}
              <th className="border p-2 text-center whitespace-nowrap">
                Raw Score /
                {classActivityRawMax}
              </th>

              {/* Daily */}
              <th className="border p-2 text-center whitespace-nowrap">
                Daily /30
              </th>

              {/* Exam assessments */}
              {exams.map(
                (assessment) => (
                  <th
                    key={assessment.id}
                    className="border p-2 text-center whitespace-nowrap"
                  >
                    {assessment.type} /
                    {assessment.maxScore}
                  </th>
                )
              )}

              {/* Exam Raw */}
              <th className="border p-2 text-center whitespace-nowrap">
                Raw Score /
                {examRawMax}
              </th>

              {/* Tests */}
              <th className="border p-2 text-center whitespace-nowrap">
                Tests /70
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => {
              const classActivityRaw =
                calculateClassActivityRaw(
                  student
                );

              const examRaw =
                calculateExamRaw(student);

              const daily =
                calculateDaily(student);

              const tests =
                calculateTests(student);

              const total =
                calculateTotal(student);

              return (
                <tr
                  key={student.studentId}
                  className="border-b"
                >

                  {/* Roll */}
                  <td className="border p-2 text-center">
                    {student.rollNumber}
                  </td>

                  {/* Student */}
                  <td className="border p-2 whitespace-nowrap">
                    {student.name}{" "}
                    {student.surname}
                  </td>

                  {/* ============================
                      CLASS ACTIVITIES
                      ============================ */}

                  {classActivities.map(
                    (assessment) => {
                      const value =
                        getScore(
                          student.studentId,
                          assessment.id
                        );

                      return (
                        <td
                          key={assessment.id}
                          className="border p-1 text-center"
                        >
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={
                              assessment.maxScore
                            }
                            value={value}
                            disabled={locked}
                            onChange={(event) =>
                              updateScore(
                                student.studentId,
                                assessment.id,
                                event.target.value
                              )
                            }
                            className="w-20 border rounded-md px-2 py-1 text-center disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                      );
                    }
                  )}

                  {/* Class Activity Raw */}
                  <td className="border p-2 text-center font-medium whitespace-nowrap">
                    {classActivityRaw.toFixed(
                      2
                    )}{" "}
                    / {classActivityRawMax}
                  </td>

                  {/* Daily /30 */}
                  <td className="border p-2 text-center font-medium whitespace-nowrap">
                    {daily.toFixed(2)} / 30
                  </td>

                  {/* ============================
                      EXAMS
                      ============================ */}

                  {exams.map(
                    (assessment) => {
                      const value =
                        getScore(
                          student.studentId,
                          assessment.id
                        );

                      return (
                        <td
                          key={assessment.id}
                          className="border p-1 text-center"
                        >
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={
                              assessment.maxScore
                            }
                            value={value}
                            disabled={locked}
                            onChange={(event) =>
                              updateScore(
                                student.studentId,
                                assessment.id,
                                event.target.value
                              )
                            }
                            className="w-20 border rounded-md px-2 py-1 text-center disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </td>
                      );
                    }
                  )}

                  {/* Exam Raw */}
                  <td className="border p-2 text-center font-medium whitespace-nowrap">
                    {examRaw.toFixed(2)} /{" "}
                    {examRawMax}
                  </td>

                  {/* Tests /70 */}
                  <td className="border p-2 text-center font-medium whitespace-nowrap">
                    {tests.toFixed(2)} / 70
                  </td>

                  {/* Total /100 */}
                  <td className="border p-2 text-center font-semibold whitespace-nowrap">
                    {total.toFixed(2)} / 100
                  </td>
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      {/* ==================================================
          MESSAGE
      ================================================== */}

      {message && (
        <div className="mt-4 text-sm text-center">
          {message}
        </div>
      )}

      {/* ==================================================
          ACTION BUTTONS
      ================================================== */}

      {!locked && (
        <div className="flex justify-end gap-3 mt-6">

          {/* SAVE DRAFT */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || submitting}
            className="bg-badirBlue text-white px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : "Save Draft"}
          </button>

          {/* SUBMIT */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="bg-badirBlue text-white px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : "Submit"}
          </button>

        </div>
      )}

    </div>
  );
};

export default ResultEntryTable;