"use client";

// 하위 과제 목록 — 카드 리스트 + 총 예상 시간 표시

import { SubtaskCard } from "./subtask-card";
import { formatMinutes } from "@/lib/utils";
import type { Difficulty, EditableSubtask } from "@/types";

// leaf 노드(자식이 없는 노드)의 시간만 합산
function calcLeafMinutes(subtasks: EditableSubtask[]): number {
  return subtasks
    .filter((s) => !subtasks.some((c) => c.parent_temp_id === s.temp_id))
    .reduce((sum, s) => sum + s.estimated_minutes, 0);
}

interface SubtaskListProps {
  subtasks: EditableSubtask[];
  onChangeDifficulty: (tempId: string, difficulty: Difficulty) => void;
  onChangeTime: (tempId: string, delta: number) => void;
  onDecompose: (tempId: string) => void;
}

export function SubtaskList({
  subtasks,
  onChangeDifficulty,
  onChangeTime,
  onDecompose,
}: SubtaskListProps) {
  // 최상위 하위 과제 (depth 0)
  const topLevel = subtasks
    .filter((s) => s.parent_temp_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  // 총 예상 시간 계산 — leaf 노드만 합산
  const totalMinutes = calcLeafMinutes(subtasks);

  // 자식 카드 렌더링 함수 (재귀)
  const renderChildren = (parentTempId: string) => {
    const children = subtasks
      .filter((s) => s.parent_temp_id === parentTempId)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (children.length === 0) return null;

    return children.map((child) => (
      <SubtaskCard
        key={child.temp_id}
        subtask={child}
        onChangeDifficulty={onChangeDifficulty}
        onChangeTime={onChangeTime}
        onDecompose={onDecompose}
        renderChildren={
          subtasks.some((s) => s.parent_temp_id === child.temp_id)
            ? renderChildren
            : undefined
        }
      />
    ));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* 총 예상 시간 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/60">총 예상 시간</span>
        <span className="font-semibold">{formatMinutes(totalMinutes)}</span>
      </div>

      {/* 하위 과제 카드 목록 */}
      <div className="flex flex-col gap-3">
        {topLevel.map((subtask) => (
          <SubtaskCard
            key={subtask.temp_id}
            subtask={subtask}
            onChangeDifficulty={onChangeDifficulty}
            onChangeTime={onChangeTime}
            onDecompose={onDecompose}
            renderChildren={
              subtasks.some((s) => s.parent_temp_id === subtask.temp_id)
                ? renderChildren
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
