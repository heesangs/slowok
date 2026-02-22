"use client";

// 프로필 페이지 전체 UI — 기본 정보 수정 + 계정 관리

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { updateProfileAction, changePasswordAction } from "@/app/(main)/profile/actions";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { TaskStatsSection } from "@/components/profile/task-stats";
import type { Profile, TaskStats, UserContext } from "@/types";

// 사용 목적 선택지
const USER_CONTEXTS = [
  { value: "student" as UserContext, label: "🎒 학교 공부" },
  { value: "university" as UserContext, label: "🎓 대학 과제·시험" },
  { value: "work" as UserContext, label: "💼 업무·프로젝트" },
  { value: "personal" as UserContext, label: "📚 자기계발·취미" },
] as const;

// 컨텍스트별 세부 선택지
const STUDENT_GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"];
const STUDENT_SUBJECTS = ["국어", "영어", "수학", "과학", "사회", "기타"];

const UNI_GRADES = ["1학년", "2학년", "3학년", "4학년", "대학원"];
const UNI_SUBJECTS = [
  "인문", "사회", "경영", "공학", "자연과학", "예체능", "의약", "교육", "기타",
];

const WORK_SUBJECTS = ["개발", "디자인", "마케팅", "기획", "영업", "연구", "관리", "기타"];
const PERSONAL_SUBJECTS = ["독서", "운동", "어학", "자격증", "창작", "기타"];

const SELF_LEVELS = [
  { value: "low", label: "느긋한 편", emoji: "\uD83D\uDC22", description: "천천히, 꼼꼼하게" },
  { value: "medium", label: "보통", emoji: "\uD83D\uDEB6", description: "적당한 속도로" },
  { value: "high", label: "빠른 편", emoji: "\uD83D\uDE80", description: "빠르게, 효율적으로" },
] as const;

interface ProfileContentProps {
  profile: Profile;
  email: string;
  stats: TaskStats;
}

