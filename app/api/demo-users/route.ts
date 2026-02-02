import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true },
  });
  return NextResponse.json(users);
}
