"use client";

// 통계 섹션 — 4개 카드 + 빈 상태 처리

import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TaskStats } from "@/types";

interface TaskStatsSectionProps {
  stats: TaskStats;
}

export function TaskStatsSection({ stats }: TaskStatsSectionProps) {
  // 할 일이 없는 경우
  if (stats.totalTasks === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">나의 통계</h2>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-foreground/60 text-center">
            아직 할 일이 없어요.<br />
            첫 할 일을 만들면 통계를 볼 수 있어요.
          </p>
          <Link href="/tasks/new">
            <Button size="sm">첫 할 일 만들기</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // 할 일은 있지만 완료가 없는 경우
  if (stats.completedTasks === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold">나의 통계</h2>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-foreground/60 text-center">
            할 일을 완료하면 여기에 통계가 나타나요
          </p>
          <p className="text-xs text-foreground/40">
            진행 중 {stats.inProgressTasks}개 / 전체 {stats.totalTasks}개
          </p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = Math.round(
    (stats.completedTasks / stats.totalTasks) * 100
  );

  // 시간 예측 정확도 계산 (actual이 있는 task만)
  const hasTimeData = stats.actualMinutesTotal > 0 && stats.estimatedMinutesTotal > 0;
  let timeDiffPercent = 0;
  let timeMessage = "";
  if (hasTimeData) {
    timeDiffPercent = Math.round(
      ((stats.actualMinutesTotal - stats.estimatedMinutesTotal) /
        stats.estimatedMinutesTotal) *
        100
    );
    if (Math.abs(timeDiffPercent) <= 10) {
      timeMessage = "예상이 꽤 정확해요!";
    } else if (timeDiffPercent > 10) {
      timeMessage = `예상보다 평균 ${timeDiffPercent}% 더 걸렸어요`;
    } else {
      timeMessage = `예상보다 평균 ${Math.abs(timeDiffPercent)}% 빠르게 끝냈어요`;
    }
  }

  const { easy, medium, hard } = stats.difficultyDistribution;
  const hasDifficultyData = easy + medium + hard > 0;
  const maxDifficulty = Math.max(easy, medium, hard, 1);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">나의 통계</h2>

      {/* Card 1: 할 일 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <span className="text-2xl font-bold">{stats.totalTasks}</span>
            <span className="text-xs text-foreground/60">전체 할 일</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <span className="text-2xl font-bold">{stats.completedTasks}</span>
            <span className="text-xs text-foreground/60">완료</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <span className="text-2xl font-bold">{stats.inProgressTasks}</span>
            <span className="text-xs text-foreground/60">진행 중</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <span className="text-2xl font-bold">{completionRate}%</span>
            <span className="text-xs text-foreground/60">완료율</span>
          </CardContent>
        </Card>
      </div>

      {/* Card 2: 세부 단계 진행률 */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <p className="text-sm text-foreground/80">
            세분화한 <span className="font-semibold">{stats.totalSubtasks}개</span>의 단계 중{" "}
            <span className="font-semibold">{stats.completedSubtasks}개</span>를 완료했어요
          </p>
          <div className="h-3 w-full rounded-full bg-foreground/10">
            <div
              className="h-3 rounded-full bg-foreground transition-all"
              style={{
                width: `${stats.totalSubtasks > 0 ? Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100) : 0}%`,
              }}
            />
          </div>
          <p className="text-xs text-foreground/50 text-right">
            {stats.totalSubtasks > 0
              ? `${Math.round((stats.completedSubtasks / stats.totalSubtasks) * 100)}%`
              : "0%"}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: 시간 예측 정확도 */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <p className="text-sm font-medium">시간 예측 정확도</p>
          {hasTimeData ? (
            <>
              <p className="text-sm text-foreground/70">{timeMessage}</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground/50 w-10 shrink-0">예상</span>
                  <div className="flex-1 h-3 rounded-full bg-foreground/10">
                    <div
                      className="h-3 rounded-full bg-foreground/40"
                      style={{
                        width: `${Math.min(100, Math.round((stats.estimatedMinutesTotal / Math.max(stats.estimatedMinutesTotal, stats.actualMinutesTotal)) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-foreground/50 w-14 text-right shrink-0">
                    {stats.estimatedMinutesTotal}분
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground/50 w-10 shrink-0">실제</span>
                  <div className="flex-1 h-3 rounded-full bg-foreground/10">
                    <div
                      className="h-3 rounded-full bg-foreground"
                      style={{
                        width: `${Math.min(100, Math.round((stats.actualMinutesTotal / Math.max(stats.estimatedMinutesTotal, stats.actualMinutesTotal)) * 100))}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-foreground/50 w-14 text-right shrink-0">
                    {stats.actualMinutesTotal}분
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-foreground/50">
              할 일을 완료하면 예측 정확도를 알려드릴게요
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card 4: 난이도 분포 */}
      {hasDifficultyData && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <p className="text-sm font-medium">난이도 분포</p>
            <div className="flex flex-col gap-2.5">
              {/* 수월 */}
              <div className="flex items-center gap-3">
                <span className="text-xs w-28 shrink-0">수월했어요 🟢</span>
                <div className="flex-1 h-3 rounded-full bg-foreground/10">
                  <div
                    className="h-3 rounded-full bg-green-500"
                    style={{ width: `${Math.round((easy / maxDifficulty) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-foreground/60 w-8 text-right shrink-0">{easy}</span>
              </div>
              {/* 적당 */}
              <div className="flex items-center gap-3">
                <span className="text-xs w-28 shrink-0">적당했어요 🟡</span>
                <div className="flex-1 h-3 rounded-full bg-foreground/10">
                  <div
                    className="h-3 rounded-full bg-yellow-500"
                    style={{ width: `${Math.round((medium / maxDifficulty) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-foreground/60 w-8 text-right shrink-0">{medium}</span>
              </div>
              {/* 도전 */}
              <div className="flex items-center gap-3">
                <span className="text-xs w-28 shrink-0">도전적이었어요 🔴</span>
                <div className="flex-1 h-3 rounded-full bg-foreground/10">
                  <div
                    className="h-3 rounded-full bg-red-500"
                    style={{ width: `${Math.round((hard / maxDifficulty) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-foreground/60 w-8 text-right shrink-0">{hard}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
