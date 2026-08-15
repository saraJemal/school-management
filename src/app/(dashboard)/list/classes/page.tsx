import TableSearch from "@/components/TableSearch";
import Image from "next/image";
import Pagination from "@/components/pagination";
import Table from "@/components/Table";
import Link from "next/link";
import FormModal from "@/components/FormModal";
import { Class, Prisma, Teacher } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import FormContainer from "@/components/FormContainer";
import { auth } from "@clerk/nextjs/server";

type ClassList = Class & {homeRoomTeacher: Teacher};


const ClassListPage = async({
  searchParams,
}: {
  searchParams:{[key:string]:string | undefined};
}) => {

const { sessionClaims } = auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;

const columns = [
  {
    header:"Class Name", 
    accessor:"name",
  },
  {
    header:"Capacity", 
    accessor:"capacity",
    className:"hidden md:table-cell",
  },
  {
    header:"Grade", 
    accessor:"grade",
    className:"hidden md:table-cell",
  },
  {
    header:"Home Room Teacher",
    accessor:"homeRoomTeacher",
    className:"hidden md:table-cell",
  },
  ...(role === "admin"
  ?[
      {
        header:"Actions",
        accessor:"actions",
      },
    ]
  :[]),
];
 const renderRow = (item:ClassList) => (
   <tr key={item.id} className="border-b border-gray-200 even:bg-slate-200 text-sm hover:bg-red-100">
    <td className="flex items-center gap-4 p-4">{item.name}</td>
    <td className="hidden md:table-cell">{item.capacity}</td>
    <td className="hidden md:table-cell">{item.name[0]}</td>
    <td className="hidden md:table-cell">{item.homeRoomTeacher.name + " " + item.homeRoomTeacher.surname}</td>
    <td>
      <div className="flex items-center g-2">
        {role === "admin" && (
          <>
      <FormContainer table="class" type="update" data={item}/>
      <FormContainer table="class" type="delete" id={item.id}/>
        </>
      )}
     </div>
    </td>
   </tr>
  );

  const params = await searchParams;
  const {page, ...queryParams}= params;
  const p = page? parseInt(page) : 1;

  //URL PARAMS CONDITION
  const query: Prisma.ClassWhereInput = {};
  if(queryParams){
    for(const [key,value] of Object.entries(queryParams)){
     if(value!== undefined){
      switch(key){
        case "homeRoomTeacherId":
          query.homeRoomTeacherId = value;
          break;
        case "search":
          query.name = {contains:value, mode:"insensitive"}
          break;
      }
     }
    }
  } 

  const [data, count] = await prisma.$transaction([

   prisma.class.findMany({
    where: query,
    include:{
      homeRoomTeacher:true,
    },
    take:ITEM_PER_PAGE,
    skip:ITEM_PER_PAGE*(p-1), 
  }),
    prisma.class.count({where:query}), 
]);

return(
  <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
  {/*Top*/}
  <div className="flex items-center justify-between">
    <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
      <TableSearch/>
      <div className="flex items-center gap-4 self-end ">
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
          <Image src="/filter.png" alt="" width={14} height={14}/>
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-badirStar">
          <Image src="/sort.png" alt="" width={14} height={14}/>
        </button>
        {role === "admin" && 
          <FormContainer table="class" type="create"/>
        }
      </div>
    </div>
  </div>
  {/*List*/}
  <Table columns={columns} renderRow={renderRow} data={data}/>
  {/*Pagination*/}
  <Pagination page={p} count={count} />
  </div>
);
};
export default ClassListPage;