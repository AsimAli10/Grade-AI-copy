"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "./types";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClientComponentClient<Database>();