import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BucketDetailContent } from "@/components/buckets/bucket-detail-content";
import type { Bucket, Chapter, LifeArea } from "@/types";

type BucketRow = Bucket & {
  life_area?: Pick<LifeArea, "id" | "name"> | null;
};

interface BucketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BucketDetailPage({ params }: BucketDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [bucketResult, chaptersResult] = await Promise.all([
    supabase
      .from("buckets")
      .select("*, life_area:life_areas(id, name)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("chapters")
      .select("*")
      .eq("bucket_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (bucketResult.error || !bucketResult.data) {
    notFound();
  }

  const bucket = bucketResult.data as BucketRow;
  const chapters = (chaptersResult.data as Chapter[] | null) ?? [];

  let fetchError: string | undefined;
  if (chaptersResult.error) {
    fetchError = "챕터 데이터를 불러오는 중 일부 오류가 발생했습니다.";
  }

  return (
    <BucketDetailContent
      bucket={bucket}
      initialChapters={chapters}
      fetchError={fetchError}
    />
  );
}
