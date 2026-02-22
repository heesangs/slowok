"use server";

// 프로필 관련 서버 액션

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const VALID_SELF_LEVELS = ["low", "medium", "high"] as const;
type SelfLevel = (typeof VALID_SELF_LEVELS)[number];

const VALID_USER_CONTEXTS = ["student", "university", "work", "personal"] as const;
type UserContext = (typeof VALID_USER_CONTEXTS)[number];

export async function updateProfileAction(formData: FormData) {
  const displayName = formData.get("display_name") as string;
  const grade = formData.get("grade") as string | null;
  const subjectsRaw = formData.get("subjects") as string | null;
  const selfLevel = formData.get("self_level") as string;
  const userContextRaw = formData.get("user_context") as string | null;

  if (!displayName || !selfLevel) {
    return { success: false, error: "닉네임과 속도를 입력해주세요." };
  }

  const normalizedDisplayName = displayName.trim();
  if (!normalizedDisplayName) {
    return { success: false, error: "닉네임을 올바르게 입력해주세요." };
  }

  // user_context 파싱 및 검증
  let userContext: UserContext[] = [];
  if (userContextRaw) {
    let parsedCtx: unknown;
    try {
      parsedCtx = JSON.parse(userContextRaw);
    } catch {
      return { success: false, error: "사용 목적 형식이 올바르지 않습니다." };
    }
    if (!Array.isArray(parsedCtx)) {
      return { success: false, error: "사용 목적 형식이 올바르지 않습니다." };
    }
    if (!parsedCtx.every((c) => VALID_USER_CONTEXTS.includes(c as UserContext))) {
      return { success: false, error: "사용 목적 값이 올바르지 않습니다." };
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
      return { success: false, error: "분야 정보 형식이 올바르지 않습니다." };
    }
    if (
      !Array.isArray(parsedSubjects) ||
      parsedSubjects.some((s) => typeof s !== "string")
    ) {
      return { success: false, error: "분야 정보 형식이 올바르지 않습니다." };
    }
    subjects = [...new Set(
      parsedSubjects
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )];
  }

  if (!VALID_SELF_LEVELS.includes(selfLevel as SelfLevel)) {
    return { success: false, error: "속도 값이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const normalizedGrade = grade?.trim() || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: normalizedDisplayName,
      grade: normalizedGrade,
      subjects,
      self_level: selfLevel as SelfLevel,
      user_context: userContext,
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "프로필 저장에 실패했습니다. 다시 시도해주세요." };
  }

  return { success: true };
}

export async function changePasswordAction(formData: FormData) {
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!newPassword || !confirmPassword) {
    return { success: false, error: "비밀번호를 입력해주세요." };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "비밀번호는 최소 6자 이상이어야 합니다." };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "비밀번호가 일치하지 않습니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: "비밀번호 변경에 실패했습니다. 다시 시도해주세요." };
  }

  return { success: true };
}
