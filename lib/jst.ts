// 日付はすべて日本時間(Asia/Tokyo)基準で扱う。
// サーバー(Vercel)は海外にあり時計がUTCなので、端末やサーバーの時計に頼らない。

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }); // → "2026-07-07"
const timeFmt = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function todayJst(): string {
  return dateFmt.format(new Date());
}

export function jstTime(isoString: string): string {
  return timeFmt.format(new Date(isoString)); // → "15:40"
}
