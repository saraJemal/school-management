"use client";

import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { classSchema, ClassSchema } from "@/lib/formValidationSchemas";
import { createClass,  updateClass,  } from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const ClassForm = ({
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
  } = useForm<
        z.input<typeof classSchema>,
        any,
        z.output<typeof classSchema>
      >({
        resolver: zodResolver(classSchema),
      })

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE
  const [state, formAction] = useFormState(type === "create" ? createClass : updateClass,
    {
      success: false,
      error: false,
    });

  const onSubmit = handleSubmit(data => {
    console.log(data);
    formAction(data)
  })

  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast(`Class has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }

  }, [state, router, type, setOpen])

 const {teachers, grades} = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="text-xl font-semibold">{type === "create" ? "Create A New Class" : "Update The Class"}</h1>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="Class Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Capacity"
          name="capacity"
          defaultValue={data?.capacity}
          register={register}
          error={errors?.capacity}
        />
        {data && (<InputField
          label="id"
          name="id"
          defaultValue={data?.id}
          register={register}
          error={errors?.id}
          hidden
        />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500 ">Home Room Teacher</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("homeRoomTeacherId")} defaultValue={data?.homeRoomTeacherId}>
              {teachers.map((teacher:{id:string; name:string; surname:string}) => (
                <option value={teacher.id} key={teacher.id}selected ={data && teacher.id === data.homeRoomTeacherId}>
                  {teacher.name + " " + teacher.surname}</option>
              ))}
          </select>
          {errors.homeRoomTeacherId?.message && (<p className="text-xs text-red-500">
            {errors.homeRoomTeacherId?.message.toString()}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500 ">Grade</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full" {...register("gradeId")} defaultValue={data?.gradeId}>
              {grades.map(
                (grade:{id:number; level:number}) => (
                <option value={grade.id} key={grade.id} selected ={data && grade.id=== data.gradeId}
                >
                  {grade.level}
                </option>
              ))}
          </select>
          {errors.gradeId?.message && (<p className="text-xs text-red-500">
            {errors.gradeId?.message.toString()}</p>
          )}
        </div>
      </div>
     {state.error && (
     <span className="text-red-500">Something went wrong!</span>
      )}

      <button className="bg-badirBlue text-white p-2 rounded-md">{type === "create" ? "Create" : "Update"}</button>
    </form>
  )
}
export default ClassForm;