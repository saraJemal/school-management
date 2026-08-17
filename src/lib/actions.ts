"use server"

import { revalidatePath } from "next/cache";
import { AssignmentSchema, AttendanceSchema, ClassSchema, ExamSchema, LessonSchema, ParentSchema, StudentSchema, SubjectSchema, TeacherSchema } from "./formValidationSchemas"
import { prisma } from "./prisma";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { success } from "zod";

type CurrentState = {success:boolean; error:boolean
};

export const createSubject = async(
  currentState: CurrentState,
  data:SubjectSchema
)=>{
  try{
    await prisma.subject.create({
      data:{
        name: data.name,
        teachers:{
          connect:data.teachers.map(teacherId=> ({id:teacherId})),
        }
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}
 //Update Subject

export const updateSubject = async(
  currentState: CurrentState,
  data:SubjectSchema
)=>{
  try{
    await prisma.subject.update({
      where:{
        id:data.id,
      },
      data:{
        name: data.name,
        teachers:{
          set:data.teachers.map(teacherId=>({id:teacherId})),
        },
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//Delete Subject

export const deleteSubject = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 
  try{
    await prisma.subject.delete({
      where:{
        id:parseInt(id),
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

      // Class Action 

 // Create
export const createClass = async(
  currentState: CurrentState,
  data:ClassSchema
)=>{
  try{
    await prisma.class.create({
      data
    });

    //revalidatePath("/list/class")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}
 //Update 

export const updateClass = async(
  currentState: CurrentState,
  data:ClassSchema
)=>{
  try{
    await prisma.class.update({
      where:{
        id:data.id,
      },
      data
    });

    //revalidatePath("/list/class")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//Delete 

export const deleteClass = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 
  try{
    await prisma.class.delete({
      where:{
        id:parseInt(id),
      },
    });

    //revalidatePath("/list/class")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//-----------------------TEACHER ACTION-------------------

// Create
export const createTeacher = async(
  currentState: CurrentState,
  data:TeacherSchema
)=>{
  try{
    const user = await clerkClient.users.createUser({
      username:data.username,
      password:data.password,
      firstName:data.name,
      lastName:data.surname,
    });
    await prisma.teacher.create({
      data:{
      id: user.id,
      username:data.username,
      name:data.name,
      surname: data.surname,
      email:data.email || null,
      phone:data.phone || null,
      address:data.address,
      img:data.img || null,
      bloodType:data.bloodType,
      sex:data.sex,
      birthday:data.birthday,
      subjects:{
        connect:data.subjects?.map((subjectId:string)=>({
          id:parseInt(subjectId),
        })),
      },
      },
    });

    //revalidatePath("/list/teacher")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};
 //Update 

export const updateTeacher = async(
  currentState: CurrentState,
  data:TeacherSchema
) => {

  if(!data.id){
    return {success:false, error:true};
  }
  try{
    const user = await clerkClient.users.updateUser( data.id, {
      username:data.username,
      ...(data.password !=="" && {password:data.password}),
      firstName:data.name,
      lastName:data.surname,
    });
    await prisma.teacher.update({
      where:{
        id:data.id,
      },
      data:{
        ...(data.password !=="" && {password:data.password}),
      username:data.username,
      name:data.name,
      surname: data.surname,
      email:data.email || null,
      phone:data.phone || null,
      address:data.address,
      img:data.img || null,
      bloodType:data.bloodType,
      sex:data.sex,
      birthday:data.birthday,
      subjects:{
        set:data.subjects?.map((subjectId:string)=>({
          id:parseInt(subjectId),
        })),
      },
      },
    });


    //revalidatePath("/list/teacher")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};

//Delete 

export const deleteTeacher = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 
  try{

    await clerkClient.users.deleteUser(id);

    await prisma.teacher.delete({
      where:{
        id:id,
      },
    });

    //revalidatePath("/list/teacher")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};

//------------------------STUDENT ACTION---------------

// Create
export const createStudent = async(
  currentState: CurrentState,
  data:StudentSchema,
)=>{
   
  try{

    const classItem = await prisma.class.findUnique({
      where: {id: data.classId },
      include:{_count:{select:{students: true} } },
    });

    if(classItem && classItem.capacity === classItem._count.students){
      return {success: false, error:true};
    }

    const user = await clerkClient.users.createUser({
      username:data.username,
      password:data.password,
      firstName:data.name,
      lastName:data.surname,
    });
    await prisma.student.create({
      data:{
      id: user.id,
      username:data.username,
      name:data.name,
      surname: data.surname,
      email:data.email || null,
      phone:data.phone || null,
      address:data.address,
      img:data.img || null,
      bloodType:data.bloodType,
      sex:data.sex,
      birthday:data.birthday,
      gradeId: data.gradeId,
      classId: data.classId,
      parentId: data.parentId,
      },
    });

    //revalidatePath("/list/student")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};
 //Update 

export const updateStudent = async(
  currentState: CurrentState,
  data:StudentSchema
) =>{

  if(!data.id){
    return {success:false, error:true};
  }
  try{
    const user = await clerkClient.users.updateUser( data.id, {
      username:data.username,
      ...(data.password !=="" && {password:data.password}),
      firstName:data.name,
      lastName:data.surname,
    });
    await prisma.student.update({
      where:{
        id:data.id,
      },
      data:{
        ...(data.password !=="" && {password:data.password}),
      username:data.username,
      name:data.name,
      surname: data.surname,
      email:data.email || null,
      phone:data.phone || null,
      address:data.address,
      img:data.img || null,
      bloodType:data.bloodType,
      sex:data.sex,
      birthday:data.birthday,
      gradeId: data.gradeId,
      classId: data.classId,
      parentId: data.parentId,
      },
    });

    //revalidatePath("/list/student")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};

//Delete 

export const deleteStudent = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 
  try{

    await clerkClient.users.deleteUser(id);

    await prisma.student.delete({
      where:{
        id:id,
      },
    });

    //revalidatePath("/list/student")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};

//---------------------EXAM ACTION-------------------

//CREATE
 export const createExam = async(
  currentState: CurrentState,
  data:ExamSchema
)=>{

  const {userId, sessionClaims} = auth();
  const role = (sessionClaims?.metadata as {role?:string })?.role;

  try{
    if(role==="teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where:{
        teacherId: userId!,
        id: data.lessonId,
      },
    });

    if(!teacherLesson){
      return {success: false, error: true};
    }
  }
    await prisma.exam.create({
      data:{
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    //revalidatePath("/list/exams")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}
 //Update 

export const updateExam = async(
  currentState: CurrentState,
  data:ExamSchema
)=>{

  const {userId, sessionClaims} = auth();
  const role = (sessionClaims?.metadata as {role?:string })?.role;
  try{
    if(role==="teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where:{
        teacherId: userId!,
        id: data.lessonId,
      },
    });
  
    if(!teacherLesson){
      return {success: false, error: true};
    }
  }
    await prisma.exam.update({
      where:{
        id: data.id,
      },
      data:{
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });
  
    //revalidatePath("/list/exams")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//Delete 

export const deleteExam = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 

  const {userId, sessionClaims} = auth();
  const role = (sessionClaims?.metadata as {role?:string })?.role;

  try{
    await prisma.exam.delete({
      where:{
        id: parseInt(id),
        ...(role === "teacher" ? { lesson:{teacherId: userId!} } : {}),
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}; 

//ASSIGNMENT ACTION

           //CREATE
 export const createAssignment = async(
  currentState: CurrentState,
  data:AssignmentSchema,
)=>{

  const {userId, sessionClaims} = auth();
  const role = (sessionClaims?.metadata as {role?:string })?.role;

  try{
    if(role==="teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where:{
        teacherId: userId!,
        id: data.lessonId,
      },
    });

    if(!teacherLesson){
      return {success: false, error: true};
    }
  }
    await prisma.assignment.create({
      data:{
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });

    //revalidatePath("/list/exams")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}
 //Update 

export const updateAssignment = async(
  currentState: CurrentState,
  data:AssignmentSchema,
)=>{

  const {userId, sessionClaims} = auth();
  const role = (sessionClaims?.metadata as {role?:string })?.role;
  try{
    if(role==="teacher"){
    const teacherLesson = await prisma.lesson.findFirst({
      where:{
        teacherId: userId!,
        id: data.lessonId,
      },
    });
  
    if(!teacherLesson){
      return {success: false, error: true};
    }
  }
    await prisma.assignment.update({
      where:{
        id: data.id,
      },
      data:{
        title: data.title,
        startDate: data.startDate,
        dueDate: data.dueDate,
        lessonId: data.lessonId,
      },
    });
  
    //revalidatePath("/list/exams")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
}

//Delete 

export const deleteAssignment = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 

  const {userId, sessionClaims} = auth();
  const role = (sessionClaims?.metadata as {role?:string })?.role;

  try{
    await prisma.assignment.delete({
      where:{
        id: parseInt(id),
        ...(role === "teacher" ? { lesson:{teacherId: userId!} } : {}),
      },
    });

    //revalidatePath("/list/subjects")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};          


//--------------------------Attendance Action--------

//---------------CREATE-------------

export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only take attendance for their own classes
    if (role === "teacher") {
      const classItem = await prisma.class.findFirst({
        where: {
          id: data.classId,
          homeRoomTeacherId: userId!,
        },
      });

      if (!classItem) {
        return { success: false, error: true };
      }
    }

    // Make sure the student belongs to the selected class
    const student = await prisma.student.findFirst({
      where: {
        id: data.studentId,
        classId: data.classId,
      },
    });

    if (!student) {
      return { success: false, error: true };
    }

    await prisma.attendance.create({
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        classId: data.classId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

//--------------------------UPDATE-------------

export const updateAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only update attendance for their own classes
    if (role === "teacher") {
      const classItem = await prisma.class.findFirst({
        where: {
          id: data.classId,
          homeRoomTeacherId: userId!,
        },
      });

      if (!classItem) {
        return { success: false, error: true };
      }
    }

    // Make sure the student belongs to the selected class
    const student = await prisma.student.findFirst({
      where: {
        id: data.studentId,
        classId: data.classId,
      },
    });

    if (!student) {
      return { success: false, error: true };
    }

    await prisma.attendance.update({
      where: {
        id: data.id,
      },
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        classId: data.classId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


//--------------------------SAVE MONTHLY ATTENDANCE-------------

export const saveMonthlyAttendance = async (
  currentState: CurrentState,
  data: {
    classId: number;
    attendance: {
      studentId: string;
      date: string;
      present: boolean;
    }[];
  }
) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // Teachers can only take attendance for their own home-room class
    if (role === "teacher") {
      const classItem = await prisma.class.findFirst({
        where: {
          id: data.classId,
          homeRoomTeacherId: userId!,
        },
      });

      if (!classItem) {
        return { success: false, error: true };
      }
    }

    // Make sure all submitted students belong to the selected class
    const students = await prisma.student.findMany({
      where: {
        classId: data.classId,
      },
      select: {
        id: true,
      },
    });

    const validStudentIds = new Set(
      students.map((student) => student.id)
    );

    for (const record of data.attendance) {
      if (!validStudentIds.has(record.studentId)) {
        return { success: false, error: true };
      }
    }

    // Create or update attendance records

    await prisma.$transaction(
      data.attendance.map((record) => {
        // record.date is expected to be YYYY-MM-DD
        const [year, month, day] = record.date
          .split("-")
          .map(Number);

        // Create the date at midnight using the local calendar date.
        const attendanceDate = new Date(
          year,
          month - 1,
          day
        );

        return prisma.attendance.upsert({
          where: {
            studentId_classId_date: {
              studentId: record.studentId,
              classId: data.classId,
              date: attendanceDate,
            },
          },
          update: {
            present: record.present,
          },
          create: {
            studentId: record.studentId,
            classId: data.classId,
            date: attendanceDate,
            present: record.present,
          },
        });
      })
    );

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

//--------------------------DELETE-------------

export const deleteAttendance = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.attendance.delete({
      where: {
        id: parseInt(id),
        ...(role === "teacher"
          ? {
              class: {
                homeRoomTeacherId: userId!,
              },
            }
          : {}),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};


//--------------------------LESSON ACTION----------------

// CREATE
export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  try {
    await prisma.lesson.create({
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// UPDATE
export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await prisma.lesson.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        classId: data.classId,
        teacherId: data.teacherId,
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

// DELETE
export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.lesson.delete({
      where: {
        id: parseInt(id),
      },
    });

    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

//--------------------------PARENT ACTION----------------
 
// Create
export const createParent = async(
  currentState: CurrentState,
  data:ParentSchema
)=>{
  try{
    const user = await clerkClient.users.createUser({
      username:data.username,
      password:data.password,
      firstName:data.name,
      lastName:data.surname,
    });
    await prisma.parent.create({
      data:{
      id: user.id,
      username:data.username,
      name:data.name,
      surname: data.surname,
      email:data.email || null,
      phone:data.phone,
      address:data.address,
      students: {
          connect: data.students
            .split(",")
            .map((studentId: string) => studentId.trim())
            .filter(Boolean)
            .map((studentId: string) => ({
              id: studentId,
            })),
        },
      },
    });

    //revalidatePath("/list/parent")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};
 //Update 

export const updateParent = async(
  currentState: CurrentState,
  data:ParentSchema
) => {

  if(!data.id){
    return {success:false, error:true};
  }
  try{
    const user = await clerkClient.users.updateUser( data.id, {
      username:data.username,
      ...(data.password !=="" && {password:data.password}),
      firstName:data.name,
      lastName:data.surname,
    });
    await prisma.parent.update({
      where:{
        id:data.id,
      },
      data:{
        ...(data.password !=="" && {password:data.password}),
      username:data.username,
      name:data.name,
      surname: data.surname,
      email:data.email || null,
      phone:data.phone,
      address:data.address,
      students: {
            set: data.students
              .split(",")
              .map((studentId: string) => studentId.trim())
              .filter(Boolean)
              .map((studentId: string) => ({
                id: studentId,
              })),
          },
      },
    });


    //revalidatePath("/list/parent")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};

//Delete 

export const deleteParent = async(
  currentState: CurrentState,
  data:FormData
)=>{

  const id = data.get("id") as string 
  try{

    await clerkClient.users.deleteUser(id);

    await prisma.parent.delete({
      where:{
        id:id,
      },
    });

    //revalidatePath("/list/parent")
    return{ success: true, error: false };
  }catch(err){
    console.log(err);
    return{ success: false, error: true };
  }
};
