// 온보딩 페이지 — 프로필 미설정 사용자에게 표시

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 이미 프로필이 있으면 대시보드로
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">프로필 설정</h1>
          <p className="text-sm text-foreground/60">
            나에게 맞는 공부 속도를 찾아볼게요
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
