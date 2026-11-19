"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  isSchemaReady: boolean;
  isDemoAdmin: boolean;
  checkSchema: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  enterDemoAdmin: (adminNumber?: 1 | 2) => void;
}

const DEMO_ADMIN_STORAGE_KEY = "pongrad_sped_demo_admin";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function translateAuthError(message: string): string {
  const msg = (message || "").toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบบัญชีผู้ดูแลที่ตั้งไว้ใน Supabase";
  }
  if (msg.includes("email not confirmed")) {
    return "บัญชีนี้ยังไม่ได้รับการยืนยันอีเมล กรุณาตรวจสอบ Auth ใน Supabase";
  }
  return message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSchemaReady, setIsSchemaReady] = useState<boolean>(true);
  const [isDemoAdmin, setIsDemoAdmin] = useState<boolean>(false);

  const checkSchema = useCallback(async () => {
    if (!isConfigured) {
      setIsSchemaReady(false);
      return;
    }
    try {
      const { error } = await supabase.from("students").select("id").limit(1);
      if (
        error &&
        (error.code === "42P01" ||
          error.code === "PGRST205" ||
          error.message?.includes("does not exist") ||
          error.message?.includes("schema cache"))
      ) {
        setIsSchemaReady(false);
      } else {
        setIsSchemaReady(true);
      }
    } catch {
      // Ignore transient network errors
    }
  }, [isConfigured]);

  const fetchProfile = useCallback(
    async (currentUser: User) => {
      if (!isConfigured) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (data) {
        setProfile(data as Profile);
      } else {
        const meta = currentUser.user_metadata || {};
        setProfile({
          id: currentUser.id,
          email: currentUser.email || null,
          display_name: meta.display_name || currentUser.email || "ผู้ดูแลระบบ",
          role: "admin",
          created_at: currentUser.created_at || new Date().toISOString(),
        });
      }
    },
    [isConfigured]
  );

  useEffect(() => {
    let active = true;

    async function init() {
      if (!isConfigured) {
        if (typeof window !== "undefined") {
          const savedDemo = localStorage.getItem(DEMO_ADMIN_STORAGE_KEY);
          if (savedDemo === "1" || savedDemo === "2") {
            setIsDemoAdmin(true);
            setProfile({
              id: `demo-admin-${savedDemo}`,
              email:
                savedDemo === "1"
                  ? "wadpongradschool@gmail.com"
                  : "sped2@pongrad.ac.th",
              display_name:
                savedDemo === "1"
                  ? "ครูเอก (ผู้ดูแลคนที่ 1 • Demo)"
                  : "ครูผู้ช่วยการศึกษาพิเศษ (ผู้ดูแลคนที่ 2 • Demo)",
              role: "admin",
              position: "ครูการศึกษาพิเศษ",
              created_at: new Date().toISOString(),
            });
          }
        }
        setIsSchemaReady(false);
        setIsLoading(false);
        return;
      }

      await checkSchema();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      }
      setIsLoading(false);
    }

    init();

    if (!isConfigured) return () => { active = false; };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [isConfigured, checkSchema, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return {
        error: new Error("ยังไม่ได้เชื่อมต่อ Supabase กรุณาใช้ปุ่มเข้าสู่โหมดทดลอง (Demo)"),
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return { error: new Error(translateAuthError(error.message)) };
    }

    if (data.user) {
      setUser(data.user);
      await fetchProfile(data.user);
    }

    return { error: null };
  };

  const enterDemoAdmin = (adminNumber: 1 | 2 = 1) => {
    if (isConfigured) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_ADMIN_STORAGE_KEY, String(adminNumber));
    }
    setIsDemoAdmin(true);
    setProfile({
      id: `demo-admin-${adminNumber}`,
      email:
        adminNumber === 1 ? "wadpongradschool@gmail.com" : "sped2@pongrad.ac.th",
      display_name:
        adminNumber === 1
          ? "ครูเอก (ผู้ดูแลคนที่ 1 • Demo)"
          : "ครูผู้ช่วยการศึกษาพิเศษ (ผู้ดูแลคนที่ 2 • Demo)",
      role: "admin",
      position: "ครูการศึกษาพิเศษ",
      created_at: new Date().toISOString(),
    });
  };

  const signOut = async () => {
    if (!isConfigured) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(DEMO_ADMIN_STORAGE_KEY);
      }
      setIsDemoAdmin(false);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAdmin = isConfigured
    ? Boolean(user && (!profile || profile.role === "admin" || profile.role === "director"))
    : isDemoAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAdmin,
        isConfigured,
        isSchemaReady,
        isDemoAdmin,
        checkSchema,
        signIn,
        signOut,
        enterDemoAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
