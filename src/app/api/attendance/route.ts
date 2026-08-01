import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { attendance, lessonId } = await req.json();

  const today = new Date();

  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const operations = Object.entries(attendance).map(
    async ([studentId, present]) => {
      const existing = await prisma.attendance.findFirst({
        where: {
          studentId,
          lessonId,
          date: {
            gte: start,
            lt: end,
          },
        },
      });

      if (existing) {
        return prisma.attendance.update({
          where: { id: existing.id },
          data: { present: present as boolean },
        });
      } else {
        return prisma.attendance.create({
          data: {
            studentId,
            lessonId,
            present: present as boolean,
            date: new Date(),
          },
        });
      }
    }
  );

  await Promise.all(operations);

  return Response.json({ success: true });
}