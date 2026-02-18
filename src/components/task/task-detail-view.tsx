"use client";

// 과제 실행 뷰 — 하위 과제 체크리스트 + 진행 상황 + 경과 시간

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SubtaskCheckItem } from "@/components/task/subtask-check-item";
import { useToast } from "@/components/ui/toast";
import { cn, formatMinutes, difficultyConfig } from "@/lib/utils";
import { toggleSubtaskAction, updateActualMinutesAction } from "@/app/(main)/tasks/actions";
import type { TaskWithSubtasks, Subtask, Difficulty } from "@/types";

interface TaskDetailViewProps {
  task: TaskWithSubtasks;
}

export function TaskDetailView({ task: initialTask }: TaskDetailViewProps) {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<Subtask[]>(
    [...initialTask.subtasks].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 타이머 관리
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsTimerRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 진행 통계 계산
  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  // 총 예상/실제 시간
  const totalEstimated = initialTask.total_estimated_minutes ?? 0;

  // 경과 시간 포맷 (초 단위)
  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}시간 ${m}분 ${s}초`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
  };

  // 난이도 통계
  const difficultyCounts = subtasks.reduce(
    (acc, s) => {
      acc[s.difficulty] = (acc[s.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<Difficulty, number>
  );

  // 하위 과제 토글
  const handleToggle = async (subtaskId: string) => {
    const target = subtasks.find((s) => s.id === subtaskId);
    if (!target) return;

    const newStatus = target.status === "completed" ? "pending" : "completed";

    // 낙관적 업데이트
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtaskId
          ? { ...s, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : null }
          : s
      )
    );

    // 첫 체크 시 타이머 자동 시작
    if (newStatus === "completed" && !isTimerRunning && completedCount === 0) {
      startTimer();
    }

    const result = await toggleSubtaskAction(subtaskId, initialTask.id, newStatus);
    if (!result.success) {
      // 롤백
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtaskId ? { ...s, status: target.status, completed_at: target.completed_at } : s
        )
      );
      toast(result.error ?? "상태 변경에 실패했습니다.", "error");
    }
  };

  // 실제 소요 시간 업데이트
  const handleUpdateMinutes = async (subtaskId: string, minutes: number) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === subtaskId ? { ...s, actual_minutes: minutes } : s))
    );

    const result = await updateActualMinutesAction(subtaskId, initialTask.id, minutes);
    if (!result.success) {
      toast(result.error ?? "시간 업데이트에 실패했습니다.", "error");
    }
  };

  // 트리 구조 렌더링: depth 0 부터 재귀
  const topLevel = subtasks.filter((s) => !s.parent_subtask_id);
  const getChildren = (parentId: string) =>
    subtasks.filter((s) => s.parent_subtask_id === parentId);

  const renderSubtask = (subtask: Subtask) => {
    const children = getChildren(subtask.id);
    return (
      <div key={subtask.id}>
        <SubtaskCheckItem
          subtask={subtask}
          onToggle={handleToggle}
          onUpdateMinutes={handleUpdateMinutes}
        />
        {children.length > 0 && (
          <div className="ml-4 mt-1 flex flex-col gap-1">
            {children.map(renderSubtask)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 뒤로 가기 */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground/80 transition-colors min-h-[44px]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 12L6 8L10 4" />
        </svg>
        대시보드
      </Link>

      {/* 과제 제목 + 상태 */}
      <div>
        <h1 className={cn("text-xl font-bold", isAllCompleted && "line-through text-foreground/40")}>
          {initialTask.title}
        </h1>

        {/* 난이도 뱃지 */}
        <div className="flex items-center gap-2 mt-2">
          {(["easy", "medium", "hard"] as const).map((diff) => {
            const count = difficultyCounts[diff];
            if (!count) return null;
            const config = difficultyConfig[diff];
            return (
              <span
                key={diff}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  config.tailwind
                )}
              >
                {config.label} {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* 진행 상황 + 시간 요약 */}
      <div className="rounded-xl border border-foreground/10 p-4 flex flex-col gap-3">
        {/* 진행 바 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isAllCompleted ? "bg-green-500" : "bg-foreground/60"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-semibold shrink-0">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* 시간 정보 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/50">
            예상 {formatMinutes(totalEstimated)}
          </span>
          <span className={cn("font-medium", isTimerRunning && "text-green-500")}>
            경과 {formatElapsed(elapsedSeconds)}
          </span>
        </div>

        {/* 타이머 컨트롤 */}
        <div className="flex gap-2">
          {!isTimerRunning ? (
            <Button size="sm" variant="secondary" onClick={startTimer} className="flex-1">
              {elapsedSeconds > 0 ? "이어서 측정" : "시간 측정 시작"}
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={stopTimer} className="flex-1">
              일시 정지
            </Button>
          )}
          {isAllCompleted && elapsedSeconds > 0 && (
            <span className="flex items-center text-xs text-green-500 font-medium px-2">
              완료!
            </span>
          )}
        </div>
      </div>

      {/* 하위 과제 체크리스트 */}
      <section>
        <h2 className="text-sm font-semibold text-foreground/50 mb-3">
          하위 과제
        </h2>
        <div className="flex flex-col gap-2">
          {topLevel.map(renderSubtask)}
        </div>
      </section>
    </div>
  );
}
