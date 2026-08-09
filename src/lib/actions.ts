"use server"

import { revalidatePath } from "next/cache";
import { AssignmentSchema, AttendanceSchema, ClassSchema, ExamSchema, LessonSchema, StudentSchema, SubjectSchema, TeacherSchema } from "./formValidationSchemas"
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

//TEACHER ACTION

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

//STUDENT ACTION

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

           //EXAM ACTION

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

// ATTENDANCE ACTION

// CREATE
export const createAttendance = async (
  currentState: CurrentState,
  data: AttendanceSchema
) => {
  const { userId, sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    if (role === "teacher") {
      const lesson = await prisma.lesson.findFirst({
        where: {
          id: data.lessonId,
          class: {
            supervisorId: userId!,
          },
        },
      });

      if (!lesson) {
        return { success: false, error: true };
      }
    }

    await prisma.attendance.create({
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
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
    if (role === "teacher") {
      const lesson = await prisma.lesson.findFirst({
        where: {
          id: data.lessonId,
          class: {
            supervisorId: userId!,
          },
        },
      });

      if (!lesson) {
        return { success: false, error: true };
      }
    }

    await prisma.attendance.update({
      where: {
        id: data.id,
      },
      data: {
        date: data.date,
        present: data.present,
        studentId: data.studentId,
        lessonId: data.lessonId,
      },
    });

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
              lesson: {
                class: {
                  supervisorId: userId!,
                },
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

//----------Lesson Action-------


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
        startTime:data.startTime,
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
  try {
    await prisma.lesson.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        day: data.day,
        startTime:data.startTime,
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