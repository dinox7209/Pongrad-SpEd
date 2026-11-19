"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SCHOOL_INFO } from "@/types/database";
import {
  Sparkles,
  LayoutDashboard,
  Users,
  FileText,
  Film,
  CalendarCheck2,
  LogIn,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  Globe,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isPrimaryAdmin, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicLinks = [
    { href: "/showcase", label: "ผลงานสาธารณะ", icon: Sparkles },
  ];

  const adminLinks = [
    { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/admin/students", label: "นักเรียน", icon: Users },
    { href: "/admin/generator", label: "เอกสาร A4", icon: FileText },
    { href: "/admin/studio", label: "สตูดิโอสื่อ", icon: Film },
    { href: "/admin/tracker", label: "20 สัปดาห์", icon: CalendarCheck2 },
  ];

  const visibleLinks = isAdmin ? [...publicLinks, ...adminLinks] : publicLinks;

  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
    router.push("/showcase");
  };

  return (
    <header className="sticky top-0 z-50 liquid-glass-nav running-line-bottom border-b border-white/20 text-white no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-[74px]">
          {/* Logo & Compact Brand */}
          <Link
            href="/showcase"
            className="flex items-center gap-2.5 group min-w-0 shrink"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-fuchsia-400/90 via-purple-500/85 to-pink-500/90 flex items-center justify-center shadow-glass-pink border border-white/40 group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-5 h-5 text-white drop-shadow" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base text-white tracking-wide group-hover:text-pink-200 transition-colors whitespace-nowrap truncate">
                ห้องเรียนเสริมวิชาการ
                <span className="hidden sm:inline font-normal text-pink-200 text-xs ml-1.5">
                  (Resource Room)
                </span>
              </div>
              <div className="text-[11px] text-purple-200/90 truncate max-w-[210px] sm:max-w-[260px]">
                รร.วัดโป่งแรด × ศูนย์การศึกษาพิเศษ จันทบุรี
              </div>
            </div>
          </Link>

          {/* Desktop Navigation (Single-line Liquid Pill Capsule) */}
          <nav className="hidden xl:flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20 shrink-0">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white shadow-glass-pink border border-white/35"
                      : "text-purple-100 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Login Button */}
          <div className="hidden xl:flex items-center gap-2.5 shrink-0">
            {isAdmin ? (
              <div className="flex items-center gap-2.5 bg-white/12 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/25">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white flex items-center justify-end gap-1 whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                    <span className="max-w-[140px] truncate">
                      {profile?.display_name || "ผู้ดูแลระบบ"}
                    </span>
                  </div>
                  <div className="text-[10px] text-pink-200 max-w-[155px] truncate">
                    {isPrimaryAdmin ? "แอดมินหลัก • " : ""}
                    {profile?.position || "ผู้ดูแลระบบ"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="ออกจากระบบ"
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500/80 text-purple-100 hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-[11px] text-purple-100 whitespace-nowrap">
                  <Globe className="w-3.5 h-3.5 text-pink-300" />
                  <span>มุมมองสาธารณะ</span>
                </span>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-semibold text-xs sm:text-sm shadow-glass-pink border border-white/30 whitespace-nowrap transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบเจ้าหน้าที่</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile / Tablet Hamburger */}
          <div className="xl:hidden flex items-center gap-2">
            {!isAdmin && (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-xs font-semibold border border-white/30 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 rounded-xl bg-white/10 border border-white/20 text-purple-100 hover:text-white hover:bg-white/20 focus:outline-none"
              aria-label="เปิดเมนู"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-navy-950/92 backdrop-blur-2xl border-t border-white/15 px-4 pt-3 pb-5 space-y-2">
          <div className="text-[11px] text-purple-200/80 px-2 pb-1">
            {SCHOOL_INFO.name} × {SCHOOL_INFO.partnerName}
          </div>
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-white/25"
                    : "text-purple-100 hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-white/15">
            {isAdmin ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-2xl">
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-semibold text-white truncate">
                    {profile?.display_name || "ผู้ดูแลระบบ"}
                  </div>
                  <div className="text-xs text-pink-200 truncate">
                    {isPrimaryAdmin ? "แอดมินหลัก • " : ""}
                    {profile?.position || "ผู้ดูแลระบบ"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/25 border border-rose-300/30 text-rose-100 text-xs font-medium shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออก</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white font-semibold text-sm border border-white/30"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบเจ้าหน้าที่</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
