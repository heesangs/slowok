// 대시보드 로딩 — 로그인 직후 데이터 준비 중 스켈레톤 표시

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-foreground/10 p-4">
      <div className="h-5 w-3/5 rounded bg-foreground/10" />
      <div className="mt-3 h-3 w-2/5 rounded bg-foreground/10" />
      <div className="mt-4 h-2 w-full rounded bg-foreground/10" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div>
        <div className="h-7 w-40 rounded bg-foreground/10" />
        <div className="mt-2 h-4 w-64 rounded bg-foreground/10" />
      </div>

      <section>
        <div className="mb-3 h-4 w-16 rounded bg-foreground/10" />
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    </div>
  );
}
