import { randomUUID } from "crypto";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { todayJst } from "@/lib/jst";

const MAX_PHOTOS = 4;
const MAX_BYTES = 20 * 1024 * 1024; // 元画像1枚あたりの上限。保存時は縮小される

// 長辺1600px・JPEG品質82に縮小する。無料枠(1GB)で数千枚入るサイズを狙う。
// 見たことのない形式で失敗した場合は、諦めて元データをそのまま保存する。
async function resizeImage(buffer: Buffer): Promise<{ buffer: Buffer; contentType: string }> {
  try {
    const resized = await sharp(buffer)
      .rotate() // スマホ写真のEXIF回転情報を反映してから縮小する
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return { buffer: resized, contentType: "image/jpeg" };
  } catch {
    return { buffer, contentType: "application/octet-stream" };
  }
}

// POST /api/photos  (multipart/form-data, key="photos" を複数枚まで)
// 縮小してSupabase Storageに保存し、保存先のパス一覧を返す。
// 記録本体への紐づけは呼び出し側(/api/entries, /api/coach)が行う。
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const files = form.getAll("photos").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "写真がありません" }, { status: 400 });
    }
    if (files.length > MAX_PHOTOS) {
      return NextResponse.json(
        { error: `写真は${MAX_PHOTOS}枚までです` },
        { status: 400 }
      );
    }
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "写真のサイズが大きすぎます" }, { status: 400 });
      }
    }

    const supabase = getSupabase();
    const today = todayJst();
    const paths: string[] = [];

    for (const file of files) {
      const original = Buffer.from(await file.arrayBuffer());
      const { buffer, contentType } = await resizeImage(original);
      const path = `${today}/${randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("photos")
        .upload(path, buffer, { contentType, upsert: false });
      if (error) throw new Error(error.message);
      paths.push(path);
    }

    return NextResponse.json({ paths });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
