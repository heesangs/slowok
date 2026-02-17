"use client";

// 과제 입력 폼 — 텍스트 입력 + "분석하기" 버튼

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TaskInputFormProps {
  onSubmit: (title: string) => void;
  isLoading: boolean;
}

export function TaskInputForm({ onSubmit, isLoading }: TaskInputFormProps) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        id="task-title"
        label="과제 입력"
        placeholder="예: 수학 중간고사 준비"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
        autoFocus
      />
      <Button type="submit" isLoading={isLoading} disabled={!title.trim()}>
        {isLoading ? "분석 중..." : "분석하기"}
      </Button>
    </form>
  );
}
