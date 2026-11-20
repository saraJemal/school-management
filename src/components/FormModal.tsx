"use client";

import {
  deleteAttendance,
  deleteClass,
  deleteLesson,
  deleteParent,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
  deleteAssessmentRow,
  deleteStudentEnrollment,
  deleteAdmin,
  deletePromotionPolicy,
  deleteAcademicYear,
  deleteReportCard,
  deleteCommunicationBook,
  deleteWeeklyProgress,
  deleteMessage,
   deletePerformanceAnalysis,
} from "@/lib/actions";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  JSX,
  SetStateAction,
  useState,
} from "react";
import { toast } from "react-toastify";
import { FormContainerProps } from "./FormContainer";
import ResetPasswordForm from "./ResetPasswordForm";

// ---------------------------------------------------------
// DELETE ACTION MAP
// ---------------------------------------------------------

const deleteActionMap = {
  admin: deleteAdmin,
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  parent: deleteParent,
  lesson: deleteLesson,
  assessmentRow: deleteAssessmentRow,
  attendance: deleteAttendance,
  studentEnrollment: deleteStudentEnrollment,
  event: deleteSubject,
  announcement: deleteSubject,
  promotionPolicy: deletePromotionPolicy,
  academicYear: deleteAcademicYear,
  reportCard: deleteReportCard,
  communicationBook: deleteCommunicationBook,
  weeklyProgress: deleteWeeklyProgress,
  message: deleteMessage,
  performanceAnalysis: deletePerformanceAnalysis,
};

// ---------------------------------------------------------
// EXISTING DYNAMIC FORM IMPORTS
// ---------------------------------------------------------

