// 節目の問いの目印。coach応答の本文先頭に付け、画面側でラベルに変換する
export const MONTHLY_MARKER = "【月の問い】";
export const HALF_YEAR_MARKER = "【半年の問い】";
export const YEAR_MARKER = "【年の問い】";

export const PERIODIC_LABELS: Record<string, string> = {
  [MONTHLY_MARKER]: "月の問い",
  [HALF_YEAR_MARKER]: "半年の問い",
  [YEAR_MARKER]: "年の問い",
};

export type Entry = {
  id: string;
  created_at: string;
  entry_date: string;
  role: "user" | "coach";
  mode: "toi" | "jogen" | null;
  body: string;
};
