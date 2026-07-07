# TOI セットアップ手順書(初心者向け・完全版)

自分専用のTOIを建てるための手順書です。上から順にやれば完成します。
**プログラミング経験は不要**ですが、AIアシスタント(Claude や ChatGPT など)に
この手順書を見せながら一緒に進めると、つまずいたときに助けてもらえます。

## 全体像と費用

| 作るもの | 役割 | 費用 |
|---|---|---|
| Supabase アカウント | 記録の保管庫 | 無料 |
| Anthropic アカウント | AI(伴走者)の頭脳 | **有料**: 最低$5のクレジット前払い。1回の対話で1〜4円程度 |
| Vercel アカウント | アプリの公開場所 | 無料 |

すべて**自分のアカウント・自分の支払い**で作ります。誰かのアカウントを借りないこと
(借りると、あなたの記録がその人に見え、費用もその人に請求されます)。

---

## STEP 0: このコードを手に入れる

- GitHubアカウントがある場合: このリポジトリを **Fork**(自分のアカウントに複製)するか、
  **Code → Download ZIP** でダウンロードして展開
- 以降の作業はMac/Windowsどちらでも可。Node.js(v20以上)が必要:
  https://nodejs.org から LTS版をインストール

フォルダの中でターミナルを開き:

```bash
npm install
```

---

## STEP 1: Supabase(記録の保管庫)

1. https://supabase.com → サインアップ(Googleログインが楽)
2. **New project** → Name: 好きな名前 / Database Password: 自動生成してメモ /
   Region: **Northeast Asia (Tokyo)** → 作成して1〜2分待つ
3. 左メニューの **SQL Editor** を開き、下のSQLを貼り付けて **Run**:

```sql
create table entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null,
  role text not null check (role in ('user', 'coach')),
  mode text check (mode in ('toi', 'jogen')),
  body text not null
);

create index entries_entry_date_idx on entries (entry_date);

alter table entries enable row level security;
```

「Success. No rows returned」と出ればOK。

4. **Project Settings(左下の歯車)→ API Keys** から2つコピー:
   - **Project URL**(`https://〜.supabase.co`)
   - **Secret key**(`sb_secret_...`。Reveal を押すと見える)

---

## STEP 2: Anthropic(AIの頭脳)

1. https://console.anthropic.com → サインアップ
2. 支払い設定でクレジットカードを登録し、**$5** のクレジットを購入
3. **API Keys → Create Key** → 出てきた `sk-ant-...` をコピー
   (**一度しか表示されない**のでその場でコピー)

---

## STEP 3: 環境変数を設定してローカルで動かす

プロジェクトフォルダの直下に `.env.local` という名前のファイルを作り、こう書く:

```
SUPABASE_URL=(STEP1でコピーしたProject URL)
SUPABASE_SECRET_KEY=(STEP1でコピーしたsb_secret_...)
ANTHROPIC_API_KEY=(STEP2でコピーしたsk-ant-...)
ANTHROPIC_MODEL=claude-sonnet-4-6
APP_PASSPHRASE=(自分だけの合言葉。日本語も可)
```

⚠️ このファイルは**誰にも見せない・送らない**。鍵の束そのものです。

動作確認:

```bash
npm run dev
```

ブラウザで http://localhost:3000 → 合言葉を入れる → カレンダーが出て、
今日の日付から何か書いて「伴走者に送る」→ 数秒でAIの応答が返れば成功。

---

## STEP 4: Vercelに公開(スマホから使えるように)

1. https://vercel.com/signup → **Hobby**(無料)でサインアップ
2. ターミナルで:

```bash
npx vercel login
# 表示されるURLをブラウザで開いて承認

npx vercel link --yes

# 環境変数を5つ登録(値を聞かれたら.env.localの値を貼る)
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_SECRET_KEY production
npx vercel env add ANTHROPIC_API_KEY production
npx vercel env add ANTHROPIC_MODEL production
npx vercel env add APP_PASSPHRASE production

# 公開!
npx vercel --prod
```

3. 表示されたURL(`https://〜.vercel.app`)をスマホで開く → 合言葉 → 完成🎉
   - iPhoneなら Safari の共有ボタン → 「ホーム画面に追加」でアプリ化できる

---

## STEP 5: 自分専用に育てる(任意・おすすめ)

- **[prompts/coach.md](prompts/coach.md)** を開き、「次の思考パターン」の4項目を
  **自分がハマりやすいパターン**に書き換える。ここがこのアプリの心臓部
- 書き換えたら `npx vercel --prod` で再公開(ローカルは保存するだけで反映)

## 困ったら

- エラーメッセージをそのままAIアシスタントに貼って「TOIのセットアップ中にこうなった」と聞く
- 各サービスの管理画面: 記録は Supabase の Table Editor、AI利用量は Anthropic Console の Usage で見られる
