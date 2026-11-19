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
  const { isAdmin, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const publicLinks = [
    { href: "/showcase", label: "ผลงานสาธารณะ", icon: Sparkles },
  ];

  const adminLinks = [
    { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
    { href: "/admin/students", label: "นักเรียน & เคส", icon: Users },
    { href: "/admin/generator", label: "สร้างเอกสาร A4", icon: FileText },
    { href: "/admin/studio", label: "คลังสื่อ & ตัดต่อ", icon: Film },
    { href: "/admin/tracker", label: "งาน 20 สัปดาห์", icon: CalendarCheck2 },
  ];

  const visibleLinks = isAdmin ? [...publicLinks, ...adminLinks] : publicLinks;

  const handleLogout = async () => {
    await signOut();
    setMobileMenuOpen(false);
    router.push("/showcase");
  };

  return (
    <header className="sticky top-0 z-50 bg-navy-900 border-b border-navy-800 text-white shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & School Title */}
          <Link
            href="/showcase"
            className="flex items-center space-x-2.5 sm:space-x-3 group min-w-0"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-500 to-navy-700 flex items-center justify-center shadow-lg border border-blue-400/30 group-hover:scale-105 transition-transform shrink-0">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base text-white tracking-wide group-hover:text-blue-300 transition-colors truncate">
                ระบบการศึกษาพิเศษ (Pongrad SpEd)
              </div>
              <div className="text-[11px] sm:text-xs text-navy-300 flex items-center gap-1.5 truncate">
                <span className="truncate">{SCHOOL_INFO.name}</span>
                <span className="hidden md:inline-block w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="hidden md:inline-block text-[11px] text-blue-300 shrink-0">
                  {SCHOOL_INFO.area}
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
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
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-navy-100 hover:bg-navy-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile / Login Button */}
          <div className="hidden lg:flex items-center space-x-3 shrink-0">
            {isAdmin ? (
              <div className="flex items-center space-x-2.5 bg-navy-800/90 px-3 py-1.5 rounded-xl border border-navy-700">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white flex items-center justify-end gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="max-w-[160px] truncate">
                      {profile?.display_name || "ผู้ดูแลระบบ"}
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-300">
                    {profile?.position || "ผู้ดูแลระบบหลังบ้าน (2 คน)"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="ออกจากระบบ"
                  className="p-2 rounded-lg bg-navy-700 hover:bg-red-600/80 text-navy-200 hover:text-white transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy-800 border border-navy-700 text-[11px] text-navy-200">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>เปิดดูผลงานสาธารณะ</span>
                </span>
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium text-sm shadow-md transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>เข้าสู่ระบบผู้ดูแล</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="lg:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-navy-200 hover:text-white hover:bg-navy-800 focus:outline-none"
              aria-label="เปิดเมนู"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-navy-900 border-t border-navy-800 px-4 pt-3 pb-5 space-y-2">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-navy-100 hover:bg-navy-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-navy-800">
            {isAdmin ? (
              <div className="flex items-center justify-between px-3 py-2 bg-navy-800 rounded-xl">
                <div className="min-w-0 pr-2">
                  <div className="text-sm font-semibold text-white truncate">
                    {profile?.display_name || "ผู้ดูแลระบบ"}
                  </div>
                  <div className="text-xs text-blue-300 truncate">
                    {profile?.position || "ผู้ดูแลระบบหลังบ้าน"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 text-xs font-medium shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ออก</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบหลังบ้าน (ผู้ดูแล 2 ท่าน)</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
