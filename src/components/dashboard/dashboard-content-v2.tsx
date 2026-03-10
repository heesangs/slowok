"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AllTasksView } from "@/components/dashboard/all-tasks-view";
import { BucketSuggestionCard } from "@/components/dashboard/bucket-suggestion-card";
import { DailyStepCard } from "@/components/dashboard/daily-step-card";
import { LifeClockHeader } from "@/components/dashboard/life-clock-header";
import { LifeBalanceCard } from "@/components/dashboard/life-balance-card";
import { ReviewInsightCard } from "@/components/dashboard/review-insight-card";
import { useToast } from "@/components/ui/toast";
import type { DashboardV2Data, TaskWithSubtasks } from "@/types";

interface DashboardContentV2Props {
  data: DashboardV2Data;
  allTasks: TaskWithSubtasks[];
  fetchError?: string;
}

export function DashboardContentV2({ data, allTasks, fetchError }: DashboardContentV2Props) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const activeChapter = data.activeChapters[0] ?? null;
  const dailyStep = data.dailyStep;
  const shouldShowUnstartedSection =
    Boolean(data.suggestedBucket) || (data.profile.onboarding_version ?? 1) <= 1;

  useEffect(() => {
    if (searchParams.get("onboarding_saved") === "1") {
      toast("첫 한 걸음이 준비되었어요 ✨", "success");
      window.history.replaceState(null, "", "/dashboard");
      return;
    }

    if (searchParams.get("saved") === "1") {
      toast("저장되었습니다 ✓", "success");
      window.history.replaceState(null, "", "/dashboard");
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (fetchError) {
      toast(fetchError, "error");
    }
  }, [fetchError, toast]);

  return (
    <div className="flex flex-col gap-4">
      <LifeClockHeader
        age={data.profile.life_clock_age}
        activeChapterTitle={activeChapter?.title}
      />

      <DailyStepCard dailyStep={dailyStep} />
      <LifeBalanceCard balance={data.balance} />

      <BucketSuggestionCard
        suggestedBucket={data.suggestedBucket}
        shouldShow={shouldShowUnstartedSection}
      />
      <ReviewInsightCard review={data.review} />

      <section className="rounded-xl border border-foreground/10 px-4 py-4">
        <p className="text-sm text-foreground/60 mb-2">전체 할 일</p>
        <AllTasksView
          tasks={allTasks}
          displayName={data.profile.display_name ?? null}
          showHeader={false}
        />
      </section>
    </div>
  );
}
