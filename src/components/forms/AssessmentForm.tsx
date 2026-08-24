"use client";

import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  assessmentSchema,
  AssessmentSchema,
} from "@/lib/formValidationSchemas";
import {
  createAssessment,
  updateAssessment,
} from "@/lib/actions";
import { useFormState } from "react-dom";
import {
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AssessmentCategory,
  AssessmentType,
  Semester,
} from "@prisma/client";
import z from "zod";

const AssessmentForm = ({
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
  } =  useForm<
          z.input<typeof assessmentSchema>,
          any,
          z.output<typeof assessmentSchema>
        >({
          resolver: zodResolver(assessmentSchema),
        });

  const [state, formAction] = useFormState(
    type === "create" ? createAssessment : updateAssessment,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  const onSubmit = handleSubmit((data) => {
    console.log(data);
    formAction(data);
  });

  useEffect(() => {
    if (state.success) {
      toast(
        `Assessment has been ${
          type === "create" ? "created" : "updated"
        }!`
      );

      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const {
    academicYears,
    grades,
    subjects,
  } = relatedData;

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create A New Assessment"
          : "Update The Assessment"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">

        {/* TITLE */}
        <InputField
          label="Assessment Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors.title}
        />

        {/* MAX SCORE */}
        <InputField
          label="Maximum Score"
          name="maxScore"
          defaultValue={data?.maxScore}
          register={register}
          error={errors.maxScore}
        />

        {/* WEIGHT */}
        <InputField
          label="Weight"
          name="weight"
          defaultValue={data?.weight}
          register={register}
          error={errors.weight}
        />

        {/* ID */}
        {data && (
          <InputField
            label="id"
            name="id"
            defaultValue={data?.id}
            register={register}
            error={errors.id}
            hidden
          />
        )}

        {/* ACADEMIC YEAR */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Academic Year
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("academicYearId", {
              valueAsNumber: true,
            })}
            defaultValue={data?.academicYearId}
          >
            {academicYears.map(
              (year: {
                id: number;
                name: string;
              }) => (
                <option
                  value={year.id}
                  key={year.id}
                >
                  {year.name}
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

        {/* GRADE */}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-xs text-gray-500">
              Grade
            </label>

            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
              {...register("gradeId", {
                valueAsNumber: true,
              })}
              defaultValue={data?.gradeId}
            >
              {grades.map(
                (grade: {
                  id: number;
                  level: number;
                  name: string;
                }) => (
                  <option
                    value={grade.id}
                    key={grade.id}
                  >
                    {grade.name}
                  </option>
                )
              )}
            </select>

            {errors.gradeId?.message && (
              <p className="text-xs text-red-500">
                {errors.gradeId.message.toString()}
              </p>
            )}
          </div>

        {/* SUBJECT */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Subject
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("subjectId", {
              valueAsNumber: true,
            })}
            defaultValue={data?.subjectId}
          >
            {subjects.map(
              (subject: {
                id: number;
                name: string;
              }) => (
                <option
                  value={subject.id}
                  key={subject.id}
                >
                  {subject.name}
                </option>
              )
            )}
          </select>

          {errors.subjectId?.message && (
            <p className="text-xs text-red-500">
              {errors.subjectId.message.toString()}
            </p>
          )}
        </div>

        {/* TYPE */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Assessment Type
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("type")}
            defaultValue={data?.type}
          >
            {Object.values(AssessmentType).map(
              (type) => (
                <option
                  value={type}
                  key={type}
                >
                  {type}
                </option>
              )
            )}
          </select>

          {errors.type?.message && (
            <p className="text-xs text-red-500">
              {errors.type.message.toString()}
            </p>
          )}
        </div>

        {/* CATEGORY */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Category
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("category")}
            defaultValue={data?.category}
          >
            {Object.values(AssessmentCategory).map(
              (category) => (
                <option
                  value={category}
                  key={category}
                >
                  {category}
                </option>
              )
            )}
          </select>

          {errors.category?.message && (
            <p className="text-xs text-red-500">
              {errors.category.message.toString()}
            </p>
          )}
        </div>

        {/* SEMESTER */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Semester
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("semester")}
            defaultValue={data?.semester}
          >
            {Object.values(Semester).map(
              (semester) => (
                <option
                  value={semester}
                  key={semester}
                >
                  {semester === "SEMESTER1"
                    ? "Semester 1"
                    : "Semester 2"}
                </option>
              )
            )}
          </select>

          {errors.semester?.message && (
            <p className="text-xs text-red-500">
              {errors.semester.message.toString()}
            </p>
          )}
        </div>
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

export default AssessmentForm;