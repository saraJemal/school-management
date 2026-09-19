"use client";

import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { lessonSchema } from "@/lib/formValidationSchemas";
import { createLesson, updateLesson } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Day } from "@prisma/client";
import z from "zod";


type LessonFormValues = {
  id: number;
  startTime: Date;
  endTime: Date;
  day: Day;
  name: string;
  subjectId: number;
  classId: number;
  teacherId: string;
};

const LessonForm = ({
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
    handleSubmit,
    formState: { errors },
  } = useForm<
        z.input<typeof lessonSchema>,
        any,
        z.output<typeof lessonSchema>
      >({
        resolver: zodResolver(lessonSchema),
      })

  const [state, formAction] = useFormState(
    type === "create" ? createLesson : updateLesson,
    { success: false, error: false }
  );

  const router = useRouter();


  const onSubmit = handleSubmit((data) => {
  formAction(data);
});

  useEffect(() => {
    if (state.success) {
      toast(`Lesson has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { teachers, subjects, classes } = relatedData;

  const formatTime = (date?: Date) => {
  if (!date) return "";
  return new Date(date).toTimeString().slice(0, 5);
  };

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">
        {type === "create" ? "Create A New Lesson" : "Update The Lesson"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Lesson Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />

        <InputField
          label="Start Time"
          name="startTime"
          type="time"
          defaultValue={formatTime(data?.startTime)}
          register={register}
          error={errors.startTime}
        />

        <InputField
          label="End Time"
          name="endTime"
          type="time"
          defaultValue={formatTime(data?.endTime)}
          register={register}
          error={errors.endTime}
        />

                {data && (
          <input
            type="hidden"
            {...register("id", { valueAsNumber: true })}
            value={data.id}
          />
        )}

        {/* DAY */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Day</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("day")}
            defaultValue={data?.day}
          >
            {Object.values(Day).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          {errors.day?.message && (
            <p className="text-xs text-red-500">
              {errors.day.message.toString()}
            </p>
          )}
        </div>

        {/* SUBJECT */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Subject</label>
          <select
            {...register("subjectId", { valueAsNumber: true })}
            defaultValue={data?.subjectId}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          >
            {subjects.map((subject: { id: number; name: string }) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        {/* CLASS */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Class</label>
          <select
            {...register("classId", { valueAsNumber: true })}
            defaultValue={data?.classId}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          >
            {classes.map((c: { id: number; name: string }) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* TEACHER */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Teacher</label>
          <select
            {...register("teacherId")}
            defaultValue={data?.teacherId}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          >
            {teachers.map((t:{ id: string; name: string; surname: string }) => (
              <option key={t.id} value={t.id}>
                {t.name + " " + t.surname}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
      )}

      <button className="bg-badirBlue text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default LessonForm;