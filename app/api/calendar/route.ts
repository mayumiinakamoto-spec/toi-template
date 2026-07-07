import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET /api/calendar?month=2026-07 → { "2026-07-01": 3, "2026-07-05": 1, ... }
export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month=YYYY-MM が必要です" }, { status: 400 });
  }
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // その月の末日
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("entries")
      .select("entry_date")
      .gte("entry_date", `${month}-01`)
      .lte("entry_date", `${month}-${String(lastDay).padStart(2, "0")}`);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.entry_date] = (counts[row.entry_date] ?? 0) + 1;
    }
    return NextResponse.json({ counts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
