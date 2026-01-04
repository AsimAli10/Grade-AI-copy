import { createServerSupabaseClient } from "@/integrations/supabase/server";

export async function fetchRecentScansServer(userId: string, limit: number = 10) {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("food_scans")
    .select("id, image_url, image_path, serving, result_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Server: error fetching recent scans", error);
    throw error;
  }

  const scansWithUrls = await Promise.all(
    ((data || []) as Array<{
      id: string;
      image_url?: string | null;
      image_path?: string | null;
      serving?: number | null;
      result_json?: any;
      created_at: string;
    }>).map(async (scan) => {
      const resultJson = scan.result_json as { isManualEntry?: boolean; dish?: string } | null;
      const isManualEntry =
        !!resultJson?.isManualEntry ||
        (typeof resultJson?.dish === "string" && resultJson.dish.trim().toLowerCase().startsWith("manual"));
      const hasStorageImage =
        !!scan.image_path &&
        !scan.image_path.toLowerCase().startsWith("manual-entry") &&
        !isManualEntry;

      let displayUrl: string | null = null;

      if (hasStorageImage) {
        const { data: signed, error: signedError } = await supabase.storage
          .from("FoodScans")
          .createSignedUrl(scan.image_path as string, 60 * 60);

        if (signedError) {
          console.error("Server: error creating signed URL", signedError);
        } else {
          displayUrl = signed?.signedUrl ?? null;
        }
      }

      if (!displayUrl && typeof scan.image_url === "string" && /^https?:\/\//i.test(scan.image_url)) {
        displayUrl = scan.image_url;
      }

      return {
        ...scan,
        displayUrl,
      };
    })
  );

  return scansWithUrls;
}


