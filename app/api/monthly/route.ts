import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "@/lib/supabase";
import { todayJst, jstTime } from "@/lib/jst";
import {
  MONTHLY_MARKER,
  HALF_YEAR_MARKER,
  YEAR_MARKER,
  type Entry,
} from "@/lib/types";

const MAX_CONTEXT_CHARS = 24000;
// 半年・年は記録量が多いので予算を広げる(それでも溢れたら古い順に削る)
const MAX_CONTEXT_CHARS_SPECIAL = 48000;

// 節目の問いの定義。
// 交通整理: 年 > 半年 > 月。大きい節目の期間中、月の問いは休む。
type Special = {
  marker: string;
  promptFile: string;
  periodStart: string; // 記録を読む範囲
  periodEnd: string;
  guardStart: string; // この範囲に同種の問いが既にあれば生成しない
  guardEnd: string;
  describe: string;
};

function yearSpecial(targetYear: number): Special {
  return {
    marker: YEAR_MARKER,
    promptFile: "toshi.md",
    periodStart: `${targetYear}-01-01`,
    periodEnd: `${targetYear}-12-31`,
    guardStart: `${targetYear}-12-31`,
    guardEnd: `${targetYear + 1}-01-31`,
    describe: `${targetYear}年の1年間`,
  };
}

// 年の問い: 12/31〜翌1/31 / 半年の問い: 6/30〜7/31
function dueSpecial(today: string): Special | null {
  const y = Number(today.slice(0, 4));
  const mmdd = today.slice(5);
  if (mmdd >= "12-31") return yearSpecial(y);
  if (mmdd <= "01-31") return yearSpecial(y - 1);
  if (mmdd >= "06-30" && mmdd <= "07-31") {
    return {
      marker: HALF_YEAR_MARKER,
      promptFile: "hantoshi.md",
      periodStart: `${y}-01-01`,
      periodEnd: `${y}-06-30`,
      guardStart: `${y}-06-30`,
      guardEnd: `${y}-07-31`,
      describe: `${y}年の上半期(1月〜6月)`,
    };
  }
  return null;
}

// "2026-08" → "2026-07"
function prevMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

// POST /api/monthly — 節目の問い(月・半年・年)をまとめて司る。
// カレンダー表示のたびに呼ばれ、出すべき問いがあれば1件だけ生成する。
// テスト用パラメータ: ?today=YYYY-MM-DD(日付の上書き) ?dry=1(生成せず判定だけ返す)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const params = request.nextUrl.searchParams;
    const todayParam = params.get("today");
    const today =
      todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : todayJst();
    const dry = params.get("dry") === "1";
    const thisMonth = today.slice(0, 7);

    const markerExists = async (marker: string, from: string, to: string) => {
      const { data, error } = await supabase
        .from("entries")
        .select("id")
        .eq("role", "coach")
        .like("body", `${marker}%`)
        .gte("entry_date", from)
        .lte("entry_date", to)
        .limit(1);
      if (error) throw new Error(error.message);
      return data.length > 0;
    };

    const fetchRange = async (from: string, to: string) => {
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .gte("entry_date", from)
        .lte("entry_date", to)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Entry[];
    };

    const generate = async (
      marker: string,
      promptFile: string,
      history: Entry[],
      describe: string,
      budget: number
    ) => {
      const lines = history.map(formatEntry);
      while (lines.length > 1 && lines.join("\n\n").length > budget) {
        lines.shift();
      }
      const promptsDir = path.join(process.cwd(), "prompts");
      const [coachPrompt, extraPrompt] = await Promise.all([
        readFile(path.join(promptsDir, "coach.md"), "utf-8"),
        readFile(path.join(promptsDir, promptFile), "utf-8"),
      ]);
      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 512,
        system: `${coachPrompt}\n\n${extraPrompt}`,
        messages: [
          {
            role: "user",
            content: `以下は、わたしの${describe}の思考の記録です。\n\n${lines.join("\n\n")}`,
          },
        ],
      });
      const replyText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      if (replyText === "") return NextResponse.json({ skipped: "empty-reply" });
      const { data: entry, error } = await supabase
        .from("entries")
        .insert({
          entry_date: today,
          role: "coach",
          mode: "toi",
          body: `${marker}${replyText}`,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ entry });
    };

    // ① 半年・年の問い(月より優先)
    const special = dueSpecial(today);
    if (special) {
      const exists = await markerExists(
        special.marker,
        special.guardStart,
        special.guardEnd
      );
      if (exists) {
        // 節目の問いが出ている期間、月の問いは休み
        return NextResponse.json({ skipped: "superseded-by-special" });
      }
      const history = await fetchRange(special.periodStart, special.periodEnd);
      if (history.length > 0) {
        if (dry) {
          return NextResponse.json({
            would: special.marker,
            period: [special.periodStart, special.periodEnd],
            entries: history.length,
          });
        }
        return await generate(
          special.marker,
          special.promptFile,
          history,
          special.describe,
          MAX_CONTEXT_CHARS_SPECIAL
        );
      }
      // 節目の期間に記録がない → 月の問いの判定へ落ちる
    }

    // ② 月の問い
    const target = params.get("target") ?? prevMonth(thisMonth);
    if (!/^\d{4}-\d{2}$/.test(target)) {
      return NextResponse.json({ error: "targetはYYYY-MM" }, { status: 400 });
    }
    const [cy, cm] = thisMonth.split("-").map(Number);
    const thisMonthLastDay = new Date(cy, cm, 0).getDate();
    const monthlyExists = await markerExists(
      MONTHLY_MARKER,
      `${thisMonth}-01`,
      `${thisMonth}-${String(thisMonthLastDay).padStart(2, "0")}`
    );
    if (monthlyExists) {
      return NextResponse.json({ skipped: "already-generated" });
    }
    const [ty, tm] = target.split("-").map(Number);
    const lastDay = new Date(ty, tm, 0).getDate();
    const history = await fetchRange(
      `${target}-01`,
      `${target}-${String(lastDay).padStart(2, "0")}`
    );
    if (history.length === 0) {
      return NextResponse.json({ skipped: "no-entries" });
    }
    if (dry) {
      return NextResponse.json({
        would: MONTHLY_MARKER,
        period: [target],
        entries: history.length,
      });
    }
    return await generate(
      MONTHLY_MARKER,
      "tsuki.md",
      history,
      `${ty}年${tm}月`,
      MAX_CONTEXT_CHARS
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
