"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
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
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
  { key: "spelling", label: "Spelling" },
  { key: "comprehension", label: "Comprehension" },
  { key: "computation", label: "Computation" },
  { key: "punctuality", label: "Punctuality" },
  { key: "uniform", label: "Uniform" },
  { key: "materialHandling", label: "Material Handling" },
  { key: "direction", label: "Direction" },
  { key: "completion", label: "Completion" },
  { key: "englishUse", label: "English Use" },
  { key: "workEthics", label: "Work Ethics" },
  { key: "skills", label: "Skills" },
  { key: "overallProgress", label: "Overall Progress" },
] as const;

const EVALUATION_KEY = [
  { value: "A", label: "Excellent", range: "90–100" },
  { value: "B", label: "Very Good", range: "80–89" },
  { value: "C", label: "Average", range: "76–79" },
  { value: "D", label: "Poor", range: "50–75" },
  { value: "E", label: "Fail", range: "<50" },
] as const;

const EVALUATION_OPTIONS = EVALUATION_KEY.map(
  ({ value, label }) => ({
    value,
    label: `${value} - ${label}`,
  })
);

type SignaturePadProps = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/* ============================================================
   SIGNATURE PAD

   IMPORTANT:
   The canvas has an internal size of 600 x 180.

   The displayed canvas can be smaller/larger because of
   responsive CSS.

   Pointer coordinates are therefore converted from the
   displayed CSS size to the real canvas coordinate system.
============================================================ */

function SignaturePad({
  value,
  onChange,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 180;

  const getContext = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    return context;
  };

  /*
   * Convert the pointer's CSS/browser coordinates into the
   * canvas's actual 600 x 180 coordinate system.
   *
   * This is the important fix for the pointer offset.
   */
  const getPosition = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const prepareCanvas = () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
  };

  /*
   * Draw an existing saved signature when the value changes.
   */
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    prepareCanvas();

    if (!value) {
      return;
    }

    const image = new Image();

    image.onload = () => {
      const currentCanvas = canvasRef.current;

      if (!currentCanvas) {
        return;
      }

      const currentContext =
        currentCanvas.getContext("2d");

      if (!currentContext) {
        return;
      }

      currentContext.clearRect(
        0,
        0,
        currentCanvas.width,
        currentCanvas.height
      );

      currentContext.drawImage(
        image,
        0,
        0,
        currentCanvas.width,
        currentCanvas.height
      );

      prepareCanvas();
    };

    image.src = value;
  }, [value]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (disabled) {
      return;
    }

    event.preventDefault();

    const canvas = canvasRef.current;
    const context = getContext();

    if (!canvas || !context) {
      return;
    }

    drawingRef.current = true;

    /*
     * Capture this pointer so that if the pointer moves
     * slightly outside the canvas, the same stroke continues
     * until pointerup/pointercancel.
     */
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Some environments may not support pointer capture.
    }

    const { x, y } = getPosition(event);

    prepareCanvas();

    context.beginPath();
    context.moveTo(x, y);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (disabled || !drawingRef.current) {
      return;
    }

    event.preventDefault();

    const context = getContext();

    if (!context) {
      return;
    }

    const { x, y } = getPosition(event);

    context.lineTo(x, y);
    context.stroke();
  };

  const finishDrawing = (
    event?: ReactPointerEvent<HTMLCanvasElement>
  ) => {
    if (disabled || !drawingRef.current) {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    drawingRef.current = false;

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (context) {
      context.closePath();
    }

    /*
     * Release pointer capture after the stroke is complete.
     */
    if (
      event &&
      canvas.hasPointerCapture?.(event.pointerId)
    ) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore unsupported releasePointerCapture errors.
      }
    }

    /*
     * Save the signature using the real canvas dimensions.
     */
    onChange(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    if (disabled) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    prepareCanvas();

    drawingRef.current = false;

    onChange("");
  };

  return (
    <div className="space-y-2">
      <div
        className={`overflow-hidden rounded-md border ${
          disabled
            ? "border-gray-300 bg-gray-100"
            : "border-gray-400 bg-white"
        }`}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={`block h-auto w-full ${
            disabled
              ? "cursor-default"
              : "cursor-crosshair touch-none"
          }`}
          style={{
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
        />
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
        >
          Clear Signature
        </button>
      )}
    </div>
  );
}

