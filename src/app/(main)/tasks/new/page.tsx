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

  return <TaskCreator />;
}
