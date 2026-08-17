"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  attendanceSchema,
  AttendanceSchema,
} from "@/lib/formValidationSchemas";
import { createAttendance, updateAttendance } from "@/lib/actions";
import { useFormState } from "react-dom";
import { 
  Dispatch, 
  SetStateAction,
  useEffect 
  } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const AttendanceForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    formState: { errors },
    handleSubmit,
    watch,
    setValue,
  } = useForm<AttendanceSchema>({
    resolver: zodResolver(attendanceSchema),
  });

    const selectedClassId = watch("classId");
    const selectedStudentId = watch("studentId");

  const [state, formAction] = useFormState(
    type === "create" ? createAttendance : updateAttendance,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();
  const { classes, students } = relatedData;

  const onSubmit = handleSubmit((formData) => {
    console.log(formData);
    formAction(formData);
  });

  useEffect(() => {
    if (!selectedClassId) {
      setValue("studentId", "");
      return;
    }

    const selectedStudent = students?.find(
      (student: {
        id: string;
        classId: number;
      }) => student.id === selectedStudentId
    );

    if (
      selectedStudent &&
      selectedStudent.classId !== selectedClassId
    ) {
      setValue("studentId", "");
    }
  }, [
    selectedClassId,
    selectedStudentId,
    students,
    setValue,
  ]);

  useEffect(() => {
    if (state.success) {
      toast(
        `Attendance has been ${
          type === "create" ? "created" : "updated"
        }!`
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const filteredStudents = students?.filter(
    (student: {
      id: string;
      name: string;
      surname: string;
      classId: number;
    }) => student.classId === selectedClassId
  );

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create A New Attendance"
          : "Update The Attendance"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">

        {/* CLASS */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Class</label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId", { valueAsNumber: true })}
            defaultValue={data?.classId ?? ""}
          >
            <option value="">Select Class</option>

            {classes?.map(
              (classItem: { id: number; name: string }) => (
                <option value={classItem.id} key={classItem.id}>
                  {classItem.name}
                </option>
              )
            )}
          </select>

          {errors.classId?.message && (
            <p className="text-xs text-red-500">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>

        {/* STUDENT */}
        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">Student</label>

          <select
            disabled={!selectedClassId}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full disabled:bg-gray-100"
            {...register("studentId")}
            defaultValue={data?.studentId ?? ""}
          >
            <option value="">
              {selectedClassId
                ? "Select Student"
                : "Select a class first"}
            </option>

           {filteredStudents?.map(
                (student: {
                  id: string;
                  name: string;
                  surname: string;
                  classId: number;
                }) => (
                  <option value={student.id} key={student.id}>
                    {student.name} {student.surname}
                  </option>
                )
              )}
          </select>

          {errors.studentId?.message && (
            <p className="text-xs text-red-500">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>

        {/* DATE */}
        <InputField
          label="Date"
          name="date"
          defaultValue={
            data?.date
              ? new Date(data.date).toISOString().split("T")[0]
              : undefined
          }
          register={register}
          error={errors?.date}
          type="date"
        />

        {/* PRESENT */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Attendance</label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("present", {
              setValueAs: (value) => value === "true",
            })}
            defaultValue={data?.present?.toString() ?? "true"}
          >
            <option value="true">Present</option>
            <option value="false">Absent</option>
          </select>

          {errors.present?.message && (
            <p className="text-xs text-red-500">
              {errors.present.message.toString()}
            </p>
          )}
        </div>

        {/* ID FOR UPDATE */}
        {data && (
          <InputField
            label="id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors?.id}
            hidden
          />
        )}
      </div>

      {state.error && (
        <span className="text-red-500 text-sm">
          Something went wrong. Please check the attendance information.
        </span>
      )}

      <button className="bg-badirBlue text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default AttendanceForm;