export function ProfileContent({ profile, email, stats }: ProfileContentProps) {
  const { toast } = useToast();

  // 프로필 폼 상태
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [grade, setGrade] = useState(profile.grade ?? "");
  const [subjects, setSubjects] = useState<string[]>(profile.subjects ?? []);
  const [selfLevel, setSelfLevel] = useState(profile.self_level ?? "medium");
  const [userContext, setUserContext] = useState<UserContext[]>(profile.user_context ?? []);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // 비밀번호 변경 상태
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // 로그아웃 상태
  const [isSigningOut, setIsSigningOut] = useState(false);

  // 함께한 일수 계산
  const daysSinceJoined = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  function toggleContext(ctx: UserContext) {
    setUserContext((prev) =>
      prev.includes(ctx) ? prev.filter((c) => c !== ctx) : [...prev, ctx]
    );
  }

  function toggleSubject(subject: string) {
    setSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  }

  async function handleProfileSave() {
    if (!displayName.trim()) {
      toast("닉네임을 입력해주세요.", "error");
      return;
    }

    setIsProfileSaving(true);
    try {
      const formData = new FormData();
      formData.set("display_name", displayName.trim());
      formData.set("grade", grade);
      formData.set("subjects", JSON.stringify(subjects));
      formData.set("self_level", selfLevel);
      formData.set("user_context", JSON.stringify(userContext));

      const result = await updateProfileAction(formData);
      if (result.success) {
        toast("프로필이 저장되었습니다.");
      } else {
        toast(result.error ?? "저장에 실패했습니다.", "error");
      }
    } catch {
      toast("저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!newPassword || !confirmPassword) {
      toast("비밀번호를 입력해주세요.", "error");
      return;
    }
    if (newPassword.length < 6) {
      toast("비밀번호는 최소 6자 이상이어야 합니다.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    setIsPasswordSaving(true);
    try {
      const formData = new FormData();
      formData.set("new_password", newPassword);
      formData.set("confirm_password", confirmPassword);

      const result = await changePasswordAction(formData);
      if (result.success) {
        toast("비밀번호가 변경되었습니다.");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordForm(false);
      } else {
        toast(result.error ?? "변경에 실패했습니다.", "error");
      }
    } catch {
      toast("비밀번호 변경 중 오류가 발생했습니다.", "error");
    } finally {
      setIsPasswordSaving(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOutAction();
    } catch {
      // redirect는 에러로 throw되므로 무시
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background text-xl font-bold shrink-0">
          {(displayName || "?")[0]}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{displayName || "이름 없음"}</h1>
          <div className="flex items-center gap-2 text-sm text-foreground/60">
            {grade && (
              <span className="rounded-full border border-foreground/20 px-2.5 py-0.5 text-xs font-medium">
                {grade}
              </span>
            )}
            <span>slowok과 함께한 지 {daysSinceJoined}일째</span>
          </div>
        </div>
      </div>

      {/* Section 1: 기본 정보 */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">기본 정보</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* 닉네임 */}
          <Input
            id="display_name"
            label="닉네임"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="닉네임을 입력하세요"
            maxLength={10}
          />

          {/* 사용 목적 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground/70">slowok 사용 목적</label>
            <div className="flex flex-col gap-2">
              {USER_CONTEXTS.map((ctx) => (
                <button
                  key={ctx.value}
                  type="button"
                  onClick={() => toggleContext(ctx.value)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer",
                    userContext.includes(ctx.value)
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  )}
                >
                  {ctx.label}
                </button>
              ))}
            </div>
          </div>

          {/* 학교 공부 세부 */}
          {userContext.includes("student") && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground/70">학년</label>
                <div className="grid grid-cols-3 gap-2">
                  {STUDENT_GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                        grade === g
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/20 hover:bg-foreground/5"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground/70">주요 과목 (복수 선택)</label>
                <div className="grid grid-cols-3 gap-2">
                  {STUDENT_SUBJECTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                        subjects.includes(s)
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/20 hover:bg-foreground/5"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 대학 세부 */}
          {userContext.includes("university") && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground/70">학년</label>
                <div className="grid grid-cols-3 gap-2">
                  {UNI_GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(`대학${g.replace("학년", "").replace("대학원", "원")}`)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                        grade === `대학${g.replace("학년", "").replace("대학원", "원")}`
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/20 hover:bg-foreground/5"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground/70">전공 계열 (복수 선택)</label>
                <div className="grid grid-cols-3 gap-2">
                  {UNI_SUBJECTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSubject(s)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                        subjects.includes(s)
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/20 hover:bg-foreground/5"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 업무 세부 */}
          {userContext.includes("work") && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/70">업무 분야 (복수 선택)</label>
              <div className="grid grid-cols-3 gap-2">
                {WORK_SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                      subjects.includes(s)
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/20 hover:bg-foreground/5"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 자기계발·취미 세부 */}
          {userContext.includes("personal") && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/70">관심 분야 (복수 선택)</label>
              <div className="grid grid-cols-3 gap-2">
                {PERSONAL_SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={cn(
                      "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                      subjects.includes(s)
                        ? "border-foreground bg-foreground text-background"
                        : "border-foreground/20 hover:bg-foreground/5"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 나의 속도 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground/70">
              나의 속도
            </label>
            <div className="flex flex-col gap-2">
              {SELF_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setSelfLevel(level.value)}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer",
                    selfLevel === level.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/20 hover:bg-foreground/5"
                  )}
                >
                  <span className="text-sm font-medium">
                    {level.emoji} {level.label}
                  </span>
                  <span
                    className={cn(
                      "text-xs ml-2",
                      selfLevel === level.value
                        ? "text-background/70"
                        : "text-foreground/50"
                    )}
                  >
                    {level.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 저장 버튼 */}
          <Button
            onClick={handleProfileSave}
            isLoading={isProfileSaving}
            className="w-full"
          >
            저장하기
          </Button>
        </CardContent>
      </Card>

      {/* Section 2: 통계 */}
      <TaskStatsSection stats={stats} />

      {/* Section 3: 계정 관리 */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">계정 관리</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* 이메일 (읽기 전용) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground/70">이메일</label>
            <p className="rounded-lg border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm text-foreground/60">
              {email}
            </p>
          </div>

          {/* 비밀번호 변경 */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowPasswordForm((prev) => !prev)}
              className="flex items-center justify-between rounded-lg border border-foreground/20 px-4 py-3 text-sm font-medium transition-colors hover:bg-foreground/5 cursor-pointer"
            >
              <span>비밀번호 변경</span>
              <svg
                className={cn(
                  "h-4 w-4 transition-transform",
                  showPasswordForm && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPasswordForm && (
              <div className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4">
                <Input
                  id="new_password"
                  label="새 비밀번호"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6자 이상 입력"
                  autoComplete="new-password"
                />
                <Input
                  id="confirm_password"
                  label="비밀번호 확인"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력"
                  autoComplete="new-password"
                />
                <Button
                  onClick={handlePasswordChange}
                  isLoading={isPasswordSaving}
                  className="w-full"
                >
                  비밀번호 변경
                </Button>
              </div>
            )}
          </div>

          {/* 로그아웃 */}
          <Button
            variant="secondary"
            onClick={handleSignOut}
            isLoading={isSigningOut}
            className="w-full"
          >
            로그아웃
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
