import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const adminClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
}) : null as any;

const UNREGISTERED_LIMIT = 10;
const REGISTERED_DAILY_LIMIT = 3;
const SESSION_COOKIE = "wtf_free_scan_session";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type FreeScanRecord = Database["public"]["Tables"]["free_scan_sessions"]["Row"];

type FreeScanResponse = {
  type: "registered" | "unregistered";
  remaining: number;
};

function createJsonResponse(data: FreeScanResponse, init?: Parameters<typeof NextResponse.json>[1]) {
  return NextResponse.json(data, init);
}

function needsDailyReset(lastReset: string | null) {
  if (!lastReset) return true;
  const last = new Date(lastReset);
  const now = new Date();
  return (
    last.getUTCFullYear() !== now.getUTCFullYear() ||
    last.getUTCMonth() !== now.getUTCMonth() ||
    last.getUTCDate() !== now.getUTCDate()
  );
}

async function getUnregisteredRecord(sessionId: string): Promise<FreeScanRecord> {
  const { data, error } = await adminClient
    .from("free_scan_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data;
  }

  const { data: inserted, error: insertError } = await adminClient
    .from("free_scan_sessions")
    .insert({
      session_id: sessionId,
      total_remaining: UNREGISTERED_LIMIT,
      total_limit: UNREGISTERED_LIMIT,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Failed to initialize free scans");
  }

  return inserted;
}

async function getRegisteredRecord(userId: string): Promise<FreeScanRecord> {
  const { data, error } = await adminClient
    .from("free_scan_sessions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const now = new Date().toISOString();

  if (!data) {
    const { data: inserted, error: insertError } = await adminClient
      .from("free_scan_sessions")
      .insert({
        user_id: userId,
        daily_remaining: REGISTERED_DAILY_LIMIT,
        daily_limit: REGISTERED_DAILY_LIMIT,
        last_reset_at: now,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message ?? "Failed to initialize daily free scans");
    }

    return inserted;
  }

  if (needsDailyReset(data.last_reset_at)) {
    const { data: updated, error: updateError } = await adminClient
      .from("free_scan_sessions")
      .update({
        daily_remaining: REGISTERED_DAILY_LIMIT,
        daily_limit: REGISTERED_DAILY_LIMIT,
        last_reset_at: now,
      })
      .eq("id", data.id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to reset daily free scans");
    }

    return updated;
  }

  return data;
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? null;
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  let shouldSetCookie = false;

  try {
    if (userId) {
      const record = await getRegisteredRecord(userId);
      return createJsonResponse({ type: "registered", remaining: record.daily_remaining ?? REGISTERED_DAILY_LIMIT });
    }

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      shouldSetCookie = true;
    }

    const record = await getUnregisteredRecord(sessionId);
    const response = createJsonResponse({ type: "unregistered", remaining: record.total_remaining ?? UNREGISTERED_LIMIT });

    if (shouldSetCookie) {
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_COOKIE_MAX_AGE,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Free scan GET error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch free scan status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? null;
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  try {
    if (userId) {
      const record = await getRegisteredRecord(userId);
      const remaining = record.daily_remaining ?? REGISTERED_DAILY_LIMIT;
      if (remaining <= 0) {
        return NextResponse.json({ error: "No free scans remaining" }, { status: 429 });
      }

      const { data: updated, error: updateError } = await adminClient
        .from("free_scan_sessions")
        .update({ daily_remaining: remaining - 1 })
        .eq("id", record.id)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "Failed to decrement daily scans");
      }

      return createJsonResponse({ type: "registered", remaining: updated.daily_remaining ?? 0 });
    }

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const record = await getUnregisteredRecord(sessionId);
    const remaining = record.total_remaining ?? UNREGISTERED_LIMIT;
    if (remaining <= 0) {
      const response = NextResponse.json({ error: "No free scans remaining" }, { status: 429 });
      response.cookies.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: SESSION_COOKIE_MAX_AGE,
        path: "/",
      });
      return response;
    }

    const { data: updated, error: updateError } = await adminClient
      .from("free_scan_sessions")
      .update({ total_remaining: remaining - 1 })
      .eq("id", record.id)
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to decrement free scans");
    }

    const response = createJsonResponse({ type: "unregistered", remaining: updated.total_remaining ?? 0 });
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("Free scan POST error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to update free scans" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user?.id ?? null;
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  try {
    if (userId) {
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await adminClient
        .from("free_scan_sessions")
        .upsert(
          {
            user_id: userId,
            daily_remaining: REGISTERED_DAILY_LIMIT,
            daily_limit: REGISTERED_DAILY_LIMIT,
            last_reset_at: now,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "Failed to reset daily scans");
      }

      return createJsonResponse({ type: "registered", remaining: updated.daily_remaining ?? REGISTERED_DAILY_LIMIT });
    }

    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    const { data: updated, error: updateError } = await adminClient
      .from("free_scan_sessions")
      .upsert(
        {
          session_id: sessionId,
          total_remaining: UNREGISTERED_LIMIT,
          total_limit: UNREGISTERED_LIMIT,
        },
        { onConflict: "session_id" }
      )
      .select()
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message ?? "Failed to reset free scans");
    }

    const response = createJsonResponse({ type: "unregistered", remaining: updated.total_remaining ?? UNREGISTERED_LIMIT });
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAX_AGE,
      path: "/",
    });
    return response;
  } catch (error: any) {
    console.error("Free scan PATCH error", error);
    return NextResponse.json({ error: error?.message ?? "Failed to reset free scans" }, { status: 500 });
  }
}
