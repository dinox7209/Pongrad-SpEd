"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { getDemoMedia } from "@/lib/demo-store";
import {
  formatDateThai,
  getMediaStreamUrl,
  isDemoDriveId,
} from "@/lib/utils";
import {
  GRADE_LEVELS,
  MediaAsset,
  SCHOOL_INFO,
  SKILL_CATEGORIES,
} from "@/types/database";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Film,
  GraduationCap,
  Image as ImageIcon,
  Newspaper,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

function resolvePdfPreviewSrc(asset: MediaAsset): string {
  if (isDemoDriveId(asset.drive_file_id)) {
    const typeParam = asset.drive_file_id.includes("-1")
      ? "newsletter-1"
      : "newsletter";
    return `/api/demo-pdf?type=${typeParam}`;
  }
  return `${getMediaStreamUrl(asset.drive_file_id)}#toolbar=1`;
}

export default function PublicShowcasePage() {
  const { isConfigured, isAdmin } = useAuth();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [selectedType, setSelectedType] = useState<
    "all" | "video" | "image" | "pdf"
  >("all");

  // Modals
  const [activePdfAsset, setActivePdfAsset] = useState<MediaAsset | null>(null);
  const [activeMediaAsset, setActiveMediaAsset] = useState<MediaAsset | null>(
    null
  );

  useEffect(() => {
    async function loadPublicShowcase() {
      setLoading(true);
      try {
        if (isConfigured) {
          const { data, error } = await supabase
            .from("media_assets")
            .select("*")
            .eq("is_public", true)
            .order("created_at", { ascending: false });

          if (!error && data) {
            setAssets(data as MediaAsset[]);
          } else {
            setAssets(getDemoMedia().filter((m) => m.is_public));
          }
        } else {
          setAssets(getDemoMedia().filter((m) => m.is_public));
        }
      } catch (err) {
        console.error("Failed to load showcase media:", err);
        setAssets(getDemoMedia().filter((m) => m.is_public));
      } finally {
        setLoading(false);
      }
    }

    loadPublicShowcase();
  }, [isConfigured]);

  const newsletters = useMemo(
    () =>
      assets.filter(
        (a) => a.media_type === "newsletter" || a.media_type === "pdf"
      ),
    [assets]
  );

  const galleryAssets = useMemo(() => {
    return assets.filter((a) => {
      const isNewsletter = a.media_type === "newsletter";
      if (isNewsletter && selectedType === "all") {
        // วารสารแสดงในส่วนด้านบนแล้ว ยกเว้นผู้ใช้เลือกกรอง PDF โดยเฉพาะ
        return false;
      }

      const matchesSearch =
        !searchQuery.trim() ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGrade =
        selectedGrade === "all" || a.grade_level === selectedGrade;

      const matchesSkill =
        selectedSkill === "all" || a.skill_category === selectedSkill;

      const matchesType =
        selectedType === "all" ||
        (selectedType === "pdf"
          ? a.media_type === "pdf" ||
            a.media_type === "portfolio" ||
            a.media_type === "newsletter"
          : a.media_type === selectedType);

      return matchesSearch && matchesGrade && matchesSkill && matchesType;
    });
  }, [assets, searchQuery, selectedGrade, selectedSkill, selectedType]);

  const videoCount = assets.filter((a) => a.media_type === "video").length;
  const imageCount = assets.filter((a) => a.media_type === "image").length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Public Hero Banner */}
      <section className="bg-gradient-to-br from-navy-950 via-navy-900 to-blue-900 text-white py-10 sm:py-14 px-4 sm:px-6 lg:px-8 border-b border-navy-800">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>พื้นที่เผยแพร่ผลงานสาธารณะ (เปิดดูได้ทันทีไม่ต้องเข้าสู่ระบบ)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              วารสารข่าวและคลังผลงานนักเรียนการศึกษาพิเศษ
            </h1>
            <p className="text-navy-200 text-sm sm:text-base">
              {SCHOOL_INFO.name} • {SCHOOL_INFO.area} — รวมสื่อการเรียนรู้ คลิปวิดีโอสั้นพัฒนาทักษะ และวารสารข่าวประจำสัปดาห์สำหรับผู้ปกครองและชุมชน
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="bg-navy-800/80 border border-navy-700 rounded-2xl p-4 text-center">
              <div className="text-2xl font-extrabold text-white">
                {newsletters.length}
              </div>
              <div className="text-[11px] text-blue-300 mt-0.5">วารสาร PDF</div>
            </div>
            <div className="bg-navy-800/80 border border-navy-700 rounded-2xl p-4 text-center">
              <div className="text-2xl font-extrabold text-white">
                {videoCount}
              </div>
              <div className="text-[11px] text-blue-300 mt-0.5">คลิปวิดีโอสั้น</div>
            </div>
            <div className="bg-navy-800/80 border border-navy-700 rounded-2xl p-4 text-center">
              <div className="text-2xl font-extrabold text-white">
                {imageCount}
              </div>
              <div className="text-[11px] text-blue-300 mt-0.5">ภาพผลงาน</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Section 1: Weekly Newsletters */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-navy-950 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-600" />
                <span>วารสารข่าวการศึกษาพิเศษประจำสัปดาห์</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                คลิก &quot;เปิดอ่าน PDF ออนไลน์&quot; เพื่ออ่านวารสาร A4 ฉบับเต็มบนหน้าเว็บได้ทันที
              </p>
            </div>
            {isAdmin && (
              <Link
                href="/admin/generator"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold border border-blue-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>สร้างวารสารฉบับใหม่</span>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl bg-white border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : newsletters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              ยังไม่มีวารสารประจำสัปดาห์ที่เปิดเผยแพร่สาธารณะ
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {newsletters.map((item, idx) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                    idx === 0
                      ? "bg-gradient-to-br from-blue-50 via-white to-sky-50 border-blue-200"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-navy-900 text-white text-[11px] font-semibold">
                        <BookOpen className="w-3 h-3 text-blue-300" />
                        <span>
                          {item.week_number
                            ? `ฉบับสัปดาห์ที่ ${item.week_number}`
                            : "วารสารข่าว"}
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateThai(item.created_at)}
                      </span>
                    </div>
                    <h3 className="font-bold text-navy-950 text-base leading-snug">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePdfAsset(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>เปิดอ่าน PDF ออนไลน์</span>
                    </button>

                    <a
                      href={resolvePdfPreviewSrc(item).replace("#toolbar=1", "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600"
                    >
                      <span>เปิดแท็บใหม่</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Public Gallery with Grade & Skill Filters */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-navy-950 flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-600" />
                <span>แกลเลอรีคลิปวิดีโอสั้นและผลงานนักเรียน</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                คัดสรรเฉพาะผลงานที่ผู้ดูแลเปิดสวิตช์เผยแพร่สาธารณะ (<code>is_public: true</code>)
              </p>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อสื่อหรือกิจกรรม..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทุกระดับชั้น (อ.1 - ป.6)</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    ระดับชั้น {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทุกประเภททักษะ</option>
                {SKILL_CATEGORIES.map((skill) => (
                  <option key={skill} value={skill}>
                    {skill}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { id: "all", label: "ทั้งหมด" },
                  { id: "video", label: "วิดีโอ" },
                  { id: "image", label: "ภาพผลงาน" },
                  { id: "pdf", label: "PDF" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedType === tab.id
                      ? "bg-white text-navy-900 shadow-sm"
                      : "text-slate-600 hover:text-navy-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          ) : galleryAssets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <p className="font-semibold text-navy-900 text-sm">
                ไม่พบผลงานที่ตรงกับตัวกรองที่เลือก
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGrade("all");
                  setSelectedSkill("all");
                  setSelectedType("all");
                }}
                className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {galleryAssets.map((asset) => {
                const isVideo = asset.media_type === "video";
                const isPdf =
                  asset.media_type === "pdf" ||
                  asset.media_type === "portfolio" ||
                  asset.media_type === "newsletter" ||
                  asset.media_type === "report";

                return (
                  <div
                    key={asset.id}
                    className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg overflow-hidden flex flex-col transition-all"
                  >
                    {/* Preview Box */}
                    <button
                      type="button"
                      onClick={() =>
                        isPdf
                          ? setActivePdfAsset(asset)
                          : setActiveMediaAsset(asset)
                      }
                      className="relative h-48 w-full bg-navy-950 overflow-hidden text-left cursor-pointer"
                    >
                      {isVideo ? (
                        <div className="w-full h-full bg-gradient-to-br from-navy-900 via-blue-900 to-sky-800 flex flex-col items-center justify-center text-white p-4">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                          </div>
                          <span className="mt-2.5 text-xs font-semibold text-blue-100">
                            คลิกเพื่อเล่นคลิปวิดีโอสั้น 720p
                          </span>
                        </div>
                      ) : isPdf ? (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-navy-900 flex flex-col items-center justify-center text-white p-4">
                          <FileText className="w-12 h-12 text-blue-300 mb-2" />
                          <span className="text-xs font-semibold text-blue-100">
                            เอกสาร PDF ออนไลน์
                          </span>
                        </div>
                      ) : (
                        <img
                          src={getMediaStreamUrl(asset.drive_file_id)}
                          alt={asset.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-navy-950/80 backdrop-blur-sm text-white text-[11px] font-semibold">
                          {isVideo ? (
                            <Film className="w-3 h-3 text-sky-300" />
                          ) : isPdf ? (
                            <FileText className="w-3 h-3 text-amber-300" />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-emerald-300" />
                          )}
                          <span>
                            {isVideo
                              ? "วิดีโอสั้น"
                              : isPdf
                              ? "เอกสาร PDF"
                              : "ภาพผลงาน"}
                          </span>
                        </span>
                      </div>

                      {asset.grade_level && (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/90 text-navy-900 text-[11px] font-bold shadow-sm">
                          {asset.grade_level}
                        </span>
                      )}
                    </button>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5">
                        <div className="inline-flex px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold">
                          {asset.skill_category}
                        </div>
                        <h3 className="font-bold text-navy-950 text-sm sm:text-base line-clamp-2">
                          {asset.title}
                        </h3>
                        {asset.description && (
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {asset.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{formatDateThai(asset.created_at)}</span>
                        <button
                          type="button"
                          onClick={() =>
                            isPdf
                              ? setActivePdfAsset(asset)
                              : setActiveMediaAsset(asset)
                          }
                          className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          {isVideo ? "รับชมคลิป →" : "เปิดดูรายละเอียด →"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Admin Callout */}
        <div className="rounded-2xl bg-navy-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">
                สำหรับครูผู้สอนและผู้ดูแลระบบการศึกษาพิเศษ (2 ท่าน)
              </div>
              <div className="text-xs text-navy-300">
                เข้าสู่ระบบเพื่อจัดการทะเบียนนักเรียน บันทึก Case Timeline สร้างเอกสาร A4 และตัดต่อคลิปขึ้น Google Drive
              </div>
            </div>
          </div>
          <Link
            href={isAdmin ? "/admin" : "/login"}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition-colors"
          >
            {isAdmin ? "เข้าสู่แดชบอร์ดหลังบ้าน" : "เข้าสู่ระบบผู้ดูแล"}
          </Link>
        </div>
      </div>

      {/* Inline PDF Reader Modal */}
      {activePdfAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-navy-900 text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {activePdfAsset.title}
                </h3>
                <p className="text-[11px] text-blue-200 truncate">
                  {activePdfAsset.skill_category} • {formatDateThai(activePdfAsset.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={resolvePdfPreviewSrc(activePdfAsset).replace("#toolbar=1", "")}
                  download
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ดาวน์โหลด PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActivePdfAsset(null)}
                  className="p-1.5 rounded-lg hover:bg-navy-800 cursor-pointer"
                  aria-label="ปิดหน้าต่าง PDF"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={resolvePdfPreviewSrc(activePdfAsset)}
                title={activePdfAsset.title}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Video / Image Modal */}
      {activeMediaAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-5 py-3.5 bg-navy-900 text-white flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {activeMediaAsset.title}
                </h3>
                <p className="text-[11px] text-blue-200">
                  {activeMediaAsset.skill_category} • {activeMediaAsset.grade_level || "ทุกระดับชั้น"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaAsset(null)}
                className="p-1.5 rounded-lg hover:bg-navy-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black flex items-center justify-center max-h-[65vh]">
              {activeMediaAsset.media_type === "video" ? (
                isDemoDriveId(activeMediaAsset.drive_file_id) ? (
                  <div className="p-10 text-center text-white space-y-3 bg-gradient-to-br from-navy-900 to-blue-900 w-full">
                    <Film className="w-12 h-12 mx-auto text-sky-300" />
                    <div className="font-bold text-base">
                      ตัวอย่างคลิปวิดีโอ 720p (Demo Mode)
                    </div>
                    <p className="text-xs text-blue-100 max-w-md mx-auto">
                      เมื่อเชื่อมต่อ Google Service Account และอัปโหลดหรือตัดต่อคลิปในหน้า /admin/studio วิดีโอ MP4 720p จะสตรีมผ่าน Google Drive API มาเล่นในเครื่องเล่นนี้โดยตรง
                    </p>
                  </div>
                ) : (
                  <video
                    controls
                    autoPlay
                    playsInline
                    className="w-full max-h-[65vh]"
                    src={getMediaStreamUrl(activeMediaAsset.drive_file_id)}
                  />
                )
              ) : (
                <img
                  src={getMediaStreamUrl(activeMediaAsset.drive_file_id)}
                  alt={activeMediaAsset.title}
                  className="max-h-[65vh] w-auto object-contain"
                />
              )}
            </div>

            <div className="p-5 space-y-2">
              {activeMediaAsset.description && (
                <p className="text-sm text-slate-700">
                  {activeMediaAsset.description}
                </p>
              )}
              <div className="text-xs text-slate-500">
                เผยแพร่เมื่อ {formatDateThai(activeMediaAsset.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
