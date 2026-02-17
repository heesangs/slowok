// 로그인 페이지 스텁 — 추후 Supabase Auth 연동 시 구현

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">로그인 페이지 준비 중</h1>
        <p className="text-sm text-foreground/60 mb-4">
          로그인 기능은 곧 제공될 예정입니다.
        </p>
        <Link
          href="/"
          className="text-sm text-blue-500 hover:underline"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
