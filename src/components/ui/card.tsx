import { cn } from "@/lib/utils";

// 카드 컨테이너
function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-foreground/10 bg-background", className)}>
      {children}
    </div>
  );
}

// 카드 헤더
function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("px-4 py-3 border-b border-foreground/10", className)}>
      {children}
    </div>
  );
}

// 카드 콘텐츠
function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("px-4 py-4", className)}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardContent };
