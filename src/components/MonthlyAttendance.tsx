
"use client";

import { useEffect, useMemo, useState } from "react";
import { saveMonthlyAttendance } from "@/lib/actions";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";

type ClassItem = {
  id: number;
  name: string;
};

type Student = {
  id: string;
  name: string;
  surname: string;
  classId: number;
};

type AttendanceRecord = {
  studentId: string;
  date: string;
  present: boolean | null;
};

type MonthlyAttendanceProps = {
  classes: ClassItem[];
  role: string;
};

const MonthlyAttendance = ({
  classes,
  role,
}: MonthlyAttendanceProps) => {
  const [selectedClassId, setSelectedClassId] = useState<number | "">(
    classes.length === 1 ? classes[0].id : ""
  );

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

  const goToPreviousMonth = () => {
      const [year, month] = selectedMonth.split("-").map(Number);

      const date = new Date(year, month - 2, 1);

      setSelectedMonth(
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`
      );
    };

    const goToNextMonth = () => {
      const [year, month] = selectedMonth.split("-").map(Number);

      const date = new Date(year, month, 1);

      setSelectedMonth(
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}`
      );
    };

    const formattedMonth = useMemo(() => {
      if (!selectedMonth) return "";

      const [year, month] = selectedMonth.split("-").map(Number);

      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(year, month - 1, 1));
    }, [selectedMonth]);

    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<
      Record<string, boolean | null>
    >({});

      const [loading, setLoading] = useState(false);

      const [state, formAction] = useFormState(
        saveMonthlyAttendance,
        {
          success: false,
          error: false,
        }
      );

      const days = useMemo(() => {
        if (!selectedMonth) return [];

        const [year, month] = selectedMonth.split("-").map(Number);

        const numberOfDays = new Date(
          year,
          month,
          0
        ).getDate();

        return Array.from({ length: numberOfDays }, (_, index) => {
          const date = new Date(
            year,
            month - 1,
            index + 1
          );

          return {
            date,
            key: `${year}-${String(month).padStart(2, "0")}-${String(
              index + 1
            ).padStart(2, "0")}`,
            day: index + 1,
          };
        });
      }, [selectedMonth]);

  useEffect(() => {
    const loadAttendanceData = async () => {
      if (!selectedClassId || !selectedMonth) {
        setStudents([]);
        setAttendance({});
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `/api/attendance?classId=${selectedClassId}&month=${selectedMonth}`
        );

        if (!response.ok) {
          throw new Error("Failed to load attendance");
        }

        const data = await response.json();

        setStudents(data.students);

        const attendanceMap: Record<string, boolean | null> = {};

          for (const record of data.attendance) {
            attendanceMap[
              `${record.studentId}_${record.date}`
            ] = record.present;
          }

          setAttendance(attendanceMap);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load attendance.");
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceData();
  }, [selectedClassId, selectedMonth]);

  useEffect(() => {
    if (state.success) {
      toast.success("Attendance has been saved!");
    }

    if (state.error) {
      toast.error(
        "Something went wrong while saving attendance."
      );
    }
  }, [state]);

  const getAttendance = (
    studentId: string,
    date: string
  ) => {
    return attendance[
      `${studentId}_${date}`
    ];
  };

  const getDailyTotals = (date: string) => {
      let present = 0;
      let absent = 0;

      for (const student of students) {
        const value = getAttendance(student.id, date);

        if (value === true) {
          present++;
        } else if (value === false) {
          absent++;
        }
      }

      return { present, absent };
    };

    const getStudentTotals = (studentId: string) => {
      let present = 0;
      let absent = 0;

      for (const day of days) {
        const dayOfWeek = day.date.getDay();

        // Don't count weekends
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        const value = getAttendance(studentId, day.key);

        if (value === true) {
          present++;
        } else if (value === false) {
          absent++;
        }
      }

      const recorded = present + absent;

      const percentage =
        recorded > 0
          ? (present / recorded) * 100
          : 0;

      return {
        present,
        absent,
        percentage,
      };
    };

  const toggleAttendance = (
      studentId: string,
      date: string
    ) => {
      const key = `${studentId}_${date}`;

      setAttendance((previous) => {
        const current = previous[key];

        let next: boolean | null;

        if (current === null || current === undefined) {
          // Not recorded → Present
          next = true;
        } else if (current === true) {
          // Present → Absent
          next = false;
        } else {
          // Absent → Not recorded
          next = null;
        }

        return {
          ...previous,
          [key]: next,
        };
      });
    };

    const markAllPresent = (date: string) => {
      setAttendance((previous) => {
        const updated = { ...previous };

        for (const student of students) {
          updated[`${student.id}_${date}`] = true;
        }

        return updated;
      });
    };

  const handleSave = () => {
    if (!selectedClassId) {
      toast.error("Please select a class.");
      return;
    }

    const records: AttendanceRecord[] = [];
    

    for (const student of students) {
      for (const day of days) {
        const key = `${student.id}_${day.key}`;

        // Only send cells that have been explicitly recorded
        // or explicitly changed back to "not recorded".
        if (key in attendance) {
          records.push({
            studentId: student.id,
            date: day.key,
            present: attendance[key],
          });
        }
      }
    }

    formAction({
      classId: selectedClassId,
      attendance: records,
    });
  };
 

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-xl font-semibold">
          Monthly Attendance
        </h1>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* CLASS */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Class
            </label>

            {role === "teacher" && classes.length === 1 ? (
              <div className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px] bg-gray-50">
                {classes[0].name}
              </div>
            ) : (
              <select
                value={selectedClassId}
                onChange={(e) =>
                  setSelectedClassId(
                    e.target.value
                      ? Number(e.target.value)
                      : ""
                  )
                }
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm min-w-[180px]"
              >
                <option value="">
                  Select Class
                </option>

                {classes.map((classItem) => (
                  <option
                    value={classItem.id}
                    key={classItem.id}
                  >
                    {classItem.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* MONTH NAVIGATION */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Month
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="px-3 py-2 border rounded-md hover:bg-gray-100"
                title="Previous month"
              >
                ←
              </button>

              <div className="min-w-[150px] text-center font-medium text-sm">
                {formattedMonth}
              </div>

              <button
                type="button"
                onClick={goToNextMonth}
                className="px-3 py-2 border rounded-md hover:bg-gray-100"
                title="Next month"
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ATTENDANCE TABLE */}
      {!selectedClassId ? (
        <div className="text-gray-500 text-sm p-6 text-center">
          Please select a class to view attendance.
        </div>
      ) : loading ? (
        <div className="text-gray-500 text-sm p-6 text-center">
          Loading attendance...
        </div>
      ) : students.length === 0 ? (
        <div className="text-gray-500 text-sm p-6 text-center">
          No students found in this class.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="sticky left-0 bg-gray-100 p-3 text-left min-w-[180px]">
                  Student
                </th>

                {days.map((day) => {
                const dayOfWeek = day.date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <th
                    key={day.key}
                    className={`p-1 text-center min-w-[50px] ${
                      isWeekend
                        ? "bg-gray-200 text-gray-400"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span>{day.day}</span>

                      <button
                        type="button"
                        disabled={isWeekend || students.length === 0}
                        onClick={() => markAllPresent(day.key)}
                        className={`w-6 h-6 rounded text-xs font-bold ${
                          isWeekend
                            ? "bg-gray-300 text-gray-400 cursor-not-allowed"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                        title={
                          isWeekend
                            ? "Weekend"
                            : "Mark all students present"
                        }
                      >
                        ✓
                      </button>
                    </div>
                  </th>
                );
              })}

              <th className="p-2 text-center min-w-[75px] bg-gray-100">
                    Present
                  </th>

                  <th className="p-2 text-center min-w-[70px] bg-gray-100">
                    Absent
                  </th>

                  <th className="p-2 text-center min-w-[90px] bg-gray-100">
                    Attendance
                  </th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="sticky left-0 bg-white p-3 font-medium">
                    {student.name} {student.surname}
                  </td>

                  {days.map((day) => {
                      const key = `${student.id}_${day.key}`;

                      const present = getAttendance(
                        student.id,
                        day.key
                      );

                      const dayOfWeek = day.date.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;


                      return (
                      <td
                          key={key}
                          className={`p-2 text-center ${
                            isWeekend ? "bg-gray-100" : ""
                          }`}
                        >
                        <button
                            type="button"
                            disabled={isWeekend}
                            onClick={() => {
                              if (!isWeekend) {
                                toggleAttendance(
                                  student.id,
                                  day.key
                                );
                              }
                            }}
                            className={`w-7 h-7 rounded-md font-semibold text-sm ${
                              isWeekend
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : present === true
                                ? "bg-green-100 text-green-700"
                                : present === false
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            }`}
                            title={
                              isWeekend
                                ? "Weekend"
                                : present === true
                                ? "Present"
                                : present === false
                                ? "Absent"
                                : "Not recorded"
                            }
                          >
                            {isWeekend
                              ? "–"
                              : present === true
                              ? "✓"
                              : present === false
                              ? "✗"
                              : "–"}
                          </button>
                      </td>
                    );
                  })}

                  {/* STUDENT TOTALS */}
                    {(() => {
                    const totals = getStudentTotals(student.id);

                    return (
                      <>
                        <td className="p-2 text-center font-semibold">
                          {totals.present}
                        </td>

                        <td className="p-2 text-center font-semibold">
                          {totals.absent}
                        </td>

                        <td className="p-2 text-center font-semibold">
                          {totals.percentage.toFixed(1)}%
                        </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
              {/* DAILY TOTALS */}
              <tr className="border-t-2 bg-green-50">
                <td className="sticky left-0 bg-green-50 p-3 font-semibold">
                  Present
                </td>

                {days.map((day) => {
                  const dayOfWeek = day.date.getDay();
                  const isWeekend =
                    dayOfWeek === 0 || dayOfWeek === 6;

                  const { present } = getDailyTotals(day.key);

                  return (
                    <td
                      key={day.key}
                      className={`p-2 text-center font-semibold ${
                        isWeekend ? "bg-gray-200 text-gray-400" : ""
                      }`}
                    >
                      {isWeekend ? "–" : present}
                    </td>
                  );
                })}
              </tr>

              <tr className="bg-red-50">
                <td className="sticky left-0 bg-red-50 p-3 font-semibold">
                  Absent
                </td>

                {days.map((day) => {
                  const dayOfWeek = day.date.getDay();
                  const isWeekend =
                    dayOfWeek === 0 || dayOfWeek === 6;

                  const { absent } = getDailyTotals(day.key);

                  return (
                    <td
                      key={day.key}
                      className={`p-2 text-center font-semibold ${
                        isWeekend ? "bg-gray-200 text-gray-400" : ""
                      }`}
                    >
                      {isWeekend ? "–" : absent}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* SAVE */}
      {selectedClassId && students.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="bg-badirBlue text-white px-6 py-2 rounded-md"
          >
            Save Attendance
          </button>
        </div>
      )}
    </div>
  );
};

export default MonthlyAttendance;

