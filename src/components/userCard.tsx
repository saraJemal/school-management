import Image from "next/image";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const UserCard = async ({
  type,
}: {
  type: "admin" | "student" | "teacher" | "parent";
}) => {
  const countMap = {
    admin: () => prisma.admin.count(),
    student: () => prisma.student.count(),
    teacher: () => prisma.teacher.count(),
    parent: () => prisma.parent.count(),
  };

  const data = await countMap[type]();

  return (
    <div className="rounded-2xl odd:bg-badirBlue even:bg-badirYellow p-4 flex-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          Total
        </span>

        <Link href={`/users/${type}`}>
          <Image
            src="/more.png"
            alt="View users"
            width={20}
            height={20}
          />
        </Link>
      </div>

      <h1 className="text-2xl font-semibold my-4">{data}</h1>

      <h2 className="capitalize text-lg font-bold text-badirRed">
        {type}
      </h2>
    </div>
  );
};

export default UserCard;