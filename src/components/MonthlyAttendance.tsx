
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
  present: boolean;
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

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, boolean>
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

        const attendanceMap: Record<string, boolean> = {};

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

  const toggleAttendance = (
    studentId: string,
    date: string
  ) => {
    setAttendance((previous) => ({
      ...previous,
      [`${studentId}_${date}`]:
        !(previous[`${studentId}_${date}`] ?? false),
    }));
  };

  const handleSave = () => {
    if (!selectedClassId) {
      toast.error("Please select a class.");
      return;
    }

    const records: AttendanceRecord[] = [];
    

    for (const student of students) {
      for (const day of days) {
        records.push({
          studentId: student.id,
          date: day.key,
          present:
            attendance[
              `${student.id}_${day.key}`
            ] ?? false,
        });
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

            <select
              value={selectedClassId}
              onChange={(e) =>
                setSelectedClassId(
                  e.target.value
                    ? Number(e.target.value)
                    : ""
                )
              }
              disabled={role === "teacher" && classes.length === 1}
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
          </div>

          {/* MONTH */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Month
            </label>

            <input
              type="month"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value)
              }
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
            />
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

                {days.map((day) => (
                  <th
                    key={day.key}
                    className="p-2 text-center min-w-[45px]"
                  >
                    {day.day}
                  </th>
                ))}
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

                    const present =
                      getAttendance(
                        student.id,
                        day.key
                      ) ?? false;

                    return (
                      <td
                        key={key}
                        className="p-2 text-center"
                      >
                        <input
                          type="checkbox"
                          checked={present}
                          onChange={() =>
                            toggleAttendance(
                              student.id,
                              day.key
                            )
                          }
                          className="w-4 h-4"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
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

