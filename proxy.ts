import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, passphraseHash } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ログイン画面と照合APIだけは、門を通さず入れる
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const passphrase = process.env.APP_PASSPHRASE;
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (passphrase && cookie === (await passphraseHash(passphrase))) {
    return NextResponse.next();
  }

  // APIは401(未認証)を返し、画面はログインへ誘導する
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // 静的ファイル(CSS/JS/画像)は門番の対象外にする
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
