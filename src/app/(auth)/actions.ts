"use server";

// 인증 관련 서버 액션

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const VALID_SELF_LEVELS = ["low", "medium", "high"] as const;
type SelfLevel = (typeof VALID_SELF_LEVELS)[number];

const VALID_USER_CONTEXTS = ["student", "university", "work", "personal"] as const;
type UserContext = (typeof VALID_USER_CONTEXTS)[number];

export async function signUpAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  // 이메일 인증이 필요한 설정이면 즉시 세션이 생기지 않는다.
  if (!data.session) {
    return { message: "인증 메일을 보냈어요. 메일 확인 후 로그인해주세요." };
  }

  redirect("/onboarding");
}

export async function signInAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  // 프로필 존재 여부 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인에 실패했습니다." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  // "row not found" 외 조회 에러는 안내 후 중단
  if (profileError && profileError.code !== "PGRST116") {
    return { error: "프로필 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  if (profile) {
    redirect("/dashboard");
  } else {
    redirect("/onboarding");
  }
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function saveProfileAction(formData: FormData) {
  const displayName = formData.get("display_name") as string;
  const grade = formData.get("grade") as string | null;
  const subjectsRaw = formData.get("subjects") as string | null;
  const selfLevel = formData.get("self_level") as string;
  const userContextRaw = formData.get("user_context") as string | null;

  if (!displayName || !selfLevel) {
    return { error: "닉네임과 속도를 입력해주세요." };
  }

  const normalizedDisplayName = displayName.trim();
  if (!normalizedDisplayName) {
    return { error: "닉네임을 올바르게 입력해주세요." };
  }

  // user_context 파싱 및 검증
  let userContext: UserContext[] = [];
  if (userContextRaw) {
    let parsedCtx: unknown;
    try {
      parsedCtx = JSON.parse(userContextRaw);
    } catch {
      return { error: "사용 목적 형식이 올바르지 않습니다." };
    }
    if (!Array.isArray(parsedCtx)) {
      return { error: "사용 목적 형식이 올바르지 않습니다." };
    }
    if (!parsedCtx.every((c) => VALID_USER_CONTEXTS.includes(c as UserContext))) {
      return { error: "사용 목적 값이 올바르지 않습니다." };
    }
    userContext = parsedCtx as UserContext[];
  }

  // subjects 파싱 (optional)
  let subjects: string[] = [];
  if (subjectsRaw) {
    let parsedSubjects: unknown;
    try {
      parsedSubjects = JSON.parse(subjectsRaw);
    } catch {
      return { error: "분야 정보 형식이 올바르지 않습니다." };
    }
    if (
      !Array.isArray(parsedSubjects) ||
      parsedSubjects.some((s) => typeof s !== "string")
    ) {
      return { error: "분야 정보 형식이 올바르지 않습니다." };
    }
    subjects = [...new Set(
      parsedSubjects
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )];
  }

  if (!VALID_SELF_LEVELS.includes(selfLevel as SelfLevel)) {
    return { error: "속도 값이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedGrade = grade?.trim() || null;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: normalizedDisplayName,
    grade: normalizedGrade,
    subjects,
    self_level: selfLevel as SelfLevel,
    user_context: userContext,
  });

  if (error) {
    return { error: "프로필 저장에 실패했습니다. 다시 시도해주세요." };
  }

  redirect("/dashboard");
}
