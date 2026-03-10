"use client";

interface LifeClockHeaderProps {
  age: number | null | undefined;
  activeChapterTitle?: string | null;
}

function getLifeClockLabel(age: number | null | undefined) {
  if (age == null || age < 0 || age > 100) {
    return "탐색 중";
  }

  const totalHours = (age / 100) * 24;
  const hour24 = Math.floor(totalHours);
  const minute = Math.floor((totalHours - hour24) * 60);
  const meridiem = hour24 < 12 ? "오전" : "오후";
  const hour12Raw = hour24 % 12;
  const hour12 = hour12Raw === 0 ? 12 : hour12Raw;
  return `${meridiem} ${hour12}:${String(minute).padStart(2, "0")}`;
}

export function LifeClockHeader({ age, activeChapterTitle }: LifeClockHeaderProps) {
  const lifeClockLabel = getLifeClockLabel(age);

  return (
    <section className="rounded-xl border border-foreground/10 bg-foreground/[0.03] px-4 py-4">
      <p className="text-sm text-foreground/60">인생 시계</p>
      <p className="text-xl font-semibold mt-1">{lifeClockLabel}</p>
      <p className="text-sm text-foreground/70 mt-3">
        이번 시즌의 장면: {activeChapterTitle ?? "지금은 탐색의 챕터"}
      </p>
    </section>
  );
}
