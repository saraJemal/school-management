import { auth } from "@clerk/nextjs/server";


// const {userId, sessionClaims} = auth();

// export const role = (sessionClaims?.metadata as {role?:string})?.role;
  
// export const currentUserId = userId;


export const currentWorkWeek = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const startOfWeek = new Date(today);

  if (dayOfWeek === 0) {
    // Sunday → next Monday
    startOfWeek.setDate(today.getDate() + 1);
  } else if (dayOfWeek === 6) {
    // Saturday → next Monday
    startOfWeek.setDate(today.getDate() + 2);
  } else {
    // Weekday → current Monday
    startOfWeek.setDate(today.getDate() - (dayOfWeek - 1));
  }

  startOfWeek.setHours(0, 0, 0, 0);

  return { startOfWeek };
};
export const adjustScheduleToCurrentWeek = (lessons: any[]) => {
  const { startOfWeek } = currentWorkWeek();

  const dayMap: Record<string, number> = {
    MONDAY: 0,
    TUESDAY: 1,
    WEDNESDAY: 2,
    THURSDAY: 3,
    FRIDAY: 4,
    SATURDAY: 5,
    SUNDAY: 6,
  };

  return lessons.map((lesson) => {
  const adjustedStart = new Date(startOfWeek);

  adjustedStart.setDate(
    startOfWeek.getDate() + dayMap[lesson.day]
  );

  const startTime = new Date(lesson.start);
  const endTime = new Date(lesson.end);

  adjustedStart.setHours(
    startTime.getHours(),
    startTime.getMinutes(),
    0
  );

  const adjustedEnd = new Date(adjustedStart);

  adjustedEnd.setHours(
    endTime.getHours(),
    endTime.getMinutes(),
    0
  );

  return {
    title: lesson.title,
    start: adjustedStart,
    end: adjustedEnd,
  };
  })
};