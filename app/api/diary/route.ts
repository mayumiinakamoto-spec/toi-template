import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { todayJst, jstTime } from "@/lib/jst";
import { DIARY_MARKER, type Entry } from "@/lib/types";

// POST /api/diary  { date?: "YYYY-MM-DD" }
// その日の利用者の記録(粒)を清書係が読み、本人の声の一本の日記にまとめる。
// dateを省略すると今日。過去の日の分もあとから清書できる(未来は不可)。
// すでにその日の記があれば置き換える(粒は消さない)。
export async function POST(request: NextRequest) {
  try {
    const { date } = await request.json().catch(() => ({}));
    const today = todayJst();
    let targetDate = today;
    if (date !== undefined) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "dateが不正です" }, { status: 400 });
      }
      if (date > today) {
        return NextResponse.json(
          { error: "未来の日付には記録できません" },
          { status: 400 }
        );
      }
      targetDate = date;
    }
    const supabase = getSupabase();

    const { data, error: fetchError } = await supabase
      .from("entries")
      .select("*")
      .eq("entry_date", targetDate)
      .eq("role", "user")
      .order("created_at", { ascending: true });
    if (fetchError) throw new Error(fetchError.message);

    const all = data as Entry[];
    const fragments = all.filter((e) => !e.body.startsWith(DIARY_MARKER));
    const oldDiaries = all.filter((e) => e.body.startsWith(DIARY_MARKER));
    if (fragments.length === 0) {
      return NextResponse.json(
        { error: "この日の記録がまだありません" },
        { status: 400 }
      );
    }

    const lines = fragments.map((e) => `[${jstTime(e.created_at)}]\n${e.body}`);
    const kyouPrompt = await readFile(
      path.join(process.cwd(), "prompts", "kyou.md"),
      "utf-8"
    );

    const [y, m, d] = targetDate.split("-").map(Number);
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: kyouPrompt,
      messages: [
        {
          role: "user",
          content: `以下は、わたしが${y}年${m}月${d}日に書き残した記録の粒です。一本の日記に清書してください。\n\n${lines.join("\n\n")}`,
        },
      ],
    });

    const replyText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (replyText === "") throw new Error("清書が空でした");

    // 新しい清書を保存してから、古い清書を消す(置き換え)
    const { data: entry, error: saveError } = await supabase
      .from("entries")
      .insert({
        entry_date: targetDate,
        role: "user",
        mode: null,
        body: `${DIARY_MARKER}${replyText}`,
        photos: [],
      })
      .select()
      .single();
    if (saveError) throw new Error(saveError.message);

    if (oldDiaries.length > 0) {
      await supabase
        .from("entries")
        .delete()
        .in(
          "id",
          oldDiaries.map((e) => e.id)
        );
    }

    return NextResponse.json({ entry });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Anthropic APIキーが無効です。" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
