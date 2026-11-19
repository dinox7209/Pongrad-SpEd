"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { getSupabaseProjectRef } from "@/lib/supabase/client";
import { SUPABASE_SCHEMA_SQL } from "@/lib/supabase/schema-sql";
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw } from "lucide-react";

export function SetupBanner() {
  const { isConfigured, isSchemaReady, checkSchema } = useAuth();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const projectRef = getSupabaseProjectRef();
  const sqlEditorUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
    : "https://supabase.com/dashboard";

  if (isConfigured && isSchemaReady) return null;

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const el = document.createElement("textarea");
      el.value = SUPABASE_SCHEMA_SQL;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    await checkSchema();
    setTimeout(() => setChecking(false), 500);
  };

  return (
    <div className="bg-gradient-to-r from-purple-950/90 via-fuchsia-950/85 to-pink-950/90 backdrop-blur-xl border-b border-pink-400/30 text-pink-100 px-4 py-2.5 no-print">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-pink-300 shrink-0 mt-0.5" />
          <div>
            {!isConfigured ? (
              <>
                <span className="font-bold text-white">โหมดทดลองใช้งาน (Demo Mode): </span>
                <span>
                  ยังไม่ได้ตั้งค่า <code>NEXT_PUBLIC_SUPABASE_URL</code> และ{" "}
                  <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — สามารถทดสอบดูหน้าสาธารณะและระบบหลังบ้านจำลองได้ทันที
                </span>
              </>
            ) : (
              <>
                <span className="font-bold text-pink-200">
                  ยังไม่ได้รันสคริปต์ฐานข้อมูล ({projectRef || "Supabase"}):{" "}
                </span>
                <span>
                  คัดลอกโค้ด <code>supabase/schema.sql</code> ไปวางและกด Run ใน Supabase SQL Editor เพื่อสร้าง 5 ตารางหลักและบัญชีผู้ดูแล 2 ท่าน
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copySql}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-400 hover:to-fuchsia-400 text-white rounded-full text-xs font-bold shadow-sm border border-white/25 transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "คัดลอก SQL แล้ว!" : "คัดลอก SQL (schema.sql)"}</span>
          </button>

          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-full text-xs font-bold border border-white/25 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>เปิด SQL Editor</span>
          </a>

          {isConfigured && (
            <button
              type="button"
              onClick={handleRecheck}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-pink-100 rounded-full text-xs font-medium border border-white/20 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>ตรวจสอบอีกครั้ง</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
