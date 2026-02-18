// 과제 실행 페이지 — 하위 과제 체크리스트 + 소요 시간 추적 (Server Component)

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskDetailView } from "@/components/task/task-detail-view";
import type { TaskWithSubtasks } from "@/types";

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 과제 + 하위 과제 조회
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*, subtasks(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !task) {
    notFound();
  }

  return <TaskDetailView task={task as TaskWithSubtasks} />;
}
