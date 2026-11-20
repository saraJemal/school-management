
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export type FinanceChartSummary = {
  totalStudents: number;
  totalMale: number;
  totalFemale: number;
  excellentMale: number;
  excellentFemale: number;
  veryGoodMale: number;
  veryGoodFemale: number;
  averageMale: number;
  averageFemale: number;
  poorMale: number;
  poorFemale: number;
  failMale: number;
  failFemale: number;
};

export type FinanceChartAnalysis = {
  academicYearId: number;
  academicYearName: string;
  academicYearStartDate: string;
  isCurrentAcademicYear: boolean;
  semester: string;
  subjectId: number;
  subjectName: string;
  summary: FinanceChartSummary;
};

type PerformanceCategory =
  | "EXCELLENT"
  | "VERY_GOOD"
  | "AVERAGE"
  | "POOR"
  | "FAIL";

type Props = {
  analyses: FinanceChartAnalysis[];
};

const categoryOptions: {
  value: PerformanceCategory;
  label: string;
}[] = [
  { value: "EXCELLENT", label: "Excellent" },
  { value: "VERY_GOOD", label: "Very Good" },
  { value: "AVERAGE", label: "Average" },
  { value: "POOR", label: "Poor" },
  { value: "FAIL", label: "Fail" },
];

const categoryFields: Record<
  PerformanceCategory,
  { male: keyof FinanceChartSummary; female: keyof FinanceChartSummary }
> = {
  EXCELLENT: {
    male: "excellentMale",
    female: "excellentFemale",
  },
  VERY_GOOD: {
    male: "veryGoodMale",
    female: "veryGoodFemale",
  },
  AVERAGE: {
    male: "averageMale",
    female: "averageFemale",
  },
  POOR: {
    male: "poorMale",
    female: "poorFemale",
  },
  FAIL: {
    male: "failMale",
    female: "failFemale",
  },
};

const semesterLabels: Record<string, string> = {
  SEMESTER1: "Semester 1",
  SEMESTER2: "Semester 2",
};

const FinanceChart = ({ analyses }: Props) => {
  const [selectedYearId, setSelectedYearId] = useState<number | "">("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | "">("");
  const [category, setCategory] =
    useState<PerformanceCategory>("EXCELLENT");

  const academicYears = useMemo(() => {
    const uniqueYears = new Map<
      number,
      {
        id: number;
        name: string;
        startDate: string;
        isCurrent: boolean;
      }
    >();

    for (const analysis of analyses) {
      if (!uniqueYears.has(analysis.academicYearId)) {
        uniqueYears.set(analysis.academicYearId, {
          id: analysis.academicYearId,
          name: analysis.academicYearName,
          startDate: analysis.academicYearStartDate,
          isCurrent: analysis.isCurrentAcademicYear,
        });
      }
    }

    return Array.from(uniqueYears.values()).sort(
      (a, b) =>
        new Date(b.startDate).getTime() -
        new Date(a.startDate).getTime()
    );
  }, [analyses]);

  const defaultYear =
    academicYears.find((year) => year.isCurrent) ?? academicYears[0];

  const activeYear =
    academicYears.find((year) => year.id === selectedYearId) ??
    defaultYear;

  const subjects = useMemo(() => {
    const uniqueSubjects = new Map<number, string>();

    for (const analysis of analyses) {
      if (analysis.academicYearId === activeYear?.id) {
        uniqueSubjects.set(analysis.subjectId, analysis.subjectName);
      }
    }

    return Array.from(uniqueSubjects, ([id, name]) => ({ id, name })).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [analyses, activeYear?.id]);

  const activeSubjectId =
    subjects.find((subject) => subject.id === selectedSubjectId)?.id ??
    subjects[0]?.id;

  const chartData = useMemo(() => {
    if (!activeYear || activeSubjectId === undefined) {
      return [];
    }

    const fields = categoryFields[category];

    return ["SEMESTER1", "SEMESTER2"].flatMap((semester) => {
      const analysis = analyses.find(
        (item) =>
          item.academicYearId === activeYear.id &&
          item.subjectId === activeSubjectId &&
          item.semester === semester
      );

      // Don't fabricate a zero when no saved analysis exists.
      if (!analysis) {
        return [];
      }

      return [
        {
          name: semesterLabels[semester] ?? semester,
          male: analysis.summary[fields.male],
          female: analysis.summary[fields.female],
        },
      ];
    });
  }, [analyses, activeYear, activeSubjectId, category]);

  const selectClass =
    "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="bg-red-100 rounded-xl w-full h-full min-w-0 p-4">
      <div className="flex justify-between items-center gap-3">
        <h1 className="text-lg font-semibold">
          Whole-School Performance
        </h1>

        <Image
          src="/moreDark.png"
          alt=""
          width={20}
          height={20}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Academic year
          <select
            className={selectClass}
            value={activeYear?.id ?? ""}
            onChange={(event) =>
              setSelectedYearId(
                event.target.value ? Number(event.target.value) : ""
              )
            }
          >
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.name}
                {year.isCurrent ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Subject
          <select
            className={selectClass}
            value={activeSubjectId ?? ""}
            onChange={(event) =>
              setSelectedSubjectId(
                event.target.value ? Number(event.target.value) : ""
              )
            }
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Performance category
          <select
            className={selectClass}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as PerformanceCategory)
            }
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 h-[calc(100%-115px)] min-h-[230px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-600">
            {analyses.length === 0
              ? "No saved whole-school overall performance analyses were found."
              : "No saved overall analysis is available for this subject and academic year."}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 30,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />

              <XAxis
                dataKey="name"
                tick={{ fill: "darkgray", fontSize: 12 }}
                tickLine={false}
                tickMargin={10}
              />

              <YAxis
                allowDecimals={false}
                domain={[0, "auto"]}
                tick={{ fill: "darkgray", fontSize: 12 }}
                tickLine={false}
                tickMargin={10}
              />

              <Tooltip />
              <Legend
                align="center"
                verticalAlign="top"
                wrapperStyle={{
                  paddingTop: "5px",
                  paddingBottom: "15px",
                }}
              />

              <Line
                type="monotone"
                dataKey="male"
                name="Male"
                stroke="#ffc701"
                strokeWidth={4}
                activeDot={{ r: 6 }}
              />

              <Line
                type="monotone"
                dataKey="female"
                name="Female"
                stroke="#013567"
                strokeWidth={4}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default FinanceChart;