const TeacherForm = dynamic(
  () => import("./forms/TeacherForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const StudentForm = dynamic(
  () => import("./forms/StudentForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const SubjectForm = dynamic(
  () => import("./forms/SubjectForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const ClassForm = dynamic(
  () => import("./forms/ClassForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const AttendanceForm = dynamic(
  () => import("./forms/AttendanceForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const LessonForm = dynamic(
  () => import("./forms/LessonForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const ParentForm = dynamic(
  () => import("./forms/ParentForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const AssessmentRowForm = dynamic(
  () => import("./forms/AssessmentRowForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const AdminForm = dynamic(
  () => import("./forms/AdminForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const StudentEnrollmentForm = dynamic(
  () => import("./forms/StudentEnrollmentForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const ReportCardForm = dynamic(
  () => import("./forms/ReportCardForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const PromotionPolicyForm = dynamic(
  () => import("./forms/PromotionPolicyForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const AcademicYearForm = dynamic(
  () => import("./forms/AcademicYearForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const CommunicationBookForm = dynamic(
  () => import("./forms/CommunicationBookForm"),
  { loading: () => <h1>Loading...</h1> }
);

const CommunicationBookParentForm = dynamic(
  () => import("./forms/CommunicationBookParentForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const WeeklyProgressForm = dynamic(
  () => import("./forms/WeeklyProgressForm"),
  { loading: () => <h1>Loading...</h1> }
);

const MessageForm = dynamic(
  () => import("./forms/MessageForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const MessageView = dynamic(
  () => import("./forms/MessageView"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);

const PerformanceAnalysisForm = dynamic(
  () => import("./forms/PerformanceAnalysisForm"),
  {
    loading: () => <h1>Loading...</h1>,
  }
);


// ---------------------------------------------------------
// EXISTING CREATE / UPDATE FORMS
// ---------------------------------------------------------

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any
  ) => JSX.Element;
} = {
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  attendance: (setOpen, type, data, relatedData) => (
    <AttendanceForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  parent: (setOpen, type, data, relatedData) => (
    <ParentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  assessmentRow: (setOpen, type, data, relatedData) => (
    <AssessmentRowForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  studentEnrollment: (setOpen, type, data, relatedData) => (
    <StudentEnrollmentForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  admin: (setOpen, type, data) => (
    <AdminForm
      type={type}
      data={data}
      setOpen={setOpen}
    />
  ),

  reportCard: (setOpen, type, data, relatedData) => (
    <ReportCardForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  promotionPolicy: (
    setOpen,
    type,
    data,
    relatedData
  ) => (
    <PromotionPolicyForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),

  academicYear: (setOpen, type, data, relatedData) => (
  <AcademicYearForm
    type={type}
    data={data}
    setOpen={setOpen}
  />
),

communicationBook: (
  setOpen,
  type,
  data,
  relatedData
) => (
  <CommunicationBookForm
    type={type}
    data={data}
    setOpen={setOpen}
    relatedData={relatedData}
  />
),

weeklyProgress: (setOpen, type, data, relatedData) => (
  <WeeklyProgressForm
    type={type}
    data={data}
    setOpen={setOpen}
    relatedData={relatedData}
  />
),

message: (setOpen, type, data, relatedData) => (
  <MessageForm
    type={type}
    data={data}
    setOpen={setOpen}
    relatedData={relatedData}
  />
),

performanceAnalysis: (setOpen, type, data, relatedData) => (
  <PerformanceAnalysisForm
    type={type}
    data={data}
    setOpen={setOpen}
    relatedData={relatedData}
  />
),

};

// ---------------------------------------------------------
// NORMAL DELETE FORM
// ---------------------------------------------------------

const DeleteForm = ({
  table,
  id,
  setOpen,
}: {
  table: keyof typeof deleteActionMap;
  id: string | number;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    const result = await deleteActionMap[table](
      {
        success: false,
        error: false,
      },
      formData
    );

    console.log(
      "DELETE RESULT:",
      table,
      result
    );

    if (result.success) {
      toast.success(
        `${table} has been deleted!`
      );

      setOpen(false);
      router.refresh();
    } else if (
      result.error === "unauthorized"
    ) {
      toast.error(
        "You are not authorized to perform this action."
      );
    } else if (
      result.error === "cannot-delete-self"
    ) {
      toast.error(
        "You cannot delete your own account."
      );
    } else if (
      result.error === "admin-not-found"
    ) {
      toast.error(
        "Admin was not found."
      );
    } else {
      toast.error(
        `Failed to delete ${table}.`
      );
    }
  };

  return (
    <form
      action={handleSubmit}
      className="p-4 flex flex-col gap-4"
    >
      <input
        type="hidden"
        name="id"
        value={id}
      />

      <span className="text-center font-medium">
        {table === "reportCard"
          ? "This report card and all of its semester and basic-skill data will be permanently deleted. Are you sure?"
          : `All data will be lost. Are you sure you want to delete this ${table}?`}
      </span>

      <button
        type="submit"
        className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Delete
      </button>
    </form>
  );
};

// ---------------------------------------------------------
// ASSESSMENT ROW DELETE FORM
// ---------------------------------------------------------

const AssessmentRowDeleteForm = ({
  data,
  setOpen,
}: {
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();

  const handleSubmit = async (
    formData: FormData
  ) => {
    const result = await deleteAssessmentRow(
      {
        success: false,
        error: false,
      },
      formData
    );

    console.log(
      "DELETE ASSESSMENT ROW RESULT:",
      result
    );

    if (result.success) {
      toast.success(
        "Assessment definitions have been deleted!"
      );

      setOpen(false);
      router.refresh();
    } else {
      toast.error(
        "Failed to delete assessment definitions."
      );
    }
  };

  return (
    <form
      action={handleSubmit}
      className="p-4 flex flex-col gap-4"
    >
      <input
        type="hidden"
        name="academicYearId"
        value={data?.academicYearId ?? ""}
      />

      <input
        type="hidden"
        name="gradeId"
        value={data?.gradeId ?? ""}
      />

      <input
        type="hidden"
        name="subjectId"
        value={data?.subjectId ?? ""}
      />

      <input
        type="hidden"
        name="semester"
        value={data?.semester ?? ""}
      />

      <span className="text-center font-medium">
        All assessment definitions for{" "}
        <strong>
          {data?.subjectName}
        </strong>{" "}
        will be deleted.
        <br />
        Are you sure?
      </span>

      <button
        type="submit"
        className="bg-red-700 text-white py-2 px-4 rounded-md border-none w-max self-center"
      >
        Delete
      </button>
    </form>
  );
};

// ---------------------------------------------------------
// FORM MODAL
// ---------------------------------------------------------

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
  mode,
}: FormContainerProps & {
  relatedData?: any;
}) => {
  const size =
    type === "create"
      ? "w-8 h-8"
      : "w-7 h-7";

  const bgColor =
  type === "create"
    ? "bg-badirStar"
    : type === "update"
    ? "bg-slate-500"
    : type === "view"
    ? "bg-slate-500"
    : type === "resetPassword"
    ? "bg-slate-500"
    : "bg-red-400";

  const [open, setOpen] =
    useState(false);

  const Form = () => {
        /*
        * DELETE
        */
        if (type === "delete") {
          if (id === undefined) {
            return null;
          }

          if (!(table in deleteActionMap)) {
            return null;
          }

          return (
            <DeleteForm
              table={table as keyof typeof deleteActionMap}
              id={id}
              setOpen={setOpen}
            />
          );
        }

        /*
        * VIEW
        */
        if (type === "view" && table === "message") {
          return (
            <MessageView
              data={data}
              setOpen={setOpen}
            />
          );
        }

       /*
 * CREATE / UPDATE
 */
  if (type === "create" || type === "update") {
    if (table === "communicationBook" && mode === "parent") {
      if (type !== "update") {
        return null;
      }

      return (
        <CommunicationBookParentForm
          data={data}
          setOpen={setOpen}
        />
      );
    }

    return forms[table](
      setOpen,
      type,
      data,
      relatedData
    );
  }
        return null;
      };
  return (
    <>
      <button
        type="button"
        title="Reset Password"
        aria-label="Reset Password"
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() =>
          setOpen(true)
        }
      >
        {type === "resetPassword" ? (
          <span
            className="text-base"
            title="Reset Password"
          >
            🔐
          </span>
        ) : (
          <Image
            src={`/${type}.png`}
            alt=""
            width={16}
            height={16}
          />
        )}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md relative w-[95%] md:w-[80%] lg:w-[70%] xl:w-[60%] 2xl:w-[50%] max-h-[90vh] overflow-hidden">

            {/* CLOSE BUTTON */}
            <button
              type="button"
              className="absolute top-4 right-4 z-50 bg-white rounded-full p-1 hover:bg-gray-100"
              onClick={() =>
                setOpen(false)
              }
            >
              <Image
                src="/close.png"
                alt="Close"
                width={18}
                height={18}
              />
            </button>

            {/* FORM CONTENT */}
            <div className="p-6 pt-12 max-h-[90vh] overflow-y-auto">
              <Form />
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
