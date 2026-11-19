"use client";

import React from "react";
import { Code2, MapPin, School } from "lucide-react";
import { SCHOOL_INFO } from "@/types/database";

export function Footer() {
  return (
    <footer className="liquid-glass-nav running-line-bottom border-t border-white/20 text-purple-100 py-7 px-4 sm:px-6 lg:px-8 mt-auto no-print">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-pink-200 shadow-glass-pink">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm sm:text-base">
                {SCHOOL_INFO.name}
              </div>
              <div className="text-xs text-purple-200/80 flex items-center justify-center md:justify-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-pink-300" />
                <span>สำนักงานเขตพื้นที่การศึกษาประถมศึกษาจันทบุรี เขต 1</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-purple-200/80">
            <div>ระบบจัดการสื่อการสอนและติดตามนักเรียนการศึกษาพิเศษ (Pongrad SpEd)</div>
            <div>Google Drive Streaming • Client-side FFmpeg 720p • React-PDF A4</div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-center gap-1.5 text-[11px] text-purple-200/80 text-center">
          <Code2 className="w-3.5 h-3.5 text-pink-300 hidden sm:inline-block" />
          <span>
            พัฒนาโดย ครูเอก · © 2026 Crafted with code &amp; coffee by Kru Aek. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
