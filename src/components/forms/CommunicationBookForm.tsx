"use client";

import {
  createCommunicationBook,
  updateCommunicationBook,
} from "@/lib/actions";

import { communicationBookSchema } from "@/lib/formValidationSchemas";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useFormState } from "react-dom";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { z } from "zod";

type CommunicationBookFormProps = {
  type: "create" | "update";
  data?: any;
  setOpen: (open: boolean) => void;
  relatedData?: {
    academicYears?: any[];
    students?: any[];
    classes?: any[];
    subjects?: any[];
    enrollment?: any;
  };
};

const CommunicationBookForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: CommunicationBookFormProps) => {
  // ------------------------------------------------------------
  // EXISTING COMMUNICATION BOOK
  // ------------------------------------------------------------

  const communicationBook =
    data?.communicationBook ?? data ?? {};

  const enrollment = relatedData?.enrollment;

  const academicYears =
    relatedData?.academicYears ?? [];

  const students =
    relatedData?.students ?? [];

  const classes =
    relatedData?.classes ?? [];

  const subjects =
    relatedData?.subjects ?? [];

  const existingSubjects =
    communicationBook?.subjects ??
    communicationBook?.communicationBookSubjects ??
    [];

  // ------------------------------------------------------------
// DEFAULT VALUES
// ------------------------------------------------------------

const currentAcademicYear =
  academicYears.find(
    (year) => year.isCurrent
  ) ?? academicYears[0];

// Communication Book date is a CALENDAR DATE,
// not a timezone-sensitive moment.
//
// Always use the UTC calendar portion of an existing
// database DateTime so that:
// 2026-09-29T00:00:00.000Z
// remains:
// 2026-09-29
const formatCommunicationBookDate = (
  value: Date | string | undefined
) => {
  if (!value) {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  return date
    .toISOString()
    .slice(0, 10);
};

const formattedDate =
  formatCommunicationBookDate(
    communicationBook?.date
  );

const defaultStudentId =
  communicationBook?.studentId ??
  enrollment?.studentId ??
  "";

const defaultAcademicYearId =
  communicationBook?.academicYearId ??
  enrollment?.academicYearId ??
  currentAcademicYear?.id ??
  "";

const defaultClassId =
  communicationBook?.classId ??
  enrollment?.classId ??
  "";

  // ------------------------------------------------------------
  // REACT HOOK FORM
  // ------------------------------------------------------------

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<
    z.input<typeof communicationBookSchema>,
    any,
    z.output<typeof communicationBookSchema>
  >({
    resolver: zodResolver(
      communicationBookSchema
    ),

    defaultValues: {
      id: communicationBook?.id,

      studentId: defaultStudentId,

      academicYearId:
        defaultAcademicYearId
          ? Number(defaultAcademicYearId)
          : undefined,

      classId:
        defaultClassId
          ? Number(defaultClassId)
          : undefined,

      date: formattedDate as any,

      dailyWord:
        communicationBook?.dailyWord ?? "",

      characterTrait:
        communicationBook?.characterTrait ?? "",

      teacherComment:
        communicationBook?.teacherComment ?? "",

      teacherName:
        communicationBook?.teacherName ?? "",

      teacherSignature:
        communicationBook?.teacherSignature ?? "",

      // Parent fields are deliberately not
      // editable/submitted by this form.
      parentComment: "",
      parentName: "",
      parentSignature: "",

      subjects: subjects.map(
        (subject: any) => {
          const existing =
            existingSubjects.find(
              (item: any) =>
                Number(item.subjectId) ===
                Number(subject.id)
            );

          return {
            id: existing?.id,

            subjectId: Number(subject.id),

            homeworkInstruction:
              existing?.homeworkInstruction ??
              "",

            asp:
              existing?.asp ?? "",

            parentSignature:
              existing?.parentSignature ??
              "",
          };
        }
      ),
    },
  });

  // ------------------------------------------------------------
  // SERVER ACTION
  // ------------------------------------------------------------

  const [state, formAction] =
    useFormState(
      type === "create"
        ? createCommunicationBook
        : updateCommunicationBook,
      {
        success: false,
        error: false,
      }
    );

  // ------------------------------------------------------------
  // ROUTER
  // ------------------------------------------------------------

  const router = useRouter();

  // ------------------------------------------------------------
  // TEACHER SIGNATURE
  // ------------------------------------------------------------

  const teacherSignatureRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const [isDrawing, setIsDrawing] =
    useState(false);

  // ------------------------------------------------------------
  // LOAD EXISTING TEACHER SIGNATURE
  // ------------------------------------------------------------

  useEffect(() => {
    const canvas =
      teacherSignatureRef.current;

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

    const signature =
      communicationBook?.teacherSignature;

    if (!signature) return;

    const image = new Image();

    image.onload = () => {
      context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );
    };

    image.src = signature;
  }, [
    communicationBook?.teacherSignature,
  ]);

  // ------------------------------------------------------------
  // SIGNATURE CANVAS COORDINATES
  // ------------------------------------------------------------

  const getCanvasCoordinates = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas =
      teacherSignatureRef.current;

    if (!canvas) return null;

    const rect =
      canvas.getBoundingClientRect();

    if ("touches" in event) {
      const touch =
        event.touches[0];

      return {
        x:
          ((touch.clientX -
            rect.left) /
            rect.width) *
          canvas.width,

        y:
          ((touch.clientY -
            rect.top) /
            rect.height) *
          canvas.height,
      };
    }

    return {
      x:
        ((event.clientX -
          rect.left) /
          rect.width) *
        canvas.width,

      y:
        ((event.clientY -
          rect.top) /
          rect.height) *
        canvas.height,
    };
  };

  // ------------------------------------------------------------
  // START SIGNATURE
  // ------------------------------------------------------------

  const startDrawing = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    event.preventDefault();

    const canvas =
      teacherSignatureRef.current;

    const coordinates =
      getCanvasCoordinates(event);

    if (!canvas || !coordinates)
      return;

    const context =
      canvas.getContext("2d");

    if (!context) return;

    context.beginPath();

    context.moveTo(
      coordinates.x,
      coordinates.y
    );

    setIsDrawing(true);
  };

  // ------------------------------------------------------------
  // DRAW SIGNATURE
  // ------------------------------------------------------------

  const draw = (
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) => {
    event.preventDefault();

    if (!isDrawing) return;

    const canvas =
      teacherSignatureRef.current;

    const coordinates =
      getCanvasCoordinates(event);

    if (!canvas || !coordinates)
      return;

    const context =
      canvas.getContext("2d");

    if (!context) return;

    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";

    context.lineTo(
      coordinates.x,
      coordinates.y
    );

    context.stroke();
  };

  // ------------------------------------------------------------
  // STOP SIGNATURE
  // ------------------------------------------------------------

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    const canvas =
      teacherSignatureRef.current;

    if (!canvas) return;

    setValue(
      "teacherSignature",
      canvas.toDataURL("image/png"),
      {
        shouldDirty: true,
      }
    );
  };

  // ------------------------------------------------------------
  // CLEAR SIGNATURE
  // ------------------------------------------------------------

  const clearTeacherSignature = () => {
    const canvas =
      teacherSignatureRef.current;

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

    setValue(
      "teacherSignature",
      "",
      {
        shouldDirty: true,
      }
    );
  };

  // ------------------------------------------------------------
  // SUBMIT
  // ------------------------------------------------------------

  const onSubmit = handleSubmit(
    (
      values: z.output<
        typeof communicationBookSchema
      >
    ) => {
      console.log(
        "COMMUNICATION BOOK SUBMIT:",
        values
      );

      const formData =
        new FormData();

      // --------------------------------------------------------
      // ID
      // --------------------------------------------------------

      if (
        values.id !== undefined
      ) {
        formData.append(
          "id",
          String(values.id)
        );
      }

      // --------------------------------------------------------
      // BASIC INFORMATION
      // --------------------------------------------------------

      formData.append(
        "studentId",
        values.studentId
      );

      formData.append(
        "academicYearId",
        String(
          values.academicYearId
        )
      );

      formData.append(
        "classId",
        String(values.classId)
      );

      formData.append(
        "date",
        String(values.date)
      );

      // --------------------------------------------------------
      // DAILY WORD
      // --------------------------------------------------------

      formData.append(
        "dailyWord",
        values.dailyWord ?? ""
      );

      // --------------------------------------------------------
      // CHARACTER TRAIT
      // --------------------------------------------------------

      formData.append(
        "characterTrait",
        values.characterTrait ?? ""
      );

      // --------------------------------------------------------
      // TEACHER FIELDS
      // --------------------------------------------------------

      formData.append(
        "teacherComment",
        values.teacherComment ?? ""
      );

      formData.append(
        "teacherName",
        values.teacherName ?? ""
      );

      formData.append(
        "teacherSignature",
        values.teacherSignature ?? ""
      );

      // --------------------------------------------------------
      // PARENT FIELDS
      //
      // Deliberately NOT submitted here.
      // Parent editing has its own server-side action.
      // --------------------------------------------------------

      // --------------------------------------------------------
      // SUBJECTS
      //
      // IMPORTANT:
      // Only save subjects having:
      //
      // Homework / Instruction
      // OR
      // ASP
      //
      // Empty subjects are not saved.
      // --------------------------------------------------------

      const subjectsToSubmit =
        values.subjects
          ?.filter(
            (subject) =>
              Boolean(
                subject.homeworkInstruction?.trim()
              ) ||
              Boolean(
                subject.asp?.trim()
              )
          )
          .map((subject) => ({
            id: subject.id,

            subjectId:
              Number(
                subject.subjectId
              ),

            homeworkInstruction:
              subject.homeworkInstruction?.trim() ??
              "",

            asp:
              subject.asp?.trim() ??
              "",
          })) ?? [];

      formData.append(
        "subjects",
        JSON.stringify(
          subjectsToSubmit
        )
      );

      console.log(
        "COMMUNICATION BOOK FORM DATA ID:",
        formData.get("id")
      );

      console.log(
        "COMMUNICATION BOOK SUBJECTS TO SAVE:",
        subjectsToSubmit
      );

      // --------------------------------------------------------
      // SAME PATTERN AS CLASSFORM
      // --------------------------------------------------------

      formAction(formData);
    }
  );

  // ------------------------------------------------------------
  // SUCCESS / ERROR
  //
  // SAME PROJECT PATTERN AS CLASSFORM
  // ------------------------------------------------------------

  useEffect(() => {
    console.log(
      "COMMUNICATION BOOK FORM STATE:",
      state
    );

    if (state.success) {
      toast(
        `Communication Book has been ${
          type === "create"
            ? "created"
            : "updated"
        }!`
      );

      setOpen(false);

      router.refresh();
    }

    if (state.error) {
      toast.error(
        "Something went wrong!"
      );
    }
  }, [
    state,
    router,
    type,
    setOpen,
  ]);

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={onSubmit}
    >
      {/* ======================================================
          TITLE
      ====================================================== */}

      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create Communication Book"
          : "Update Communication Book"}
      </h1>

      {/* ======================================================
          BASIC INFORMATION
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* STUDENT */}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Student
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-gray-100"
            {...register("studentId")}
            defaultValue={
              defaultStudentId
            }
            disabled
          >
            <option value="">
              Select Student
            </option>

            {students.map(
              (student: any) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {student.id} -{" "}
                  {student.name}{" "}
                  {student.surname}
                </option>
              )
            )}
          </select>

          {errors.studentId
            ?.message && (
            <p className="text-xs text-red-500">
              {String(
                errors.studentId
                  .message
              )}
            </p>
          )}
        </div>

        {/* ACADEMIC YEAR */}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Academic Year
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-gray-100"
            {...register(
              "academicYearId"
            )}
            defaultValue={
              defaultAcademicYearId
            }
            disabled
          >
            <option value="">
              Select Academic Year
            </option>

            {academicYears.map(
              (year: any) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                </option>
              )
            )}
          </select>

          {errors.academicYearId
            ?.message && (
            <p className="text-xs text-red-500">
              {String(
                errors.academicYearId
                  .message
              )}
            </p>
          )}
        </div>

        {/* CLASS */}

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Class
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full bg-gray-100"
            {...register("classId")}
            defaultValue={
              defaultClassId
            }
            disabled
          >
            <option value="">
              Select Class
            </option>

            {classes.map(
              (classItem: any) => (
                <option
                  key={classItem.id}
                  value={classItem.id}
                >
                  {classItem.name}
                </option>
              )
            )}
          </select>

          {errors.classId
            ?.message && (
            <p className="text-xs text-red-500">
              {String(
                errors.classId.message
              )}
            </p>
          )}
        </div>
      </div>

      {/* ======================================================
          DATE
      ====================================================== */}

      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500">
          Date
        </label>

        <input
          type="date"
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register("date")}
        />

        {errors.date?.message && (
          <p className="text-xs text-red-500">
            {String(
              errors.date.message
            )}
          </p>
        )}
      </div>

      {/* ======================================================
          DAILY WORD + CHARACTER TRAIT
      ====================================================== */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Daily Word
          </label>

          <input
            type="text"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register(
              "dailyWord"
            )}
            placeholder="Daily Word"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">
            Character Trait
          </label>

          <input
            type="text"
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register(
              "characterTrait"
            )}
            placeholder="Character Trait"
          />
        </div>
      </div>

      {/* ======================================================
          SUBJECTS
      ====================================================== */}

      <div className="flex flex-col gap-3">

        <h2 className="text-sm font-semibold">
          Daily Subjects
        </h2>

        <div className="overflow-x-auto">

          <table className="w-full border border-gray-300 text-sm">

            <thead>
              <tr className="bg-gray-100">

                <th className="border border-gray-300 p-2 text-left">
                  Subject
                </th>

                <th className="border border-gray-300 p-2 text-left">
                  Homework / Instruction
                </th>

                <th className="border border-gray-300 p-2 text-left">
                  ASP
                </th>

              </tr>
            </thead>

            <tbody>
              {subjects.map(
                (
                  subject: any,
                  index: number
                ) => (
                  <tr
                    key={subject.id}
                  >

                    <td className="border border-gray-300 p-2 font-medium">
                      {subject.name}

                      <input
                        type="hidden"
                        {...register(
                          `subjects.${index}.subjectId`
                        )}
                        value={subject.id}
                      />

                      {existingSubjects.find(
                        (item: any) =>
                          Number(
                            item.subjectId
                          ) ===
                          Number(
                            subject.id
                          )
                      )?.id && (
                        <input
                          type="hidden"
                          {...register(
                            `subjects.${index}.id`
                          )}
                          value={
                            existingSubjects.find(
                              (
                                item: any
                              ) =>
                                Number(
                                  item.subjectId
                                ) ===
                                Number(
                                  subject.id
                                )
                            )?.id
                          }
                        />
                      )}
                    </td>

                    <td className="border border-gray-300 p-2">
                      <textarea
                        rows={2}
                        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                        {...register(
                          `subjects.${index}.homeworkInstruction`
                        )}
                        placeholder="Homework / Instruction"
                      />
                    </td>

                    <td className="border border-gray-300 p-2">
                      <textarea
                        rows={2}
                        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
                        {...register(
                          `subjects.${index}.asp`
                        )}
                        placeholder="ASP"
                      />
                    </td>

                  </tr>
                )
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* ======================================================
          TEACHER COMMENT
      ====================================================== */}

      <div className="flex flex-col gap-2">

        <label className="text-xs text-gray-500">
          Teacher Comment
        </label>

        <textarea
          rows={4}
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register(
            "teacherComment"
          )}
          placeholder="Teacher Comment"
        />

      </div>

      {/* ======================================================
          TEACHER NAME
      ====================================================== */}

      <div className="flex flex-col gap-2">

        <label className="text-xs text-gray-500">
          Teacher Name
        </label>

        <input
          type="text"
          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
          {...register(
            "teacherName"
          )}
          placeholder="Teacher Name"
        />

      </div>

      {/* ======================================================
          TEACHER SIGNATURE
      ====================================================== */}

      <div className="flex flex-col gap-2">

        <label className="text-xs text-gray-500">
          Teacher Signature
        </label>

        <div className="border border-gray-300 rounded-md p-2 bg-white">

          <canvas
            ref={
              teacherSignatureRef
            }
            width={600}
            height={180}
            className="w-full h-[130px] touch-none cursor-crosshair bg-white"
            onMouseDown={
              startDrawing
            }
            onMouseMove={
              draw
            }
            onMouseUp={
              stopDrawing
            }
            onMouseLeave={
              stopDrawing
            }
            onTouchStart={
              startDrawing
            }
            onTouchMove={
              draw
            }
            onTouchEnd={
              stopDrawing
            }
          />

        </div>

        <div className="flex gap-2">

          <button
            type="button"
            onClick={
              clearTeacherSignature
            }
            className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            Clear Signature
          </button>

        </div>

      </div>

      {/* ======================================================
          SERVER ERROR
      ====================================================== */}

      {state.error && (
        <span className="text-red-500 text-sm">
          Something went wrong!
        </span>
      )}

      {/* ======================================================
          SUBMIT
      ====================================================== */}

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

export default CommunicationBookForm;