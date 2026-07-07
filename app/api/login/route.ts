import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, passphraseHash } from "@/lib/auth";

// POST /api/login  { passphrase: "..." }
export async function POST(request: NextRequest) {
  const { passphrase } = await request.json().catch(() => ({}));
  const expected = process.env.APP_PASSPHRASE;

  if (!expected) {
    return NextResponse.json(
      { error: "サーバーに APP_PASSPHRASE が設定されていません" },
      { status: 500 }
    );
  }
  if (typeof passphrase !== "string" || passphrase.trim() !== expected) {
    return NextResponse.json({ error: "合言葉が違います" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, await passphraseHash(expected), {
    httpOnly: true, // JavaScriptから読めない(盗まれにくい)
    secure: process.env.NODE_ENV === "production", // 本番はHTTPSのみ
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1年
    path: "/",
  });
  return response;
}
