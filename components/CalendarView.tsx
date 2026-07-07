"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todayJst } from "@/lib/jst";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function dotSize(count: number): number {
  if (count >= 4) return 10;
  if (count >= 2) return 8;
  return 6;
}

export default function CalendarView() {
  const today = todayJst(); // "2026-07-07"
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7))); // 1〜12
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    fetch(`/api/calendar?month=${monthKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else {
          setCounts(json.counts);
          setError(null);
        }
      })
      .catch(() => setError("通信に失敗しました"));
  }, [monthKey]);

  const moveMonth = (diff: number) => {
    const d = new Date(year, month - 1 + diff, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=日曜

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="mx-auto w-full max-w-md p-4">
      <div className="pt-4 text-center">
        <h1 className="text-lg tracking-[0.3em]">TOI</h1>
        <p className="font-mincho text-[10px] text-sumi-light">
          〜Questions create your future.〜
        </p>
      </div>
      <header className="flex items-center justify-between py-4">
        <button
          onClick={() => moveMonth(-1)}
          className="px-4 py-2 text-sumi-light"
          aria-label="前の月"
        >
          ←
        </button>
        <h1 className="text-lg tracking-widest">
          {year}年{month}月
        </h1>
        <button
          onClick={() => moveMonth(1)}
          className="px-4 py-2 text-sumi-light"
          aria-label="次の月"
        >
          →
        </button>
      </header>

      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid grid-cols-7 text-center text-xs text-sumi-light">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${monthKey}-${String(day).padStart(2, "0")}`;
          const count = counts[dateStr] ?? 0;
          const isToday = dateStr === today;
          return (
            <Link
              key={dateStr}
              href={`/day/${dateStr}`}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm ${
                isToday ? "border border-sumi" : ""
              }`}
            >
              <span>{day}</span>
              {count > 0 ? (
                <span
                  className="rounded-full bg-sumi"
                  style={{ width: dotSize(count), height: dotSize(count) }}
                />
              ) : (
                <span style={{ width: 6, height: 6 }} />
              )}
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-center font-mincho text-xs text-sumi-light">
        日付を選ぶと、その日の記録が開きます
      </p>
    </div>
  );
}
