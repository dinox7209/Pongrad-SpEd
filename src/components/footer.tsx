"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Code2,
  Coffee,
  Handshake,
  MapPin,
  Phone,
  School,
  Sparkles,
} from "lucide-react";
import { useBrandAssets } from "@/context/brand-context";
import { SCHOOL_INFO } from "@/types/database";

export function Footer() {
  const { schoolLogoUrl, partnerLogoUrl } = useBrandAssets();

  return (
    <footer className="liquid-glass-nav running-line-bottom border-t border-white/20 text-purple-100 pt-8 pb-6 px-4 sm:px-6 lg:px-8 mt-auto no-print">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Row: Two Symmetric Partner Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Agency 1: School */}
          <div className="h-full flex items-center gap-4 bg-white/10 hover:bg-white/[0.14] transition-colors rounded-3xl p-4 sm:p-5 border border-white/20 shadow-inner">
            {schoolLogoUrl ? (
              <div className="w-12 h-14 rounded-2xl bg-white/95 border border-white/50 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <img
                  src={schoolLogoUrl}
                  alt={SCHOOL_INFO.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-12 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-pink-200 shrink-0">
                <School className="w-6 h-6" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-white text-sm sm:text-base leading-snug">
                {SCHOOL_INFO.name}
              </div>
              <div className="text-xs text-purple-100/90 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-300 shrink-0 mt-0.5" />
                <span>
                  {SCHOOL_INFO.address} (สังกัด {SCHOOL_INFO.area})
                </span>
              </div>
              <div className="text-xs text-pink-200 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                <a
                  href={`tel:${SCHOOL_INFO.phone.replace(/-/g, "")}`}
                  className="hover:text-white hover:underline transition-colors"
                >
                  โทรศัพท์ {SCHOOL_INFO.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Agency 2: Special Education Center */}
          <div className="h-full flex items-center gap-4 bg-white/10 hover:bg-white/[0.14] transition-colors rounded-3xl p-4 sm:p-5 border border-white/20 shadow-inner">
            {partnerLogoUrl ? (
              <div className="w-12 h-14 rounded-2xl bg-white/95 border border-white/50 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <img
                  src={partnerLogoUrl}
                  alt={SCHOOL_INFO.partnerName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-12 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-pink-200 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-white text-sm sm:text-base leading-snug">
                {SCHOOL_INFO.partnerName}
              </div>
              <div className="text-xs text-purple-100/90 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-300 shrink-0 mt-0.5" />
                <span>{SCHOOL_INFO.partnerAddress}</span>
              </div>
              <div className="text-xs text-pink-200 font-medium flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                <a
                  href={`tel:${SCHOOL_INFO.partnerPhone.replace(/-/g, "")}`}
                  className="hover:text-white hover:underline transition-colors"
                >
                  โทรศัพท์ {SCHOOL_INFO.partnerPhone}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Row: Project Cooperation Line + Balanced Public Action Pills */}
        <div className="pt-4 border-t border-white/15 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs text-purple-100/90 text-center lg:text-left">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5">
            <span className="font-semibold text-white">
              {SCHOOL_INFO.projectName}
            </span>
            <span className="text-pink-200/80 hidden sm:inline">•</span>
            <span className="text-purple-200/90">
              {SCHOOL_INFO.name} × {SCHOOL_INFO.partnerName}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
            <Link
              href="/showcase"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/12 hover:bg-white/25 text-white font-semibold text-[11px] border border-white/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-200" />
              <span>ผลงานสาธารณะ</span>
            </Link>
            <Link
              href="/mou"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-[11px] border border-white/25 transition-colors"
            >
              <Handshake className="w-3.5 h-3.5 text-pink-200" />
              <span>บันทึกข้อตกลงความร่วมมือ (MOU)</span>
            </Link>
          </div>
        </div>

        {/* Bottom Row: Centered Developer Credit Capsule with Icons */}
        <div className="pt-1 flex justify-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-black/15 border border-white/15 text-[11px] sm:text-xs text-purple-100/90 text-center">
            <span className="inline-flex items-center gap-1.5 text-pink-200 font-semibold">
              <Code2 className="w-3.5 h-3.5 text-pink-300 shrink-0" />
              <Coffee className="w-3.5 h-3.5 text-amber-200 shrink-0" />
            </span>
            <span>
              <strong className="font-semibold text-white">พัฒนาโดย ครูเอก</strong>
              {" · "}© 2026 Crafted with code &amp; coffee by Kru Aek. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
