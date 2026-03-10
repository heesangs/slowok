export default function ReviewLoading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse" aria-label="회고 데이터 로딩 중">
      <div className="h-8 w-36 rounded bg-foreground/10" />
      <div className="h-4 w-64 rounded bg-foreground/10" />

      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
        <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
        <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
        <div className="h-20 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
      </div>

      <div className="h-24 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
      <div className="h-32 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
      <div className="h-40 rounded-xl border border-foreground/10 bg-foreground/[0.03]" />
    </div>
  );
}
