// 대시보드 과제 카드 — 과제 요약 정보 표시

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMinutes, difficultyConfig } from "@/lib/utils";
import type { TaskWithSubtasks, Difficulty } from "@/types";

interface TaskCardProps {
  task: TaskWithSubtasks;
}

export function TaskCard({ task }: TaskCardProps) {
  const isCompleted = task.status === "completed";
  const subtasks = task.subtasks ?? [];

  // 난이도별 하위 과제 수 계산
  const difficultyCounts = subtasks.reduce(
    (acc, s) => {
      acc[s.difficulty] = (acc[s.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<Difficulty, number>
  );

  // 완료된 하위 과제 수
  const completedCount = subtasks.filter((s) => s.status === "completed").length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Link href={`/tasks/${task.id}`} className="block">
      <Card
        className={cn(
          "transition-colors active:bg-foreground/5",
          isCompleted && "opacity-60"
        )}
      >
        <CardContent>
          {/* 과제 제목 */}
          <h3
            className={cn(
              "font-semibold text-base",
              isCompleted && "line-through text-foreground/40"
            )}
          >
            {task.title}
          </h3>

          {/* 난이도 뱃지 */}
          {totalCount > 0 && (
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
          )}

          {/* 진행 바 + 시간 */}
          <div className="mt-3 flex items-center gap-3">
            {/* 진행 바 */}
            {totalCount > 0 && (
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground/60 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs text-foreground/50 shrink-0">
                  {completedCount}/{totalCount}
                </span>
              </div>
            )}

            {/* 예상 시간 */}
            <span className="text-xs text-foreground/50 shrink-0">
              {formatMinutes(task.total_estimated_minutes)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
