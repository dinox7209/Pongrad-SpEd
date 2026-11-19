"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useBrandAssets } from "@/context/brand-context";
import { SCHOOL_INFO } from "@/types/database";
import {
  Sparkles,
  LayoutDashboard,
  ClipboardList,
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
  Handshake,
  Layers,
  Palette,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isPrimaryAdmin, profile, signOut } = useAuth();
  const { appIconUrl } = useBrandAssets();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicLinks = [
    { href: "/showcase", label: "ผลงานสาธารณะ", icon: Sparkles },
    { href: "/mou", label: "บันทึก MOU", icon: Handshake },
  ];

  const adminLinks = [
    { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/admin/information", label: "สารสนเทศ", icon: ClipboardList },
    { href: "/admin/development-plans", label: "แผน 10 สาระ", icon: Layers },
    { href: "/admin/students", label: "นักเรียน", icon: Users },
    { href: "/admin/generator", label: "เอกสาร A4", icon: FileText },
    { href: "/admin/studio", label: "สตูดิโอสื่อ", icon: Film },
    { href: "/admin/tracker", label: "20 สัปดาห์", icon: CalendarCheck2 },
    { href: "/admin/branding", label: "โลโก้", icon: Palette },
  ];

  const isLinkActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
    router.push("/showcase");
  };

  return (
    <header className="sticky top-0 z-50 liquid-glass-nav running-line-bottom border-b border-white/20 text-white no-print">
      {/* Row 1: Top Brand Identity & Account / Public Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16 sm:h-[68px]">
          {/* Brand Crest & Full School Title */}
          <Link
            href="/showcase"
            className="flex items-center gap-3 group min-w-0 flex-1"
          >
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shadow-glass-pink border group-hover:scale-105 transition-transform shrink-0 overflow-hidden ${
                appIconUrl
                  ? "bg-white/95 p-1 border-white/60"
                  : "bg-gradient-to-br from-fuchsia-400/90 via-purple-500/85 to-pink-500/90 border-white/40"
              }`}
            >
              {appIconUrl ? (
                <img
                  src={appIconUrl}
                  alt={SCHOOL_INFO.projectName}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <GraduationCap className="w-5 h-5 text-white drop-shadow" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm sm:text-base text-white tracking-wide group-hover:text-pink-200 transition-colors truncate">
                ห้องเรียนเสริมวิชาการสู่การเรียนรวม
                <span className="hidden md:inline font-normal text-pink-200 text-xs ml-1.5">
                  (Resource Room)
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-purple-200/90 truncate">
                {SCHOOL_INFO.name} × {SCHOOL_INFO.partnerName}
              </div>
            </div>
          </Link>

          {/* Desktop Right Utility: Public Nav (when guest) OR Profile Card (when admin) */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {!isAdmin && (
              <nav className="flex items-center gap-1 bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20">
                {publicLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        active
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
            )}

            {isAdmin ? (
              <div className="flex items-center gap-2.5 bg-white/12 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/25">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white flex items-center justify-end gap-1.5 whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                    <span>{profile?.display_name || "ผู้ดูแลระบบ"}</span>
                  </div>
                  <div className="text-[10px] text-pink-200 whitespace-nowrap">
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
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-semibold text-xs sm:text-sm shadow-glass-pink border border-white/30 whitespace-nowrap transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบเจ้าหน้าที่</span>
              </Link>
            )}
          </div>

          {/* Mobile / Tablet Hamburger */}
          <div className="lg:hidden flex items-center gap-2 shrink-0">
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
              className="p-2 rounded-xl bg-white/10 border border-white/20 text-purple-100 hover:text-white hover:bg-white/20 focus:outline-none cursor-pointer"
              aria-label="เปิดเมนู"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Row 2: Dedicated Admin Sub-Navigation Bar (Brought down cleanly below Brand row) */}
      {isAdmin && (
        <div className="hidden lg:block border-t border-white/15 bg-black/10 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <nav
              aria-label="เมนูหลักระบบ"
              className="flex items-center justify-between gap-2 overflow-x-auto"
            >
              <div className="flex items-center gap-1 shrink-0">
                {publicLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        active
                          ? "bg-white/25 text-white border border-white/40 shadow-sm"
                          : "text-purple-100/90 hover:bg-white/15 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-pink-200 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="h-5 w-px bg-white/20 shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1 flex-wrap xl:flex-nowrap justify-end">
                {adminLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        active
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-glass-pink border border-white/35"
                          : "text-purple-100 hover:bg-white/15 hover:text-white"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Mobile / Tablet Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-navy-950/95 backdrop-blur-2xl border-t border-white/15 px-4 pt-3 pb-5 space-y-3 max-h-[82vh] overflow-y-auto">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-pink-200/80 px-2">
              หน้าเผยแพร่สาธารณะ
            </div>
            {publicLinks.map((link) => {
              const Icon = link.icon;
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium ${
                    active
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-white/25"
                      : "text-purple-100 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {isAdmin && (
            <div className="space-y-1.5 pt-2 border-t border-white/15">
              <div className="text-[11px] font-bold uppercase tracking-wider text-pink-200/80 px-2">
                ระบบจัดการหลังบ้าน
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {adminLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isLinkActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-semibold ${
                        active
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-white/25"
                          : "text-purple-100 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/15">
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