function getFullName(person: any) {
  if (!person) {
    return "";
  }

  return [
    person.name,
    person.middleName,
    person.surname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function calculateAge(
  birthday: string | Date | null | undefined
) {
  if (!birthday) {
    return "";
  }

  const birthDate = new Date(birthday);

  if (Number.isNaN(birthDate.getTime())) {
    return "";
  }

  const today = new Date();

  let age =
    today.getFullYear() - birthDate.getFullYear();

  const monthDifference =
    today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age >= 0 ? String(age) : "";
}

function getGradeName(grade: any) {
  if (!grade) {
    return "";
  }

  return grade.name ?? grade.levelName ?? "";
}

function getSectionName(reportCard: any) {
  return (
    reportCard?.class?.name ??
    reportCard?.enrollment?.class?.name ??
    reportCard?.className ??
    ""
  );
}

function getRollNumber(reportCard: any) {
  return (
    reportCard?.rollNumber ??
    reportCard?.enrollment?.rollNumber ??
    reportCard?.studentEnrollment?.rollNumber ??
    ""
  );
}

function getAcademicYearName(reportCard: any) {
  return (
    reportCard?.academicYear?.name ??
    reportCard?.academicYear?.year ??
    reportCard?.academicYearName ??
    ""
  );
}

function getStudentResults(reportCard: any) {
  return (
    reportCard?.subjectResults ??
    reportCard?.results ??
    reportCard?.subjectsResults ??
    []
  );
}

function getResultValue(
  result: any,
  semester: "SEMESTER1" | "SEMESTER2"
) {
  if (!result) {
    return "";
  }

  if (semester === "SEMESTER1") {
    return (
      result.semester1 ??
      result.semester1Result ??
      result.s1 ??
      result.S1 ??
      result.firstSemester ??
      ""
    );
  }

  return (
    result.semester2 ??
    result.semester2Result ??
    result.s2 ??
    result.S2 ??
    result.secondSemester ??
    ""
  );
}

function getAverageValue(result: any) {
  if (!result) {
    return "";
  }

  return (
    result.average ??
    result.annualAverage ??
    result.annual ??
    ""
  );
}

function formatResult(value: any) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return numberValue.toFixed(2);
}

function getPromotionText(reportCard: any) {
  if (reportCard?.promotionStatus) {
    return reportCard.promotionStatus;
  }

  if (reportCard?.promotedGrade) {
    return `Promoted to ${getGradeName(
      reportCard.promotedGrade
    )}`;
  }

  if (reportCard?.detainedGrade) {
    return `Detained in ${getGradeName(
      reportCard.detainedGrade
    )}`;
  }

  if (reportCard?.promotion?.promotedGrade) {
    return `Promoted to ${getGradeName(
      reportCard.promotion.promotedGrade
    )}`;
  }

  if (reportCard?.promotion?.detainedGrade) {
    return `Detained in ${getGradeName(
      reportCard.promotion.detainedGrade
    )}`;
  }

  return "Not yet determined";
}

export default function ReportCardForm({
  type,
  data,
  setOpen,
  relatedData,
}: ReportCardFormProps) {
  const router = useRouter();

  console.log("REPORT CARD FORM RENDERED", {
    type,
    data,
    relatedData,
  });

  const reportCard = data?.reportCard ?? data ?? {};

  /*
   * The role is intentionally NOT guessed.
   *
   * Teacher signature editing is allowed only when the page
   * explicitly provides role === "teacher".
   *
   * Managing Director signature editing is allowed only for admin.
   *
   * The server action remains the final authorization layer.
   */
  const role =
    relatedData?.role ??
    reportCard?.role ??
    data?.role ??
    "";

  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  const semester1 =
    reportCard?.semesters?.find(
      (item: any) =>
        item.semester === "SEMESTER1"
    ) ??
    reportCard?.semester1 ??
    {};

  const semester2 =
    reportCard?.semesters?.find(
      (item: any) =>
        item.semester === "SEMESTER2"
    ) ??
    reportCard?.semester2 ??
    {};

  const semester1Skills =
    reportCard?.basicSkills?.find(
      (item: any) =>
        item.semester === "SEMESTER1"
    ) ??
    reportCard?.semester1Skills ??
    {};

  const semester2Skills =
    reportCard?.basicSkills?.find(
      (item: any) =>
        item.semester === "SEMESTER2"
    ) ??
    reportCard?.semester2Skills ??
    {};

  const student = reportCard?.student ?? {};

  const parent =
    student?.parent ??
    reportCard?.parent ??
    {};

  const parentName =
    reportCard?.parentName ??
    getFullName(parent);

  const currentGrade =
    reportCard?.currentGrade ??
    reportCard?.grade ??
    reportCard?.class?.grade ??
    reportCard?.enrollment?.class?.grade ??
    {};

  const studentName =
    reportCard?.studentName ??
    getFullName(student);

  const age =
    reportCard?.age ??
    calculateAge(student?.birthday);

  const sex =
    reportCard?.sex ??
    student?.sex ??
    "";

  const section =
    reportCard?.section ??
    getSectionName(reportCard);

  const rollNumber =
    getRollNumber(reportCard);

  const academicYear =
    getAcademicYearName(reportCard);

  const semester1TeacherName =
    semester1?.homeroomTeacherName ??
    getFullName(
      semester1?.homeroomTeacher
    ) ??
    reportCard?.homeroomTeacherName ??
    getFullName(
      reportCard?.homeroomTeacher
    ) ??
    "";

  const semester2TeacherName =
    semester2?.homeroomTeacherName ??
    getFullName(
      semester2?.homeroomTeacher
    ) ??
    reportCard?.homeroomTeacherName ??
    getFullName(
      reportCard?.homeroomTeacher
    ) ??
    "";

  const managingDirectorName =
    reportCard?.managingDirectorName ??
    getFullName(
      reportCard?.managingDirector
    ) ??
    "";

  const promotionText =
    getPromotionText(reportCard);

  const results =
    getStudentResults(reportCard);

  const classRank =
    reportCard?.classRank ??
    reportCard?.rank ??
    "";

  const classSize =
    reportCard?.classSize ??
    reportCard?.numberOfStudents ??
    "";

  const absence =
    reportCard?.absence ??
    reportCard?.absentDays ??
    reportCard?.attendance?.absentDays ??
    "";

  const studentAverage =
    reportCard?.studentAverage ??
    reportCard?.annualAverage ??
    reportCard?.average ??
    "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<
    z.input<typeof reportCardSchema>,
    any,
    ReportCardSchema
  >({
    resolver: zodResolver(reportCardSchema),

    defaultValues: {
      id: Number(reportCard?.id ?? 0),

      conductSemester1:
        semester1?.conduct ?? "",

      conductSemester2:
        semester2?.conduct ?? "",

      commentSemester1:
        semester1?.comment ?? "",

      commentSemester2:
        semester2?.comment ?? "",

      teacherSignatureSemester1:
        semester1?.homeroomTeacherSignature ?? "",

      teacherSignatureSemester2:
        semester2?.homeroomTeacherSignature ?? "",

      managingDirectorSignature:
        reportCard?.managingDirectorSignature ?? "",

      semester1Skills: {
        reading:
          semester1Skills?.reading ?? "",
        writing:
          semester1Skills?.writing ?? "",
        spelling:
          semester1Skills?.spelling ?? "",
        comprehension:
          semester1Skills?.comprehension ?? "",
        computation:
          semester1Skills?.computation ?? "",
        punctuality:
          semester1Skills?.punctuality ?? "",
        uniform:
          semester1Skills?.uniform ?? "",
        materialHandling:
          semester1Skills?.materialHandling ?? "",
        direction:
          semester1Skills?.direction ?? "",
        completion:
          semester1Skills?.completion ?? "",
        englishUse:
          semester1Skills?.englishUse ?? "",
        workEthics:
          semester1Skills?.workEthics ?? "",
        skills:
          semester1Skills?.skills ?? "",
        overallProgress:
          semester1Skills?.overallProgress ?? "",
      },

      semester2Skills: {
        reading:
          semester2Skills?.reading ?? "",
        writing:
          semester2Skills?.writing ?? "",
        spelling:
          semester2Skills?.spelling ?? "",
        comprehension:
          semester2Skills?.comprehension ?? "",
        computation:
          semester2Skills?.computation ?? "",
        punctuality:
          semester2Skills?.punctuality ?? "",
        uniform:
          semester2Skills?.uniform ?? "",
        materialHandling:
          semester2Skills?.materialHandling ?? "",
        direction:
          semester2Skills?.direction ?? "",
        completion:
          semester2Skills?.completion ?? "",
        englishUse:
          semester2Skills?.englishUse ?? "",
        workEthics:
          semester2Skills?.workEthics ?? "",
        skills:
          semester2Skills?.skills ?? "",
        overallProgress:
          semester2Skills?.overallProgress ?? "",
      },
    },
  });

  /*
   * Keep the form synchronized if the report-card data changes.
   */
  useEffect(() => {
    reset({
      id: Number(reportCard?.id ?? 0),

      conductSemester1:
        semester1?.conduct ?? "",

      conductSemester2:
        semester2?.conduct ?? "",

      commentSemester1:
        semester1?.comment ?? "",

      commentSemester2:
        semester2?.comment ?? "",

      teacherSignatureSemester1:
        semester1?.homeroomTeacherSignature ?? "",

      teacherSignatureSemester2:
        semester2?.homeroomTeacherSignature ?? "",

      managingDirectorSignature:
        reportCard?.managingDirectorSignature ?? "",

      semester1Skills: {
        reading:
          semester1Skills?.reading ?? "",
        writing:
          semester1Skills?.writing ?? "",
        spelling:
          semester1Skills?.spelling ?? "",
        comprehension:
          semester1Skills?.comprehension ?? "",
        computation:
          semester1Skills?.computation ?? "",
        punctuality:
          semester1Skills?.punctuality ?? "",
        uniform:
          semester1Skills?.uniform ?? "",
        materialHandling:
          semester1Skills?.materialHandling ?? "",
        direction:
          semester1Skills?.direction ?? "",
        completion:
          semester1Skills?.completion ?? "",
        englishUse:
          semester1Skills?.englishUse ?? "",
        workEthics:
          semester1Skills?.workEthics ?? "",
        skills:
          semester1Skills?.skills ?? "",
        overallProgress:
          semester1Skills?.overallProgress ?? "",
      },

      semester2Skills: {
        reading:
          semester2Skills?.reading ?? "",
        writing:
          semester2Skills?.writing ?? "",
        spelling:
          semester2Skills?.spelling ?? "",
        comprehension:
          semester2Skills?.comprehension ?? "",
        computation:
          semester2Skills?.computation ?? "",
        punctuality:
          semester2Skills?.punctuality ?? "",
        uniform:
          semester2Skills?.uniform ?? "",
        materialHandling:
          semester2Skills?.materialHandling ?? "",
        direction:
          semester2Skills?.direction ?? "",
        completion:
          semester2Skills?.completion ?? "",
        englishUse:
          semester2Skills?.englishUse ?? "",
        workEthics:
          semester2Skills?.workEthics ?? "",
        skills:
          semester2Skills?.skills ?? "",
        overallProgress:
          semester2Skills?.overallProgress ?? "",
      },
    });
  }, [
    reset,
    reportCard?.id,
    reportCard?.managingDirectorSignature,
    semester1?.conduct,
    semester1?.comment,
    semester1?.homeroomTeacherSignature,
    semester2?.conduct,
    semester2?.comment,
    semester2?.homeroomTeacherSignature,
    semester1Skills?.reading,
    semester1Skills?.writing,
    semester1Skills?.spelling,
    semester1Skills?.comprehension,
    semester1Skills?.computation,
    semester1Skills?.punctuality,
    semester1Skills?.uniform,
    semester1Skills?.materialHandling,
    semester1Skills?.direction,
    semester1Skills?.completion,
    semester1Skills?.englishUse,
    semester1Skills?.workEthics,
    semester1Skills?.skills,
    semester1Skills?.overallProgress,
    semester2Skills?.reading,
    semester2Skills?.writing,
    semester2Skills?.spelling,
    semester2Skills?.comprehension,
    semester2Skills?.computation,
    semester2Skills?.punctuality,
    semester2Skills?.uniform,
    semester2Skills?.materialHandling,
    semester2Skills?.direction,
    semester2Skills?.completion,
    semester2Skills?.englishUse,
    semester2Skills?.workEthics,
    semester2Skills?.skills,
    semester2Skills?.overallProgress,
  ]);

  const teacherSignatureSemester1 = watch(
    "teacherSignatureSemester1"
  );

  const teacherSignatureSemester2 = watch(
    "teacherSignatureSemester2"
  );

  const managingDirectorSignature = watch(
    "managingDirectorSignature"
  );

  const onSubmit = async (
    formData: ReportCardSchema
  ) => {
    try {
      const result = await updateReportCard(
        {
          success: false,
          error: false,
        },
        formData
      );

      if (result?.success) {
        toast.success(
          "Report card information saved successfully."
        );

        setOpen(false);
        router.refresh();

        return;
      }

      if (result?.error === "unauthorized") {
        toast.error(
          "You are not authorized to update this report card."
        );
        return;
      }

      if (
        result?.error ===
        "report-card-not-found"
      ) {
        toast.error("Report card not found.");
        return;
      }

      if (
        result?.error ===
        "student-enrollment-not-found"
      ) {
        toast.error(
          "Student enrollment was not found for this academic year."
        );
        return;
      }

      if (result?.error === "teacher-not-found") {
        toast.error(
          "Teacher account was not found."
        );
        return;
      }

      toast.error(
        "Unable to save the report card."
      );
    } catch (error) {
      console.error(
        "REPORT CARD FORM ERROR:",
        error
      );

      toast.error(
        "An unexpected error occurred while saving the report card."
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-6"
    >
      {/* =========================================================
          HIDDEN ID
      ========================================================= */}

      <input
        type="hidden"
        {...register("id")}
      />

      {/* =========================================================
          HEADER
      ========================================================= */}

      <div className="border-b pb-5 text-center">
        <div className="flex items-center justify-center gap-4">
          {reportCard?.school?.logo ? (
            <img
              src={reportCard.school.logo}
              alt="School Logo"
              className="h-16 w-16 object-contain"
            />
          ) : null}

          <div>
            <h1 className="text-xl font-bold">
              Student Report Card
            </h1>

            {reportCard?.school
              ?.nameAfaanOromoo && (
              <p className="text-sm font-semibold">
                {
                  reportCard.school
                    .nameAfaanOromoo
                }
              </p>
            )}

            {reportCard?.school
              ?.nameAmharic && (
              <p className="text-sm font-semibold">
                {
                  reportCard.school
                    .nameAmharic
                }
              </p>
            )}

            {reportCard?.school
              ?.nameEnglish && (
              <p className="text-sm font-semibold">
                {
                  reportCard.school
                    .nameEnglish
                }
              </p>
            )}

            {reportCard?.school?.motto && (
              <p className="text-xs italic text-gray-600">
                {reportCard.school.motto}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================
          AUTOMATIC STUDENT INFORMATION
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Student Information
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Student Name
            </label>

            <input
              value={studentName}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Age
            </label>

            <input
              value={age}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Sex
            </label>

            <input
              value={sex}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Grade
            </label>

            <input
              value={getGradeName(currentGrade)}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Section
            </label>

            <input
              value={section}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Roll Number
            </label>

            <input
              value={rollNumber}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <input
              value={academicYear}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          AUTOMATIC ACADEMIC RESULTS
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Academic Results
        </h2>

        {results.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">
                    Subject
                  </th>

                  <th className="border p-2 text-center">
                    Semester 1
                  </th>

                  <th className="border p-2 text-center">
                    Semester 2
                  </th>

                  <th className="border p-2 text-center">
                    Annual Average
                  </th>
                </tr>
              </thead>

              <tbody>
                {results.map(
                  (
                    result: any,
                    index: number
                  ) => (
                    <tr
                      key={
                        result.id ?? index
                      }
                    >
                      <td className="border p-2">
                        {result.subjectName ??
                          result.subject?.name ??
                          result.subject ??
                          "-"}
                      </td>

                      <td className="border p-2 text-center">
                        {formatResult(
                          getResultValue(
                            result,
                            "SEMESTER1"
                          )
                        )}
                      </td>

                      <td className="border p-2 text-center">
                        {formatResult(
                          getResultValue(
                            result,
                            "SEMESTER2"
                          )
                        )}
                      </td>

                      <td className="border p-2 text-center">
                        {formatResult(
                          getAverageValue(
                            result
                          )
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            Academic results are automatically
            calculated from submitted assessment
            results and are not editable from the
            report-card form.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Student Annual Average
            </label>

            <input
              value={formatResult(
                studentAverage
              )}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Class Rank
            </label>

            <input
              value={
                classRank === ""
                  ? "-"
                  : String(classRank)
              }
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Number of Students
            </label>

            <input
              value={
                classSize === ""
                  ? "-"
                  : String(classSize)
              }
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Absence
            </label>

            <input
              value={
                absence === ""
                  ? "-"
                  : String(absence)
              }
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          CONDUCT
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Conduct
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Semester 1 Conduct
            </label>

            <select
              {...register(
                "conductSemester1"
              )}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            >
              <option value="">
                Select Evaluation
              </option>

              {EVALUATION_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Semester 2 Conduct
            </label>

            <select
              {...register(
                "conductSemester2"
              )}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
            >
              <option value="">
                Select Evaluation
              </option>

              {EVALUATION_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      {/* =========================================================
          EVALUATION KEY
      ========================================================= */}

      <section className="rounded-md border bg-gray-50 p-4">
        <h2 className="mb-3 text-lg font-semibold">
          Evaluation Key
        </h2>

        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
          {EVALUATION_OPTIONS.map(
            (option) => (
              <div key={option.value}>
                <span className="font-semibold">
                  {option.value}
                </span>{" "}
                -{" "}
                {option.label.replace(
                  `${option.value} - `,
                  ""
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* =========================================================
          HOMEROOM TEACHER COMMENTS
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Homeroom Teacher Comments
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Semester 1 Comment
            </label>

            <textarea
              {...register(
                "commentSemester1"
              )}
              rows={6}
              placeholder="Enter Semester 1 homeroom teacher comment..."
              className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Semester 2 Comment
            </label>

            <textarea
              {...register(
                "commentSemester2"
              )}
              rows={6}
              placeholder="Enter Semester 2 homeroom teacher comment..."
              className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          PARENT INFORMATION
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Parent Information
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Parent Name
            </label>

            <input
              value={parentName}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              Parent name is automatically taken
              from the student's parent record.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Parent Signature
            </label>

            <div className="flex h-[130px] items-end rounded-md border border-dashed border-gray-400 bg-white p-4">
              <div className="w-full border-b border-gray-500 pb-2 text-center text-xs text-gray-500">
                Parent signature — sign manually
                on the printed report card
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROMOTION / DETENTION
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Promotion Status
        </h2>

        <div className="rounded-md border border-gray-300 bg-gray-100 p-4">
          <p className="text-sm font-semibold">
            {promotionText}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Promotion or detention is automatically
            determined from the school's promotion
            policy and the student's annual result.
          </p>
        </div>
      </section>

      {/* =========================================================
          BASIC SKILLS
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Basic Skills
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">
                  Skill
                </th>

                <th className="border p-2 text-center">
                  Semester 1
                </th>

                <th className="border p-2 text-center">
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
                      className="w-full rounded-md border border-gray-300 bg-white p-2"
                    >
                      <option value="">
                        Select
                      </option>

                      {EVALUATION_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.value}
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
                      className="w-full rounded-md border border-gray-300 bg-white p-2"
                    >
                      <option value="">
                        Select
                      </option>

                      {EVALUATION_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.value}
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
      </section>

      {/* =========================================================
          HOMEROOM TEACHER SIGNATURES
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Homeroom Teacher Signatures
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Semester 1 */}
          <div className="rounded-md border p-4">
            <h3 className="mb-3 font-semibold">
              Semester 1
            </h3>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Homeroom Teacher Name
              </label>

              <input
                value={semester1TeacherName}
                readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
              />
            </div>

            <label className="mb-1 block text-sm font-medium">
              Digital Signature
            </label>

            <SignaturePad
              value={
                teacherSignatureSemester1
              }
              onChange={(value) =>
                setValue(
                  "teacherSignatureSemester1",
                  value,
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  }
                )
              }
              disabled={!isTeacher}
            />

            {!isTeacher && (
              <p className="mt-2 text-xs text-gray-500">
                The homeroom teacher signature can
                only be entered by the assigned
                homeroom teacher.
              </p>
            )}
          </div>

          {/* Semester 2 */}
          <div className="rounded-md border p-4">
            <h3 className="mb-3 font-semibold">
              Semester 2
            </h3>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                Homeroom Teacher Name
              </label>

              <input
                value={semester2TeacherName}
                readOnly
                className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
              />
            </div>

            <label className="mb-1 block text-sm font-medium">
              Digital Signature
            </label>

            <SignaturePad
              value={
                teacherSignatureSemester2
              }
              onChange={(value) =>
                setValue(
                  "teacherSignatureSemester2",
                  value,
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  }
                )
              }
              disabled={!isTeacher}
            />

            {!isTeacher && (
              <p className="mt-2 text-xs text-gray-500">
                The homeroom teacher signature can
                only be entered by the assigned
                homeroom teacher.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          MANAGING DIRECTOR
      ========================================================= */}

      <section className="rounded-md border p-4">
        <h2 className="mb-4 text-lg font-semibold">
          Managing Director
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Managing Director Name
            </label>

            <input
              value={managingDirectorName}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 text-sm"
            />

            <p className="mt-1 text-xs text-gray-500">
              The managing director name is
              automatically taken from the school
              administration record.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Managing Director Digital Signature
            </label>

            <SignaturePad
              value={
                managingDirectorSignature
              }
              onChange={(value) =>
                setValue(
                  "managingDirectorSignature",
                  value,
                  {
                    shouldDirty: true,
                    shouldValidate: true,
                  }
                )
              }
              disabled={!isAdmin}
            />

            {!isAdmin && (
              <p className="mt-2 text-xs text-gray-500">
                Only the administrator can enter or
                change the managing director digital
                signature.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================
          AUTOMATIC FIELD SUMMARY
      ========================================================= */}

      <section className="rounded-md border bg-gray-50 p-4">
        <h2 className="mb-3 text-lg font-semibold">
          Automatic Report Card Information
        </h2>

        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
          <p>
            <span className="font-semibold">
              Student:
            </span>{" "}
            {studentName || "-"}
          </p>

          <p>
            <span className="font-semibold">
              Grade:
            </span>{" "}
            {getGradeName(currentGrade) ||
              "-"}
          </p>

          <p>
            <span className="font-semibold">
              Section:
            </span>{" "}
            {section || "-"}
          </p>

          <p>
            <span className="font-semibold">
              Roll Number:
            </span>{" "}
            {rollNumber || "-"}
          </p>

          <p>
            <span className="font-semibold">
              Academic Year:
            </span>{" "}
            {academicYear || "-"}
          </p>

          <p>
            <span className="font-semibold">
              Parent:
            </span>{" "}
            {parentName || "-"}
          </p>

          <p>
            <span className="font-semibold">
              Homeroom Teacher:
            </span>{" "}
            {semester1TeacherName ||
              semester2TeacherName ||
              "-"}
          </p>

          <p>
            <span className="font-semibold">
              Managing Director:
            </span>{" "}
            {managingDirectorName || "-"}
          </p>

          <p>
            <span className="font-semibold">
              Promotion Status:
            </span>{" "}
            {promotionText}
          </p>

          <p>
            <span className="font-semibold">
              Class Rank:
            </span>{" "}
            {classRank === ""
              ? "-"
              : classRank}
          </p>

          <p>
            <span className="font-semibold">
              Class Size:
            </span>{" "}
            {classSize === ""
              ? "-"
              : classSize}
          </p>

          <p>
            <span className="font-semibold">
              Absence:
            </span>{" "}
            {absence === ""
              ? "-"
              : absence}
          </p>
        </div>
      </section>

      {/* =========================================================
          ERRORS
      ========================================================= */}

      {Object.keys(errors).length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">
            Please correct the following errors:
          </p>

          <ul className="mt-2 list-disc pl-5">
            {errors.id && (
              <li>
                Report card ID is required.
              </li>
            )}

            {errors.conductSemester1 && (
              <li>
                Semester 1 conduct is invalid.
              </li>
            )}

            {errors.conductSemester2 && (
              <li>
                Semester 2 conduct is invalid.
              </li>
            )}

            {errors.commentSemester1 && (
              <li>
                Semester 1 comment is invalid.
              </li>
            )}

            {errors.commentSemester2 && (
              <li>
                Semester 2 comment is invalid.
              </li>
            )}

            {errors.teacherSignatureSemester1 && (
              <li>
                Semester 1 teacher signature is
                invalid.
              </li>
            )}

            {errors.teacherSignatureSemester2 && (
              <li>
                Semester 2 teacher signature is
                invalid.
              </li>
            )}

            {errors.managingDirectorSignature && (
              <li>
                Managing director signature is
                invalid.
              </li>
            )}
          </ul>
        </div>
      )}

      {/* =========================================================
          ACTION BUTTONS
      ========================================================= */}

      <div className="flex items-center justify-end gap-3 border-t pt-5">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? "Saving..."
            : type === "create"
              ? "Create Report Card"
              : "Save Changes"}
        </button>
      </div>
    </form>
  );
}