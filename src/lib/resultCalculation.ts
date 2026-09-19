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
 * CLASS ACTIVITIES /30
 * =====================================================
 *
 * Class Activity assessments are converted to a
 * maximum result of 30.
 *
 * The calculation uses the assessment weights.
 */

export const calculateDailyActivityResult = (
  assessments: AssessmentDefinition[],
  scores: StudentScores
): number => {
  const activityAssessments =
    assessments.filter(
      (assessment) =>
        assessment.category ===
        "CLASS_ACTIVITY"
    );

  if (
    activityAssessments.length === 0
  ) {
    return 0;
  }

  const totalWeight =
    activityAssessments.reduce(
      (sum, assessment) =>
        sum + assessment.weight,
      0
    );

  if (totalWeight <= 0) {
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
    (weightedScore / totalWeight) *
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
 * The calculation uses the assessment weights.
 */

export const calculateExamResult = (
  assessments: AssessmentDefinition[],
  scores: StudentScores
): number => {
  const examAssessments =
    assessments.filter(
      (assessment) =>
        assessment.category === "EXAM"
    );

  if (
    examAssessments.length === 0
  ) {
    return 0;
  }

  const totalWeight =
    examAssessments.reduce(
      (sum, assessment) =>
        sum + assessment.weight,
      0
    );

  if (totalWeight <= 0) {
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
    (weightedScore / totalWeight) *
    EXAM_TARGET
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
 * Final Result /100
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