// 대시보드 페이지 — 전체 할일 요약 (Server Component)

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

  // 사용자 전체 과제 + 하위 과제 조회
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*, subtasks(*)")
    .eq("user_id", user.id)
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
