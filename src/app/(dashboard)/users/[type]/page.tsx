import { prisma } from "@/lib/prisma";

const Page = async ({
  params,
}: {
  params: { type: "admin" | "student" | "teacher" | "parent" };
}) => {
  const { type } = params;

  const modelMap: Record<typeof type, any> = {
    admin: prisma.admin,
    student: prisma.student,
    teacher: prisma.teacher,
    parent: prisma.parent,
  };

  const hasCreatedAt = type !== "admin";

  let history: { date: string; count: number }[] = [];

  if (hasCreatedAt) {
    // fetch all createdAt values
    const data = await modelMap[type].findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // group by day
    const grouped: Record<string, number> = {};

    data.forEach((item: any) => {
      const date = new Date(item.createdAt).toLocaleDateString();

      if (!grouped[date]) {
        grouped[date] = 0;
      }

      grouped[date]++;
    });

    // convert to array
    history = Object.entries(grouped).map(([date, count]) => ({
      date,
      count,
    }));
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold capitalize mb-4">
        {type} Registration History
      </h1>

      {!hasCreatedAt && (
        <p className="text-gray-500">
          No registration history available for admin.
        </p>
      )}

      {hasCreatedAt && history.length === 0 && (
        <p className="text-gray-500">No data available.</p>
      )}

      {hasCreatedAt && history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          {history.map((item, index) => (
            <div
              key={index}
              className="flex justify-between border-b last:border-none py-2"
            >
              <span className="text-gray-700">{item.date}</span>
              <span className="font-semibold">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Page;