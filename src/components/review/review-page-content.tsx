import Link from "next/link";
import { cn, formatMinutes, getDifficultyConfig } from "@/lib/utils";
import type { Difficulty, ReviewPageData, ReviewTimeBand } from "@/types";

interface ReviewPageContentProps {
  displayName: string | null;
  data: ReviewPageData | null;
  fetchError?: string;
}

const STRONGEST_BAND_LABEL: Record<ReviewTimeBand, string> = {
  morning: "오전형",
  afternoon: "오후형",
  evening: "저녁형",
  night: "야행형",
};

function tendencyMessage(tendency: "easier" | "harder" | "neutral") {
  if (tendency === "easier") {
    return "AI 제안보다 난이도를 낮출 때 실행 지속성이 높아지는 편";
  }
  if (tendency === "harder") {
    return "AI 제안보다 조금 더 도전적인 난이도에서 몰입이 생기는 편";
  }
  return "난이도 조정 경향이 안정적이며 기본 제안과 크게 다르지 않은 편";
}

function difficultyLabel(value: Difficulty | null) {
  if (!value) return "-";
  return getDifficultyConfig(value).label;
}

function shortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

export function ReviewPageContent({ displayName, data, fetchError }: ReviewPageContentProps) {
  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">회고 / 학습</h1>
          <p className="text-sm text-foreground/60 mt-1">
            완료한 한 걸음이 쌓이면 나만의 실행 패턴을 보여드릴게요.
          </p>
        </div>

        {fetchError && (
          <section className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError}
          </section>
        )}

        <section className="rounded-xl border border-dashed border-foreground/20 px-4 py-6 text-center">
          <p className="text-sm text-foreground/70">
            아직 완료한 한 걸음이 없어요. 첫 실행을 마치면 회고 화면이 채워집니다.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/tasks/new"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              한 걸음 만들기
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
            >
              대시보드로
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const maxBandCount = Math.max(...data.timeBandStats.map((item) => item.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">회고 / 학습</h1>
        <p className="text-sm text-foreground/60">
          {displayName ? `${displayName}님의` : "나의"} 실행 패턴을 돌아보고 다음 한 걸음을 더 잘 준비해요.
        </p>
      </div>

      {fetchError && (
        <section className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-foreground/10 px-4 py-4">
          <p className="text-xs text-foreground/60">누적 완료</p>
          <p className="text-xl font-semibold mt-1">{data.completedCount}개</p>
        </div>
        <div className="rounded-xl border border-foreground/10 px-4 py-4">
          <p className="text-xs text-foreground/60">최근 14일 완료</p>
          <p className="text-xl font-semibold mt-1">{data.completedInLast14Days}개</p>
        </div>
        <div className="rounded-xl border border-foreground/10 px-4 py-4">
          <p className="text-xs text-foreground/60">평균 예상 시간</p>
          <p className="text-xl font-semibold mt-1">{formatMinutes(data.averageEstimatedMinutes)}</p>
        </div>
        <div className="rounded-xl border border-foreground/10 px-4 py-4">
          <p className="text-xs text-foreground/60">평균 실제 시간</p>
          <p className="text-xl font-semibold mt-1">{formatMinutes(data.averageActualMinutes)}</p>
        </div>
      </section>

      <section className="rounded-xl border border-foreground/10 px-4 py-4">
        <p className="text-sm text-foreground/60 mb-2">이번 회고 인사이트</p>
        <p className={cn("text-sm", data.insight ? "text-foreground/85" : "text-foreground/60")}>
          {data.insight ?? "완료 데이터 6개 이상부터 개인화 인사이트가 생성됩니다."}
        </p>
        <p className="text-xs text-foreground/50 mt-3">
          평균 오차: {data.averageGapMinutes == null ? "-" : `${data.averageGapMinutes > 0 ? "+" : ""}${data.averageGapMinutes}분`}
          {" · "}
          대표 시간대: {data.strongestBand ? STRONGEST_BAND_LABEL[data.strongestBand] : "데이터 수집 중"}
        </p>
      </section>

      <section className="rounded-xl border border-foreground/10 px-4 py-4">
        <p className="text-sm text-foreground/60 mb-3">시간대 리듬</p>
        <div className="flex flex-col gap-3">
          {data.timeBandStats.map((item) => (
            <div key={item.band} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-foreground/60">{item.label}</span>
              <div className="h-2.5 flex-1 rounded-full bg-foreground/10">
                <div
                  className="h-2.5 rounded-full bg-foreground/70"
                  style={{ width: `${Math.round((item.count / maxBandCount) * 100)}%` }}
                />
              </div>
              <span className="w-7 shrink-0 text-right text-xs text-foreground/60">{item.count}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-foreground/10 px-4 py-4">
        <p className="text-sm text-foreground/60 mb-2">난이도 학습</p>
        <p className="text-sm text-foreground/85">
          {tendencyMessage(data.learning.tendency)}
        </p>
        <p className="text-xs text-foreground/50 mt-2">
          샘플 {data.learning.sampleSize}건
          {" · "}
          시간 배율 {data.learning.averageTimeMultiplier ? `${data.learning.averageTimeMultiplier}x` : "-"}
        </p>
      </section>

      <section className="rounded-xl border border-foreground/10 px-4 py-4">
        <p className="text-sm text-foreground/60 mb-3">최근 회고 기록</p>
        <div className="flex flex-col gap-3">
          {data.recent.map((item) => (
            <article key={item.id} className="rounded-lg border border-foreground/10 px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-foreground/55 mt-0.5">{shortDate(item.completedAt)}</p>
                </div>
                <Link
                  href={`/tasks/${item.id}`}
                  className="inline-flex min-h-[32px] items-center rounded-md border border-foreground/20 px-2.5 text-xs text-foreground/70 transition-colors hover:bg-foreground/5"
                >
                  상세
                </Link>
              </div>

              <p className="text-xs text-foreground/70 mt-2">
                예상 {formatMinutes(item.estimatedMinutes)} → 실제 {formatMinutes(item.actualMinutes)}
              </p>

              <p className="text-xs text-foreground/70 mt-1">
                체감 난이도 {difficultyLabel(item.difficultyBefore)} → {difficultyLabel(item.difficultyAfter)}
              </p>

              {(item.bucketTitle || item.lifeAreaName) && (
                <p className="text-xs text-foreground/55 mt-1">
                  {item.lifeAreaName ? `${item.lifeAreaName} · ` : ""}
                  {item.bucketTitle ?? "버킷 미연결"}
                </p>
              )}

              {item.memo && (
                <p className="text-xs text-foreground/65 mt-2">메모: &quot;{item.memo}&quot;</p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
