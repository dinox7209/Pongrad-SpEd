"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintMouButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-purple-950 hover:bg-pink-50 text-xs sm:text-sm font-bold shadow-glass-pink transition-all hover:scale-[1.02] cursor-pointer"
    >
      <Printer className="w-4 h-4 text-pink-600" />
      <span>พิมพ์บันทึกข้อตกลง / บันทึก PDF</span>
    </button>
  );
}
