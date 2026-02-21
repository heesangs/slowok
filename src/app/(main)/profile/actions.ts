"use server";

// 프로필 관련 서버 액션

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const VALID_SELF_LEVELS = ["low", "medium", "high"] as const;
type SelfLevel = (typeof VALID_SELF_LEVELS)[number];

export async function updateProfileAction(formData: FormData) {
  const displayName = formData.get("display_name") as string;
  const grade = formData.get("grade") as string;
  const subjectsRaw = formData.get("subjects") as string;
  const selfLevel = formData.get("self_level") as string;

  if (!displayName || !grade || !subjectsRaw || !selfLevel) {
    return { success: false, error: "모든 항목을 입력해주세요." };
  }

  const normalizedDisplayName = displayName.trim();
  const normalizedGrade = grade.trim();
  if (!normalizedDisplayName || !normalizedGrade) {
    return { success: false, error: "모든 항목을 올바르게 입력해주세요." };
  }

  let parsedSubjects: unknown;
  try {
    parsedSubjects = JSON.parse(subjectsRaw);
  } catch {
    return { success: false, error: "과목 정보 형식이 올바르지 않습니다." };
  }

  if (
    !Array.isArray(parsedSubjects) ||
    parsedSubjects.some((subject) => typeof subject !== "string")
  ) {
    return { success: false, error: "과목 정보 형식이 올바르지 않습니다." };
  }

  const subjects = [...new Set(
    parsedSubjects
      .map((subject) => subject.trim())
      .filter((subject) => subject.length > 0)
  )];

  if (subjects.length === 0) {
    return { success: false, error: "과목을 하나 이상 선택해주세요." };
  }

  if (!VALID_SELF_LEVELS.includes(selfLevel as SelfLevel)) {
    return { success: false, error: "공부 속도 값이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: normalizedDisplayName,
      grade: normalizedGrade,
      subjects,
      self_level: selfLevel as SelfLevel,
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
