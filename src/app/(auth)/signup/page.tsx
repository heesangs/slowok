"use client";

// 회원가입 페이지

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/app/(auth)/actions";
import Link from "next/link";
import { useState } from "react";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setMessage(null);

    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    // 클라이언트 검증
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUpAction(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.message) {
        setMessage(result.message);
      }
    } catch {
      // redirect는 에러로 throw되므로 무시
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">회원가입</h1>
          <p className="text-sm text-foreground/60">
            나만의 속도로 공부를 시작해보세요
          </p>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            name="email"
            type="email"
            label="이메일"
            placeholder="example@email.com"
            required
            autoComplete="email"
          />

          <Input
            id="password"
            name="password"
            type="password"
            label="비밀번호"
            placeholder="6자 이상 입력하세요"
            required
            autoComplete="new-password"
            minLength={6}
          />

          <Input
            id="confirm_password"
            name="confirm_password"
            type="password"
            label="비밀번호 확인"
            placeholder="비밀번호를 다시 입력하세요"
            required
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
          {message && (
            <p className="text-sm text-green-600 text-center">{message}</p>
          )}

          <Button type="submit" isLoading={isLoading} className="w-full mt-2">
            회원가입
          </Button>
        </form>

        <p className="text-sm text-foreground/60 text-center mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
