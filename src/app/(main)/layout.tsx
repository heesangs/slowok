// (main) 라우트 그룹 레이아웃 — 상단 헤더 + 중앙 정렬 컨테이너

import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      {/* 상단 헤더 */}
      <header className="border-b border-foreground/10 px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between">
          <Link href="/dashboard" className="text-lg font-bold">
            slowgoes
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/review"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-foreground/5"
              aria-label="회고"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 9.75h6.75m-6.75 3h4.5M3.75 6.75A2.25 2.25 0 016 4.5h12a2.25 2.25 0 012.25 2.25v8.25A2.25 2.25 0 0118 17.25H10.5l-3.75 2.25v-2.25H6A2.25 2.25 0 013.75 15V6.75z"
                />
              </svg>
            </Link>
            <Link
              href="/profile"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:bg-foreground/5"
              aria-label="프로필"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* 본문 콘텐츠 */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
