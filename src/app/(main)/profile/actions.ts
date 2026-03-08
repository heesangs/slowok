"use server";

// 프로필 관련 서버 액션

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const VALID_SELF_LEVELS = ["low", "medium", "high"] as const;
type SelfLevel = (typeof VALID_SELF_LEVELS)[number];

const VALID_USER_CONTEXTS = ["student", "university", "work", "personal"] as const;
type UserContext = (typeof VALID_USER_CONTEXTS)[number];
const ACCOUNT_DELETE_CONFIRM_TEXT = "탈퇴합니다";

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

function mapDeleteAccountError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "회원탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  const candidate = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    name?: unknown;
  };

  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  const code =
    typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const name =
    typeof candidate.name === "string" ? candidate.name.toLowerCase() : "";
  const status = typeof candidate.status === "number" ? candidate.status : undefined;

  const hasToken = (...tokens: string[]) =>
    tokens.some(
      (token) =>
        message.includes(token) ||
        code.includes(token) ||
        name.includes(token)
    );

  if (
    status === 400 &&
    hasToken("invalid login credentials", "invalid_credentials", "invalid grant")
  ) {
    return "비밀번호가 올바르지 않습니다.";
  }

  if (
    status === 429 ||
    hasToken("too many requests", "rate limit", "over_request_rate_limit")
  ) {
    return "요청이 많아 잠시 제한되었어요. 잠시 후 다시 시도해주세요.";
  }

  if (typeof status === "number" && status >= 500) {
    return "서버 오류로 회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.";
  }

  return "회원탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
}

export async function deleteAccountAction(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmText = formData.get("confirm_text") as string;

  if (!password) {
    return { success: false, error: "비밀번호를 입력해주세요." };
  }

  if (confirmText !== ACCOUNT_DELETE_CONFIRM_TEXT) {
    return {
      success: false,
      error: `확인 문구를 정확히 입력해주세요. (${ACCOUNT_DELETE_CONFIRM_TEXT})`,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    redirect("/login");
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (reauthError) {
    return { success: false, error: mapDeleteAccountError(reauthError) };
  }

  const { error: deleteError } = await supabase.rpc("delete_my_account");
  if (deleteError) {
    return { success: false, error: mapDeleteAccountError(deleteError) };
  }

  await supabase.auth.signOut();
  redirect("/login?deleted=1");
}
