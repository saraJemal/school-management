"use client";

import { useForm, useWatch } from "react-hook-form";
import InputField from "../InputField";
import {
  assessmentRowSchema,
  AssessmentRowSchema,
} from "@/lib/formValidationSchemas";
import {
  createAssessmentRow,
  updateAssessmentRow,
} from "@/lib/actions";
import { useFormState } from "react-dom";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { GradeSection } from "@prisma/client";

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
    subjectId?: number;
    subjectName?: string;
    semester: string;
    assessments?: AssessmentData[];
  };

  setOpen: Dispatch<SetStateAction<boolean>>;

  relatedData?: {
    academicYears?: {
      id: number;
      name: string;
    }[];

    grades?: {
      id: number;
      level: number;
      name: string;
      section: GradeSection;
    }[];

    subjects?: {
      id: number;
      name: string;
      sections: {
        section: GradeSection
      }[];
    }[];
  };
};

const AssessmentRowForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: Props) => {
  const subjects = relatedData?.subjects ?? [];
  const {
    register,
    control,
    formState: { errors },
    handleSubmit,
  } = useForm<
        z.input<typeof assessmentRowSchema>,
        any,
        z.output<typeof assessmentRowSchema>
      >({
        resolver: zodResolver(assessmentRowSchema),
      });

      const selectedGradeId = useWatch({
        control,
        name: "gradeId",
      });

      const selectedGrade = relatedData?.grades?.find(
        (grade) =>
          grade.id === Number(selectedGradeId)
      );

      const filteredSubjects = useMemo(() => {
        if (!selectedGrade) {
          return [];
        }

        return subjects.filter((subject) =>
          subject.sections.some(
            (section) =>
              section.section === selectedGrade.section
          )
        );
      }, [subjects, selectedGrade]);

  const [state, formAction] = useFormState(
    type === "create"
      ? createAssessmentRow
      : updateAssessmentRow,
    {
      success: false,
      error: false,
    }
  );

  const router = useRouter();

  const onSubmit = handleSubmit((formData) => {
    console.log("ASSESSMENT ROW DATA:", formData);
    formAction(formData);
  });

  useEffect(() => {
    if (state.success) {
      toast(
        `Assessment definitions have been ${
          type === "create"
            ? "created"
            : "updated"
        }!`
      );

      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

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
  className="flex flex-col gap-6 pb-4"
      onSubmit={onSubmit}
    >
      {/* HEADER */}

      <div>
        <h1 className="text-xl font-semibold">
          {type === "create"
            ? "Create Assessment Definitions"
            : "Update Assessment Definitions"}
        </h1>

        {type === "update" && (
          <p className="text-sm text-gray-500 mt-1">
            {data?.subjectName}
          </p>
        )}
      </div>

      {/* CREATE SELECTIONS */}

      {type === "create" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ACADEMIC YEAR */}

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Academic Year
            </label>

            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
              {...register("academicYearId")}
              defaultValue=""
            >
              <option value="" disabled>
                Select academic year
              </option>

              {relatedData?.academicYears?.map(
                (year) => (
                  <option
                    key={year.id}
                    value={year.id}
                  >
                    {year.name}
                  </option>
                )
              )}
            </select>

            {errors.academicYearId && (
              <span className="text-xs text-red-500">
                {errors.academicYearId.message}
              </span>
            )}
          </div>

          {/* GRADE */}

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Grade
            </label>

            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
              {...register("gradeId")}
              defaultValue=""
            >
              <option value="" disabled>
                Select grade
              </option>

              {relatedData?.grades?.map(
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

            {errors.gradeId && (
              <span className="text-xs text-red-500">
                {errors.gradeId.message}
              </span>
            )}
          </div>

          {/* SUBJECT */}

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Subject
            </label>

            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
              {...register("subjectId")}
              defaultValue=""
            >
              <option value="" disabled>
                Select subject
              </option>

              {filteredSubjects.map(
                  (subject) => (
                    <option
                      key={subject.id}
                      value={subject.id}
                    >
                      {subject.name}
                    </option>
                  )
                )}
            </select>

            {errors.subjectId && (
              <span className="text-xs text-red-500">
                {errors.subjectId.message}
              </span>
            )}
          </div>

          {/* SEMESTER */}

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Semester
            </label>

            <select
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
              {...register("semester")}
              defaultValue="SEMESTER1"
            >
              <option value="SEMESTER1">
                Semester 1
              </option>

              <option value="SEMESTER2">
                Semester 2
              </option>
            </select>

            {errors.semester && (
              <span className="text-xs text-red-500">
                {errors.semester.message}
              </span>
            )}
          </div>

        </div>
      ) : (
        <>
          {/* UPDATE: HIDDEN DATA */}

          <input
            type="hidden"
            {...register("academicYearId")}
            value={data?.academicYearId ?? ""}
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
            value={data?.subjectId ?? ""}
            readOnly
          />

          <input
            type="hidden"
            {...register("semester")}
            value={data?.semester ?? "SEMESTER1"}
            readOnly
          />
        </>
      )}

      {/* ASSESSMENTS */}

      <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-2">

        {assessmentTypes.map(
          (assessmentType) => {
            const assessment =
              getAssessment(assessmentType);

            return (
              <div
                key={assessmentType}
                className="border border-gray-200 rounded-md p-4"
              >
                <h2 className="font-medium text-sm mb-4">
                  {assessmentType}
                </h2>

                <div className="flex flex-wrap gap-4">

                  {/* MAXIMUM SCORE */}

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
                    error={
                      errors.assessments?.[
                        assessmentType
                      ]?.maxScore
                    }
                  />

                  {/* WEIGHT */}

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
                    error={
                      errors.assessments?.[
                        assessmentType
                      ]?.weight
                    }
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
        {type === "create"
          ? "Create"
          : "Update"}
      </button>
    </form>
  );
};

export default AssessmentRowForm;