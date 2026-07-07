# TOI 〜Questions create your future.〜(テンプレート版)

自分専用の「思考の伴走AIコーチ」を建てるためのテンプレート。

問題を解決するAIではなく、無意識の思考パターンに気づかせ、
「いま、問題を解決したいのか。それとも何かを創りたいのか」と静かに問い返す伴走者。

> **これから自分の環境を建てる人へ → [SETUP.md](SETUP.md) を上から順に。**
> プログラミング経験は不要。所要1〜2時間、費用は AI 利用料(月数百円目安、自分のカードで前払い$5〜)のみ。

## このアプリの性質

- **完全に1人用**。記録はあなたのデータベースだけに保存され、誰とも共有されない
- AIコーチの人格は [prompts/coach.md](prompts/coach.md) を編集して自分用に調整できる
- **問いモード**(デフォルト): AIは助言せず、短い問いだけを返す
- **助言モード**: 明示的に切り替えたときだけ、視点や選択肢を提示する

## 構成

- **Next.js 16**(App Router / TypeScript / Tailwind CSS v4)
- **Supabase** — `entries` テーブルに記録を保存(日付は日本時間基準)
- **Anthropic API**(Claude Sonnet)— モデルは環境変数で差し替え可能
- **アクセス保護** — 合言葉+httpOnly Cookie(`proxy.ts`)
- **デプロイ** — Vercel(無料枠)

## 画面

- カレンダー(月表示)— 記録のある日に墨色の点。件数で点が育つ
- 日別タイムライン — 1本の縦の流れ。AIの応答には「問い」「助言」のラベル
- 入力欄は1つ。「記録のみ」(AI応答なし)と「伴走者に送る」の2ボタン

## 開発コマンド

```bash
npm install
npm run dev   # http://localhost:3000
```

環境変数(`.env.local`、リポジトリには含めない):

| 変数 | 内容 |
|---|---|
| `SUPABASE_URL` | SupabaseプロジェクトURL |
| `SUPABASE_SECRET_KEY` | Supabase secret key(サーバー専用) |
| `ANTHROPIC_API_KEY` | Anthropic APIキー |
| `ANTHROPIC_MODEL` | 使用モデル(例: `claude-sonnet-4-6`) |
| `APP_PASSPHRASE` | アクセス用の合言葉 |
