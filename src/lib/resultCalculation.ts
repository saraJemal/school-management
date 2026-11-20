export const DAILY_ACTIVITY_TARGET = 30;
export const EXAM_TARGET = 70;

type AssessmentDefinition = {
  type: string;
  category: string;
  maxScore: number;
  weight: number;
};

type StudentScores = Record<
  string,
  number | null | undefined
>;

/*
 * =====================================================
 * RECORDED SCORE
 * =====================================================
 *
 * IMPORTANT:
 *
 * score = 0
 *   means the assessment WAS completed and the student
 *   received zero. It MUST participate in calculation.
 *
 * score = null / undefined
 *   means the assessment has NOT been recorded yet.
 *   It must NOT participate in calculation.
 *
 * The UI may display an unrecorded assessment as "-",
 * but "-" is never stored as a numeric score.
 */

export const isRecordedScore = (
  score: number | null | undefined
): score is number => {
  return (
    score !== null &&
    score !== undefined
  );
};

/*
 * =====================================================
 * CLASS ACTIVITIES /30
 * =====================================================
 *
 * Class Activity assessments are converted to a
 * maximum result of 30.
 *
 * PROGRESSIVE CALCULATION:
 *
 * Only assessments that have a recorded score are
 * included in the calculation.
 *
 * A score of 0 IS a recorded score and is included.
 *
 * An assessment with no recorded score is excluded.
 *
 * The completed assessment weights are normalized
 * against the completed weight.
 *
 * Example:
 *
 * Activity weights:
 *   CW1 = 10
 *   CW2 = 10
 *   HW1 = 10
 *
 * If only CW1 and CW2 are recorded:
 *
 *   completed weight = 20
 *
 * The student's current activity performance is
 * calculated from those 20 completed weight points
 * and converted to /30.
 */

export const calculateDailyActivityResult = (
  assessments: AssessmentDefinition[],
  scores: StudentScores
): number => {
  const activityAssessments =
    assessments.filter(
      (assessment) =>
        assessment.category ===
          "CLASS_ACTIVITY" &&
        isRecordedScore(
          scores[assessment.type]
        )
    );

  if (
    activityAssessments.length === 0
  ) {
    return 0;
  }

  const completedWeight =
    activityAssessments.reduce(
      (sum, assessment) =>
        sum + assessment.weight,
      0
    );

  if (completedWeight <= 0) {
    return 0;
  }

  const weightedScore =
    activityAssessments.reduce(
      (sum, assessment) =>
        sum +
        (scores[assessment.type] ?? 0),
      0
    );

  return (
    (weightedScore / completedWeight) *
    DAILY_ACTIVITY_TARGET
  );
};

/*
 * =====================================================
 * TESTS / EXAMS /70
 * =====================================================
 *
 * Test/Exam assessments are converted to a
 * maximum result of 70.
 *
 * PROGRESSIVE CALCULATION:
 *
 * Only assessments that have a recorded score are
 * included.
 *
 * A score of 0 IS included.
 *
 * An assessment with no recorded score is excluded.
 *
 * The completed assessment weights are normalized
 * against the completed weight.
 */

export const calculateExamResult = (
  assessments: AssessmentDefinition[],
  scores: StudentScores
): number => {
  const examAssessments =
    assessments.filter(
      (assessment) =>
        assessment.category ===
          "EXAM" &&
        isRecordedScore(
          scores[assessment.type]
        )
    );

  if (
    examAssessments.length === 0
  ) {
    return 0;
  }

  const completedWeight =
    examAssessments.reduce(
      (sum, assessment) =>
        sum + assessment.weight,
      0
    );

  if (completedWeight <= 0) {
    return 0;
  }

  const weightedScore =
    examAssessments.reduce(
      (sum, assessment) =>
        sum +
        (scores[assessment.type] ?? 0),
      0
    );

  return (
    (weightedScore / completedWeight) *
    EXAM_TARGET
  );
};

/*
 * =====================================================
 * COMPLETION WEIGHT
 * =====================================================
 *
 * Returns the percentage of the total assessment
 * weight for which the student has a recorded score.
 *
 * This is useful for showing:
 *
 *   Assessment Coverage: 45%
 *
 * IMPORTANT:
 *
 * A score of 0 counts as completed.
 */

export const calculateAssessmentCoverage = (
  assessments: AssessmentDefinition[],
  scores: StudentScores
): number => {
  if (assessments.length === 0) {
    return 0;
  }

  const totalWeight =
    assessments.reduce(
      (sum, assessment) =>
        sum + assessment.weight,
      0
    );

  if (totalWeight <= 0) {
    return 0;
  }

  const completedWeight =
    assessments
      .filter((assessment) =>
        isRecordedScore(
          scores[assessment.type]
        )
      )
      .reduce(
        (sum, assessment) =>
          sum + assessment.weight,
        0
      );

  return (
    (completedWeight / totalWeight) *
    100
  );
};

/*
 * =====================================================
 * FINAL RESULT /100
 * =====================================================
 *
 * Class Activities /30
 * +
 * Tests /70
 * =
 * Current / Final Result /100
 *
 * IMPORTANT:
 *
 * This calculation is PROGRESSIVE.
 *
 * It does NOT treat missing assessments as zero.
 *
 * Instead:
 *
 *   recorded score → included
 *   score = 0       → included
 *   no score        → excluded
 *
 * As teachers enter additional assessment results,
 * this same function automatically recalculates the
 * student's result.
 *
 * When all assessments are recorded, the result becomes
 * the student's complete final result /100.
 */

export const calculateFinalResult = (
  assessments: AssessmentDefinition[],
  scores: StudentScores
): number => {
  const dailyActivityResult =
    calculateDailyActivityResult(
      assessments,
      scores
    );

  const examResult =
    calculateExamResult(
      assessments,
      scores
    );

  return (
    dailyActivityResult +
    examResult
  );
};

/*
 * =====================================================
 * ROUND RESULT
 * =====================================================
 *
 * All displayed calculated results are rounded
 * to two decimal places.
 */

export const roundResult = (
  value: number
): number => {
  return Number(
    value.toFixed(2)
  );
};