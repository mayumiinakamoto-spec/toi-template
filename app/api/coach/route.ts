import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { todayJst, jstTime } from "@/lib/jst";
import type { Entry } from "@/lib/types";

// AIに渡す文脈の上限(文字数)。超えたら古い記録から削る
const MAX_CONTEXT_CHARS = 24000;

function daysAgoJst(days: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(
    new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  );
}

function formatEntry(e: Entry): string {
  const who =
    e.role === "user"
      ? "わたし"
      : e.mode === "jogen"
        ? "伴走者(助言)"
        : "伴走者(問い)";
  return `[${e.entry_date} ${jstTime(e.created_at)}] ${who}:\n${e.body}`;
}

// POST /api/coach  { body: "...", mode: "toi" | "jogen", photos?: string[], date?: "YYYY-MM-DD" }
// 記録を保存した上で、AI(伴走者)が応答する。dateで過去の日付として保存できる(未来は不可)
export async function POST(request: NextRequest) {
  const { body, mode, photos, date } = await request.json().catch(() => ({}));
  if (typeof body !== "string" || body.trim() === "") {
    return NextResponse.json({ error: "本文が空です" }, { status: 400 });
  }
  if (mode !== "toi" && mode !== "jogen") {
    return NextResponse.json({ error: "modeはtoiかjogen" }, { status: 400 });
  }
  const today = todayJst();
  let entryDate = today;
  if (date !== undefined) {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "dateが不正です" }, { status: 400 });
    }
    if (date > today) {
      return NextResponse.json({ error: "未来の日付には記録できません" }, { status: 400 });
    }
    entryDate = date;
  }

  try {
    const supabase = getSupabase();

    // 1. 利用者の記録を保存(伴走者は写真を見ない。読むのは文章だけ)
    const { data: userEntry, error: saveError } = await supabase
      .from("entries")
      .insert({
        entry_date: entryDate,
        role: "user",
        mode: null,
        body: body.trim(),
        photos: Array.isArray(photos) ? photos : [],
      })
      .select()
      .single();
    if (saveError) throw new Error(saveError.message);

    // 2. 文脈を集める: 当日+直近7日分の全記録(今回の分も含む)
    const { data: history, error: fetchError } = await supabase
      .from("entries")
      .select("*")
      .gte("entry_date", daysAgoJst(7))
      .order("created_at", { ascending: true });
    if (fetchError) throw new Error(fetchError.message);

    // 古いものから切り詰めて上限に収める
    const lines = (history as Entry[]).map(formatEntry);
    while (lines.length > 1 && lines.join("\n\n").length > MAX_CONTEXT_CHARS) {
      lines.shift();
    }

    // 3. システムプロンプト = coach.md + モード別ファイル
    const promptsDir = path.join(process.cwd(), "prompts");
    const [coachPrompt, modePrompt] = await Promise.all([
      readFile(path.join(promptsDir, "coach.md"), "utf-8"),
      readFile(path.join(promptsDir, `${mode}.md`), "utf-8"),
    ]);

    // 4. Claudeを呼ぶ(APIキーはサーバー側の環境変数から)
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `${coachPrompt}\n\n${modePrompt}`,
      messages: [
        {
          role: "user",
          content: `以下は、わたしの思考の記録(直近7日分)です。最後の記録が、いま伴走者に送られたものです。\n\n${lines.join("\n\n")}`,
        },
      ],
    });

    const replyText = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (replyText === "") throw new Error("AIの応答が空でした");

    // 5. 伴走者の応答を保存(利用者の記録と同じ日付に並べる)
    const { data: coachEntry, error: coachError } = await supabase
      .from("entries")
      .insert({ entry_date: entryDate, role: "coach", mode, body: replyText })
      .select()
      .single();
    if (coachError) throw new Error(coachError.message);

    return NextResponse.json({ userEntry, coachEntry });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Anthropic APIキーが無効です。.env.localを確認してください。" },
        { status: 500 }
      );
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "AIの利用制限に達しました。少し待ってから再送してください。" },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
