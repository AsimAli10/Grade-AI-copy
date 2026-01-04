import { supabase } from "@/integrations/supabase/client";

export type FoodAnalysis = {
  dish: string;
  description?: string;
  tags?: string[];
  additionalInfo?: string;
  servingGuidance?: string;
  confidence: number;
  servingSize: string;
  servingWeightGrams?: number;
  nutrients?: {
    calories?: number;
    protein_g?: number;
    carbohydrates_g?: number;
    fat_g?: number;
    fiber_g?: number;
    sugar_g?: number;
  };
  ingredients: string[];
  instructions: string[];
  youtubeVideoUrl?: string;
  insights?: string;
  isManualEntry?: boolean;
  manualItems?: any[];
};

type AnalyzeFoodResponse = {
  ok?: boolean;
  analysis?: FoodAnalysis;
  insights?: string;
  upgrade?: boolean;
  error?: string;
};

type AnalyzeFoodInvokeResult = {
  data: AnalyzeFoodResponse | null;
  error: { message?: string } | null;
};

export async function uploadFoodImage(file: File, userId: string): Promise<{ path: string; publicUrl: string; signedUrl?: string }>{
  const cleanName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const ext = cleanName.split(".").pop() || "jpg";
  const filename = `${Date.now()}.${ext}`;
  const path = `${userId}/${filename}`;

  const { error: upErr } = await supabase.storage.from("FoodScans").upload(path, file, {
    upsert: false,
    cacheControl: "3600",
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from("FoodScans").getPublicUrl(path);
  const publicUrl = pub.publicUrl;
  // Try to create a short-lived signed URL in case bucket is private
  let signedUrl: string | undefined;
  try {
    const { data: signed } = await supabase.storage.from("FoodScans").createSignedUrl(path, 60 * 5);
    signedUrl = signed?.signedUrl;
  } catch {}
  return { path, publicUrl, signedUrl };
}

export async function analyzeFood(
  imageUrl: string | null,
  serving: number = 1,
  insightsParams?: { age?: number; gender?: string; activity?: string; goal?: string; optimize?: boolean; weight_kg?: number; height_cm?: number },
  options?: { overrideIngredients?: string[]; manualEntry?: { dish: string; ingredients: string[] } }
): Promise<{ analysis: FoodAnalysis; insights?: string; upgrade?: boolean }>{
  const body: Record<string, unknown> = { serving, ...(insightsParams || {}) };
  
  // Support both image-based and manual entry analysis
  if (options?.manualEntry) {
    body.manualEntry = options.manualEntry;
  } else if (imageUrl) {
    body.imageUrl = imageUrl;
  } else {
    throw new Error("Either imageUrl or manualEntry must be provided");
  }
  
  if (options?.overrideIngredients && options.overrideIngredients.length > 0) {
    body.overrideIngredients = options.overrideIngredients;
  }

  const { data, error } = await supabase.functions.invoke<AnalyzeFoodResponse>("analyze-food", {
    body,
  });
  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || "Analyze failed");
  }
  return {
    analysis: data.analysis as FoodAnalysis,
    insights: data.insights,
    upgrade: data.upgrade,
  };
}

// Dedicated function for recalculating nutrition from edited ingredients only
export async function recalculateNutritionFromIngredients(
  existingAnalysis: FoodAnalysis,
  editedIngredients: string[],
  serving: number = 1
): Promise<FoodAnalysis> {
  if (!Array.isArray(editedIngredients) || editedIngredients.length === 0) {
    throw new Error("Ingredients list is required");
  }

  const body = {
    recalculateOnly: true,
    existingAnalysis: existingAnalysis,
    overrideIngredients: editedIngredients,
    serving,
  };

  const { data, error } = await supabase.functions.invoke<AnalyzeFoodResponse>("analyze-food", {
    body,
  });

  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || "Recalculation failed");
  }

  return data.analysis as FoodAnalysis;
}

export function scaleNutrients(base: FoodAnalysis["nutrients"] | undefined, multiplier: number){
  const scale = (v?: number) => (typeof v === "number" ? Math.round(v * multiplier * 10) / 10 : undefined);
  return {
    calories: scale(base?.calories),
    protein_g: scale(base?.protein_g),
    carbohydrates_g: scale(base?.carbohydrates_g),
    fat_g: scale(base?.fat_g),
    fiber_g: scale(base?.fiber_g),
    sugar_g: scale(base?.sugar_g),
  };
}

