import { SEMESTER_CONFIG } from "./semesterConfig";

export type Semester = "semester1" | "semester2";

export const getSemesterDateRange = (
  academicYear: number,
  semester: Semester
) => {
  const config = SEMESTER_CONFIG[semester];

  let startYear = academicYear;
  let endYear = academicYear;

  // Semester 1:
  // August -> December of the academic year
  //
  // Semester 2:
  // January -> June of the following calendar year
  if (semester === "semester2") {
    startYear = academicYear + 1;
    endYear = academicYear + 1;
  }

  const startDate = new Date(
    Date.UTC(
      startYear,
      config.startMonth - 1,
      config.startDay,
      0,
      0,
      0,
      0
    )
  );

  // End date is exclusive.
  // We use the day after the configured end date.
  const endDate = new Date(
    Date.UTC(
      endYear,
      config.endMonth - 1,
      config.endDay + 1,
      0,
      0,
      0,
      0
    )
  );

  return {
    startDate,
    endDate,
  };
};