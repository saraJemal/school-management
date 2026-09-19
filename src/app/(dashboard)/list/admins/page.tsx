import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import { Admin, Prisma } from "@prisma/client";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import FormContainer from "@/components/FormContainer";
import { auth } from "@clerk/nextjs/server";

const AdminListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  // Only admins should access this page.
  if (role !== "admin") {
    return (
      <div className="p-4">
        <div className="bg-white rounded-md p-6 text-center text-red-500">
          You are not authorized to access this page.
        </div>
      </div>
    );
  }

  const columns = [
    {
      header: "Info",
      accessor: "info",
    },
    {
      header: "Admin ID",
      accessor: "adminId",
      className: "hidden md:table-cell",
    },
    {
      header: "Actions",
      accessor: "actions",
    },
  ];

  const renderRow = (item: Admin) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-200 text-sm hover:bg-red-100"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src="/noAvatar.png"
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />

        <div className="flex flex-col">
          <h3 className="font-semibold">
            {item.name} {item.surname}
          </h3>

          <p className="text-xs text-gray-500">
            @{item.username}
          </p>
        </div>
      </td>

      <td className="hidden md:table-cell">
        {item.id}
      </td>

      <td>
        <div className="flex items-center gap-2">
          <FormContainer
            table="admin"
            type="update"
            data={item}
          />
          <FormContainer
            table="admin"
            type="resetPassword"
            id={item.id}
            data={item}
          />
          <FormContainer
            table="admin"
            type="delete"
            id={item.id}
          />
        </div>
      </td>
    </tr>
  );

  const params = await searchParams;
  const { page, ...queryParams } = params;

  const p = page ? parseInt(page) : 1;

  // Search/filter conditions
  const query: Prisma.AdminWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "search":
            query.OR = [
              {
                username: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: value,
                  mode: "insensitive",
                },
              },
              {
                surname: {
                  contains: value,
                  mode: "insensitive",
                },
              },
            ];
            break;
        }
      }
    }
  }

  const [data, count] = await prisma.$transaction([
    prisma.admin.findMany({
      where: query,
      orderBy: [
        {
          name: "asc",
        },
        {
          surname: "asc",
        },
      ],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),

    prisma.admin.count({
      where: query,
    }),
  ]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* Top */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Admins
        </h1>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image
                src="/filter.png"
                alt="Filter"
                width={14}
                height={14}
              />
            </button>

            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
              <Image
                src="/sort.png"
                alt="Sort"
                width={14}
                height={14}
              />
            </button>

            <FormContainer
              table="admin"
              type="create"
            />
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
      <Pagination
        page={p}
        count={count}
      />
    </div>
  );
};

export default AdminListPage;

