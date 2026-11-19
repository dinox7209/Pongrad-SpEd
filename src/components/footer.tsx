"use client";

import React from "react";
import Link from "next/link";
import { Building2, Handshake, MapPin, Phone, School } from "lucide-react";
import { useBrandAssets } from "@/context/brand-context";
import { SCHOOL_INFO } from "@/types/database";

export function Footer() {
  const { schoolLogoUrl, partnerLogoUrl } = useBrandAssets();

  return (
    <footer className="liquid-glass-nav running-line-bottom border-t border-white/20 text-purple-100 py-8 px-4 sm:px-6 lg:px-8 mt-auto no-print">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Agency 1: School */}
          <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-4 border border-white/15">
            {schoolLogoUrl ? (
              <div className="w-11 h-12 rounded-2xl bg-white/95 border border-white/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <img
                  src={schoolLogoUrl}
                  alt={SCHOOL_INFO.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-pink-200 shrink-0">
                <School className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-1">
              <div className="font-bold text-white text-sm sm:text-base">
                {SCHOOL_INFO.name}
              </div>
              <div className="text-xs text-purple-200/90 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-300 shrink-0 mt-0.5" />
                <span>
                  {SCHOOL_INFO.address} (สังกัด {SCHOOL_INFO.area})
                </span>
              </div>
              <div className="text-xs text-pink-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                <a href={`tel:${SCHOOL_INFO.phone.replace(/-/g, "")}`} className="hover:underline">
                  โทรศัพท์ {SCHOOL_INFO.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Agency 2: Special Education Center */}
          <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-4 border border-white/15">
            {partnerLogoUrl ? (
              <div className="w-11 h-12 rounded-2xl bg-white/95 border border-white/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <img
                  src={partnerLogoUrl}
                  alt={SCHOOL_INFO.partnerName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-pink-200 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-1">
              <div className="font-bold text-white text-sm sm:text-base">
                {SCHOOL_INFO.partnerName}
              </div>
              <div className="text-xs text-purple-200/90 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-300 shrink-0 mt-0.5" />
                <span>{SCHOOL_INFO.partnerAddress}</span>
              </div>
              <div className="text-xs text-pink-200 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                <a
                  href={`tel:${SCHOOL_INFO.partnerPhone.replace(/-/g, "")}`}
                  className="hover:underline"
                >
                  โทรศัพท์ {SCHOOL_INFO.partnerPhone}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-purple-200/85 text-center sm:text-left">
          <span>
            {SCHOOL_INFO.projectName} • ความร่วมมือ {SCHOOL_INFO.name} และ {SCHOOL_INFO.partnerName}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/mou"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold border border-white/25 transition-colors"
            >
              <Handshake className="w-3.5 h-3.5 text-pink-200" />
              <span>บันทึกข้อตกลงความร่วมมือ (MOU)</span>
            </Link>
            <span className="text-purple-200/75">
              © 2026 All rights reserved. ข้อมูลส่วนบุคคลได้รับการคุ้มครอง
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
