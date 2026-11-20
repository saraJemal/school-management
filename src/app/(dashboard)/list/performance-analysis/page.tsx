import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import FormContainer from "@/components/FormContainer";
import Link from "next/link";

type PerformanceAnalysisList =
  Prisma.PerformanceAnalysisGetPayload<{
    include: {
      academicYear: true;
      grade: true;
      class: true;
      subject: true;
      createdByAdmin: true;
      createdByTeacher: true;
    };
  }>;

const PerformanceAnalysisListPage = async ({
  searchParams,
}: {
  searchParams: {
    [key: string]: string | undefined;
  };
}) => {
  const { userId, sessionClaims } = auth();

  const role = (
    sessionClaims?.metadata as {
      role?: string;
    }
  )?.role;

  /*
   * ----------------------------------------------------------
   * SEARCH PARAMETERS
   * ----------------------------------------------------------
   */

  const params = await searchParams;

  const {
    page,
    academicYearId,
    semester,
    ...queryParams
  } = params;

  const p = page ? parseInt(page) : 1;

  /*
   * ----------------------------------------------------------
   * ACADEMIC YEARS
   * ----------------------------------------------------------
   */

  const academicYears =
    await prisma.academicYear.findMany({
      orderBy: {
        startDate: "desc",
      },
      select: {
        id: true,
        name: true,
      },
    });

  /*
   * ----------------------------------------------------------
   * TABLE COLUMNS
   * ----------------------------------------------------------
   */

  const columns = [
    {
      header: "Level",
      accessor: "level",
    },
    {
      header: "Grade",
      accessor: "grade",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "Type",
      accessor: "type",
    },
    {
      header: "Analysis",
      accessor: "analysis",
      className: "hidden lg:table-cell",
    },
    {
      header: "Created By",
      accessor: "createdBy",
      className: "hidden xl:table-cell",
    },
    {
      header: "Actions",
      accessor: "actions",
    },
  ];

  /*
   * ----------------------------------------------------------
   * DISPLAY HELPERS
   * ----------------------------------------------------------
   */

  const getLevelLabel = (
    level: PerformanceAnalysisList["level"]
  ) => {
    switch (level) {
      case "CLASS":
        return "Class";

      case "GRADE":
        return "Grade";

      case "SECTION":
        return "Section";

      case "SCHOOL":
        return "School";

      default:
        return level;
    }
  };

  const getAnalysisTypeLabel = (
    scope: PerformanceAnalysisList["assessmentScope"]
  ) => {
    return scope === "OVERALL"
      ? "Overall"
      : "Assessment";
  };

  /*
   * ----------------------------------------------------------
   * RENDER ROW
   * ----------------------------------------------------------
   */

  const renderRow = (
    item: PerformanceAnalysisList
  ) => {
    let createdBy = "-";

    if (item.createdByAdmin) {
      createdBy = `${item.createdByAdmin.name} ${item.createdByAdmin.surname}`;
    } else if (item.createdByTeacher) {
      createdBy = `${item.createdByTeacher.name} ${item.createdByTeacher.surname}`;
    }

    /*
     * The parent PerformanceAnalysis record is the
     * authoritative source for the analysis context.
     */

    const level = getLevelLabel(item.level);

    const grade =
      item.gradeName ||
      item.grade?.name ||
      (item.level === "SCHOOL"
        ? "All Grades"
        : "-");

    const className =
      item.className ||
      item.class?.name ||
      (item.level === "CLASS"
        ? "-"
        : "All Classes");

    const subject =
      item.subjectName ||
      item.subject?.name ||
      "-";

    const type = getAnalysisTypeLabel(
      item.assessmentScope
    );

    const analysis =
      item.assessmentScope === "OVERALL"
        ? "Final Score /100"
        : item.assessmentTitle || "Assessment";

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-200 text-sm hover:bg-red-100"
      >
        {/* LEVEL */}
        <td className="p-4">
          {level}
        </td>

        {/* GRADE */}
        <td className="p-4">
          {grade}
        </td>

        {/* CLASS */}
        <td className="p-4">
          {className}
        </td>

        {/* SUBJECT */}
        <td className="p-4">
          {subject}
        </td>

        {/* TYPE */}
        <td className="p-4">
          <span
            className={
              item.assessmentScope === "OVERALL"
                ? "font-semibold"
                : "font-medium"
            }
          >
            {type}
          </span>
        </td>

        {/* ANALYSIS */}
        <td className="hidden lg:table-cell p-4">
          <div className="flex flex-col">
            <span className="font-medium">
              {analysis}
            </span>

            <span className="text-xs text-gray-500">
              {item.assessmentScope ===
              "OVERALL"
                ? "Final score /100"
                : `Max: ${
                    item.assessmentMaxScore ??
                    "-"
                  }`}
            </span>
          </div>
        </td>

        {/* CREATED BY */}
        <td className="hidden xl:table-cell p-4">
          {createdBy}
        </td>

        {/* ACTIONS */}
        <td className="p-4">
          <div className="flex items-center gap-2">
            {/* VIEW */}
            <Link
              href={`/list/performance-analysis/${item.id}`}
            >
              <button
                className="w-7 h-7 flex items-center justify-center rounded-full bg-saraSky"
                title="View"
              >
                <Image
                  src="/view.png"
                  alt="View"
                  width={16}
                  height={16}
                />
              </button>
            </Link>

            {/* UPDATE */}
            {(role === "admin" ||
              (role === "teacher" &&
                item.createdByTeacherId)) && (
              <FormContainer
                table="performanceAnalysis"
                type="update"
                data={item}
              />
            )}

            {/* DELETE */}
            {(role === "admin" ||
              (role === "teacher" &&
                item.createdByTeacherId)) && (
              <FormContainer
                table="performanceAnalysis"
                type="delete"
                id={item.id}
              />
            )}
          </div>
        </td>
      </tr>
    );
  };

  /*
   * ----------------------------------------------------------
   * QUERY
   * ----------------------------------------------------------
   */

  const query: Prisma.PerformanceAnalysisWhereInput =
    {};

  /*
   * SEARCH
   */

  if (queryParams) {
    for (const [key, value] of Object.entries(
      queryParams
    )) {
      if (
        value !== undefined &&
        value !== ""
      ) {
        switch (key) {
          case "search":
            query.OR = [
              {
                subjectName: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                gradeName: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                className: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                sectionName: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                assessmentTitle: {
                  contains: value,
                  mode: "insensitive",
                },
              },
            ];
            break;

          default:
            break;
        }
      }
    }
  }

  /*
   * ACADEMIC YEAR FILTER
   */

  if (academicYearId) {
    const parsedAcademicYearId =
      parseInt(academicYearId);

    if (
      Number.isInteger(
        parsedAcademicYearId
      )
    ) {
      query.academicYearId =
        parsedAcademicYearId;
    }
  }

  /*
   * SEMESTER FILTER
   */

  if (
    semester === "SEMESTER1" ||
    semester === "SEMESTER2"
  ) {
    query.semester = semester;
  }

  /*
   * ----------------------------------------------------------
   * ROLE-BASED ACCESS
   * ----------------------------------------------------------
   */

  if (role === "teacher") {
    const teacher =
      await prisma.teacher.findUnique({
        where: {
          clerkUserId: userId!,
        },
        select: {
          id: true,
        },
      });

    if (teacher) {
      query.createdByTeacherId =
        teacher.id;
    } else {
      query.id = -1;
    }
  }

  /*
   * ----------------------------------------------------------
   * DATA
   * ----------------------------------------------------------
   */

  const [data, count] =
    await prisma.$transaction([
      prisma.performanceAnalysis.findMany({
        where: query,

        include: {
          academicYear: true,
          grade: true,
          class: true,
          subject: true,
          createdByAdmin: true,
          createdByTeacher: true,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: ITEM_PER_PAGE,

        skip:
          ITEM_PER_PAGE * (p - 1),
      }),

      prisma.performanceAnalysis.count({
        where: query,
      }),
    ]);

  /*
   * ----------------------------------------------------------
   * SELECT VALUES
   * ----------------------------------------------------------
   */

  const selectedAcademicYearId =
    academicYearId || "";

  const selectedSemester =
    semester || "";

  /*
   * ----------------------------------------------------------
   * PAGE
   * ----------------------------------------------------------
   */

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">

      {/* ---------------------------------------------------- */}
      {/* HEADER */}
      {/* ---------------------------------------------------- */}

      <div className="flex flex-col gap-4 mb-6">

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">
            Performance Analysis
          </h1>

          <div className="flex items-center gap-4">
            {/* CREATE */}
            {(role === "admin" ||
              role === "teacher") && (
              <FormContainer
                table="performanceAnalysis"
                type="create"
              />
            )}
          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* ACADEMIC YEAR + SEMESTER FILTERS */}
        {/* -------------------------------------------------- */}

        <form
          method="GET"
          className="flex flex-col md:flex-row items-stretch md:items-end gap-3"
        >
          {/* ACADEMIC YEAR */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="academicYearId"
              className="text-xs text-gray-500"
            >
              Academic Year
            </label>

            <select
              id="academicYearId"
              name="academicYearId"
              defaultValue={
                selectedAcademicYearId
              }
              className="border rounded-md px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">
                All Academic Years
              </option>

              {academicYears.map(
                (academicYear) => (
                  <option
                    key={academicYear.id}
                    value={academicYear.id}
                  >
                    {academicYear.name}
                  </option>
                )
              )}
            </select>
          </div>

          {/* SEMESTER */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="semester"
              className="text-xs text-gray-500"
            >
              Semester
            </label>

            <select
              id="semester"
              name="semester"
              defaultValue={
                selectedSemester
              }
              className="border rounded-md px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">
                All Semesters
              </option>

              <option value="SEMESTER1">
                Semester 1
              </option>

              <option value="SEMESTER2">
                Semester 2
              </option>
            </select>
          </div>

          {/* APPLY */}
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-badirStar text-sm font-medium"
          >
            Apply
          </button>
        </form>

        {/* -------------------------------------------------- */}
        {/* SEARCH */}
        {/* -------------------------------------------------- */}

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            {/* FILTER */}
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar"
              title="Filter"
            >
              <Image
                src="/filter.png"
                alt="Filter"
                width={14}
                height={14}
              />
            </button>

            {/* SORT */}
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar"
              title="Sort"
            >
              <Image
                src="/sort.png"
                alt="Sort"
                width={14}
                height={14}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TABLE */}
      {/* ---------------------------------------------------- */}

      <Table
        columns={columns}
        renderRow={renderRow}
        data={data}
      />

      {/* ---------------------------------------------------- */}
      {/* PAGINATION */}
      {/* ---------------------------------------------------- */}

      <Pagination
        page={p}
        count={count}
      />
    </div>
  );
};

export default PerformanceAnalysisListPage;