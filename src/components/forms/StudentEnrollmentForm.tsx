"use client";

import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import {
  createStudentEnrollment,
  updateStudentEnrollment,
} from "@/lib/actions";

type StudentEnrollmentFormProps = {
  type: "create" | "update";
  data?: any;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  relatedData?: {
    academicYears?: {
      id: number;
      name: string;
      isCurrent: boolean;
    }[];
    grades?: {
      id: number;
      level: number;
      name: string;
      section: string;
    }[];
    classes?: {
      id: number;
      name: string;
      capacity: number;
      gradeId: number;
    }[];
    students?: {
      id: string;
      name: string;
      surname: string;
    }[];
    enrollments?: {
      id?: number;
      studentId: string;
      academicYearId: number;
      classId?: number;
      rollNumber?: number;
    }[];
  };
};

const initialState = {
  success: false,
  error: false,
};

const StudentEnrollmentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: StudentEnrollmentFormProps) => {
  const isUpdate = type === "update";

  const academicYears = relatedData?.academicYears ?? [];
  const grades = relatedData?.grades ?? [];
  const classes = relatedData?.classes ?? [];
  const students = relatedData?.students ?? [];
  const enrollments = relatedData?.enrollments ?? [];

  // ------------------------------------------------------------
  // ACADEMIC YEAR
  // ------------------------------------------------------------

  const [academicYearId, setAcademicYearId] = useState<string>(
    data?.academicYearId?.toString() ??
      academicYears
        .find((year) => year.isCurrent)
        ?.id.toString() ??
      ""
  );

  // ------------------------------------------------------------
  // INITIAL CLASS / GRADE
  // ------------------------------------------------------------

  const initialClassId = data?.classId?.toString() ?? "";

  const initialClass = classes.find(
    (item) => item.id === Number(initialClassId)
  );

  const [gradeId, setGradeId] = useState<string>(
    initialClass?.gradeId?.toString() ?? ""
  );

  const [classId, setClassId] = useState<string>(
    initialClassId
  );

  // ------------------------------------------------------------
  // STUDENT
  // ------------------------------------------------------------

  const [studentId, setStudentId] = useState<string>(
    data?.studentId?.toString() ?? ""
  );

  // ------------------------------------------------------------
  // ROLL NUMBER
  //
  // CREATE:
  //   Automatically calculated.
  //
  // UPDATE:
  //   Existing roll number is loaded and can be edited.
  // ------------------------------------------------------------

  const [rollNumber, setRollNumber] = useState<string>(
    isUpdate && data?.rollNumber != null
      ? data.rollNumber.toString()
      : ""
  );

  // ------------------------------------------------------------
  // FILTER CLASSES BY GRADE
  // ------------------------------------------------------------

  const filteredClasses = useMemo(() => {
    if (!gradeId) {
      return [];
    }

    return classes.filter(
      (item) => item.gradeId === Number(gradeId)
    );
  }, [classes, gradeId]);

  // ------------------------------------------------------------
  // FILTER STUDENTS
  //
  // IMPORTANT:
  // Student no longer has gradeId/classId.
  //
  // CREATE:
  //   Show all students who are NOT already enrolled
  //   in the selected academic year.
  //
  // UPDATE:
  //   Show only the existing enrolled student.
  // ------------------------------------------------------------

  const filteredStudents = useMemo(() => {
    // ----------------------------------------------------------
    // UPDATE
    //
    // Student cannot be changed during update.
    // ----------------------------------------------------------

    if (isUpdate) {
      return students.filter(
        (student) => student.id === studentId
      );
    }

    // ----------------------------------------------------------
    // CREATE
    //
    // No grade filtering here.
    //
    // A newly created student does not have a grade yet.
    // The enrollment itself assigns the student to the
    // selected class, and the class determines the grade.
    // ----------------------------------------------------------

    if (!academicYearId) {
      return [];
    }

    const enrolledStudentIds = new Set(
      enrollments
        .filter(
          (enrollment) =>
            enrollment.academicYearId ===
            Number(academicYearId)
        )
        .map(
          (enrollment) =>
            enrollment.studentId
        )
    );

    return students.filter(
      (student) =>
        !enrolledStudentIds.has(student.id)
    );
  }, [
    students,
    academicYearId,
    enrollments,
    isUpdate,
    studentId,
  ]);

  // ------------------------------------------------------------
  // SELECTED CLASS
  // ------------------------------------------------------------

  const selectedClass = useMemo(() => {
    return classes.find(
      (item) => item.id === Number(classId)
    );
  }, [classes, classId]);

  // ------------------------------------------------------------
  // NEXT ROLL NUMBER
  //
  // ONLY USED WHEN CREATING.
  //
  // The next roll number is calculated from enrollments
  // belonging to the selected academic year and class.
  // ------------------------------------------------------------

  const nextRollNumber = useMemo(() => {
    if (isUpdate) {
      return null;
    }

    if (!classId || !academicYearId) {
      return null;
    }

    const classEnrollments = enrollments.filter(
      (enrollment) =>
        enrollment.academicYearId ===
          Number(academicYearId) &&
        enrollment.classId === Number(classId)
    );

    if (classEnrollments.length === 0) {
      return 1;
    }

    const rollNumbers = classEnrollments
      .map((enrollment) =>
        Number(enrollment.rollNumber)
      )
      .filter(
        (rollNumber) =>
          !Number.isNaN(rollNumber)
      );

    if (rollNumbers.length === 0) {
      return 1;
    }

    return Math.max(...rollNumbers) + 1;
  }, [
    classId,
    academicYearId,
    enrollments,
    isUpdate,
  ]);

  // ------------------------------------------------------------
  // ACADEMIC YEAR CHANGE
  // ------------------------------------------------------------

  const handleAcademicYearChange = (
    value: string
  ) => {
    setAcademicYearId(value);

    if (!isUpdate) {
      setGradeId("");
      setClassId("");
      setStudentId("");
    }
  };

  // ------------------------------------------------------------
  // GRADE CHANGE
  // ------------------------------------------------------------

  const handleGradeChange = (
    value: string
  ) => {
    setGradeId(value);
    setClassId("");

    if (!isUpdate) {
      setStudentId("");
    }
  };

  // ------------------------------------------------------------
  // CLASS CHANGE
  // ------------------------------------------------------------

  const handleClassChange = (
    value: string
  ) => {
    setClassId(value);
  };

  // ------------------------------------------------------------
  // SUBMIT
  // ------------------------------------------------------------

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    // ----------------------------------------------------------
    // ACADEMIC YEAR VALIDATION
    // ----------------------------------------------------------

    if (!academicYearId) {
      toast.error(
        "Please select an academic year."
      );
      return;
    }

    // ----------------------------------------------------------
    // GRADE VALIDATION
    // ----------------------------------------------------------

    if (!gradeId) {
      toast.error(
        "Please select a grade."
      );
      return;
    }

    // ----------------------------------------------------------
    // CLASS VALIDATION
    // ----------------------------------------------------------

    if (!classId) {
      toast.error(
        "Please select a class."
      );
      return;
    }

    // ----------------------------------------------------------
    // STUDENT VALIDATION
    // ----------------------------------------------------------

    if (!isUpdate && !studentId) {
      toast.error(
        "Please select a student."
      );
      return;
    }

    // ----------------------------------------------------------
    // ROLL NUMBER VALIDATION
    //
    // Roll number is manually editable only during update.
    // During creation, the server assigns it automatically.
    // ----------------------------------------------------------

    if (isUpdate) {
      const parsedRollNumber =
        Number(rollNumber);

      if (
        !rollNumber ||
        !Number.isInteger(parsedRollNumber) ||
        parsedRollNumber < 1
      ) {
        toast.error(
          "Please enter a valid roll number."
        );
        return;
      }
    }

    // ----------------------------------------------------------
    // PAYLOAD
    //
    // IMPORTANT:
    // StudentEnrollment stores:
    //   studentId
    //   academicYearId
    //   classId
    //   rollNumber
    //
    // It does NOT store gradeId.
    //
    // Grade is determined through:
    //
    // StudentEnrollment
    //      ↓
    //    Class
    //      ↓
    //    Grade
    // ----------------------------------------------------------

    const payload = {
      ...(isUpdate && data?.id
        ? {
            id: Number(data.id),
          }
        : {}),

      studentId,

      academicYearId:
        Number(academicYearId),

      classId:
        Number(classId),

      ...(isUpdate
        ? {
            rollNumber:
              Number(rollNumber),
          }
        : {}),
    };

    // ----------------------------------------------------------
    // SUBMIT
    // ----------------------------------------------------------

    try {
      const result = isUpdate
        ? await updateStudentEnrollment(
            initialState,
            payload
          )
        : await createStudentEnrollment(
            initialState,
            payload
          );

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      if (result.success) {
        toast.success(
          isUpdate
            ? "Student enrollment updated successfully!"
            : "Student enrolled successfully!"
        );

        setOpen(false);
        return;
      }

      // --------------------------------------------------------
      // GRADE / CLASS MISMATCH
      // --------------------------------------------------------

      if (
        result.error ===
        "grade-class-mismatch"
      ) {
        toast.error(
          "The selected class does not belong to the selected grade."
        );
        return;
      }

      // --------------------------------------------------------
      // ENROLLMENT CONFLICT
      // --------------------------------------------------------

      if (
        result.error ===
        "enrollment-conflict"
      ) {
        toast.error(
          "Enrollment conflict. The student may already be enrolled or the roll number is already in use."
        );
        return;
      }

      // --------------------------------------------------------
      // STUDENT NOT FOUND
      // --------------------------------------------------------

      if (
        result.error ===
        "student-not-found"
      ) {
        toast.error(
          "Student not found."
        );
        return;
      }

      // --------------------------------------------------------
      // ACADEMIC YEAR NOT FOUND
      // --------------------------------------------------------

      if (
        result.error ===
        "academic-year-not-found"
      ) {
        toast.error(
          "Academic year not found."
        );
        return;
      }

      // --------------------------------------------------------
      // CLASS NOT FOUND
      // --------------------------------------------------------

      if (
        result.error ===
        "class-not-found"
      ) {
        toast.error(
          "Class not found."
        );
        return;
      }

      // --------------------------------------------------------
      // STUDENT ALREADY ENROLLED
      // --------------------------------------------------------

      if (
        result.error ===
        "student-already-enrolled"
      ) {
        toast.error(
          "This student is already enrolled for the selected academic year."
        );
        return;
      }

      if (result.error === "invalid-roll-number") {
        toast.error("Please enter a valid roll number.");
        return;
      }

      // --------------------------------------------------------
      // CLASS FULL
      // --------------------------------------------------------

      if (
        result.error ===
        "class-full"
      ) {
        toast.error(
          "The selected class has reached its capacity."
        );
        return;
      }

      // --------------------------------------------------------
      // FALLBACK
      // --------------------------------------------------------

      toast.error(
        "Something went wrong!"
      );
    } catch (error) {
      console.error(
        "STUDENT ENROLLMENT FORM ERROR:",
        error
      );

      toast.error(
        "Unable to save the student enrollment."
      );
    }
  };

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-8"
    >
      <h1 className="text-xl font-semibold">
        {isUpdate
          ? "Update Student Enrollment"
          : "Enroll Student"}
      </h1>

      {/* ------------------------------------------------------
          ENROLLMENT ID
          ------------------------------------------------------ */}

      {isUpdate && (
        <input
          type="hidden"
          name="id"
          value={data?.id ?? ""}
        />
      )}

      <div className="flex flex-wrap gap-4">

        {/* ----------------------------------------------------
            ACADEMIC YEAR
            ---------------------------------------------------- */}

        <div className="flex flex-col gap-2 w-full md:w-[45%]">
          <label className="text-xs text-gray-500">
            Academic Year
          </label>

          <select
            value={academicYearId}
            onChange={(e) =>
              handleAcademicYearChange(
                e.target.value
              )
            }
            disabled={isUpdate}
            required
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
          >
            <option value="">
              Select academic year
            </option>

            {academicYears.map(
              (year) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                  {year.isCurrent
                    ? " (Current)"
                    : ""}
                </option>
              )
            )}
          </select>
        </div>

        {/* ----------------------------------------------------
            GRADE
            ---------------------------------------------------- */}

        <div className="flex flex-col gap-2 w-full md:w-[45%]">
          <label className="text-xs text-gray-500">
            Grade
          </label>

          <select
            value={gradeId}
            onChange={(e) =>
              handleGradeChange(
                e.target.value
              )
            }
            disabled={!academicYearId}
            required
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
          >
            <option value="">
              Select grade
            </option>

            {grades.map(
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

        {/* ----------------------------------------------------
            CLASS
            ---------------------------------------------------- */}

        <div className="flex flex-col gap-2 w-full md:w-[45%]">
          <label className="text-xs text-gray-500">
            Class
          </label>

          <select
            value={classId}
            onChange={(e) =>
              handleClassChange(
                e.target.value
              )
            }
            disabled={!gradeId}
            required
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
          >
            <option value="">
              Select class
            </option>

            {filteredClasses.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name} — Capacity{" "}
                  {item.capacity}
                </option>
              )
            )}
          </select>
        </div>

        {/* ----------------------------------------------------
            STUDENT
            ---------------------------------------------------- */}

        <div className="flex flex-col gap-2 w-full md:w-[45%]">
          <label className="text-xs text-gray-500">
            Student
          </label>

          <select
            value={studentId}
            onChange={(e) =>
              setStudentId(
                e.target.value
              )
            }
            disabled={
              !gradeId ||
              !academicYearId ||
              isUpdate
            }
            required={!isUpdate}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
          >
            <option value="">
              Select student
            </option>

            {filteredStudents.map(
              (student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.name}{" "}
                  {student.surname}{" "}
                  ({student.id})
                </option>
              )
            )}
          </select>
        </div>

        {/* ----------------------------------------------------
            ROLL NUMBER
            ---------------------------------------------------- */}

        <div className="flex flex-col gap-2 w-full md:w-[45%]">
          <label className="text-xs text-gray-500">
            Roll Number
          </label>

          {isUpdate ? (
            <>
              <input
                type="number"
                min="1"
                step="1"
                value={rollNumber}
                onChange={(e) =>
                  setRollNumber(
                    e.target.value
                  )
                }
                required
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-white"
              />

              <p className="text-[11px] text-gray-400">
                You can change the roll
                number when updating the
                enrollment.
              </p>
            </>
          ) : (
            <>
              <input
                type="text"
                value={
                  nextRollNumber !== null
                    ? nextRollNumber.toString()
                    : "Automatically assigned"
                }
                readOnly
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100 text-gray-600"
              />

              <p className="text-[11px] text-gray-400">
                Roll number is assigned
                automatically for the
                selected class and academic
                year.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------
          SELECTED CLASS INFORMATION
          ------------------------------------------------------ */}

      {selectedClass && (
        <div className="text-xs text-gray-500">
          Selected class:{" "}
          <span className="font-medium text-gray-700">
            {selectedClass.name}
          </span>
        </div>
      )}

      {/* ------------------------------------------------------
          STUDENT INFORMATION
          ------------------------------------------------------ */}

      {!isUpdate &&
        academicYearId &&
        gradeId &&
        filteredStudents.length === 0 && (
          <div className="text-sm text-gray-500">
            No students are currently available
            for enrollment in the selected academic
            year.
          </div>
        )}

      {/* ------------------------------------------------------
          SUBMIT BUTTON
          ------------------------------------------------------ */}

      <button
        type="submit"
        className="bg-blue-400 text-white rounded-md px-4 py-2 w-max"
      >
        {isUpdate
          ? "Update Enrollment"
          : "Enroll Student"}
      </button>
    </form>
  );
};

export default StudentEnrollmentForm;