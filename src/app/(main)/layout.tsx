// (main) 라우트 그룹 레이아웃 — 상단 헤더 + 중앙 정렬 컨테이너

import Link from "next/link";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* 상단 헤더 */}
      <header className="border-b border-foreground/10 px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-lg font-bold">
            slowok
          </Link>
        </div>
      </header>

      {/* 본문 콘텐츠 */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
