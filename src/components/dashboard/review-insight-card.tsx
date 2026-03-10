"use client";

import Link from "next/link";
import { cn, formatMinutes, getDifficultyConfig } from "@/lib/utils";
import type { ReviewSummary } from "@/types";

interface ReviewInsightCardProps {
  review: ReviewSummary | null;
}

export function ReviewInsightCard({ review }: ReviewInsightCardProps) {
  if (!review) return null;

  const isReviewMature = review.completedCount >= 6;

  return (
    <section className="rounded-xl border border-foreground/10 px-4 py-4">
      <p className="text-sm text-foreground/60 mb-2">회고 / 학습</p>

      {!isReviewMature && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">최근 회고</p>
          <p className="text-sm text-foreground/80">
            예상 {formatMinutes(review.recentEstimatedMinutes)} → 실제{" "}
            {formatMinutes(review.recentActualMinutes)}
          </p>
          {(review.recentDifficultyBefore || review.recentDifficultyAfter) && (
            <p className="text-sm text-foreground/80">
              체감 난이도:{" "}
              {review.recentDifficultyBefore
                ? getDifficultyConfig(review.recentDifficultyBefore).label
                : "-"}{" "}
              →{" "}
              {review.recentDifficultyAfter
                ? getDifficultyConfig(review.recentDifficultyAfter).label
                : "-"}
            </p>
          )}
          {review.recentMemo && (
            <p className="text-sm text-foreground/70">메모: &quot;{review.recentMemo}&quot;</p>
          )}
        </div>
      )}

      {isReviewMature && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">당신에 대해 알게 된 것</p>
          <p
            className={cn(
              "text-sm",
              review.insight ? "text-foreground/80" : "text-foreground/60"
            )}
          >
            {review.insight ?? "아직 회고 데이터가 충분하지 않아요. 몇 번 더 완료해보세요."}
          </p>
        </div>
      )}

      <Link
        href="/review"
        className="mt-3 inline-flex min-h-[36px] items-center rounded-lg border border-foreground/20 px-3 text-xs text-foreground/70 transition-colors hover:bg-foreground/5"
      >
        회고 자세히 보기
      </Link>
    </section>
  );
}
