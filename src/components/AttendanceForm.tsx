"use client";

import { useState } from "react";

type Student = {
  id: string;
  name: string;
  surname: string;
};

type AttendanceRecord = {
  studentId: string;
  present: boolean;
};

const AttendanceForm = ({
  students,
  lessonId,
  existingAttendance,
}: {
  students: Student[];
  lessonId: number;
  existingAttendance: AttendanceRecord[];
}) => {
  const initialState: Record<string, boolean> = {};

  students.forEach((student) => {
    const record = existingAttendance.find(
      (a) => a.studentId === student.id
    );
    initialState[student.id] = record ? record.present : false;
  });

  const [attendance, setAttendance] = useState(initialState);

  const handleChange = (studentId: string, value: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const handleSubmit = async () => {
    await fetch("/api/attendance", {
      method: "POST",
      body: JSON.stringify({ attendance, lessonId }),
    });

    alert("Attendance saved");
  };

  return (
    <div>
      {students.map((student) => (
        <div
          key={student.id}
          className="flex justify-between items-center border-b py-2"
        >
          <span>
            {student.name} {student.surname}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => handleChange(student.id, true)}
              className={`px-3 py-1 rounded ${
                attendance[student.id]
                  ? "bg-green-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              Present
            </button>

            <button
              onClick={() => handleChange(student.id, false)}
              className={`px-3 py-1 rounded ${
                !attendance[student.id]
                  ? "bg-red-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              Absent
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save Attendance
      </button>
    </div>
  );
};

export default AttendanceForm;