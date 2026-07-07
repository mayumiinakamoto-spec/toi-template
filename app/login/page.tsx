"use client";

import { useState } from "react";

export default function LoginPage() {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (passphrase.trim() === "" || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("通信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl tracking-[0.3em]">TOI</h1>
      <p className="font-mincho text-sm text-sumi-light">
        〜Questions create your future.〜
      </p>
      <p className="text-xs text-sumi-light">合言葉をどうぞ</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="rounded-lg border border-sumi/20 bg-white/80 p-3 text-center outline-none focus:border-sumi/40"
          autoFocus
        />
        <button
          onClick={submit}
          disabled={sending || passphrase.trim() === ""}
          className="rounded-lg bg-sumi px-4 py-3 text-sm text-white disabled:opacity-40"
        >
          {sending ? "確認中…" : "入る"}
        </button>
        {error && <p className="text-center text-sm text-red-700">{error}</p>}
      </div>
    </main>
  );
}
