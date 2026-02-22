// 과제 생성 페이지 — 인증 확인 후 TaskCreator 렌더링

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskCreator } from "@/components/task/task-creator";

export default async function NewTaskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // userContext를 폼 placeholder에 사용
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_context")
    .eq("id", user.id)
    .single();

  return <TaskCreator userContext={profile?.user_context ?? []} />;
}
