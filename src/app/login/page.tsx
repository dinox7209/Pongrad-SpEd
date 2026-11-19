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
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-blue-900 text-white p-7 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8 text-blue-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ระบบหลังบ้านสำหรับผู้ดูแล 2 ท่าน</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                เข้าสู่ระบบจัดการศึกษาพิเศษ
              </h1>
              <p className="text-xs text-navy-200 mt-1">{SCHOOL_INFO.name}</p>
            </div>
          </div>

          <div className="p-6 sm:p-7 space-y-5">
            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  อีเมลผู้ดูแลระบบ
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="wadpongradschool@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm shadow-md transition-colors cursor-pointer"
              >
                <span>{loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบผู้ดูแล"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {!isConfigured && (
              <div className="pt-4 border-t border-slate-200 space-y-2.5">
                <div className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  โหมดทดลอง (ยังไม่ได้เชื่อมต่อ Supabase): เลือกเข้าสู่ระบบจำลองเพื่อทดสอบทุกฟีเจอร์หลังบ้าน
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(1)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                    <span>ทดลองเข้าใช้: ครูเอก (คนที่ 1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(2)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>ทดลองเข้าใช้: ผู้ดูแลคนที่ 2</span>
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-navy-900">
                บัญชีผู้ดูแลที่ Seed ไว้ใน <code>supabase/schema.sql</code>:
              </div>
              <div>1) <code>wadpongradschool@gmail.com</code> (ผู้ดูแลคนที่ 1)</div>
              <div>2) <code>sped2@pongrad.ac.th</code> (ผู้ดูแลคนที่ 2)</div>
            </div>

            <div className="text-center pt-1">
              <Link
                href="/showcase"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับไปหน้าแสดงผลงานสาธารณะ (ไม่ต้องล็อกอิน)</span>
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
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
          กำลังโหลดหน้าเข้าสู่ระบบ...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
