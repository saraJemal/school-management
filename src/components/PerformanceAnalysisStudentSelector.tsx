"use client";

import Link from "next/link";
import { GradeSection } from "@prisma/client";

type SelectorGrade = {
  id: number;
  name: string;
};

type SelectorClass = {
  id: number;
  name: string;
};

type Props = {
  analysisId: number;
  level: "SCHOOL" | "SECTION" | "GRADE" | "CLASS";
  availableSections: GradeSection[];
  selectedSection: string;
  availableGrades: SelectorGrade[];
  selectedGradeId: number;
  availableClasses: SelectorClass[];
  selectedClassId: number;
  selectorSelectionComplete: boolean;
  assessmentDisplayedStudentsCount: number;
};

export default function PerformanceAnalysisStudentSelector({
  analysisId,
  level,
  availableSections,
  selectedSection,
  availableGrades,
  selectedGradeId,
  availableClasses,
  selectedClassId,
  selectorSelectionComplete,
  assessmentDisplayedStudentsCount,
}: Props) {
  const handleChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const form = event.currentTarget.form;

    if (!form) return;

    /*
     * When a parent selector changes, remove
     * selections that are no longer valid.
     *
     * SCHOOL:
     *   Section change -> clear Grade + Class
     *   Grade change   -> clear Class
     *
     * SECTION:
     *   Grade change   -> clear Class
     */
    if (event.currentTarget.name === "section") {
      const gradeInput = form.elements.namedItem(
        "grade"
      ) as HTMLSelectElement | null;

      const classInput = form.elements.namedItem(
        "class"
      ) as HTMLSelectElement | null;

      if (gradeInput) {
        gradeInput.value = "";
      }

      if (classInput) {
        classInput.value = "";
      }
    }

    if (event.currentTarget.name === "grade") {
      const classInput = form.elements.namedItem(
        "class"
      ) as HTMLSelectElement | null;

      if (classInput) {
        classInput.value = "";
      }
    }

    form.requestSubmit();
  };

  const clearHref =
    `/list/performance-analysis/${analysisId}`;

  const selectedClassName =
    availableClasses.find(
      (classItem) =>
        classItem.id === selectedClassId
    )?.name;

  const selectedGradeName =
    availableGrades.find(
      (grade) =>
        grade.id === selectedGradeId
    )?.name;

  return (
    <>
      {/* STUDENT SELECTOR */}
      <div className="mb-6 rounded-md border bg-gray-50 p-4 print:hidden">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">
            Select Students to View
          </h3>

          <p className="text-xs text-gray-500 mt-1">
            Select the location and class whose
            students you want to view.
          </p>
        </div>

        <form
          method="GET"
           action={`/list/performance-analysis/${analysisId}#student-performance`}
           className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* SCHOOL -> SECTION */}
          {level === "SCHOOL" && (
            <div>
              <label
                htmlFor="section"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Section
              </label>

              <select
                id="section"
                name="section"
                value={selectedSection}
                onChange={handleChange}
                className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-badirStar"
              >
                <option value="">
                  Select Section
                </option>

                {availableSections.map(
                  (section) => (
                    <option
                      key={section}
                      value={section}
                    >
                      {section}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* SCHOOL / SECTION -> GRADE */}
          {(level === "SCHOOL" ||
            level === "SECTION") && (
            <div>
              <label
                htmlFor="grade"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Grade
              </label>

              <select
                id="grade"
                name="grade"
                value={
                  selectedGradeId
                    ? String(selectedGradeId)
                    : ""
                }
                onChange={handleChange}
                disabled={
                  level === "SCHOOL" &&
                  !selectedSection
                }
                className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none disabled:bg-gray-100 disabled:text-gray-400 focus:ring-1 focus:ring-badirStar"
              >
                <option value="">
                  Select Grade
                </option>

                {availableGrades.map(
                  (grade) => (
                    <option
                      key={grade.id}
                      value={grade.id}
                    >
                      {grade.name}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* GRADE -> CLASS */}
          <div>
            <label
              htmlFor="class"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Class
            </label>

            <select
              id="class"
              name="class"
              value={
                selectedClassId
                  ? String(selectedClassId)
                  : ""
              }
              onChange={handleChange}
              disabled={
                (level === "SCHOOL" &&
                  (!selectedSection ||
                    !selectedGradeId)) ||
                (level === "SECTION" &&
                  !selectedGradeId)
              }
              className="w-full rounded-md border bg-white px-3 py-2 text-sm outline-none disabled:bg-gray-100 disabled:text-gray-400 focus:ring-1 focus:ring-badirStar"
            >
              <option value="">
                Select Class
              </option>

              {availableClasses.map(
                (classItem) => (
                  <option
                    key={classItem.id}
                    value={classItem.id}
                  >
                    {classItem.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {selectorSelectionComplete
                ? `${assessmentDisplayedStudentsCount} student${
                    assessmentDisplayedStudentsCount ===
                    1
                      ? ""
                      : "s"
                  } selected`
                : level === "SCHOOL"
                ? "Select section, then grade, then class."
                : level === "SECTION"
                ? "Select grade, then class."
                : "Select class."}
            </span>

            {(selectedSection ||
              selectedGradeId ||
              selectedClassId) && (
              <Link
                href={clearHref}
                className="ml-auto px-4 py-2 rounded-md bg-white border text-sm font-medium hover:bg-gray-100"
              >
                Clear
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* This is intentionally kept here only for clarity:
          the selected class/grade names are calculated from
          the server-provided selector data. */}
      {selectorSelectionComplete && (
        <div className="hidden">
          {selectedClassName}
          {selectedGradeName}
        </div>
      )}
    </>
  );
}