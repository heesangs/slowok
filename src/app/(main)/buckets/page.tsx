import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BucketsPageContent } from "@/components/buckets/buckets-page-content";
import type { Bucket, LifeArea } from "@/types";

type BucketRow = Bucket & {
  life_area?: Pick<LifeArea, "id" | "name"> | null;
};

export default async function BucketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [lifeAreasResult, bucketsResult] = await Promise.all([
    supabase
      .from("life_areas")
      .select("id, name")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("buckets")
      .select("*, life_area:life_areas(id, name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const lifeAreas = (lifeAreasResult.data as Pick<LifeArea, "id" | "name">[] | null) ?? [];
  const buckets = (bucketsResult.data as BucketRow[] | null) ?? [];

  let fetchError: string | undefined;
  if (lifeAreasResult.error || bucketsResult.error) {
    fetchError = "버킷 데이터를 불러오는 중 일부 오류가 발생했습니다.";
  }

  return (
    <BucketsPageContent
      initialBuckets={buckets}
      lifeAreas={lifeAreas}
      fetchError={fetchError}
    />
  );
}
