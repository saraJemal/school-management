"use client";

import { useMemo, useState } from "react";

type Grade = {
  id: number;
  level: number;
  name: string;
  section: string;
};

type ClassItem = {
  id: number;
  name: string;
  capacity: number;
  gradeId: number;
};

type StudentEnrollmentSelectorsProps = {
  academicYears: {
    id: number;
    name: string;
  }[];
  grades: Grade[];
  classes: ClassItem[];
  selectedAcademicYearId?: number;
  selectedGradeId?: number;
  selectedClassId?: number;
};

const StudentEnrollmentSelectors = ({
  academicYears,
  grades,
  classes,
  selectedAcademicYearId,
  selectedGradeId,
  selectedClassId,
}: StudentEnrollmentSelectorsProps) => {
  const [gradeId, setGradeId] = useState(
    selectedGradeId?.toString() ?? ""
  );

  const [classId, setClassId] = useState(() => {
    if (!selectedClassId) return "";

    const selectedClass = classes.find(
      (item) => item.id === selectedClassId
    );

    if (
      selectedClass &&
      selectedGradeId &&
      selectedClass.gradeId === selectedGradeId
    ) {
      return selectedClassId.toString();
    }

    return "";
  });

  const filteredClasses = useMemo(() => {
    if (!gradeId) {
      return [];
    }

    return classes.filter(
      (item) => item.gradeId === Number(gradeId)
    );
  }, [classes, gradeId]);

  const handleGradeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;

    setGradeId(value);

    // A class from the previous grade must never remain selected.
    setClassId("");
  };

  return (
    <form
      method="GET"
      className="bg-slate-50 border border-gray-200 rounded-md p-4 mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Academic Year */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="academicYearId"
            className="text-xs text-gray-500"
          >
            Academic Year
          </label>

          <select
            id="academicYearId"
            name="academicYearId"
            defaultValue={selectedAcademicYearId ?? ""}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-white"
          >
            <option value="">
              Select academic year
            </option>

            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
              </option>
            ))}
          </select>
        </div>

        {/* Grade */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="gradeId"
            className="text-xs text-gray-500"
          >
            Grade
          </label>

          <select
            id="gradeId"
            name="gradeId"
            value={gradeId}
            onChange={handleGradeChange}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-white"
          >
            <option value="">
              All grades
            </option>

            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor="classId"
            className="text-xs text-gray-500"
          >
            Class
          </label>

          <select
            id="classId"
            name="classId"
            value={classId}
            onChange={(event) =>
              setClassId(event.target.value)
            }
            disabled={!gradeId}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-white disabled:bg-gray-100"
          >
            <option value="">
              {gradeId ? "All classes" : "Select grade first"}
            </option>

            {filteredClasses.map((classItem) => (
              <option
                key={classItem.id}
                value={classItem.id}
              >
                {classItem.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <button
          type="submit"
          className="bg-badirStar text-white px-5 py-2 rounded-md text-sm font-medium"
        >
          View Class
        </button>
      </div>
    </form>
  );
};

export default StudentEnrollmentSelectors;