export const WEEKLY_PROGRESS_CATEGORIES = {
  ACADEMIC_PERFORMANCE: "Academic Performance",
  BEHAVIOUR_EVALUATION: "Behaviour Evaluation",
  SOCIALIZATION_AND_WORK_ETHICS:
    "Socialization and Work Ethics",
} as const;

export const WEEKLY_PROGRESS_CRITERIA = [
  {
    criterion: "Academic Performance",
    category: WEEKLY_PROGRESS_CATEGORIES.ACADEMIC_PERFORMANCE,
  },

  {
    criterion: "Behaviour Evaluation",
    category: WEEKLY_PROGRESS_CATEGORIES.BEHAVIOUR_EVALUATION,
  },

  {
    criterion:
      "Works independently and completes all activities on time",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion:
      "Comes to class on time with all scholastic materials",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion:
      "Is enthusiastic and needs motivation from parents",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion:
      "Is not easily distracted and shows interest in learning",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion:
      "Handles materials properly and keeps his/her work neat",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion: "Is an asset to the class",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion:
      "Has shown some improvement this week",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion:
      "Plays and socializes well with friends",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },

  {
    criterion:
      "Participates actively in class",
    category:
      WEEKLY_PROGRESS_CATEGORIES.SOCIALIZATION_AND_WORK_ETHICS,
  },
] as const;

export const WEEKLY_PROGRESS_RATINGS = [
  {
    value: "EXCELLENT",
    label: "Excellent",
  },
  {
    value: "VERY_GOOD",
    label: "Very Good",
  },
  {
    value: "GOOD",
    label: "Good",
  },
  {
    value: "SATISFACTORY",
    label: "Satisfactory",
  },
  {
    value: "NEEDS_IMPROVEMENT",
    label: "Needs Improvement",
  },
] as const;

export type WeeklyProgressRating =
  (typeof WEEKLY_PROGRESS_RATINGS)[number]["value"];