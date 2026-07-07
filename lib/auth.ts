export const AUTH_COOKIE = "bansou_auth";

// 合言葉そのものではなく、SHA-256ハッシュ(一方向の指紋)をCookieに入れる。
// 合言葉を変えると全端末で再ログインが必要になる。
export async function passphraseHash(passphrase: string): Promise<string> {
  const data = new TextEncoder().encode(passphrase);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
