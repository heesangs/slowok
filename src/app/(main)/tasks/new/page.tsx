// 과제 생성 페이지 — 인증 확인 후 TaskCreator 렌더링

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskCreator } from "@/components/task/task-creator";
import type { Bucket, Chapter, Profile } from "@/types";

interface NewTaskPageProps {
  searchParams?: Promise<{
    bucketId?: string;
    chapterId?: string;
  }>;
}

export default async function NewTaskPage({ searchParams }: NewTaskPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const queryBucketId = resolvedSearchParams.bucketId?.trim();
  const queryChapterId = resolvedSearchParams.chapterId?.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, bucketsResult, chaptersResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_context")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("buckets")
      .select("id, title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("chapters")
      .select("id, title, bucket_id, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const userContext = (profileResult.data as Pick<Profile, "user_context"> | null)?.user_context ?? [];
  const buckets = (bucketsResult.data as Array<Pick<Bucket, "id" | "title">> | null) ?? [];
  const chapters =
    (chaptersResult.data as Array<Pick<Chapter, "id" | "title" | "bucket_id" | "status">> | null) ?? [];

  const chapterById = queryChapterId
    ? chapters.find((chapter) => chapter.id === queryChapterId)
    : undefined;
  const bucketById = queryBucketId
    ? buckets.find((bucket) => bucket.id === queryBucketId)
    : undefined;

  const defaultBucketId = bucketById?.id ?? chapterById?.bucket_id ?? undefined;
  const defaultChapterId =
    chapterById && (!defaultBucketId || chapterById.bucket_id === defaultBucketId)
      ? chapterById.id
      : undefined;

  return (
    <TaskCreator
      userContext={userContext}
      buckets={buckets}
      chapters={chapters}
      defaultBucketId={defaultBucketId}
      defaultChapterId={defaultChapterId}
    />
  );
}
