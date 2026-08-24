"use client";

import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  assessmentRowSchema,
  AssessmentRowSchema,
} from "@/lib/formValidationSchemas";
import { updateAssessmentRow } from "@/lib/actions";
import { useFormState } from "react-dom";
import {
  Dispatch,
  SetStateAction,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const assessmentTypes = [
  "CW1",
  "CW2",
  "HW1",
  "HW2",
  "WS1",
  "WS2",
  "PROJECT",
  "EXERCISE_BOOK",
  "Q1",
  "Q2",
  "TEST1",
  "TEST2",
  "MIDTERM",
  "FINAL",
] as const;

type AssessmentData = {
  id: number;
  type: string;
  maxScore: number;
  weight: number;
};

type Props = {
  type: "create" | "update";

  data?: {
    academicYearId: number;
    gradeId: number;
    subjectId: number;
    subjectName: string;
    semester: string;
    assessments: AssessmentData[];
  };

  setOpen: Dispatch<SetStateAction<boolean>>;

  relatedData?: any;
};

const AssessmentRowForm = ({
  type,
  data,
  setOpen,
}: Props) => {
  const {
    register,
    handleSubmit,
  } = useForm<
          z.input<typeof assessmentRowSchema>,
          any,
          z.output<typeof assessmentRowSchema>
        >({
          resolver: zodResolver(
            assessmentRowSchema
          ),
        });

  const [state, formAction] = useFormState(
    updateAssessmentRow,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  const onSubmit = handleSubmit(
  (data) => {
    console.log(
      "ASSESSMENT ROW DATA:",
      data
    );

    formAction(data);
  }
);
  useEffect(() => {
    if (state.success) {
      toast(
        "Assessment definitions have been updated!"
      );

      setOpen(false);
      router.refresh();
    }
  }, [
    state,
    router,
    setOpen,
  ]);

  const getAssessment = (
    assessmentType: string
  ) => {
    return data?.assessments?.find(
      (assessment) =>
        assessment.type === assessmentType
    );
  };

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      {/* HEADER */}

      <div>
        <h1 className="text-xl font-semibold">
          Update Assessment Definitions
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          {data?.subjectName}
        </p>
      </div>

      {/* HIDDEN DATA */}

      <input
        type="hidden"
        {...register("academicYearId")}
        value={
          data?.academicYearId ?? ""
        }
        readOnly
      />

      <input
        type="hidden"
        {...register("gradeId")}
        value={data?.gradeId ?? ""}
        readOnly
      />

      <input
        type="hidden"
        {...register("subjectId")}
        value={
          data?.subjectId ?? ""
        }
        readOnly
      />

      <input
        type="hidden"
        {...register("semester")}
        value={
          data?.semester ?? "SEMESTER1"
        }
        readOnly
      />

      {/* ASSESSMENTS */}

      <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-2">

        {assessmentTypes.map(
          (assessmentType) => {
            const assessment =
              getAssessment(
                assessmentType
              );

            return (
              <div
                key={assessmentType}
                className="border border-gray-200 rounded-md p-4"
              >
                <h2 className="font-medium text-sm mb-4">
                  {assessmentType}
                </h2>

                <div className="flex flex-wrap gap-4">

                  <InputField
                    label="Maximum Score"
                    name={`assessments.${assessmentType}.maxScore`}
                    defaultValue={
                      assessment
                        ? String(
                            assessment.maxScore
                          )
                        : ""
                    }
                    register={register}
                  />

                  <InputField
                    label="Weight (%)"
                    name={`assessments.${assessmentType}.weight`}
                    defaultValue={
                      assessment
                        ? String(
                            assessment.weight
                          )
                        : ""
                    }
                    register={register}
                  />

                </div>
              </div>
            );
          }
        )}

      </div>

      {/* ERROR */}

      {state.error && (
        <span className="text-red-500">
          Something went wrong!
        </span>
      )}

      {/* SUBMIT */}

      <button
        type="submit"
        className="bg-badirBlue text-white p-2 rounded-md"
      >
        Update
      </button>

    </form>
  );
};

export default AssessmentRowForm;