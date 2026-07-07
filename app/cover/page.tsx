import Link from "next/link";

// 表紙 — 戻ってくるための頁。
// 慌てた時、呼吸が浅くなった時、問題解決に走ってしまった時に開く。
export default function CoverPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-10 p-8 text-center">
      <header>
        <h1 className="text-4xl tracking-[0.4em]">TOI</h1>
        <p className="mt-3 font-mincho text-sm text-sumi-light">
          〜Questions create your future.〜
        </p>
      </header>

      <p className="font-mincho text-sm leading-loose text-sumi-light">
        ここは、戻ってくるための頁。
        <br />
        慌ただしさの中で、呼吸が浅くなっていたら。
        <br />
        気づけば、問題解決に走り出していたら。
        <br />
        いったん、ここへ。
      </p>

      {/* 呼吸の円 — ふくらむ間に吸って、しぼむ間に吐く */}
      <div className="flex h-32 items-center justify-center">
        <div className="breathe-circle h-16 w-16 rounded-full bg-indigo-toi/40" />
      </div>

      <div className="font-mincho leading-loose">
        <p>ひとつ、深い呼吸を。</p>
        <p className="mt-8">
          余白を作ろう。
          <br />
          それは 何もない時間ではなく
          <br />
          わたしが わたしに還る場所。
        </p>
        <p className="mt-8">
          自分のための時間を作ろう。
          <br />
          誰の問題も抱えていない手で
          <br />
          お茶をあたためるような時間を。
        </p>
        <p className="mt-8">
          そうして その静けさの底から
          <br />
          創る時間が 立ちあがってくる。
        </p>
        <p className="mt-6 text-sumi-light">
          ——いま、問題を解決したいのか。
          <br />
          それとも、何かを創りたいのか。
        </p>
      </div>

      <Link href="/" className="mt-4 text-sm text-sumi-light underline-offset-4">
        ← カレンダーへ
      </Link>
    </main>
  );
}
