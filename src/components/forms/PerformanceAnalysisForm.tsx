"use client";

import { useForm, useWatch } from "react-hook-form";
import {
  performanceAnalysisSchema,
  PerformanceAnalysisSchema,
} from "@/lib/formValidationSchemas";
import {
  createPerformanceAnalysis,
  updatePerformanceAnalysis,
} from "@/lib/actions";
import { useFormState } from "react-dom";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const PerformanceAnalysisForm = ({
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
    control,
    setValue,
    formState: { errors },
    handleSubmit,
  } = useForm<
    z.input<typeof performanceAnalysisSchema>,
    any,
    z.output<typeof performanceAnalysisSchema>
  >({
    resolver: zodResolver(performanceAnalysisSchema),
    defaultValues: {
      academicYearId: data?.academicYearId ?? undefined,
      semester: data?.semester ?? "SEMESTER1",
      level: data?.level ?? "CLASS",
      section: data?.section ?? undefined,
      gradeId: data?.gradeId ?? undefined,
      classId: data?.classId ?? undefined,
      subjectId: data?.subjectId ?? undefined,
      assessmentScope:
        data?.assessmentScope ?? "ASSESSMENT",
      assessmentType:
        data?.assessmentType ?? undefined,
      ...(data?.id ? { id: data.id } : {}),
    },
  });

  const selectedLevel = useWatch({
    control,
    name: "level",
  });

  const selectedGradeId = useWatch({
    control,
    name: "gradeId",
  });

  const selectedSection = useWatch({
    control,
    name: "section",
  });

  const selectedAssessmentScope = useWatch({
    control,
    name: "assessmentScope",
  });

  const previousSectionRef = useRef<string | undefined>(
  data?.section ? String(data.section) : undefined
);

  const previousLevelRef = useRef<string | undefined>(
    data?.level
  );

 /*
 * Clear dependent fields when the section changes.
 */
useEffect(() => {
  if (!selectedSection) {
    return;
  }

  const currentSection = String(selectedSection);

  if (
    previousSectionRef.current !== undefined &&
    previousSectionRef.current !== currentSection
  ) {
    setValue("gradeId", "");
    setValue("classId", "");
    setValue("subjectId", "");
  }

  previousSectionRef.current = currentSection;
}, [selectedSection, setValue]);

  /*
   * Keep fields appropriate to the selected analysis level.
   *
   * CLASS   -> section + grade + class
   * GRADE   -> section + grade
   * SECTION -> section only
   * SCHOOL  -> no section/grade/class
   */
  useEffect(() => {
    if (
      previousLevelRef.current !== undefined &&
      previousLevelRef.current !== selectedLevel
    ) {
      if (
        selectedLevel === "GRADE"
      ) {
        setValue("classId", undefined);
      }

      if (
        selectedLevel === "SECTION"
      ) {
        setValue("gradeId", undefined);
        setValue("classId", undefined);
        setValue("subjectId", undefined);
      }

      if (
        selectedLevel === "SCHOOL"
      ) {
        setValue("section", undefined);
        setValue("gradeId", undefined);
        setValue("classId", undefined);
        setValue("subjectId", undefined);
      }

      if (
        selectedLevel === "CLASS"
      ) {
        /*
         * Keep the current section/grade if they already exist.
         * Class must be selected for class-level analysis.
         */
      }
    }

    previousLevelRef.current = selectedLevel;
  }, [selectedLevel, setValue]);

  /*
   * Overall analysis does not use an individual
   * assessment type.
   */
  useEffect(() => {
    if (selectedAssessmentScope === "OVERALL") {
      setValue("assessmentType", undefined);
    }
  }, [selectedAssessmentScope, setValue]);

  // AFTER REACT 19 IT'LL BE USEACTIONSTATE
  const [state, formAction] = useFormState(
    type === "create"
      ? createPerformanceAnalysis
      : updatePerformanceAnalysis,
    {
      success: false,
      error: false,
    }
  );

  const onSubmit = handleSubmit((formData) => {
    console.log(formData);
    formAction(formData);
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(
        `Performance Analysis has been ${
          type === "create" ? "created" : "updated"
        }!`
      );

      setOpen(false);
      router.refresh();
    }

    if (state.error) {
      toast.error(
        typeof state.error === "string"
          ? state.error
          : "Something went wrong!"
      );
    }
  }, [state, router, type, setOpen]);

  const {
    academicYears = [],
    grades = [],
    classes = [],
    subjects = [],
  } = relatedData || {};

  const selectedGrade = grades.find(
    (grade: {
      id: number;
      level: number;
      name: string;
      section: string;
    }) =>
      Number(grade.id) === Number(selectedGradeId)
  );

  /*
   * Grades are available only after selecting a section.
   *
   * For SCHOOL level there is no grade selection.
   */
  const filteredGrades =
    selectedSection
      ? grades.filter(
          (grade: {
            id: number;
            level: number;
            name: string;
            section: string;
          }) =>
            grade.section === selectedSection
        )
      : [];

  /*
   * Classes are only relevant to CLASS-level analysis.
   */
  const filteredClasses =
    selectedGradeId
      ? classes.filter(
          (classItem: {
            id: number;
            name: string;
            gradeId: number;
          }) =>
            Number(classItem.gradeId) ===
            Number(selectedGradeId)
        )
      : [];

  /*
   * Subjects are based on the selected grade's section.
   *
   * SCHOOL-level analysis has no grade, so all subjects
   * are available.
   */
