import { prisma } from "@/lib/prisma";
import BigCalendar from "./BigCalendar";
import { adjustScheduleToCurrentWeek, currentWorkWeek } from "@/lib/utils";

const BigCalendarcontainer = async({
  type, 
  id,
}:{
  type:"teacherId" | "classId"; 
  id:string| number;
}) =>{

 const dataRes = await prisma.lesson.findMany({
  where:{
    ...(type === "teacherId" ? {teacherId:id as string}: {classId: id as number }),
  },
 });

 const data = dataRes.map(lesson => ({
  title:lesson.name,
  start:lesson.startTime,
  end:lesson.endTime,
  day:lesson.day,
 }))

 //const schedule = adjustScheduleToCurrentWeek(data)
 const { startOfWeek } = currentWorkWeek();
 const adjustedEvents = adjustScheduleToCurrentWeek(data);

  return <div className=""><BigCalendar data= {adjustedEvents} currentDate={startOfWeek}/></div>
  
}
export default BigCalendarcontainer;