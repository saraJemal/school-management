import Image from "next/image";
import { prisma } from "@/lib/prisma";

const UserCard = async({
  type,
}: {
  type:"admin" | "student" | "teacher" | "parent";
}) => {

  const modelMap :Record<typeof type, any> = {
    admin: prisma.admin,
    student: prisma.student,
    teacher: prisma.teacher,
    parent: prisma.parent,
  };

 const data = await modelMap[type].count();

  return (
      <div className="rounded-2xl odd:bg-badirBlue even:bg-badirYellow p-4 flex-1">
       <div className="flex justify-between items-center">
        <span className="text-10px bg-white px-2 py-1 rounded-full text-green-600">2026/20</span>
        <Image src="/more.png" alt="" width={20} height={20}/>
       </div>
       <h1 className="text-2xl font-semibold my-4">{data}</h1>
       <h2 className="capitalize text-lg font-bold text-badirRed">{type}</h2>
      </div>
  )
}

export default UserCard