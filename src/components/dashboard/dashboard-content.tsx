"use client";

// 대시보드 콘텐츠 — 과제 목록 + 헤더 + FAB (Client Component)

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TaskCard } from "@/components/dashboard/task-card";
import { useToast } from "@/components/ui/toast";
import { formatMinutes } from "@/lib/utils";
import { deleteTaskAction } from "@/app/(main)/tasks/actions";
import type { TaskWithSubtasks } from "@/types";

interface DashboardContentProps {
  tasks: TaskWithSubtasks[];
  displayName: string | null;
  fetchError?: string;
}

export function DashboardContent({
  tasks,
  displayName,
  fetchError,
}: DashboardContentProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [completedOpen, setCompletedOpen] = useState(false);

  // Optimistic Update를 위한 로컬 상태 — props 변경 시 동기화
  const [optimisticTasks, setOptimisticTasks] = useState(tasks);
  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  async function handleDelete(taskId: string) {
    // 삭제 대상 저장 (롤백용)
    const deletedTask = optimisticTasks.find((t) => t.id === taskId);

    // 즉시 UI에서 제거 + toast 표시
    setOptimisticTasks((prev) => prev.filter((t) => t.id !== taskId));
    toast("할일을 삭제했습니다.", "success");

    // 백그라운드로 서버 삭제 실행
    const result = await deleteTaskAction(taskId);

    if (result.success) {
      // 서버 데이터와 최종 동기화
      router.refresh();
    } else {
      // 실패 시 카드 복원 + 에러 toast
      if (deletedTask) {
        setOptimisticTasks((prev) => [...prev, deletedTask]);
      }
      toast(result.error ?? "삭제 중 오류가 발생했습니다.", "error");
    }
  }

  // /tasks/new에서 돌아왔을 때 성공 토스트 표시
  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      toast("저장되었습니다 ✓", "success");
      // URL에서 쿼리 파라미터 제거
      window.history.replaceState(null, "", "/dashboard");
      return;
    }

    if (searchParams.get("onboarding_saved") === "1") {
      toast("첫 한 걸음이 준비되었어요 ✨", "success");
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [searchParams, toast]);

  // 에러 토스트 표시
  useEffect(() => {
    if (fetchError) {
      toast(fetchError, "error");
    }
  }, [fetchError, toast]);

  // 진행 중/대기 과제와 완료 과제 분리 & 정렬 (optimisticTasks 사용)
  const activeTasks = optimisticTasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => {
      // in_progress 먼저, 그 다음 pending
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (a.status !== "in_progress" && b.status === "in_progress") return 1;
      return 0;
    });
  const completedTasks = optimisticTasks.filter((t) => t.status === "completed");

  // 총 예상 시간 계산
  const totalMinutes = optimisticTasks.reduce(
    (sum, t) => sum + (t.total_estimated_minutes ?? 0),
    0
  );
  const totalSubtasks = optimisticTasks.reduce(
    (sum, t) => sum + (t.subtasks?.length ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 섹션 */}
      <div>
        <h1 className="text-xl font-bold">
          안녕, {displayName || "친구"} 👋
        </h1>
          <p className="text-sm text-foreground/60 mt-1">
          {optimisticTasks.length > 0
            ? `${optimisticTasks.length}개 할일, ${totalSubtasks}개 세부 단계, 총 ${formatMinutes(totalMinutes)}`
            : "등록된 할일이 없어요"}
        </p>
      </div>

      {/* 진행 중 섹션 */}
      {activeTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-foreground/50 mb-3">
            진행 중
          </h2>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={() => handleDelete(task.id)}
                isDeleting={false}
              />
            ))}
          </div>
        </section>
      )}

      {/* 완료 섹션 (접을 수 있음) */}
      {completedTasks.length > 0 && (
        <section>
          <button
            onClick={() => setCompletedOpen(!completedOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground/50 mb-3 min-h-[44px] cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              className={`transition-transform ${completedOpen ? "rotate-90" : ""}`}
            >
              <path d="M4 2L9 6L4 10V2Z" />
            </svg>
            완료 ({completedTasks.length})
          </button>
          {completedOpen && (
            <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={() => handleDelete(task.id)}
                  isDeleting={false}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* FAB — 할일 추가 버튼 */}
      <Link
        href="/tasks/new"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90 active:opacity-80 transition-opacity"
        aria-label="할일 추가하기"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  );
}
