"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { saveMonthlyAttendance } from "@/lib/actions";
import { calculateAttendanceSummary } from "@/lib/attendance";


type StudentRow = {
  id: string;
  name: string;
  surname: string;
};

type Props = {
  role: "admin" | "teacher" | "student" | "parent";
  classes: {
    id: number;
    name: string;
  }[];
  initialClassId?: number;
};

export default function MonthlyAttendance({
  role,
  classes,
  initialClassId,
}: Props) {
  const isStudent = role === "student";
  const isParent = role === "parent";
  const canEditAttendance =
    role === "admin" || role === "teacher";
  const viewOnly = isStudent || isParent;

  const [selectedClassId, setSelectedClassId] =
    useState<number | null>(
      initialClassId ?? classes[0]?.id ?? null
    );

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  const [students, setStudents] = useState<StudentRow[]>([]);

  const [attendance, setAttendance] = useState<
    Record<string, Record<string, boolean | null>>
  >({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const monthDate = useMemo(
    () => new Date(`${selectedMonth}-01T00:00:00`),
    [selectedMonth]
  );

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const daysInMonth = new Date(
    year,
    month + 1,
    0
  ).getDate();

  const days = useMemo(() => {
    return Array.from(
      { length: daysInMonth },
      (_, index) => {
        const date = new Date(
          year,
          month,
          index + 1
        );

        const dayOfWeek = date.getDay();

        return {
          day: index + 1,
          date: `${year}-${String(month + 1).padStart(
            2,
            "0"
          )}-${String(index + 1).padStart(2, "0")}`,
          weekday: date.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
            }
          ),

          // Saturday = 6
          // Sunday = 0
          isWeekend:
            dayOfWeek === 0 || dayOfWeek === 6,
        };
      }
    );
  }, [year, month, daysInMonth]);

  const formattedMonth = monthDate.toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  useEffect(() => {
    if (!selectedClassId) return;

    const loadAttendance = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/attendance?classId=${selectedClassId}&month=${selectedMonth}`
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load attendance."
          );
        }

        const data = await response.json();

        setStudents(data.students ?? []);

        const attendanceMap: Record<
          string,
          Record<string, boolean | null>
        > = {};

        for (const student of data.students ?? []) {
          attendanceMap[student.id] = {};

          for (const day of days) {
            attendanceMap[student.id][day.date] =
              day.isWeekend
                ? null
                : null;
          }
        }

        for (const record of data.attendance ?? []) {
          const day = days.find(
            (item) => item.date === record.date
          );

          // Never load attendance into weekend cells.
          if (day?.isWeekend) continue;

          if (!attendanceMap[record.studentId]) {
            attendanceMap[record.studentId] = {};
          }

          attendanceMap[record.studentId][record.date] =
            record.present;
        }

        setAttendance(attendanceMap);
      } catch (error) {
        console.error(error);

        toast.error(
          "Failed to load attendance."
        );
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [selectedClassId, selectedMonth, days]);

  const previousMonth = () => {
    const previous = new Date(
      year,
      month - 1,
      1
    );

    setSelectedMonth(
      `${previous.getFullYear()}-${String(
        previous.getMonth() + 1
      ).padStart(2, "0")}`
    );
  };

  const nextMonth = () => {
    const next = new Date(
      year,
      month + 1,
      1
    );

    setSelectedMonth(
      `${next.getFullYear()}-${String(
        next.getMonth() + 1
      ).padStart(2, "0")}`
    );
  };

  const toggleAttendance = (
    studentId: string,
    date: string
  ) => {
    if (viewOnly) return;

    const day = days.find(
      (item) => item.date === date
    );

    // Weekends cannot be marked.
    if (day?.isWeekend) return;

    setAttendance((previous) => {
      const currentValue =
        previous[studentId]?.[date] ?? null;

      let nextValue: boolean | null;

      if (currentValue === null) {
        nextValue = true;
      } else if (currentValue === true) {
        nextValue = false;
      } else {
        nextValue = null;
      }

      return {
        ...previous,
        [studentId]: {
          ...previous[studentId],
          [date]: nextValue,
        },
      };
    });
  };

  const markAllPresent = (date: string) => {
    if (!canEditAttendance) return;

    const day = days.find(
      (item) => item.date === date
    );

    // Weekends cannot be marked.
    if (day?.isWeekend) return;

    setAttendance((previous) => {
      const updated = { ...previous };

      for (const student of students) {
        updated[student.id] = {
          ...updated[student.id],
          [date]: true,
        };
      }

      return updated;
    });
  };

  const saveAttendance = async () => {
    if (
      !canEditAttendance ||
      !selectedClassId
    ) {
      return;
    }

    try {
      setSaving(true);

      const records = students.flatMap(
        (student) =>
          days
            // Never save weekends.
            .filter(
              (day) =>
                !day.isWeekend &&
                attendance[student.id]?.[
                  day.date
                ] !== null
            )
            .map((day) => ({
              studentId: student.id,
              date: day.date,
              present:
                attendance[student.id][day.date]!,
            }))
      );

      const result =
        await saveMonthlyAttendance(
          {
            success: false,
            error: false,
          },
          {
            classId: selectedClassId,
            attendance: records,
          }
        );

      if (result.success) {
        toast.success(
          "Attendance saved successfully."
        );
      } else {
        toast.error(
          "Failed to save attendance."
        );
      }
    } catch (error) {
      console.error(
        "SAVE ATTENDANCE ERROR:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">
          Monthly Attendance
        </h1>

        <div className="flex items-center gap-3">
          <select
            value={selectedClassId ?? ""}
            onChange={(e) =>
              setSelectedClassId(
                e.target.value
                  ? Number(e.target.value)
                  : null
              )
            }
            className="border rounded-md px-3 py-2 text-sm"
          >
            {classes.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={previousMonth}
            className="border rounded-md px-3 py-2 text-sm"
          >
            Previous
          </button>

          <div className="font-medium min-w-[130px] text-center">
            {formattedMonth}
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="border rounded-md px-3 py-2 text-sm"
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-500">
          Loading attendance...
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 text-left min-w-[180px]">
                    Student
                  </th>

                  <th className="border p-2 text-left min-w-[100px]">
                    ID
                  </th>

                  {days.map((day) => (
                    <th
                      key={day.date}
                      className={`border p-1 text-center min-w-[48px] ${
                        day.isWeekend
                          ? "bg-gray-200 text-gray-400"
                          : ""
                      }`}
                    >
                      <div className="text-xs font-semibold">
                        {day.day}
                      </div>

                      <div className="text-[10px] text-gray-500">
                        {day.weekday}
                      </div>

                      {canEditAttendance && (
                        <button
                          type="button"
                          title={
                            day.isWeekend
                              ? "Weekend"
                              : "Mark all present"
                          }
                          disabled={
                            day.isWeekend
                          }
                          onClick={() =>
                            markAllPresent(
                              day.date
                            )
                          }
                          className={`mt-1 font-bold ${
                            day.isWeekend
                              ? "text-gray-300 cursor-not-allowed"
                              : "text-green-600"
                          }`}
                        >
                          ✓
                        </button>
                      )}
                    </th>
                  ))}

                  <th className="border p-2 text-center">
                    Present
                  </th>

                  <th className="border p-2 text-center">
                    Absent
                  </th>

                  <th className="border p-2 text-center">
                    %
                  </th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => {
                  const studentAttendance =
                    attendance[student.id] ?? {};

                  const attendanceRecords = days
                    .filter((day) => !day.isWeekend)
                    .map((day) => ({
                      date: day.date,
                      present:
                        studentAttendance[day.date] ??
                        null,
                    }))
                    .filter(
                      (
                        record
                      ): record is {
                        date: string;
                        present: boolean;
                      } =>
                        record.present !== null
                    );

                  const totals =
                    calculateAttendanceSummary(
                      attendanceRecords
                    );

                  const percentage =
                    totals.percentage.toFixed(2);
                  return (
                    <tr key={student.id}>
                      <td className="border p-2">
                        {student.name}{" "}
                        {student.surname}
                      </td>

                      <td className="border p-2">
                        {student.id}
                      </td>

                      {days.map((day) => {
                        const value =
                          studentAttendance[
                            day.date
                          ] ?? null;

                        // Weekend cells are always
                        // disabled and gray.
                        if (day.isWeekend) {
                          return (
                            <td
                              key={day.date}
                              className="border p-1 text-center bg-gray-200"
                            >
                              <button
                                type="button"
                                disabled
                                className="w-full h-8 text-gray-400 cursor-not-allowed"
                              >
                                -
                              </button>
                            </td>
                          );
                        }

                        const label =
                          value === true
                            ? "✓"
                            : value === false
                            ? "X"
                            : "-";

                        const cellClass =
                          value === true
                            ? "text-green-600 font-bold"
                            : value === false
                            ? "text-red-600 font-bold"
                            : "text-gray-400";

                        return (
                          <td
                            key={day.date}
                            className="border p-1 text-center"
                          >
                            <button
                              type="button"
                              disabled={viewOnly}
                              onClick={() =>
                                toggleAttendance(
                                  student.id,
                                  day.date
                                )
                              }
                              className={`w-full h-8 ${cellClass} ${
                                viewOnly
                                  ? "cursor-default"
                                  : "cursor-pointer"
                              }`}
                            >
                              {label}
                            </button>
                          </td>
                        );
                      })}

                      <td className="border p-2 text-center text-green-600 font-semibold">
                        {totals.present}
                      </td>

                      <td className="border p-2 text-center text-red-600 font-semibold">
                        {totals.absent}
                      </td>

                      <td className="border p-2 text-center font-semibold">
                        {percentage}%
                      </td>
                    </tr>
                  );
                })}

                <tr>
                  <td
                    colSpan={2}
                    className="border p-2 font-semibold text-right"
                  >
                    Daily Totals
                  </td>

                  {days.map((day) => {
                    if (day.isWeekend) {
                      return (
                        <td
                          key={day.date}
                          className="border p-1 text-center bg-gray-200 text-gray-400"
                        >
                          -
                        </td>
                      );
                    }

                    let present = 0;
                    let absent = 0;

                    for (const student of students) {
                      const value =
                        attendance[
                          student.id
                        ]?.[day.date] ?? null;

                      if (value === true)
                        present++;

                      if (value === false)
                        absent++;
                    }

                    return (
                      <td
                        key={day.date}
                        className="border p-1 text-center text-xs"
                      >
                        <div className="text-green-600">
                          P:{present}
                        </div>

                        <div className="text-red-600">
                          A:{absent}
                        </div>
                      </td>
                    );
                  })}

                  <td
                    colSpan={3}
                    className="border"
                  />
                </tr>
              </tbody>
            </table>
          </div>

          {canEditAttendance && (
            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={saveAttendance}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Attendance"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}