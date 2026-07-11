import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { todayJst } from "@/lib/jst";
import type { Entry } from "@/lib/types";

const SIGNED_URL_TTL = 60 * 60; // 1時間。画面を開くたびに新しく発行される

// entriesの生データ(photosはStorageのパス配列)を、表示用の署名付きURLに差し替える
async function attachPhotoUrls(
  rows: (Omit<Entry, "photos"> & { photos: string[] })[]
): Promise<Entry[]> {
  const allPaths = rows.flatMap((r) => r.photos ?? []);
  if (allPaths.length === 0) {
    return rows.map((r) => ({ ...r, photos: [] }));
  }
  const supabase = getSupabase();
  const { data: signed, error } = await supabase.storage
    .from("photos")
    .createSignedUrls(allPaths, SIGNED_URL_TTL);
  if (error) throw new Error(error.message);
  const urlMap = new Map(signed.map((s) => [s.path, s.signedUrl]));
  return rows.map((r) => ({
    ...r,
    photos: (r.photos ?? [])
      .map((p) => urlMap.get(p))
      .filter((u): u is string => Boolean(u)),
  }));
}

// GET /api/entries?date=2026-07-07 → その日の記録を時刻順で返す
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD が必要です" }, { status: 400 });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("entry_date", date)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ entries: await attachPhotoUrls(data) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// PATCH /api/entries  { id: "...", body: "..." } → 記録の本文を書き換える
export async function PATCH(request: NextRequest) {
  const { id, body } = await request.json().catch(() => ({}));
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)
  ) {
    return NextResponse.json({ error: "idが不正です" }, { status: 400 });
  }
  if (typeof body !== "string" || body.trim() === "") {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("entries")
      .update({ body: body.trim() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ entry: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/entries?id=xxx → 記録を1件削除(添付写真もStorageから消す)
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    return NextResponse.json({ error: "idが不正です" }, { status: 400 });
  }
  try {
    const supabase = getSupabase();
    const { data: existing, error: fetchError } = await supabase
      .from("entries")
      .select("photos")
      .eq("id", id)
      .single();
    if (fetchError) throw new Error(fetchError.message);

    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) throw new Error(error.message);

    if (existing?.photos?.length > 0) {
      await supabase.storage.from("photos").remove(existing.photos);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/entries  { body: "...", photos?: string[] } → 「記録のみ」保存。日付は常に日本時間の今日
export async function POST(request: NextRequest) {
  const { body, photos } = await request.json().catch(() => ({}));
  if (typeof body !== "string" || body.trim() === "") {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("entries")
      .insert({
        entry_date: todayJst(),
        role: "user",
        mode: null,
        body: body.trim(),
        photos: Array.isArray(photos) ? photos : [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ entry: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