const filteredSubjects = (() => {
  // CLASS and GRADE:
  // Subject is filtered using the selected Grade's section.
  if (
    selectedLevel === "CLASS" ||
    selectedLevel === "GRADE"
  ) {
    if (!selectedGrade) {
      return [];
    }

    return subjects.filter(
      (subject: {
        id: number;
        name: string;
        sections: {
          section: string;
        }[];
      }) =>
        subject.sections?.some(
          (subjectSection) =>
            subjectSection.section === selectedGrade.section
        )
    );
  }

  // SECTION:
  // Once a section is selected, show subjects belonging to
  // that section. If no section has been selected yet,
  // show all subjects so the subject field never becomes
  // unusable because of an empty dependency.
  if (selectedLevel === "SECTION") {
    if (!selectedSection) {
      return subjects;
    }

    const sectionSubjects = subjects.filter(
      (subject: {
        id: number;
        name: string;
        sections: {
          section: string;
        }[];
      }) =>
        subject.sections?.some(
          (subjectSection) =>
            subjectSection.section === selectedSection
        )
    );

    // If the section relation does not contain the expected
    // value, keep the subject selector usable.
    return sectionSubjects.length > 0
      ? sectionSubjects
      : subjects;
  }

  // SCHOOL:
  // All subjects are available.
  if (selectedLevel === "SCHOOL") {
    return subjects;
  }

  return [];
})();

  const isClassLevel =
    selectedLevel === "CLASS";

  const isGradeLevel =
    selectedLevel === "GRADE";

  const isSectionLevel =
    selectedLevel === "SECTION";

  const isSchoolLevel =
    selectedLevel === "SCHOOL";

  const isAssessment =
    selectedAssessmentScope === "ASSESSMENT";

  const isOverall =
    selectedAssessmentScope === "OVERALL";

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={onSubmit}
    >
      <h1 className="text-xl font-semibold">
        {type === "create"
          ? "Create Performance Analysis"
          : "Update Performance Analysis"}
      </h1>

      <div className="flex justify-between flex-wrap gap-4">
        {/* Academic Year */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Academic Year
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("academicYearId")}
          >
            <option value="">
              Select academic year
            </option>

            {academicYears.map(
              (academicYear: {
                id: number;
                name?: string;
                year?: string;
              }) => (
                <option
                  value={academicYear.id}
                  key={academicYear.id}
                >
                  {academicYear.name ??
                    academicYear.year ??
                    academicYear.id}
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

        {/* Semester */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Semester
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("semester")}
          >
            <option value="SEMESTER1">
              Semester 1
            </option>

            <option value="SEMESTER2">
              Semester 2
            </option>
          </select>

          {errors.semester?.message && (
            <p className="text-xs text-red-500">
              {errors.semester.message.toString()}
            </p>
          )}
        </div>

        {/* Analysis Level */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Analysis Level
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("level")}
          >
            <option value="CLASS">
              Class
            </option>

            <option value="GRADE">
              Grade
            </option>

            <option value="SECTION">
              Section
            </option>

            <option value="SCHOOL">
              School
            </option>
          </select>

          {errors.level?.message && (
            <p className="text-xs text-red-500">
              {errors.level.message.toString()}
            </p>
          )}
        </div>

        {/* Section */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Section
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("section")}
            disabled={isSchoolLevel}
          >
            <option value="">
              {isSchoolLevel
                ? "Not required for school analysis"
                : "Select section"}
            </option>

            <option value="KG">
              KG
            </option>

            <option value="PRIMARY">
              Primary
            </option>

            <option value="MIDDLE">
              Middle
            </option>

            <option value="SECONDARY">
              Secondary
            </option>

            <option value="PREPARATORY">
              Preparatory
            </option>
          </select>

          {errors.section?.message && (
            <p className="text-xs text-red-500">
              {errors.section.message.toString()}
            </p>
          )}
        </div>

        {/* Grade */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Grade
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("gradeId")}
            disabled={
              isSectionLevel ||
              isSchoolLevel ||
              !selectedSection
            }
          >
            <option value="">
              {isSectionLevel || isSchoolLevel
                ? "Not required for this level"
                : selectedSection
                ? "Select grade"
                : "Select section first"}
            </option>

            {filteredGrades.map(
              (grade: {
                id: number;
                level: number;
                name: string;
                section: string;
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

        {/* Class */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Class
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("classId")}
            disabled={
              !isClassLevel ||
              !selectedGradeId
            }
          >
            <option value="">
              {!isClassLevel
                ? "Not required for this level"
                : selectedGradeId
                ? "Select class"
                : "Select grade first"}
            </option>

            {filteredClasses.map(
              (classItem: {
                id: number;
                name: string;
                gradeId: number;
              }) => (
                <option
                  value={classItem.id}
                  key={classItem.id}
                >
                  {classItem.name}
                </option>
              )
            )}
          </select>

          {errors.classId?.message && (
            <p className="text-xs text-red-500">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
        <label className="text-xs text-gray-500">
            Subject
        </label>
        <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("subjectId")}
            disabled={
            selectedLevel === "CLASS" &&
            !selectedGradeId
                ? true
                : selectedLevel === "GRADE" &&
                !selectedGradeId
                ? true
                : false
            }
        >
            <option value="">
            {selectedLevel === "CLASS"
                ? selectedGradeId
                ? "Select subject"
                : "Select grade first"
                : selectedLevel === "GRADE"
                ? selectedGradeId
                ? "Select subject"
                : "Select grade first"
                : "Select subject"}
            </option>

            {filteredSubjects.map(
            (subject: {
                id: number;
                name: string;
                sections: {
                section: string;
                }[];
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



        {/* Assessment Scope */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Assessment Scope
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("assessmentScope")}
          >
            <option value="ASSESSMENT">
              Assessment
            </option>

            <option value="OVERALL">
              Overall /100
            </option>
          </select>

          {errors.assessmentScope?.message && (
            <p className="text-xs text-red-500">
              {errors.assessmentScope.message.toString()}
            </p>
          )}
        </div>

        {/* Assessment Type */}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">
            Assessment
          </label>

          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            {...register("assessmentType")}
            disabled={isOverall}
          >
            <option value="">
              {isOverall
                ? "Not required for Overall /100"
                : "Select assessment"}
            </option>

            <option value="Q1">
              Quiz 1
            </option>

            <option value="Q2">
              Quiz 2
            </option>

            <option value="TEST1">
              Test 1
            </option>

            <option value="TEST2">
              Test 2
            </option>

            <option value="MIDTERM">
              Mid Exam
            </option>

            <option value="FINAL">
              Final Exam
            </option>
          </select>

          {errors.assessmentType?.message && (
            <p className="text-xs text-red-500">
              {errors.assessmentType.message.toString()}
            </p>
          )}

          <p className="text-[11px] text-gray-400">
            {isOverall
              ? "Not used for Overall /100 analysis."
              : "Required for Assessment analysis."}
          </p>
        </div>

        {/* Hidden ID for update */}
        {data && (
          <input
            type="hidden"
            {...register("id")}
            value={data.id}
          />
        )}
      </div>

      {state.error && (
        <span className="text-red-500">
          {typeof state.error === "string"
            ? state.error
            : "Something went wrong!"}
        </span>
      )}

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

export default PerformanceAnalysisForm;