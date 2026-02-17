"use client";

// 하위 과제 카드 — 난이도 토글, 시간 스텝퍼, "더 나누기" 버튼

import { Button } from "@/components/ui/button";
import { cn, getDifficultyConfig, formatMinutes } from "@/lib/utils";
import type { Difficulty, EditableSubtask } from "@/types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

interface SubtaskCardProps {
  subtask: EditableSubtask;
  children?: EditableSubtask[];
  onChangeDifficulty: (tempId: string, difficulty: Difficulty) => void;
  onChangeTime: (tempId: string, delta: number) => void;
  onDecompose: (tempId: string) => void;
  // 자식 카드 렌더링용 콜백
  renderChildren?: (parentTempId: string) => React.ReactNode;
}

export function SubtaskCard({
  subtask,
  onChangeDifficulty,
  onChangeTime,
  onDecompose,
  renderChildren,
}: SubtaskCardProps) {
  const config = getDifficultyConfig(subtask.difficulty);
  const canDecompose = subtask.depth < 2 && !subtask.is_decomposing;
  const hasChildren = renderChildren !== undefined;

  return (
    <div
      className={cn(
        "rounded-lg border border-foreground/10 p-4",
        subtask.depth > 0 && "ml-4 border-foreground/5 bg-foreground/[0.02]"
      )}
    >
      {/* 제목 + 난이도 뱃지 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-medium flex-1">{subtask.title}</h3>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            config.tailwind
          )}
        >
          {config.label}
        </span>
      </div>

      {/* 난이도 토글 + 시간 스텝퍼 */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* 난이도 토글 */}
        <div className="flex gap-1">
          {DIFFICULTIES.map((d) => {
            const dConfig = getDifficultyConfig(d);
            const isActive = subtask.difficulty === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onChangeDifficulty(subtask.temp_id, d)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all min-h-[36px] cursor-pointer",
                  isActive
                    ? dConfig.tailwind + " ring-1 ring-current"
                    : "text-foreground/40 hover:text-foreground/60"
                )}
              >
                {dConfig.label}
              </button>
            );
          })}
        </div>

        {/* 시간 스텝퍼 (±5분) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChangeTime(subtask.temp_id, -5)}
            disabled={subtask.estimated_minutes <= 5}
            className="flex items-center justify-center w-8 h-8 rounded-md border border-foreground/20 text-foreground/60 hover:bg-foreground/5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="text-sm font-medium w-16 text-center">
            {formatMinutes(subtask.estimated_minutes)}
          </span>
          <button
            type="button"
            onClick={() => onChangeTime(subtask.temp_id, 5)}
            disabled={subtask.estimated_minutes >= 120}
            className="flex items-center justify-center w-8 h-8 rounded-md border border-foreground/20 text-foreground/60 hover:bg-foreground/5 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>

      {/* "더 나누기" 버튼 */}
      {canDecompose && (
        <div className="mt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDecompose(subtask.temp_id)}
            isLoading={subtask.is_decomposing}
          >
            {subtask.is_decomposing ? "분해 중..." : "더 나누기"}
          </Button>
        </div>
      )}

      {/* 자식 하위 과제 렌더링 */}
      {hasChildren && (
        <div className="mt-3 flex flex-col gap-2">
          {renderChildren(subtask.temp_id)}
        </div>
      )}
    </div>
  );
}
