import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { uploadToCafe24 } from "@/lib/cafe24-upload";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    // 로컬에 임시 저장
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join("/tmp", file.name);
    await writeFile(tempPath, buffer);

    // FTP 업로드
    const fileUrl = await uploadToCafe24(tempPath, file.name);

    return NextResponse.json({ url: fileUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
