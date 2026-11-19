import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function isServerSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return (
    Boolean(url) &&
    Boolean(anon) &&
    url.startsWith("http") &&
    !url.includes("your-project-id") &&
    !url.includes("placeholder-project")
  );
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component context: cookies can only be mutated in Route Handler / Proxy
        }
      },
    },
  });
}

/**
 * Service-role client (ไม่ผ่าน RLS) สำหรับงานเบื้องหลัง เช่น Vercel Cron และตรวจสิทธิ์สตรีมไฟล์
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey || url.includes("your-project-id")) {
    return null;
  }
  return createSupabaseAdmin(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * ตรวจสอบว่าคำขอที่เข้ามาเป็นของ Admin ที่เข้าสู่ระบบแล้วหรือไม่
 */
export async function getAuthenticatedAdmin() {
  if (!isServerSupabaseConfigured()) {
    return { user: null, profile: null, isDemoMode: true };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, isDemoMode: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const isAllowedRole =
    profile?.role === "super_admin" ||
    profile?.role === "admin" ||
    profile?.role === "director";

  if (!profile || !isAllowedRole) {
    return { user: null, profile: null, isDemoMode: false };
  }

  return { user, profile, isDemoMode: false };
}
