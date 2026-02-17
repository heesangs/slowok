// 대시보드 페이지 — 오늘의 할일 요약 (Server Component)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import type { TaskWithSubtasks } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미로그인 시 로그인 페이지로 리다이렉트
  if (!user) {
    redirect("/login");
  }

  // 프로필 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? null;

  // KST(UTC+9) 기준 오늘 날짜 범위 계산
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const now = new Date(Date.now() + KST_OFFSET);
  const startOfDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const startOfDayKST = new Date(startOfDayUTC.getTime() - KST_OFFSET);
  const endOfDayKST = new Date(startOfDayKST.getTime() + 24 * 60 * 60 * 1000);

  // 오늘 생성된 과제 + 하위 과제 조회
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*, subtasks(*)")
    .eq("user_id", user.id)
    .gte("created_at", startOfDayKST.toISOString())
    .lt("created_at", endOfDayKST.toISOString())
    .order("created_at", { ascending: false });

  // 에러 발생 시
  if (error) {
    return (
      <DashboardContent
        tasks={[]}
        displayName={displayName}
        fetchError="할일을 불러오는데 실패했습니다."
      />
    );
  }

  // 빈 결과
  if (!tasks || tasks.length === 0) {
    return <DashboardEmpty displayName={displayName} />;
  }

  return (
    <DashboardContent
      tasks={tasks as TaskWithSubtasks[]}
      displayName={displayName}
    />
  );
}
