import { redirect } from "next/navigation";
import { ReviewPageContent } from "@/components/review/review-page-content";
import { getReviewPageData } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, reviewResult] = await Promise.allSettled([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
    getReviewPageData(supabase, user.id),
  ]);

  let displayName: string | null = null;
  let fetchError: string | undefined;

  if (profileResult.status === "fulfilled") {
    if (profileResult.value.error) {
      fetchError = "프로필 정보를 불러오는 중 일부 오류가 발생했습니다.";
    } else {
      const profile = profileResult.value.data as { display_name?: string | null } | null;
      if (!profile) {
        redirect("/onboarding");
      }
      displayName = profile.display_name ?? null;
    }
  } else {
    fetchError = "프로필 정보를 불러오는 중 일부 오류가 발생했습니다.";
  }

  let reviewData: Awaited<ReturnType<typeof getReviewPageData>> = null;
  if (reviewResult.status === "fulfilled") {
    reviewData = reviewResult.value;
  } else {
    const reviewError = toErrorMessage(
      reviewResult.reason,
      "회고 데이터를 불러오는 중 일부 오류가 발생했습니다."
    );
    fetchError = fetchError ? `${fetchError} ${reviewError}` : reviewError;
  }

  return (
    <ReviewPageContent
      displayName={displayName}
      data={reviewData}
      fetchError={fetchError}
    />
  );
}
