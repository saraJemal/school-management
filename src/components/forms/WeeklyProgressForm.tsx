"use client";

import {
  createWeeklyProgress,
  updateWeeklyProgress,
} from "@/lib/actions";
import {
  weeklyProgressSchema,
} from "@/lib/formValidationSchemas";
import {
  WEEKLY_PROGRESS_RATINGS,
} from "@/lib/weeklyProgress";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useEffect,
  useRef,
} from "react";
import {
  useFieldArray,
  useForm,
} from "react-hook-form";
import { toast } from "react-toastify";
import z from "zod";

type WeeklyProgressFormProps = {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
};

// ---------------------------------------------------------
// WEEKLY PROGRESS STRUCTURE
// ---------------------------------------------------------

const ACADEMIC_PERFORMANCE = "Academic Performance";

const BEHAVIOUR_EVALUATION = "Behaviour Evaluation";

const SOCIALIZATION_CATEGORY =
  "Socialization and Work Ethics";

const SOCIALIZATION_CRITERIA = [
  "Works independently and completes all activities on time",
  "Comes to class on time with all scholastic materials",
  "Is enthusiastic and needs motivation from parents",
  "Is not easily distracted and shows interest in learning",
  "Handles materials properly and keeps his/her work neat",
  "Is an asset to the class",
  "Has shown some improvement this week",
  "Plays and socializes well with friends",
  "Participates actively in class",
];

const DEFAULT_ITEMS = [
  {
    criterion: ACADEMIC_PERFORMANCE,
    category: ACADEMIC_PERFORMANCE,
  },
  {
    criterion: BEHAVIOUR_EVALUATION,
    category: BEHAVIOUR_EVALUATION,
  },
  ...SOCIALIZATION_CRITERIA.map((criterion) => ({
    criterion,
    category: SOCIALIZATION_CATEGORY,
  })),
];

// ---------------------------------------------------------
// FORM
// ---------------------------------------------------------

const WeeklyProgressForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: WeeklyProgressFormProps) => {
  const router = useRouter();

  const report =
    data?.weeklyProgressReport ?? data ?? {};

  // -------------------------------------------------------
  // PERMISSIONS
  // -------------------------------------------------------

  const canEditTeacher =
    relatedData?.canEditTeacher === true;

  const canEditParent =
    relatedData?.canEditParent === true;

  // -------------------------------------------------------
  // DEFAULT ITEMS
  // -------------------------------------------------------

  const defaultItems =
    report?.items?.length > 0
      ? DEFAULT_ITEMS.map(
          (defaultItem) => {
            const existingItem =
              report.items.find(
                (item: any) =>
                  item.criterion ===
                  defaultItem.criterion
              );

            return {
              id: existingItem?.id,
              criterion:
                defaultItem.criterion,
              category:
                defaultItem.category,
              rating:
                existingItem?.rating ??
                ("SATISFACTORY" as const),
            };
          }
        )
      : DEFAULT_ITEMS.map(
          (item) => ({
            criterion: item.criterion,
            category: item.category,
            rating:
              "SATISFACTORY" as const,
          })
        );

  // -------------------------------------------------------
  // FORM
  // -------------------------------------------------------

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<
    z.input<typeof weeklyProgressSchema>,
    any,
    z.output<typeof weeklyProgressSchema>
  >({
    resolver: zodResolver(
      weeklyProgressSchema
    ),

    defaultValues: {
      id: report?.id
        ? Number(report.id)
        : undefined,

      studentId:
        report?.studentId ||
        relatedData?.studentId ||
        "",

      academicYearId:
        report?.academicYearId ||
        relatedData?.academicYearId ||
        0,

      classId:
        report?.classId ||
        relatedData?.classId ||
        0,

      weekStart:
        report?.weekStart
          ? new Date(report.weekStart)
              .toISOString()
              .slice(0, 10)
          : relatedData?.weekStart || "",

      weekEnd:
        report?.weekEnd
          ? new Date(report.weekEnd)
              .toISOString()
              .slice(0, 10)
          : relatedData?.weekEnd || "",

      teacherComment:
        report?.teacherComment || "",

      teacherName:
        report?.teacherName || "",

      teacherSignature:
        report?.teacherSignature || "",

      parentComment:
        report?.parentComment || "",

      parentName:
        report?.parentName || "",

      parentSignature:
        report?.parentSignature || "",

      items: defaultItems,
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "items",
  });

  // -------------------------------------------------------
  // SIGNATURE CANVAS
  // -------------------------------------------------------

  const teacherCanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const parentCanvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const teacherDrawing =
    useRef(false);

  const parentDrawing =
    useRef(false);

  const prepareCanvas = (
    canvas: HTMLCanvasElement | null,
    signature?: string
  ) => {
    if (!canvas) return;

    const context =
      canvas.getContext("2d");

    if (!context) return;

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#000";

    if (signature) {
      const image =
        new window.Image();

      image.onload = () => {
        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );
      };

      image.src = signature;
    }
  };

  useEffect(() => {
    prepareCanvas(
      teacherCanvasRef.current,
      report?.teacherSignature
    );

    prepareCanvas(
      parentCanvasRef.current,
      report?.parentSignature
    );
  }, [
    report?.teacherSignature,
    report?.parentSignature,
  ]);

  const getCanvasPosition = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect =
      canvas.getBoundingClientRect();

    const scaleX =
      canvas.width / rect.width;

    const scaleY =
      canvas.height / rect.height;

    if ("touches" in event) {
      const touch = event.touches[0];

      return {
        x:
          (touch.clientX - rect.left) *
          scaleX,
        y:
          (touch.clientY - rect.top) *
          scaleY,
      };
    }

    return {
      x:
        (event.clientX - rect.left) *
        scaleX,
      y:
        (event.clientY - rect.top) *
        scaleY,
    };
  };

  const startDrawing = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: RefObject<HTMLCanvasElement>,
    drawingRef: MutableRefObject<boolean>
  ) => {
    if (!canvasRef.current) return;

    event.preventDefault();

    drawingRef.current = true;

    const context =
      canvasRef.current.getContext("2d");

    if (!context) return;

    const position =
      getCanvasPosition(
        event,
        canvasRef.current
      );

    context.beginPath();

    context.moveTo(
      position.x,
      position.y
    );
  };

  const draw = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
    canvasRef: RefObject<HTMLCanvasElement>,
    drawingRef: MutableRefObject<boolean>
  ) => {
    if (
      !drawingRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    event.preventDefault();

    const context =
      canvasRef.current.getContext("2d");

    if (!context) return;

    const position =
      getCanvasPosition(
        event,
        canvasRef.current
      );

    context.lineTo(
      position.x,
      position.y
    );

    context.stroke();
  };

  const stopDrawing = (
    canvasRef: RefObject<HTMLCanvasElement>,
    drawingRef: MutableRefObject<boolean>,
    field:
      | "teacherSignature"
      | "parentSignature"
  ) => {
    if (!drawingRef.current) return;

    drawingRef.current = false;

    if (!canvasRef.current) return;

    setValue(
      field,
      canvasRef.current.toDataURL(
        "image/png"
      ),
      {
        shouldDirty: true,
      }
    );
  };

  const clearSignature = (
    canvasRef: RefObject<HTMLCanvasElement>,
    field:
      | "teacherSignature"
      | "parentSignature"
  ) => {
    if (!canvasRef.current) return;

    const context =
      canvasRef.current.getContext("2d");

    if (!context) return;

    context.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    setValue(field, "", {
      shouldDirty: true,
    });
  };

  // -------------------------------------------------------
  // SUBMIT
  // -------------------------------------------------------

  const onSubmit = async (
    values: z.output<
      typeof weeklyProgressSchema
    >
  ) => {
    const result =
      type === "create"
        ? await createWeeklyProgress(
            {
              success: false,
              error: false,
            },
            values
          )
        : await updateWeeklyProgress(
            {
              success: false,
              error: false,
            },
            values
          );

    if (result.success) {
      toast.success(
        `Weekly Progress has been ${
          type === "create"
            ? "created"
            : "updated"
        }!`
      );

      setOpen(false);
      router.refresh();

      return;
    }

    if (result.error === "unauthorized") {
      toast.error(
        "You are not authorized to perform this action."
      );
    } else if (
      result.error ===
      "weekly-progress-already-exists"
    ) {
      toast.error(
        "A Weekly Progress Report already exists for this week."
      );
    } else if (
      result.error ===
      "student-enrollment-not-found"
    ) {
      toast.error(
        "Student enrollment was not found."
      );
    } else if (
      result.error === "invalid-week-range"
    ) {
      toast.error(
        "The week must run from Monday to Friday."
      );
    } else {
      toast.error(
        "Something went wrong while saving the Weekly Progress Report."
      );
    }
  };

  // -------------------------------------------------------
  // DISPLAY DATA
  // -------------------------------------------------------

  const studentName =
    relatedData?.studentName ||
    report?.student?.name ||
    "";

  const studentSurname =
    relatedData?.studentSurname ||
    report?.student?.surname ||
    "";

  const gradeName =
    relatedData?.gradeName ||
    report?.class?.grade?.name ||
    "";

  const className =
    relatedData?.className ||
    report?.class?.name ||
    "";

  const academicYearName =
    relatedData?.academicYearName ||
    report?.academicYear?.name ||
    "";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6 p-2"
    >
      {/* -------------------------------------------------- */}
      {/* HIDDEN CONTEXT */}
      {/* -------------------------------------------------- */}

      <input
        type="hidden"
        {...register("studentId")}
      />

      <input
        type="hidden"
        {...register(
          "academicYearId",
          {
            valueAsNumber: true,
          }
        )}
      />

      <input
        type="hidden"
        {...register("classId", {
          valueAsNumber: true,
        })}
      />

      {type === "update" && (
        <input
          type="hidden"
          {...register("id", {
            valueAsNumber: true,
          })}
        />
      )}

      {/* -------------------------------------------------- */}
      {/* TITLE */}
      {/* -------------------------------------------------- */}

      <div className="border-b pb-3">
        <h1 className="text-lg font-semibold">
          {type === "create"
            ? "Create Weekly Progress Report"
            : "Update Weekly Progress Report"}
        </h1>
      </div>

      {/* -------------------------------------------------- */}
      {/* STUDENT INFORMATION */}
      {/* -------------------------------------------------- */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Student
          </label>

          <input
            type="text"
            value={`${studentName} ${studentSurname}`.trim()}
            readOnly
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Student ID
          </label>

          <input
            type="text"
            value={valuesafe(
              relatedData?.studentId ||
                report?.studentId
            )}
            readOnly
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Grade
          </label>

          <input
            type="text"
            value={gradeName}
            readOnly
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Class
          </label>

          <input
            type="text"
            value={className}
            readOnly
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
          />
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs text-gray-500">
            Academic Year
          </label>

          <input
            type="text"
            value={academicYearName}
            readOnly
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm bg-gray-100"
          />
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* WEEK */}
      {/* -------------------------------------------------- */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Week Start
          </label>

          <input
            type="date"
            {...register("weekStart")}
            disabled={type === "update"}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
          />

          {errors.weekStart?.message && (
            <p className="text-xs text-red-500">
              {errors.weekStart.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">
            Week End
          </label>

          <input
            type="date"
            {...register("weekEnd")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
          />

          {errors.weekEnd?.message && (
            <p className="text-xs text-red-500">
              {errors.weekEnd.message.toString()}
            </p>
          )}
        </div>
      </div>

      {/* ================================================== */}
      {/* ACADEMIC PERFORMANCE */}
      {/* ================================================== */}

      <div>
        <h2 className="font-semibold mb-3">
          Academic Performance
        </h2>

        {fields[0] && (
          <div className="border border-gray-300 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px]">
              <div className="p-3">
                <input
                  type="hidden"
                  {...register(
                    "items.0.criterion"
                  )}
                />

                <input
                  type="hidden"
                  {...register(
                    "items.0.category"
                  )}
                />

                <span>
                  Academic Performance
                </span>
              </div>

              <div className="p-3 border-t md:border-t-0 md:border-l border-gray-300">
                <select
                  {...register(
                    "items.0.rating"
                  )}
                  disabled={!canEditTeacher}
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full disabled:bg-gray-100"
                >
                  {WEEKLY_PROGRESS_RATINGS.map(
                    (rating) => (
                      <option
                        key={rating.value}
                        value={rating.value}
                      >
                        {rating.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* BEHAVIOUR EVALUATION */}
      {/* ================================================== */}

      <div>
        <h2 className="font-semibold mb-3">
          Behaviour Evaluation
        </h2>

        {fields[1] && (
          <div className="border border-gray-300 rounded-md">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px]">
              <div className="p-3">
                <input
                  type="hidden"
                  {...register(
                    "items.1.criterion"
                  )}
                />

                <input
                  type="hidden"
                  {...register(
                    "items.1.category"
                  )}
                />

                <span>
                  Behaviour Evaluation
                </span>
              </div>

              <div className="p-3 border-t md:border-t-0 md:border-l border-gray-300">
                <select
                  {...register(
                    "items.1.rating"
                  )}
                  disabled={!canEditTeacher}
                  className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full disabled:bg-gray-100"
                >
                  {WEEKLY_PROGRESS_RATINGS.map(
                    (rating) => (
                      <option
                        key={rating.value}
                        value={rating.value}
                      >
                        {rating.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* SOCIALIZATION AND WORK ETHICS */}
      {/* ================================================== */}

      <div>
        <h2 className="font-semibold mb-3">
          Socialization and Work Ethics
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-gray-300 p-2 text-left w-12">
                  No.
                </th>

                <th className="border border-gray-300 p-2 text-left">
                  Criterion
                </th>

                <th className="border border-gray-300 p-2 text-left w-56">
                  Rating
                </th>
              </tr>
            </thead>

            <tbody>
              {fields
                .slice(2)
                .map((field, relativeIndex) => {
                  const index =
                    relativeIndex + 2;

                  return (
                    <tr key={field.id}>
                      <td className="border border-gray-300 p-2 align-top">
                        {relativeIndex + 1}
                      </td>

                      <td className="border border-gray-300 p-2 align-top">
                        <input
                          type="hidden"
                          {...register(
                            `items.${index}.criterion`
                          )}
                        />

                        <input
                          type="hidden"
                          {...register(
                            `items.${index}.category`
                          )}
                        />

                        <span>
                          {
                            SOCIALIZATION_CRITERIA[
                              relativeIndex
                            ]
                          }
                        </span>
                      </td>

                      <td className="border border-gray-300 p-2">
                        <select
                          {...register(
                            `items.${index}.rating`
                          )}
                          disabled={
                            !canEditTeacher
                          }
                          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full disabled:bg-gray-100"
                        >
                          {WEEKLY_PROGRESS_RATINGS.map(
                            (rating) => (
                              <option
                                key={
                                  rating.value
                                }
                                value={
                                  rating.value
                                }
                              >
                                {rating.label}
                              </option>
                            )
                          )}
                        </select>

                        {errors.items?.[
                          index
                        ]?.rating?.message && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[
                              index
                            ]?.rating?.message?.toString()}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================== */}
      {/* TEACHER SECTION */}
      {/* ================================================== */}

      <div className="border-t pt-5">
        <h2 className="font-semibold mb-4">
          Teacher
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Teacher Comment
            </label>

            <textarea
              {...register(
                "teacherComment"
              )}
              disabled={!canEditTeacher}
              rows={4}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Teacher Name
            </label>

            <input
              type="text"
              {...register("teacherName")}
              disabled={!canEditTeacher}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Teacher Signature
            </label>

            <canvas
              ref={teacherCanvasRef}
              width={600}
              height={180}
              onMouseDown={(event) =>
                canEditTeacher &&
                startDrawing(
                  event,
                  teacherCanvasRef,
                  teacherDrawing
                )
              }
              onMouseMove={(event) =>
                canEditTeacher &&
                draw(
                  event,
                  teacherCanvasRef,
                  teacherDrawing
                )
              }
              onMouseUp={() =>
                canEditTeacher &&
                stopDrawing(
                  teacherCanvasRef,
                  teacherDrawing,
                  "teacherSignature"
                )
              }
              onMouseLeave={() =>
                canEditTeacher &&
                stopDrawing(
                  teacherCanvasRef,
                  teacherDrawing,
                  "teacherSignature"
                )
              }
              onTouchStart={(event) =>
                canEditTeacher &&
                startDrawing(
                  event,
                  teacherCanvasRef,
                  teacherDrawing
                )
              }
              onTouchMove={(event) =>
                canEditTeacher &&
                draw(
                  event,
                  teacherCanvasRef,
                  teacherDrawing
                )
              }
              onTouchEnd={() =>
                canEditTeacher &&
                stopDrawing(
                  teacherCanvasRef,
                  teacherDrawing,
                  "teacherSignature"
                )
              }
              className={`border border-gray-300 rounded-md w-full max-w-[600px] h-[130px] bg-white ${
                !canEditTeacher
                  ? "pointer-events-none bg-gray-100"
                  : ""
              }`}
            />

            {canEditTeacher && (
              <button
                type="button"
                onClick={() =>
                  clearSignature(
                    teacherCanvasRef,
                    "teacherSignature"
                  )
                }
                className="text-xs text-red-500 w-fit"
              >
                Clear Signature
              </button>
            )}

            <input
              type="hidden"
              {...register(
                "teacherSignature"
              )}
            />
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* PARENT SECTION */}
      {/* ================================================== */}

      <div className="border-t pt-5">
        <h2 className="font-semibold mb-4">
          Parent
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Parent Comment
            </label>

            <textarea
              {...register(
                "parentComment"
              )}
              disabled={!canEditParent}
              rows={4}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500">
              Parent Name
            </label>

            <input
              type="text"
              {...register("parentName")}
              disabled={!canEditParent}
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm disabled:bg-gray-100"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500">
              Parent Signature
            </label>

            <canvas
              ref={parentCanvasRef}
              width={600}
              height={180}
              onMouseDown={(event) =>
                canEditParent &&
                startDrawing(
                  event,
                  parentCanvasRef,
                  parentDrawing
                )
              }
              onMouseMove={(event) =>
                canEditParent &&
                draw(
                  event,
                  parentCanvasRef,
                  parentDrawing
                )
              }
              onMouseUp={() =>
                canEditParent &&
                stopDrawing(
                  parentCanvasRef,
                  parentDrawing,
                  "parentSignature"
                )
              }
              onMouseLeave={() =>
                canEditParent &&
                stopDrawing(
                  parentCanvasRef,
                  parentDrawing,
                  "parentSignature"
                )
              }
              onTouchStart={(event) =>
                canEditParent &&
                startDrawing(
                  event,
                  parentCanvasRef,
                  parentDrawing
                )
              }
              onTouchMove={(event) =>
                canEditParent &&
                draw(
                  event,
                  parentCanvasRef,
                  parentDrawing
                )
              }
              onTouchEnd={() =>
                canEditParent &&
                stopDrawing(
                  parentCanvasRef,
                  parentDrawing,
                  "parentSignature"
                )
              }
              className={`border border-gray-300 rounded-md w-full max-w-[600px] h-[130px] bg-white ${
                !canEditParent
                  ? "pointer-events-none bg-gray-100"
                  : ""
              }`}
            />

            {canEditParent && (
              <button
                type="button"
                onClick={() =>
                  clearSignature(
                    parentCanvasRef,
                    "parentSignature"
                  )
                }
                className="text-xs text-red-500 w-fit"
              >
                Clear Signature
              </button>
            )}

            <input
              type="hidden"
              {...register(
                "parentSignature"
              )}
            />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* SUBMIT */}
      {/* -------------------------------------------------- */}

      {(canEditTeacher ||
        canEditParent) && (
        <div className="flex justify-end gap-3 border-t pt-5">
          <button
            type="button"
            onClick={() =>
              setOpen(false)
            }
            className="bg-gray-200 text-gray-700 py-2 px-5 rounded-md"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="bg-badirStar text-black py-2 px-5 rounded-md"
          >
            {type === "create"
              ? "Create"
              : "Update"}
          </button>
        </div>
      )}
    </form>
  );
};

// ---------------------------------------------------------
// SMALL DISPLAY HELPER
// ---------------------------------------------------------

const valuesafe = (
  value: unknown
): string => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
};

export default WeeklyProgressForm;