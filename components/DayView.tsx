"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PERIODIC_LABELS,
  HALF_YEAR_MARKER,
  YEAR_MARKER,
  type Entry,
} from "@/lib/types";
import { jstTime, todayJst } from "@/lib/jst";

const MODE_LABEL = { toi: "問い", jogen: "助言" } as const;

// 節目の問い(月・半年・年)は本文先頭の目印で見分け、ラベルと本文に分解する。
// milestone = 半年・年の問い(見た目に静かな格を付ける)
function coachLabelAndBody(entry: Entry): {
  label: string;
  body: string;
  milestone: boolean;
} {
  for (const [marker, label] of Object.entries(PERIODIC_LABELS)) {
    if (entry.body.startsWith(marker)) {
      return {
        label,
        body: entry.body.slice(marker.length).trimStart(),
        milestone: marker === HALF_YEAR_MARKER || marker === YEAR_MARKER,
      };
    }
  }
  return {
    label: entry.mode ? MODE_LABEL[entry.mode] : "伴走者",
    body: entry.body,
    milestone: false,
  };
}

export default function DayView({ date }: { date: string }) {
  const router = useRouter();
  const today = todayJst();
  const isToday = date === today;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"toi" | "jogen">("toi");
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    fetch(`/api/entries?date=${date}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else {
          setEntries(json.entries);
          setError(null);
        }
      })
      .catch(() => setError("通信に失敗しました"));
  }, [date]);

  useEffect(load, [load]);

  // 保存の共通処理。url = "/api/entries"(記録のみ) or "/api/coach"(伴走者に送る)
  const submit = async (url: string, payload: object) => {
    if (text.trim() === "" || saving) return;
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setText("");
      if (isToday) {
        load();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        // 過去の日付を見ていても、保存先は常に「今日」
        router.push(`/day/${today}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const saveOnly = () => submit("/api/entries", { body: text });
  const sendToCoach = () => submit("/api/coach", { body: text, mode });

  const deleteEntry = async (id: string) => {
    if (!window.confirm("この記録を削除します。よろしいですか?")) return;
    const res = await fetch(`/api/entries?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.error) {
      setError(json.error);
      return;
    }
    load();
  };

  const [y, m, d] = date.split("-");

  return (
    <div className="mx-auto w-full max-w-md">
      {/* ヘッダー */}
      <header className="sticky top-0 flex items-center gap-3 border-b border-sumi/10 bg-washi/95 p-4">
        <Link href="/" className="text-sumi-light">
          ← カレンダー
        </Link>
        <h1 className="text-lg tracking-wider">
          {Number(m)}月{Number(d)}日
          <span className="ml-2 text-xs text-sumi-light">{y}年</span>
        </h1>
        {isToday && <span className="rounded border border-sumi/30 px-2 py-0.5 text-xs">今日</span>}
      </header>

      {/* タイムライン */}
      <main className="px-4 pb-56 pt-6">
        {error && (
          <p className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {entries.length === 0 && !error && (
          <p className="py-16 text-center font-mincho text-sm text-sumi-light">
            この日の記録はまだありません
          </p>
        )}
        <ol className="relative ml-14 border-l border-sumi/20">
          {entries.map((entry) => (
            <li key={entry.id} className="relative mb-6 pl-4">
              <span className="absolute -left-14 top-1 w-10 text-right text-xs text-sumi-light">
                {jstTime(entry.created_at)}
              </span>
              <span className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-sumi/60" />
              {entry.role === "user" ? (
                <p className="whitespace-pre-wrap rounded-lg border border-sumi/10 bg-white/60 p-3 text-sm leading-relaxed">
                  {entry.body}
                </p>
              ) : (
                (() => {
                  const coach = coachLabelAndBody(entry);
                  return (
                    <div
                      className={`rounded-lg p-3 ${
                        coach.milestone
                          ? "border-[3px] border-double border-kincha/60 bg-kincha/5"
                          : entry.mode === "jogen"
                            ? "border border-matsuba/40 bg-matsuba/5"
                            : "border border-indigo-toi/40 bg-indigo-toi/5"
                      }`}
                    >
                      <span
                        className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] text-white ${
                          coach.milestone
                            ? "bg-kincha"
                            : entry.mode === "jogen"
                              ? "bg-matsuba"
                              : "bg-indigo-toi"
                        }`}
                      >
                        {coach.label}
                      </span>
                      <p
                        className={`whitespace-pre-wrap font-mincho leading-relaxed ${
                          coach.milestone ? "text-[15px]" : "text-sm"
                        }`}
                      >
                        {coach.body}
                      </p>
                    </div>
                  );
                })()
              )}
              <button
                onClick={() => deleteEntry(entry.id)}
                className="ml-auto mt-1 block px-1 text-[10px] text-sumi-light/60 active:text-red-700"
              >
                削除
              </button>
            </li>
          ))}
        </ol>
        <div ref={bottomRef} />
      </main>

      {/* 入力欄(画面下部に固定) */}
      <div className="fixed inset-x-0 bottom-0 border-t border-sumi/10 bg-washi p-3">
        <div className="mx-auto max-w-md">
          {!isToday && (
            <p className="mb-1 text-center text-[11px] text-sumi-light">
              ※ 保存は今日({today})の記録になります
            </p>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="思ったことを、そのまま"
            className="w-full resize-none rounded-lg border border-sumi/20 bg-white/80 p-3 text-sm outline-none focus:border-sumi/40"
          />
          <div className="mt-2 flex items-center gap-2">
            {/* 問い/助言 モード切替(AI応答はステップ3で有効化) */}
            <button
              onClick={() => setMode(mode === "toi" ? "jogen" : "toi")}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                mode === "toi"
                  ? "border-indigo-toi text-indigo-toi"
                  : "border-matsuba text-matsuba"
              }`}
            >
              {MODE_LABEL[mode]}モード
            </button>
            <div className="flex-1" />
            <button
              onClick={saveOnly}
              disabled={saving || text.trim() === ""}
              className="rounded-lg border border-sumi/30 px-4 py-2 text-sm disabled:opacity-40"
            >
              記録のみ
            </button>
            <button
              onClick={sendToCoach}
              disabled={saving || text.trim() === ""}
              className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-40 ${
                mode === "toi" ? "bg-indigo-toi" : "bg-matsuba"
              }`}
            >
              {saving ? "送信中…" : "伴走者に送る"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
