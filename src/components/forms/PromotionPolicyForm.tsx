"use client";

import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  promotionPolicySchema,
  PromotionPolicySchema,
} from "@/lib/formValidationSchemas";
import {
  createPromotionPolicy,
  updatePromotionPolicy,
} from "@/lib/actions";
import { useFormState } from "react-dom";
import { Dispatch, SetStateAction, useEffect } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const PromotionPolicyForm = ({
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
    z.input<typeof promotionPolicySchema>,
    any,
    z.output<typeof promotionPolicySchema>
  >({
    resolver: zodResolver(promotionPolicySchema),
  });

  const [state, formAction] = useFormState(
    type === "create"
      ? createPromotionPolicy
      : updatePromotionPolicy,
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
      console.error("Promotion Policy validation errors:", errors);

      const firstError = Object.values(errors)[0];

      if (firstError?.message) {
        toast.error(String(firstError.message));
      } else {
        toast.error("Please correct the highlighted fields.");
      }
    }
  );

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(
        `Promotion Policy has been ${
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

  const { academicYears } = relatedData;

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create A New Promotion Policy"
          : "Update The Promotion Policy"}
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

        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">
            Academic Year
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("academicYearId")}
            defaultValue={data?.academicYearId}
          >
            <option value="">
              Select Academic Year
            </option>

            {academicYears.map(
              (academicYear: {
                id: number;
                name: string;
              }) => (
                <option
                  value={academicYear.id}
                  key={academicYear.id}
                >
                  {academicYear.name}
                </option>
              )
            )}
          </select>

          {errors.academicYearId?.message && (
            <p className="text-xs text-red-500">
              {errors.academicYearId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-xs text-gray-500">
            Section
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("section")}
            defaultValue={data?.section}
          >
            <option value="">
              Select Section
            </option>

            <option value="KG">KG</option>
            <option value="PRIMARY">PRIMARY</option>
            <option value="MIDDLE">MIDDLE</option>
            <option value="SECONDARY">SECONDARY</option>
            <option value="PREPARATORY">
              PREPARATORY
            </option>
          </select>

          {errors.section?.message && (
            <p className="text-xs text-red-500">
              {errors.section.message.toString()}
            </p>
          )}
        </div>

        <InputField
          label="Promotion Minimum Average"
          name="promotionMinimumAverage"
          type="number"
          defaultValue={data?.promotionMinimumAverage}
          register={register}
          error={errors?.promotionMinimumAverage}
        />

        <InputField
          label="Detention Maximum Average"
          name="detentionMaximumAverage"
          type="number"
          defaultValue={data?.detentionMaximumAverage}
          register={register}
          error={errors?.detentionMaximumAverage}
        />
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

export default PromotionPolicyForm;