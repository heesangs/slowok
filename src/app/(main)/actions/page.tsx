import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDailyTodos, getRoutinesWithCompletions, getUserBuckets } from "@/lib/dashboard";
import { ActionsContent } from "@/components/actions/actions-content";

interface ActionsPageProps {
  searchParams?: Promise<{ bucket?: string }>;
}

export default async function ActionsPage({ searchParams }: ActionsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedBucketQuery = resolvedSearchParams.bucket?.trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const buckets = await getUserBuckets(supabase, user.id);
  const selectedBucketId =
    selectedBucketQuery && buckets.some((bucket) => bucket.id === selectedBucketQuery)
      ? selectedBucketQuery
      : buckets[0]?.id ?? null;

  const [dailyTodos, routines] = await Promise.all([
    getDailyTodos(supabase, user.id, selectedBucketId),
    getRoutinesWithCompletions(supabase, user.id, selectedBucketId),
  ]);

  return (
    <ActionsContent
      dailyTodos={dailyTodos}
      routines={routines}
      buckets={buckets}
      selectedBucketId={selectedBucketId}
    />
  );
}
