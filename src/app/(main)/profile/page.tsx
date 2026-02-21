// 프로필 페이지 — 기본 정보 수정 + 계정 관리 (Server Component)

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileContent } from "@/components/profile/profile-content";
import { getTaskStats } from "@/lib/stats";
import type { Profile } from "@/types";

export default async function ProfilePage() {
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
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/onboarding");
  }

  // 과제 통계 조회
  const stats = await getTaskStats(supabase, user.id);

  return (
    <ProfileContent
      profile={profile as Profile}
      email={user.email ?? ""}
      stats={stats}
    />
  );
}
