// 대시보드 빈 상태 — 오늘의 할일이 없을 때 표시

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardEmptyProps {
  displayName: string | null;
}

export function DashboardEmpty({ displayName }: DashboardEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      {/* 인사말 */}
      <h1 className="text-xl font-bold">
        안녕, {displayName || "친구"} 👋
      </h1>

      {/* 체크리스트 아이콘 */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        className="text-foreground/20"
      >
        <rect
          x="16"
          y="12"
          width="48"
          height="56"
          rx="6"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          d="M28 32L34 38L44 28"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="28"
          y1="48"
          x2="52"
          y2="48"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="28"
          y1="56"
          x2="44"
          y2="56"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      {/* 빈 상태 메시지 + CTA */}
      <p className="text-foreground/60">아직 오늘의 할일이 없어요</p>
      <Link href="/tasks/new">
        <Button size="lg">할일 추가하기</Button>
      </Link>
    </div>
  );
}
