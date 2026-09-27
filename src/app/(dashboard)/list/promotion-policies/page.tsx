import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import { Prisma, PromotionPolicy, AcademicYear } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import { auth } from "@clerk/nextjs/server";

type PromotionPolicyList = PromotionPolicy & {
  academicYear: AcademicYear;
};

const PromotionPolicyListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const columns = [
    {
      header: "Academic Year",
      accessor: "academicYear",
    },
    {
      header: "Section",
      accessor: "section",
    },
    {
      header: "Promotion Minimum",
      accessor: "promotionMinimumAverage",
      className: "hidden md:table-cell",
    },
    {
      header: "Detention Maximum",
      accessor: "detentionMaximumAverage",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "actions",
          },
        ]
      : []),
  ];

  const renderRow = (item: PromotionPolicyList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-200 text-sm hover:bg-red-100"
    >
      <td className="p-4">
        {item.academicYear.name}
      </td>

      <td className="p-4">
        {item.section}
      </td>

      <td className="hidden md:table-cell">
        {item.promotionMinimumAverage}
      </td>

      <td className="hidden md:table-cell">
        {item.detentionMaximumAverage}
      </td>

      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer
              table="promotionPolicy"
              type="update"
              data={item}
            />

            <FormContainer
              table="promotionPolicy"
              type="delete"
              id={item.id}
            />
          </div>
        </td>
      )}
    </tr>
  );

  const params = await searchParams;

  const { page, ...queryParams } = params;

  const p = page ? parseInt(page) : 1;

  const query: Prisma.PromotionPolicyWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.academicYear = {
              name: {
                contains: value,
                mode: "insensitive",
              },
            };
            break;

          case "section":
            query.section = value as any;
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.promotionPolicy.findMany({
      where: query,
      include: {
        academicYear: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy: {
        academicYearId: "desc",
      },
    }),

    prisma.promotionPolicy.count({
      where: query,
    }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">

      {/* Top */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Promotion Policies
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">

            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image
                src="/filter.png"
                alt=""
                width={14}
                height={14}
              />
            </button>

            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image
                src="/sort.png"
                alt=""
                width={14}
                height={14}
              />
            </button>

            {role === "admin" && (
              <FormContainer
                table="promotionPolicy"
                type="create"
              />
            )}

          </div>
        </div>
      </div>

      {/* List */}
      <Table
        columns={columns}
        renderRow={renderRow}
        data={data}
      />

      {/* Pagination */}
      <Pagination page={p} count={count} />

    </div>
  );
};

export default PromotionPolicyListPage;