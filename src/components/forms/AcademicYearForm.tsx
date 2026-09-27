"use client";

import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  academicYearSchema,
  AcademicYearSchema,
} from "@/lib/formValidationSchemas";
import {
  createAcademicYear,
  updateAcademicYear,
} from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const AcademicYearForm = ({
  type,
  data,
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<
    z.input<typeof academicYearSchema>,
    any,
    z.output<typeof academicYearSchema>
  >({
    resolver: zodResolver(academicYearSchema),
  });

  const [state, formAction] = useFormState(
    type === "create"
      ? createAcademicYear
      : updateAcademicYear,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit(
    (formData) => {
      console.log(formData);
      formAction(formData);
    },
    (errors) => {
      console.error(
        "Academic Year validation errors:",
        errors
      );

      const firstError = Object.values(errors)[0];

      if (firstError?.message) {
        toast.error(String(firstError.message));
      } else {
        toast.error(
          "Please correct the highlighted fields."
        );
      }
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(
        `Academic Year has been ${
          type === "create" ? "created" : "updated"
        }!`
      );

      setOpen(false);
      router.refresh();
    }

    if (state.error) {
      toast.error("Something went wrong!");
    }
  }, [state, router, type, setOpen]);

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create A New Academic Year"
          : "Update The Academic Year"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
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

        <InputField
          label="Academic Year"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />

        <InputField
          label="Academic Year Start Date"
          name="startDate"
          type="date"
          defaultValue={
            data?.startDate
              ? new Date(data.startDate)
                  .toISOString()
                  .split("T")[0]
              : ""
          }
          register={register}
          error={errors?.startDate}
        />

        <InputField
          label="Academic Year End Date"
          name="endDate"
          type="date"
          defaultValue={
            data?.endDate
              ? new Date(data.endDate)
                  .toISOString()
                  .split("T")[0]
              : ""
          }
          register={register}
          error={errors?.endDate}
        />
      </div>

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">
          Semester 1
        </h2>

        <div className="flex justify-between flex-wrap gap-4">
          <InputField
            label="Semester 1 Start Date"
            name="semester1StartDate"
            type="date"
            defaultValue={
              data?.semester1StartDate
                ? new Date(data.semester1StartDate)
                    .toISOString()
                    .split("T")[0]
                : ""
            }
            register={register}
            error={errors?.semester1StartDate}
          />

          <InputField
            label="Semester 1 End Date"
            name="semester1EndDate"
            type="date"
            defaultValue={
              data?.semester1EndDate
                ? new Date(data.semester1EndDate)
                    .toISOString()
                    .split("T")[0]
                : ""
            }
            register={register}
            error={errors?.semester1EndDate}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">
          Semester 2
        </h2>

        <div className="flex justify-between flex-wrap gap-4">
          <InputField
            label="Semester 2 Start Date"
            name="semester2StartDate"
            type="date"
            defaultValue={
              data?.semester2StartDate
                ? new Date(data.semester2StartDate)
                    .toISOString()
                    .split("T")[0]
                : ""
            }
            register={register}
            error={errors?.semester2StartDate}
          />

          <InputField
            label="Semester 2 End Date"
            name="semester2EndDate"
            type="date"
            defaultValue={
              data?.semester2EndDate
                ? new Date(data.semester2EndDate)
                    .toISOString()
                    .split("T")[0]
                : ""
            }
            register={register}
            error={errors?.semester2EndDate}
          />
        </div>
      </div>

      <div className="border-t pt-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("isCurrent")}
            defaultChecked={data?.isCurrent ?? false}
            className="h-4 w-4"
          />

          <span className="text-sm font-medium">
            Set as current academic year
          </span>
        </label>

        {errors?.isCurrent?.message && (
          <p className="text-xs text-red-500 mt-2">
            {errors.isCurrent.message.toString()}
          </p>
        )}
      </div>

      {state.error && (
        <span className="text-red-500">
          Something went wrong!
        </span>
      )}

      <button className="bg-badirBlue text-white p-2 rounded-md">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default AcademicYearForm;