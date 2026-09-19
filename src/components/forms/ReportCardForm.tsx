"use client";

import {
  Dispatch,
  SetStateAction,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  reportCardSchema,
  ReportCardSchema,
} from "@/lib/formValidationSchemas";
import { updateReportCard } from "@/lib/actions";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import z from "zod";

type ReportCardFormProps = {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
};

const SKILLS = [
  {
    key: "reading",
    label: "Reading",
  },
  {
    key: "writing",
    label: "Writing",
  },
  {
    key: "spelling",
    label: "Spelling",
  },
  {
    key: "comprehension",
    label: "Comprehension",
  },
  {
    key: "computation",
    label: "Computation",
  },
  {
    key: "punctuality",
    label: "Punctuality",
  },
  {
    key: "uniform",
    label: "Uniform",
  },
  {
    key: "materialHandling",
    label: "Material Handling",
  },
  {
    key: "direction",
    label: "Direction",
  },
  {
    key: "completion",
    label: "Completion",
  },
  {
    key: "englishUse",
    label: "English Use",
  },
  {
    key: "workEthics",
    label: "Work Ethics",
  },
  {
    key: "skills",
    label: "Skills",
  },
  {
    key: "overallProgress",
    label: "Overall Progress",
  },
] as const;

const EVALUATION_OPTIONS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

const ReportCardForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: ReportCardFormProps) => {
  const router = useRouter();

  const reportCard =
    data?.reportCard ?? data;

  const grades =
    relatedData?.grades ?? [];

  const currentGradeId =
    reportCard?.currentGradeId ??
    reportCard?.class?.gradeId ??
    reportCard?.gradeId;

  const currentGrade = grades.find(
    (grade: any) =>
      grade.id === currentGradeId
  );

  const nextGrade = currentGrade
    ? grades.find(
        (grade: any) =>
          grade.level ===
          currentGrade.level + 1
      )
    : null;

  const semester1Skills =
    reportCard?.basicSkills?.find(
      (skill: any) =>
        skill.semester === "SEMESTER1"
    ) ?? {};

  const semester2Skills =
    reportCard?.basicSkills?.find(
      (skill: any) =>
        skill.semester === "SEMESTER2"
    ) ?? {};

  const defaultValues: ReportCardSchema = {
    id: reportCard?.id ?? 0,

    conductSemester1:
      reportCard?.conductSemester1 ?? "",

    conductSemester2:
      reportCard?.conductSemester2 ?? "",

    commentSemester1:
      reportCard?.commentSemester1 ?? "",

    commentSemester2:
      reportCard?.commentSemester2 ?? "",

    parentNameSemester1:
      reportCard?.parentNameSemester1 ?? "",

    parentNameSemester2:
      reportCard?.parentNameSemester2 ?? "",

    promotedGradeId:
      reportCard?.promotedGradeId ??
      undefined,

    detainedGradeId:
      reportCard?.detainedGradeId ??
      undefined,

    semester1Skills: {
      reading:
        semester1Skills.reading ?? "",
      writing:
        semester1Skills.writing ?? "",
      spelling:
        semester1Skills.spelling ?? "",
      comprehension:
        semester1Skills.comprehension ?? "",
      computation:
        semester1Skills.computation ?? "",
      punctuality:
        semester1Skills.punctuality ?? "",
      uniform:
        semester1Skills.uniform ?? "",
      materialHandling:
        semester1Skills.materialHandling ?? "",
      direction:
        semester1Skills.direction ?? "",
      completion:
        semester1Skills.completion ?? "",
      englishUse:
        semester1Skills.englishUse ?? "",
      workEthics:
        semester1Skills.workEthics ?? "",
      skills:
        semester1Skills.skills ?? "",
      overallProgress:
        semester1Skills.overallProgress ?? "",
    },

    semester2Skills: {
      reading:
        semester2Skills.reading ?? "",
      writing:
        semester2Skills.writing ?? "",
      spelling:
        semester2Skills.spelling ?? "",
      comprehension:
        semester2Skills.comprehension ?? "",
      computation:
        semester2Skills.computation ?? "",
      punctuality:
        semester2Skills.punctuality ?? "",
      uniform:
        semester2Skills.uniform ?? "",
      materialHandling:
        semester2Skills.materialHandling ?? "",
      direction:
        semester2Skills.direction ?? "",
      completion:
        semester2Skills.completion ?? "",
      englishUse:
        semester2Skills.englishUse ?? "",
      workEthics:
        semester2Skills.workEthics ?? "",
      skills:
        semester2Skills.skills ?? "",
      overallProgress:
        semester2Skills.overallProgress ?? "",
    },
  };

  const {
    register,
    formState: { errors, isSubmitting },
    handleSubmit,
    } = useForm<
    z.input<typeof reportCardSchema>,
    any,
    z.output<typeof reportCardSchema>
    >({
    resolver: zodResolver(reportCardSchema),
    });

  const onSubmit = async (
    formData: ReportCardSchema
  ) => {
    if (type !== "update") {
      return;
    }

    const result =
      await updateReportCard(
        {
          success: false,
          error: false,
        },
        formData
      );

    if (result.success) {
      toast.success(
        "Report card updated successfully."
      );

      setOpen(false);
      router.refresh();
      return;
    }

    if (
      result.error === "unauthorized"
    ) {
      toast.error(
        "You are not authorized to edit this report card."
      );
      return;
    }

    if (
      result.error ===
      "report-card-not-found"
    ) {
      toast.error(
        "Report card was not found."
      );
      return;
    }

    if (
      result.error ===
      "student-enrollment-not-found"
    ) {
      toast.error(
        "Student enrollment was not found."
      );
      return;
    }

    if (
      result.error ===
      "invalid-promotion-grade"
    ) {
      toast.error(
        "A student can only be promoted to the next grade."
      );
      return;
    }

    if (
      result.error ===
      "invalid-detention-grade"
    ) {
      toast.error(
        "A detained student must remain in the current grade."
      );
      return;
    }

    if (
      result.error ===
      "invalid-promotion-status"
    ) {
      toast.error(
        "A student cannot be both promoted and detained."
      );
      return;
    }

    toast.error(
      "Failed to update report card."
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      <input
        type="hidden"
        {...register("id")}
      />

      <div>
        <h2 className="text-lg font-semibold">
          Edit Student Report Card
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Update the homeroom teacher information
          and basic skills. Academic results and
          attendance are calculated automatically.
        </p>
      </div>

      {/* ================================================= */}
      {/* CONDUCT */}
      {/* ================================================= */}

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold border-b pb-2">
          Conduct
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Semester 1 Conduct
            </label>

            <textarea
              {...register(
                "conductSemester1"
              )}
              rows={3}
              className="border rounded-md p-2"
              placeholder="Enter Semester 1 conduct..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Semester 2 Conduct
            </label>

            <textarea
              {...register(
                "conductSemester2"
              )}
              rows={3}
              className="border rounded-md p-2"
              placeholder="Enter Semester 2 conduct..."
            />
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* COMMENTS */}
      {/* ================================================= */}

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold border-b pb-2">
          Homeroom Teacher Comments
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Semester 1 Comment
            </label>

            <textarea
              {...register(
                "commentSemester1"
              )}
              rows={4}
              className="border rounded-md p-2"
              placeholder="Enter Semester 1 comment..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Semester 2 Comment
            </label>

            <textarea
              {...register(
                "commentSemester2"
              )}
              rows={4}
              className="border rounded-md p-2"
              placeholder="Enter Semester 2 comment..."
            />
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* PARENT */}
      {/* ================================================= */}

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold border-b pb-2">
          Parent Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Parent Name — Semester 1
            </label>

            <input
              type="text"
              {...register(
                "parentNameSemester1"
              )}
              className="border rounded-md p-2"
              placeholder="Parent name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Parent Name — Semester 2
            </label>

            <input
              type="text"
              {...register(
                "parentNameSemester2"
              )}
              className="border rounded-md p-2"
              placeholder="Parent name"
            />
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* PROMOTION */}
      {/* ================================================= */}

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold border-b pb-2">
          Promotion Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Promoted To
            </label>

            <select
              {...register(
                "promotedGradeId"
              )}
              className="border rounded-md p-2"
            >
              <option value="">
                Not promoted
              </option>

              {nextGrade && (
                <option value={nextGrade.id}>
                  {nextGrade.name}
                </option>
              )}
            </select>

            <p className="text-xs text-gray-500">
              Only the next grade is allowed.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Detained In
            </label>

            <select
              {...register(
                "detainedGradeId"
              )}
              className="border rounded-md p-2"
            >
              <option value="">
                Not detained
              </option>

              {currentGrade && (
                <option
                  value={currentGrade.id}
                >
                  {currentGrade.name}
                </option>
              )}
            </select>

            <p className="text-xs text-gray-500">
              Detention remains in the current
              grade.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* BASIC SKILLS */}
      {/* ================================================= */}

      <section className="flex flex-col gap-4">
        <h3 className="font-semibold border-b pb-2">
          Basic Skills
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 text-left">
                  Skill
                </th>
                <th className="border p-2">
                  Semester 1
                </th>
                <th className="border p-2">
                  Semester 2
                </th>
              </tr>
            </thead>

            <tbody>
              {SKILLS.map((skill) => (
                <tr key={skill.key}>
                  <td className="border p-2 font-medium">
                    {skill.label}
                  </td>

                  <td className="border p-2">
                    <select
                      {...register(
                        `semester1Skills.${skill.key}`
                      )}
                      className="border rounded-md p-1 w-full"
                    >
                      <option value="">
                        —
                      </option>

                      {EVALUATION_OPTIONS.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}
                    </select>
                  </td>

                  <td className="border p-2">
                    <select
                      {...register(
                        `semester2Skills.${skill.key}`
                      )}
                      className="border rounded-md p-1 w-full"
                    >
                      <option value="">
                        —
                      </option>

                      {EVALUATION_OPTIONS.map(
                        (option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        )
                      )}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border rounded-md p-3 bg-gray-50 text-sm">
          <strong>Evaluation Key:</strong>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            <span>A — Excellent</span>
            <span>B — Very Good</span>
            <span>C — Average</span>
            <span>D — Poor</span>
            <span>E — Fail</span>
            <span>F — Fail</span>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* BUTTONS */}
      {/* ================================================= */}

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border px-4 py-2"
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : "Save Changes"}
        </button>
      </div>

      {Object.keys(errors).length > 0 && (
        <p className="text-red-500 text-sm">
          Please correct the highlighted fields.
        </p>
      )}
    </form>
  );
};

export default ReportCardForm;