import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { todayJst } from "@/lib/jst";

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
    return NextResponse.json({ entries: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// DELETE /api/entries?id=xxx → 記録を1件削除
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
    return NextResponse.json({ error: "idが不正です" }, { status: 400 });
  }
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST /api/entries  { body: "..." } → 「記録のみ」保存。日付は常に日本時間の今日
export async function POST(request: NextRequest) {
  const { body } = await request.json().catch(() => ({}));
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
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ entry: data });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
