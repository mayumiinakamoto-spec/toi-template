import { createClient } from "@supabase/supabase-js";

// サーバー側専用。ブラウザから import してはいけない(秘密鍵が漏れる)
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase未設定です。.env.local に SUPABASE_URL と SUPABASE_SECRET_KEY を書いてください。"
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
