"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Loader2, ShieldAlert } from "lucide-react";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`);
    }
  }, [isAdmin, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-600">
        <ShieldAlert className="w-10 h-10 text-amber-500" />
        <p className="text-sm font-medium">กำลังนำทางไปยังหน้าเข้าสู่ระบบผู้ดูแล...</p>
      </div>
    );
  }

  return <>{children}</>;
}
