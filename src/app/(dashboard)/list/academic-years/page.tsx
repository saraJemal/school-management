import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const columns = [
  {
    header: "Academic Year",
    accessor: "name",
  },
  {
    header: "Start Date",
    accessor: "startDate",
    className: "hidden md:table-cell",
  },
  {
    header: "End Date",
    accessor: "endDate",
    className: "hidden md:table-cell",
  },
  {
    header: "Semester 1",
    accessor: "semester1",
    className: "hidden lg:table-cell",
  },
  {
    header: "Semester 2",
    accessor: "semester2",
    className: "hidden lg:table-cell",
  },
  {
    header: "Current",
    accessor: "isCurrent",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

type AcademicYearList = Prisma.AcademicYearGetPayload<{}>;

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const AcademicYearListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}) => {
  const { page, search } = await searchParams;

  const p = page ? parseInt(page) : 1;

  const query = search || "";

  const [data, count] = await prisma.$transaction([
    prisma.academicYear.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      orderBy: {
        startDate: "desc",
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),

    prisma.academicYear.count({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
    }),
  ]);

  const renderRow = (item: AcademicYearList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-[#F1F5F9]"
    >
      <td className="p-4">
        <div className="flex flex-col">
          <span className="font-semibold">
            {item.name}
          </span>

          {item.isCurrent && (
            <span className="text-xs text-green-600 font-medium">
              Current Academic Year
            </span>
          )}
        </div>
      </td>

      <td className="hidden md:table-cell">
        {formatDate(item.startDate)}
      </td>

      <td className="hidden md:table-cell">
        {formatDate(item.endDate)}
      </td>

      <td className="hidden lg:table-cell">
        <div className="flex flex-col">
          <span>
            {formatDate(item.semester1StartDate)}
          </span>
          <span className="text-xs text-gray-500">
            to {formatDate(item.semester1EndDate)}
          </span>
        </div>
      </td>

      <td className="hidden lg:table-cell">
        <div className="flex flex-col">
          <span>
            {formatDate(item.semester2StartDate)}
          </span>
          <span className="text-xs text-gray-500">
            to {formatDate(item.semester2EndDate)}
          </span>
        </div>
      </td>

      <td className="hidden md:table-cell">
        {item.isCurrent ? (
          <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium">
            Yes
          </span>
        ) : (
          <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
            No
          </span>
        )}
      </td>

      <td>
        <div className="flex items-center gap-2">
          <FormContainer
            table="academicYear"
            type="update"
            data={item}
          />

          <FormContainer
            table="academicYear"
            type="delete"
            id={item.id}
          />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Academic Years
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            <FormContainer
              table="academicYear"
              type="create"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <Table
            columns={columns}
            renderRow={renderRow}
            data={data}
            />
      </div>

      {/* PAGINATION */}
      <Pagination
        page={p}
        count={count}
      />
    </div>
  );
};

export default AcademicYearListPage;