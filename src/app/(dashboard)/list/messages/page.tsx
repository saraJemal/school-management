import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import FormContainer from "@/components/FormContainer";
import MessageReadButton from "@/components/MessageReadButton";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

const MessagesListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = auth();

  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "teacher") {
    redirect("/unauthorized");
  }

  if (!userId) {
    redirect("/unauthorized");
  }

  /*
   * =========================================================
   * CURRENT USER
   * =========================================================
   */

  let currentUserId: string | null = null;

  if (role === "admin") {
    const admin = await prisma.admin.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    currentUserId = admin?.id ?? null;
  }

  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        id: true,
      },
    });

    currentUserId = teacher?.id ?? null;
  }

  if (!currentUserId) {
    redirect("/unauthorized");
  }

  /*
   * =========================================================
   * PARAMETERS
   * =========================================================
   */

  const params = await searchParams;

  const page = params.page;
  const folder = params.folder === "sent" ? "sent" : "inbox";
  const search = params.search;

  const p = page ? parseInt(page) : 1;

  /*
   * =========================================================
   * INBOX
   * =========================================================
   */

  if (folder === "inbox") {
    const recipientWhere: Prisma.MessageRecipientWhereInput =
      role === "admin"
        ? {
            adminId: currentUserId,
            ...(search
              ? {
                  message: {
                    OR: [
                      {
                        subject: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        body: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                }
              : {}),
          }
        : {
            teacherId: currentUserId,
            ...(search
              ? {
                  message: {
                    OR: [
                      {
                        subject: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                      {
                        body: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    ],
                  },
                }
              : {}),
          };

    const [data, count] = await prisma.$transaction([
      prisma.messageRecipient.findMany({
        where: recipientWhere,
        include: {
          message: {
            include: {
              senderAdmin: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  surname: true,
                },
              },
              senderTeacher: {
                select: {
                  id: true,
                  name: true,
                  surname: true,
                },
              },
            },
          },
        },
        orderBy: {
          message: {
            createdAt: "desc",
          },
        },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (p - 1),
      }),

      prisma.messageRecipient.count({
        where: recipientWhere,
      }),
    ]);

    const columns = [
      {
        header: "From",
        accessor: "from",
      },
      {
        header: "Subject",
        accessor: "subject",
      },
      {
        header: "Message",
        accessor: "message",
        className: "hidden md:table-cell",
      },
      {
        header: "Date",
        accessor: "date",
        className: "hidden md:table-cell",
      },
      {
        header: "Actions",
        accessor: "actions",
      },
    ];

    const renderRow = (item: (typeof data)[number]) => {
      const sender = item.message.senderAdmin
        ? item.message.senderAdmin.username
        : item.message.senderTeacher
        ? `${item.message.senderTeacher.name} ${item.message.senderTeacher.surname}`
        : "Unknown";

      return (
        <tr
          key={item.id}
          className={`border-b border-gray-200 text-sm hover:bg-red-100 ${
            !item.isRead
              ? "font-semibold bg-slate-50"
              : "even:bg-slate-100"
          }`}
        >
          <td className="p-4">{sender}</td>

          <td>{item.message.subject}</td>

          <td className="hidden md:table-cell max-w-[350px]">
            <div className="truncate">
              {item.message.body}
            </div>
          </td>

          <td className="hidden md:table-cell">
            {item.message.createdAt.toLocaleDateString()}
          </td>

          <td>
            <div className="flex items-center gap-2">
              {/* VIEW */}
              <FormContainer
                table="message"
                type="view"
                data={item}
              />

              {/* MARK AS READ */}
              <MessageReadButton
                messageRecipientId={item.id}
                isRead={item.isRead}
              />
            </div>
          </td>
        </tr>
      );
    };

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        {/* TOP */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">
            Inbox
          </h1>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <TableSearch />

            <FormContainer
              table="message"
              type="create"
            />
          </div>
        </div>

        {/* FOLDERS */}
        <div className="flex items-center gap-2 mt-5 border-b border-gray-200 pb-3">
          <Link
            href="/list/messages?folder=inbox"
            className="px-4 py-2 rounded-md bg-badirStar text-sm font-medium"
          >
            Inbox
          </Link>

          <Link
            href="/list/messages?folder=sent"
            className="px-4 py-2 rounded-md bg-gray-100 text-sm hover:bg-gray-200"
          >
            Sent
          </Link>
        </div>

        {/* TABLE */}
        <Table
          columns={columns}
          renderRow={renderRow}
          data={data}
        />

        {/* PAGINATION */}
        <Pagination
          page={p}
          count={count}
        />
      </div>
    );
  }

  /*
   * =========================================================
   * SENT
   * =========================================================
   */

  const sentWhere: Prisma.MessageWhereInput =
    role === "admin"
      ? {
          senderAdminId: currentUserId,
          ...(search
            ? {
                OR: [
                  {
                    subject: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    body: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        }
      : {
          senderTeacherId: currentUserId,
          ...(search
            ? {
                OR: [
                  {
                    subject: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    body: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        };

  const [data, count] = await prisma.$transaction([
    prisma.message.findMany({
      where: sentWhere,
      include: {
        senderAdmin: {
          select: {
            id: true,
            username: true,
            name: true,
            surname: true,
          },
        },
        senderTeacher: {
          select: {
            id: true,
            name: true,
            surname: true,
          },
        },
        recipients: {
          include: {
            admin: {
              select: {
                id: true,
                username: true,
                name: true,
                surname: true,
              },
            },
            teacher: {
              select: {
                id: true,
                name: true,
                surname: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
    }),

    prisma.message.count({
      where: sentWhere,
    }),
  ]);

  const columns = [
    {
      header: "To",
      accessor: "to",
    },
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "Message",
      accessor: "message",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Actions",
      accessor: "actions",
    },
  ];

  const renderRow = (item: (typeof data)[number]) => {
    const recipients = item.recipients
      .map((recipient) => {
        if (recipient.admin) {
          return recipient.admin.username;
        }

        if (recipient.teacher) {
          return `${recipient.teacher.name} ${recipient.teacher.surname}`;
        }

        return "";
      })
      .filter(Boolean)
      .join(", ");

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-100 text-sm hover:bg-red-100"
      >
        <td className="p-4 max-w-[220px]">
          <div className="truncate">
            {recipients}
          </div>
        </td>

        <td>{item.subject}</td>

        <td className="hidden md:table-cell max-w-[350px]">
          <div className="truncate">
            {item.body}
          </div>
        </td>

        <td className="hidden md:table-cell">
          {item.createdAt.toLocaleDateString()}
        </td>

        <td>
          <div className="flex items-center gap-2">
            {/* VIEW */}
            <FormContainer
              table="message"
              type="view"
              data={item}
            />

            {/* UPDATE */}
            <FormContainer
              table="message"
              type="update"
              data={item}
            />

            {/* DELETE */}
            <FormContainer
              table="message"
              type="delete"
              id={item.id}
            />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">
          Sent Messages
        </h1>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <TableSearch />

          <FormContainer
            table="message"
            type="create"
          />
        </div>
      </div>

      {/* FOLDERS */}
      <div className="flex items-center gap-2 mt-5 border-b border-gray-200 pb-3">
        <Link
          href="/list/messages?folder=inbox"
          className="px-4 py-2 rounded-md bg-gray-100 text-sm hover:bg-gray-200"
        >
          Inbox
        </Link>

        <Link
          href="/list/messages?folder=sent"
          className="px-4 py-2 rounded-md bg-badirStar text-sm font-medium"
        >
          Sent
        </Link>
      </div>

      {/* TABLE */}
      <Table
        columns={columns}
        renderRow={renderRow}
        data={data}
      />

      {/* PAGINATION */}
      <Pagination
        page={p}
        count={count}
      />
    </div>
  );
};

export default MessagesListPage;