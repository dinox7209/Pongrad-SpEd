import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const getSupabaseUrl = (): string => supabaseUrl;

export const getSupabaseProjectRef = (): string => {
  try {
    if (!supabaseUrl) return "";
    const url = new URL(supabaseUrl);
    return url.hostname.split(".")[0] || "";
  } catch {
    return "";
  }
};

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project-id") &&
    !supabaseUrl.includes("placeholder-project")
  );
};

let browserClient: SupabaseClient | null = null;

export const createClient = (): SupabaseClient => {
  if (browserClient) return browserClient;

  const url = isSupabaseConfigured()
    ? supabaseUrl
    : "https://placeholder-project.supabase.co";
  const key = isSupabaseConfigured() ? supabaseAnonKey : "placeholder-anon-key";

  browserClient = createBrowserClient(url, key);
  return browserClient;
};

export const supabase = createClient();
