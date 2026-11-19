"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SCHOOL_INFO } from "@/types/database";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, isConfigured, signIn, enterDemoAdmin } = useAuth();

  const rawRedirect = searchParams.get("redirect") || "/admin";
  const safeRedirect =
    rawRedirect.startsWith("/admin") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isAdmin) {
      router.replace(safeRedirect);
    }
  }, [isAdmin, router, safeRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg("เข้าสู่ระบบสำเร็จ กำลังเข้าสู่หน้าจัดการหลังบ้าน...");
        router.push(safeRedirect);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (adminNo: 1 | 2) => {
    enterDemoAdmin(adminNo);
    router.push(safeRedirect);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="liquid-glass rounded-[2rem] shadow-glass-lg overflow-hidden">
          <div className="liquid-glass-hero running-line-bottom text-white p-7 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center shadow-glass-pink">
              <GraduationCap className="w-8 h-8 text-pink-200" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-pink-100 text-xs font-semibold mb-2 border border-white/25">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ระบบหลังบ้านสำหรับเจ้าหน้าที่ผู้รับผิดชอบ</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                {SCHOOL_INFO.projectName}
              </h1>
              <p className="text-xs text-purple-200 mt-1">
                {SCHOOL_INFO.name} × {SCHOOL_INFO.partnerName}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-700 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1.5">
                  อีเมลผู้ใช้งาน
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/80 border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1.5">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/80 border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-pink-600"
                    aria-label="แสดง/ซ่อนรหัสผ่าน"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isConfigured}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full liquid-btn-primary disabled:opacity-50 text-white font-semibold text-sm cursor-pointer"
              >
                <span>{loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบเจ้าหน้าที่"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {!isConfigured && (
              <div className="pt-4 border-t border-purple-200/60 space-y-2.5">
                <div className="text-xs font-semibold text-purple-900 bg-purple-100/70 border border-purple-200 rounded-2xl p-3">
                  โหมดทดลอง (ยังไม่ได้เชื่อมต่อ Supabase): เลือกสิทธิ์เข้าสู่ระบบจำลอง
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(1)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full liquid-btn-primary text-white text-xs font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-200" />
                    <span>ทดลอง: แอดมินหลัก</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(2)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-full bg-white/80 hover:bg-white text-purple-800 border border-purple-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-600" />
                    <span>ทดลอง: ครูร่วมดำเนินงาน</span>
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white/60 border border-purple-200/70 p-3.5 text-xs text-purple-950/75 text-center">
              สงวนสิทธิ์การเข้าใช้งานเฉพาะเจ้าหน้าที่ผู้รับผิดชอบที่ลงทะเบียนในระบบเท่านั้น
            </div>

            <div className="text-center pt-1">
              <Link
                href="/showcase"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-600 hover:text-purple-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับไปหน้าเผยแพร่ผลงานสาธารณะ</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-purple-700">
          กำลังโหลดหน้าเข้าสู่ระบบ...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
