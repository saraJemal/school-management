import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: Request) {
  try {
    const { userId, sessionClaims } = auth();

    const role = (sessionClaims?.metadata as {
      role?: string;
    })?.role;

    if (!userId || (role !== "admin" && role !== "teacher")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    if (search.length < 2) {
      return NextResponse.json([]);
    }

    const parents = await prisma.parent.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            surname: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            username: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: search,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        surname: true,
        phone: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 10,
    });

    return NextResponse.json(parents);
  } catch (error) {
    console.error("Parent search error:", error);

    return NextResponse.json(
      { error: "Failed to search parents" },
      { status: 500 }
    );
  }
}