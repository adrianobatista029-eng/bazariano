"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