export async function saveScanHistory(params: {
  userId: string;
  imagePath: string;
  imageUrl: string;
  serving: number;
  result: FoodAnalysis;
}): Promise<string>{
  // Store image_path (never expires) and optionally a public URL if available
  // We'll always generate fresh signed URLs when displaying, so stored image_url is just a fallback
  const { data, error } = await (supabase as any).from("food_scans").insert({
    user_id: params.userId,
    image_path: params.imagePath, // This is the important one - never expires
    image_url: params.imageUrl, // Store as fallback, but we'll generate fresh URLs when displaying
    serving: params.serving,
    result_json: params.result as any,
    language: 'en', // All new scans are generated in English
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/**
 * Get a fresh signed URL for an image path
 * This ensures URLs never expire - we generate them on-demand
 */
export async function getFreshImageUrl(imagePath: string | null, expirySeconds: number = 60 * 60): Promise<string | null> {
  if (!imagePath) {
    return null;
  }
  
  // Skip manual entry paths - they don't have actual images in storage
  if (imagePath.toLowerCase().startsWith("manual-entry")) {
    return null;
  }
  
  try {
    const { data, error } = await supabase.storage.from("FoodScans").createSignedUrl(imagePath, expirySeconds);
    if (error) {
      // Silently handle errors for manual entries or missing files
      return null;
    }
    if (!data?.signedUrl) {
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    // Silently handle exceptions
    return null;
  }
}

/**
 * Get a fresh signed URL for an image path
 * Always generates a signed URL (works for both public and private buckets)
 */
export async function getImageUrl(imagePath: string | null, expirySeconds: number = 60 * 60): Promise<string | null> {
  if (!imagePath) return null;
  return getFreshImageUrl(imagePath, expirySeconds);
}

export async function fetchRecentScans(userId: string, limit: number = 10){
  const { data, error } = await (supabase as any)
    .from("food_scans")
    .select("id, image_url, image_path, serving, result_json, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  
  // Generate fresh signed URLs for all scans
  const scansWithUrls = await Promise.all(
    ((data || []) as Array<{
      id: string;
      image_url?: string | null;
      image_path?: string | null;
      serving?: number | null;
      result_json?: any;
      created_at: string;
    }>).map(async (scan) => {
      const resultJson = scan.result_json as FoodAnalysis | null;
      const isManualEntry =
        !!resultJson?.isManualEntry ||
        (typeof resultJson?.dish === "string" && resultJson.dish.trim().toLowerCase().startsWith("manual"));
      const hasStorageImage =
        !!scan.image_path &&
        !scan.image_path.toLowerCase().startsWith("manual-entry") &&
        !isManualEntry;

      let displayUrl: string | null = null;

      if (hasStorageImage) {
        displayUrl = await getImageUrl(scan.image_path as string, 60 * 60);
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

export async function getPersonalizedInsights(params: {
  scanId: string;
  age?: number;
  gender?: string;
  activity?: string;
  goal?: string;
  optimize?: boolean;
  weight_kg?: number;
  height_cm?: number;
}): Promise<{ insights?: string; upgrade?: boolean; message?: string }>{
  // Fetch the scan to get image URL or manual entry data
  const { data: scan, error: scanError } = await (supabase as any)
    .from("food_scans")
    .select("image_url, image_path, serving, result_json")
    .eq("id", params.scanId)
    .maybeSingle();
  
  if (scanError || !scan) {
    throw new Error("Scan not found");
  }

  // Check if this is a manual entry
  const resultJson = scan.result_json as FoodAnalysis | null;
  const isManualEntry = resultJson?.isManualEntry || resultJson?.dish?.startsWith("Manual: ");

  let body: Record<string, unknown> = {
    serving: scan.serving || 1,
    age: params.age,
    gender: params.gender,
    activity: params.activity,
    goal: params.goal,
    optimize: params.optimize,
    weight_kg: params.weight_kg,
    height_cm: params.height_cm,
  };

  if (isManualEntry && resultJson) {
    // For manual entries, use manualEntry instead of imageUrl
    body.manualEntry = {
      dish: resultJson.dish?.replace(/^Manual:\s*/, "") || "",
      ingredients: resultJson.ingredients || [],
    };
  } else {
    // For image-based scans, get image URL
    const imageUrl = await getImageUrl(scan.image_path, 60 * 5) || scan.image_url as string;
    if (!imageUrl) {
      throw new Error("No valid image URL available");
    }
    body.imageUrl = imageUrl;
  }

  // Call analyze-food with demographic data (single Gemini call)
  // Add timeout to the function call (15 seconds)
  const invokePromise = supabase.functions.invoke<AnalyzeFoodResponse>("analyze-food", {
    body,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Request timeout - insights generation took too long. Please try again.")), 15000);
  });

  let result: AnalyzeFoodInvokeResult;
  try {
    result = await Promise.race([invokePromise, timeoutPromise]) as AnalyzeFoodInvokeResult;
  } catch (error: any) {
    throw new Error(error?.message || "Failed to get insights");
  }
  
  const { data, error } = result;
  
  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || "Failed to get insights");
  }
  
  return {
    insights: data.insights,
    upgrade: data.upgrade,
  };
}


