"use client";

import { useRouter, useSearchParams } from "next/navigation";

type ReportCardFiltersProps = {
  academicYears: {
    id: number;
    name: string;
  }[];
  grades: {
    id: number;
    level: number;
    name: string;
  }[];
  classes: {
    id: number;
    name: string;
    gradeId: number;
  }[];
  selectedAcademicYearId?: number;
  selectedGradeId?: number;
  selectedClassId?: number;
};

const ReportCardFilters = ({
  academicYears,
  grades,
  classes,
  selectedAcademicYearId,
  selectedGradeId,
  selectedClassId,
}: ReportCardFiltersProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleAcademicYearChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const academicYearId = e.target.value;

    const params = new URLSearchParams(searchParams.toString());

    if (academicYearId) {
      params.set("academicYearId", academicYearId);
    } else {
      params.delete("academicYearId");
    }

    // Changing academic year invalidates the selected grade/class.
    params.delete("gradeId");
    params.delete("classId");

    router.push(`/list/report-cards?${params.toString()}`);
  };

  const handleGradeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const gradeId = e.target.value;

    const params = new URLSearchParams(searchParams.toString());

    if (gradeId) {
      params.set("gradeId", gradeId);
    } else {
      params.delete("gradeId");
    }

    // Changing grade invalidates the selected class.
    params.delete("classId");

    router.push(`/list/report-cards?${params.toString()}`);
  };

  const handleClassChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const classId = e.target.value;

    const params = new URLSearchParams(searchParams.toString());

    if (classId) {
      params.set("classId", classId);
    } else {
      params.delete("classId");
    }

    router.push(`/list/report-cards?${params.toString()}`);
  };

  const filteredClasses = classes
    .filter((item) =>
      selectedGradeId ? item.gradeId === selectedGradeId : false
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      {/* Academic Year */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-600">
          Academic Year
        </label>

        <select
          value={selectedAcademicYearId ?? ""}
          onChange={handleAcademicYearChange}
          className="w-[180px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
        >
          <option value="">Select academic year</option>

          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
            </option>
          ))}
        </select>
      </div>

      {/* Grade */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-600">
          Grade
        </label>

        <select
          value={selectedGradeId ?? ""}
          onChange={handleGradeChange}
          disabled={!selectedAcademicYearId}
          className="w-[180px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-gray-500"
        >
          <option value="">Select grade</option>

          {grades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.name}
            </option>
          ))}
        </select>
      </div>

      {/* Class */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-600">
          Class / Section
        </label>

        <select
          value={selectedClassId ?? ""}
          onChange={handleClassChange}
          disabled={!selectedGradeId}
          className="w-[180px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-100 focus:border-gray-500"
        >
          <option value="">Select class</option>

          {filteredClasses.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ReportCardFilters;