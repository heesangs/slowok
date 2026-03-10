"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMinutes, getDifficultyConfig } from "@/lib/utils";
import type { Difficulty, Subtask, TaskCondition, TaskWithSubtasks } from "@/types";

interface DailyStepCardProps {
  dailyStep: TaskWithSubtasks | null;
  selectedCondition: TaskCondition;
}

const CONDITION_OPTIONS: Array<{ value: TaskCondition; label: string; hint: string }> = [
  { value: "light", label: "가볍게", hint: "짧고 부담이 낮은 한 걸음을 우선 추천해요." },
  { value: "normal", label: "보통", hint: "현재 흐름에서 안정적으로 이어갈 한 걸음을 추천해요." },
  { value: "focused", label: "집중", hint: "핵심 성과를 만들 수 있는 집중형 한 걸음을 추천해요." },
  { value: "tired", label: "지침", hint: "에너지가 낮아도 바로 시작할 수 있는 한 걸음을 추천해요." },
];

function isLeafSubtask(target: Subtask, all: Subtask[]) {
  return !all.some((item) => item.parent_subtask_id === target.id);
}

function getTaskDifficulty(task: TaskWithSubtasks): Difficulty {
  const subtasks = task.subtasks ?? [];
  const leafs = subtasks.filter((item) => isLeafSubtask(item, subtasks));
  const base = leafs.length > 0 ? leafs : subtasks;

  const count: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const item of base) {
    count[item.difficulty] += 1;
  }

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top || top[1] === 0) return "medium";
  return top[0] as Difficulty;
}

function getTaskMinutes(task: TaskWithSubtasks) {
  if (typeof task.total_estimated_minutes === "number" && task.total_estimated_minutes > 0) {
    return task.total_estimated_minutes;
  }

  const subtasks = task.subtasks ?? [];
  const leafs = subtasks.filter((item) => isLeafSubtask(item, subtasks));
  const base = leafs.length > 0 ? leafs : subtasks;
  const sum = base.reduce((acc, cur) => acc + (cur.estimated_minutes ?? 0), 0);
  return sum > 0 ? sum : 5;
}

export function DailyStepCard({ dailyStep, selectedCondition }: DailyStepCardProps) {
  const activeCondition =
    CONDITION_OPTIONS.find((option) => option.value === selectedCondition) ?? CONDITION_OPTIONS[1];

  return (
    <section className="rounded-xl border border-foreground/10 px-4 py-4">
      <div className="flex flex-col gap-2 mb-3">
        <p className="text-sm text-foreground/60">오늘의 한 걸음</p>
        <div className="flex flex-wrap gap-2">
          {CONDITION_OPTIONS.map((option) => {
            const isActive = option.value === selectedCondition;
            return (
              <Link
                key={option.value}
                href={`/dashboard?condition=${option.value}`}
                className={`rounded-full px-3 py-2 text-xs min-h-[44px] inline-flex items-center transition-colors ${
                  isActive
                    ? "bg-foreground text-background"
                    : "border border-foreground/20 text-foreground/80 hover:bg-foreground/5"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-foreground/60">{activeCondition.hint}</p>
      </div>

      {dailyStep ? (
        <Link href={`/tasks/${dailyStep.id}`} className="block">
          <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-3 transition-colors hover:bg-foreground/[0.05]">
            <p className="text-base font-semibold">{dailyStep.title}</p>
            <p className="text-xs text-foreground/60 mt-1">
              예상 {formatMinutes(getTaskMinutes(dailyStep))} ·{" "}
              {getDifficultyConfig(getTaskDifficulty(dailyStep)).label}
            </p>
            <p className="text-xs text-foreground/60 mt-3">
              {dailyStep.bucket?.title
                ? `이 일은 '${dailyStep.bucket.title}'라는 삶의 장면과 연결돼 있어요.`
                : "이 일은 당신의 삶의 장면과 연결돼 있어요."}
            </p>
          </div>
        </Link>
      ) : (
        <div className="rounded-lg border border-dashed border-foreground/20 px-3 py-4">
          <p className="text-sm text-foreground/70">오늘의 한 걸음을 만들어볼까요?</p>
          <Link href="/tasks/new" className="inline-block mt-3">
            <Button size="sm">한 걸음 만들기</Button>
          </Link>
        </div>
      )}
    </section>
  );
}
