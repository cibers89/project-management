export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

export async function POST(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "PROJECT_OWNER") {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  const formData = await req.formData();
  const projectId = formData.get("projectId") as string;
  const files = formData.getAll("files") as File[];

  if (!projectId || files.length === 0) {
    return NextResponse.json(
      { message: "Invalid payload" },
      { status: 400 }
    );
  }

  const uploadDir = path.join(
    process.cwd(),
    "public/uploads"
  );

  await fs.mkdir(uploadDir, { recursive: true });

  const savedFiles = [];

  for (const file of files) {
    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const ext = path.extname(file.name);
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(uploadDir, filename);

    await fs.writeFile(filepath, buffer);

    const isImage = file.type.startsWith("image");

    const record = await prisma.projectFile.create({
      data: {
        projectId,
        url: `/uploads/${filename}`,
        fileName: file.name,
        type: isImage ? "IMAGE" : "DOCUMENT",
      },
    });

    savedFiles.push(record);
  }

  return NextResponse.json({ files: savedFiles });
}
