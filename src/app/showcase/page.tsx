"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useBrandAssets } from "@/context/brand-context";
import { supabase } from "@/lib/supabase/client";
import { getDemoMedia, getDemoProfiles } from "@/lib/demo-store";
import {
  formatDateThai,
  getMediaStreamUrl,
  isDemoDriveId,
} from "@/lib/utils";
import {
  GRADE_LEVELS,
  MediaAsset,
  PublicTeamMember,
  SCHOOL_INFO,
  SKILL_CATEGORIES,
} from "@/types/database";
import {
  ArrowUpRight,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Film,
  GraduationCap,
  Handshake,
  Image as ImageIcon,
  MapPin,
  Newspaper,
  Phone,
  Play,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
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
  const {
    schoolLogoUrl,
    partnerLogoUrl,
    showcaseBadgeUrl,
    getExtraAssets,
  } = useBrandAssets();
  const extraShowcaseAssets = getExtraAssets("showcase");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [publicTeam, setPublicTeam] = useState<PublicTeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [selectedType, setSelectedType] = useState<
    "all" | "video" | "image" | "pdf"
  >("all");

  const [activePdfAsset, setActivePdfAsset] = useState<MediaAsset | null>(null);
  const [activeMediaAsset, setActiveMediaAsset] = useState<MediaAsset | null>(
    null
  );

  useEffect(() => {
    async function loadPublicShowcase() {
      setLoading(true);
      try {
        if (isConfigured) {
          // ดึงเฉพาะสื่อที่เปิดเผยแพร่สาธารณะ (is_public = true) และไม่ดึงข้อมูลนักเรียน/ครูส่วนตัว
          const [mediaRes, teamRes] = await Promise.all([
            supabase
              .from("media_assets")
              .select(
                "id, title, description, media_type, drive_file_id, drive_view_url, is_public, skill_category, grade_level, week_number, mime_type, created_at"
              )
              .eq("is_public", true)
              .order("created_at", { ascending: false }),
            supabase
              .from("public_team_profiles")
              .select("id, display_name, position, affiliation"),
          ]);

          if (!mediaRes.error && mediaRes.data) {
            setAssets(mediaRes.data as MediaAsset[]);
          } else {
            setAssets(getDemoMedia().filter((m) => m.is_public));
          }

          if (!teamRes.error && teamRes.data) {
            setPublicTeam(teamRes.data as PublicTeamMember[]);
          } else {
            setPublicTeam([]);
          }
        } else {
          setAssets(getDemoMedia().filter((m) => m.is_public));
          // ในโหมดทดลอง: แสดงบุคลากรเฉพาะเมื่อผู้ดูแลเปิด is_public = true เท่านั้น (ค่าเริ่มต้นเป็น false)
          setPublicTeam(
            getDemoProfiles()
              .filter((p) => Boolean(p.is_public))
              .map((p) => ({
                id: p.id,
                display_name: p.display_name,
                position: p.position,
                affiliation: p.affiliation,
              }))
          );
        }
      } catch (err) {
        console.error("Failed to load showcase media:", err);
        setAssets(getDemoMedia().filter((m) => m.is_public));
        setPublicTeam([]);
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
  const hasPublicAssets = assets.length > 0;

  return (
    <div className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-9">
      {/* iOS 2026 Liquid Glass Hero Banner */}
      <section className="liquid-glass-hero running-line-bottom rounded-[2rem] text-white p-6 sm:p-9 relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-pink-100 text-xs font-semibold border border-white/25">
              {showcaseBadgeUrl ? (
                <img
                  src={showcaseBadgeUrl}
                  alt="ตราโครงการ"
                  className="w-4 h-4 rounded object-contain bg-white/90 p-0.5 shrink-0"
                />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-pink-200 shrink-0" />
              )}
              <span className="truncate">
                ความร่วมมือ {SCHOOL_INFO.name} × {SCHOOL_INFO.partnerName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-extrabold tracking-tight leading-snug drop-shadow-sm">
              ห้องเรียนเสริมวิชาการสู่การเรียนรวม{" "}
              <span className="inline-block text-pink-200 font-bold">
                (Resource Room)
              </span>
            </h1>
            <p className="text-purple-100/95 text-sm sm:text-base leading-relaxed max-w-3xl">
              {SCHOOL_INFO.cooperationDescription}
            </p>
          </div>

          {hasPublicAssets ? (
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3.5 text-center shadow-inner min-w-[88px]">
                <div className="text-2xl font-extrabold text-white">
                  {newsletters.length}
                </div>
                <div className="text-[11px] text-pink-100 mt-0.5">วารสาร PDF</div>
              </div>
              <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3.5 text-center shadow-inner min-w-[88px]">
                <div className="text-2xl font-extrabold text-white">
                  {videoCount}
                </div>
                <div className="text-[11px] text-pink-100 mt-0.5">คลิปวิดีโอ</div>
              </div>
              <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3.5 text-center shadow-inner min-w-[88px]">
                <div className="text-2xl font-extrabold text-white">
                  {imageCount}
                </div>
                <div className="text-[11px] text-pink-100 mt-0.5">สื่อกิจกรรม</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
              <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                <Handshake className="w-4 h-4 text-pink-200 shrink-0" />
                <span>ความร่วมมือ 2 หน่วยงานจังหวัดจันทบุรี</span>
              </div>
              <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-pink-100 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-pink-200 shrink-0" />
                <span>ส่งเสริมผู้เรียนเรียนรวม อ.1 – ป.6</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section: Cooperation & Partner Agencies Contact */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-navy-950 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
                <Handshake className="w-4 h-4" />
              </span>
              <span>ความร่วมมือระหว่างสองหน่วยงานและข้อมูลติดต่อ</span>
            </h2>
            <div className="heading-beam-track" />
          </div>

          <Link
            href="/mou"
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full liquid-btn-primary text-white text-xs sm:text-sm font-bold whitespace-nowrap"
          >
            <ScrollText className="w-4 h-4 shrink-0" />
            <span>อ่านบันทึกข้อตกลงความร่วมมือ (MOU)</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="liquid-glass running-line-bottom rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-start gap-3.5">
              {schoolLogoUrl && (
                <div className="w-12 h-14 rounded-2xl bg-white border border-purple-100 p-1.5 flex items-center justify-center shadow-glass-pink shrink-0">
                  <img
                    src={schoolLogoUrl}
                    alt={SCHOOL_INFO.name}
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              )}
              <div>
                <span className="inline-flex px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-bold mb-1">
                  สถานศึกษาแกนนำเรียนรวม
                </span>
                <h3 className="font-bold text-navy-950 text-base">
                  {SCHOOL_INFO.name}
                </h3>
                <p className="text-xs text-purple-800/80">
                  สังกัด {SCHOOL_INFO.fullArea}
                </p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-purple-950/80 pt-2 border-t border-purple-200/50">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                <span>ตั้งอยู่ที่ {SCHOOL_INFO.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-600 shrink-0" />
                <a
                  href={`tel:${SCHOOL_INFO.phone.replace(/-/g, "")}`}
                  className="font-semibold text-pink-700 hover:underline"
                >
                  โทรศัพท์ {SCHOOL_INFO.phone}
                </a>
              </div>
            </div>
          </div>

          <div className="liquid-glass running-line-bottom rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-start gap-3.5">
              {partnerLogoUrl && (
                <div className="w-12 h-14 rounded-2xl bg-white border border-pink-100 p-1.5 flex items-center justify-center shadow-glass-pink shrink-0">
                  <img
                    src={partnerLogoUrl}
                    alt={SCHOOL_INFO.partnerName}
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              )}
              <div>
                <span className="inline-flex px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 text-[11px] font-bold mb-1">
                  หน่วยงานความร่วมมือด้านการศึกษาพิเศษ
                </span>
                <h3 className="font-bold text-navy-950 text-base">
                  {SCHOOL_INFO.partnerName}
                </h3>
                <p className="text-xs text-purple-800/80">
                  สนับสนุนวิชาการและส่งเสริมศักยภาพผู้เรียนเรียนรวม
                </p>
              </div>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-purple-950/80 pt-2 border-t border-purple-200/50">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                <span>ตั้งอยู่ที่ {SCHOOL_INFO.partnerAddress}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-600 shrink-0" />
                <a
                  href={`tel:${SCHOOL_INFO.partnerPhone.replace(/-/g, "")}`}
                  className="font-semibold text-pink-700 hover:underline"
                >
                  โทรศัพท์ {SCHOOL_INFO.partnerPhone}
                </a>
              </div>
            </div>
          </div>
        </div>

        {extraShowcaseAssets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {extraShowcaseAssets.map((item) => (
              <div
                key={item.id}
                className="liquid-glass rounded-3xl p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-purple-100 p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-navy-950 text-xs sm:text-sm truncate">
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-[11px] text-purple-900/70 line-clamp-2 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* แสดงรายชื่อบุคลากรเฉพาะเมื่อผู้ดูแลตั้งค่าเปิดเผยแพร่สาธารณะ (is_public = true) เท่านั้น */}
      {publicTeam.length > 0 && (
        <section className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-navy-950 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
                <UserCheck className="w-4 h-4" />
              </span>
              <span>บุคลากรผู้รับผิดชอบ (ที่เปิดเผยแพร่สาธารณะ)</span>
            </h2>
            <div className="heading-beam-track" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicTeam.map((member) => (
              <div
                key={member.id}
                className="liquid-glass rounded-3xl p-5 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-navy-950 text-base">
                    {member.display_name}
                  </div>
                  {member.position && (
                    <div className="text-xs font-semibold text-pink-700">
                      {member.position}
                    </div>
                  )}
                  {member.affiliation && (
                    <div className="text-xs text-purple-900/75 mt-0.5">
                      สังกัด {member.affiliation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 1: Weekly Newsletters */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-navy-950 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
                <Newspaper className="w-4 h-4" />
              </span>
              <span>วารสารข่าวห้องเรียนเสริมวิชาการประจำสัปดาห์</span>
            </h2>
            <div className="heading-beam-track" />
            <p className="text-xs sm:text-sm text-purple-900/70 pt-0.5">
              คลิก &quot;เปิดอ่าน PDF ออนไลน์&quot; เพื่ออ่านวารสาร A4 ฉบับเต็มบนหน้าเว็บได้ทันที
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin/generator"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-glass text-purple-800 hover:text-pink-700 text-xs font-semibold transition-all"
            >
              <FileText className="w-4 h-4 text-pink-600" />
              <span>สร้างวารสารฉบับใหม่</span>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-40 rounded-3xl liquid-glass animate-pulse"
              />
            ))}
          </div>
        ) : newsletters.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-navy-950">
                  กำลังเตรียมจัดทำวารสารประชาสัมพันธ์ฉบับใหม่
                </div>
                <p className="text-xs text-purple-900/65">
                  วารสารข่าวและสรุปกิจกรรมประจำสัปดาห์ที่เปิดเผยแพร่สาธารณะจะแสดงในส่วนนี้
                </p>
              </div>
            </div>
            {isAdmin && (
              <Link
                href="/admin/generator"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs font-semibold shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>สร้างวารสาร A4</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {newsletters.map((item, idx) => (
              <div
                key={item.id}
                className={`liquid-glass rounded-3xl p-5 flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-glass-lg ${
                  idx === 0 ? "running-line-bottom ring-1 ring-pink-300/60" : ""
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-purple-700 to-pink-600 text-white text-[11px] font-semibold shadow-sm">
                      <BookOpen className="w-3 h-3 text-pink-100" />
                      <span>
                        {item.week_number
                          ? `ฉบับสัปดาห์ที่ ${item.week_number}`
                          : "วารสารข่าว"}
                      </span>
                    </span>
                    <span className="text-[11px] text-purple-900/60 font-medium">
                      {formatDateThai(item.created_at)}
                    </span>
                  </div>
                  <h3 className="font-bold text-navy-950 text-base leading-snug">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-purple-950/70 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-purple-200/50 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePdfAsset(item)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs font-semibold cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>เปิดอ่าน PDF ออนไลน์</span>
                  </button>

                  <a
                    href={resolvePdfPreviewSrc(item).replace("#toolbar=1", "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-pink-600"
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
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-navy-950 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white flex items-center justify-center shadow-glass-pink">
              <Film className="w-4 h-4" />
            </span>
            <span>แกลเลอรีคลิปวิดีโอสั้นและสื่อกิจกรรม</span>
          </h2>
          <div className="heading-beam-track" />
          <p className="text-xs sm:text-sm text-purple-900/70 pt-0.5">
            รวมคลิปวิดีโอกิจกรรม สื่อการเรียนรู้ และผลงานเด่นที่ได้รับอนุญาตให้เผยแพร่สำหรับผู้ปกครองและผู้สนใจ
          </p>
        </div>

        {/* Liquid Glass Filter Bar */}
        <div className="liquid-glass rounded-3xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสื่อหรือกิจกรรม..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/75 border border-purple-200/80 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div className="relative">
            <GraduationCap className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/75 border border-purple-200/80 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
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
            <Filter className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white/75 border border-purple-200/80 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            >
              <option value="all">ทุกประเภททักษะ</option>
              {SKILL_CATEGORIES.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-purple-100/70 p-1 rounded-2xl border border-purple-200/60">
            {(
              [
                { id: "all", label: "ทั้งหมด" },
                { id: "video", label: "วิดีโอ" },
                { id: "image", label: "ภาพสื่อ" },
                { id: "pdf", label: "PDF" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedType === tab.id
                    ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-sm"
                    : "text-purple-800 hover:text-pink-700"
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
                className="h-72 rounded-3xl liquid-glass animate-pulse"
              />
            ))}
          </div>
        ) : galleryAssets.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-9 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 text-pink-600 flex items-center justify-center">
              <Film className="w-6 h-6" />
            </div>
            <p className="font-bold text-navy-950 text-sm">
              {assets.length === 0
                ? "ยังไม่มีสื่อกิจกรรมที่เปิดเผยแพร่สาธารณะในขณะนี้"
                : "ไม่พบสื่อหรือผลงานที่ตรงกับตัวกรองที่เลือก"}
            </p>
            <p className="text-xs text-purple-900/65 max-w-md mx-auto">
              {assets.length === 0
                ? "สื่อการสอน คลิปวิดีโอสั้น และเอกสารที่ได้รับอนุญาตให้เผยแพร่จะแสดงที่นี่เมื่อเจ้าหน้าที่อัปโหลดเข้าระบบ"
                : "ลองเปลี่ยนตัวกรองระดับชั้นหรือประเภททักษะด้านบน"}
            </p>
            {assets.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGrade("all");
                  setSelectedSkill("all");
                  setSelectedType("all");
                }}
                className="text-xs font-semibold text-pink-600 hover:underline cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            ) : isAdmin ? (
              <Link
                href="/admin/studio"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs font-semibold"
              >
                <Film className="w-3.5 h-3.5" />
                <span>ไปอัปโหลดสื่อ / ตัดต่อคลิป</span>
              </Link>
            ) : null}
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
                  className="group liquid-glass running-line-bottom rounded-3xl overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-glass-lg"
                >
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
                      <div className="w-full h-full bg-gradient-to-br from-purple-900 via-fuchsia-800 to-pink-700 flex flex-col items-center justify-center text-white p-4">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center group-hover:scale-110 transition-transform shadow-glass-pink">
                          <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                        </div>
                        <span className="mt-2.5 text-xs font-semibold text-pink-100">
                          คลิกเพื่อเล่นคลิปวิดีโอสั้น 720p
                        </span>
                      </div>
                    ) : isPdf ? (
                      <div className="w-full h-full bg-gradient-to-br from-purple-800 to-pink-800 flex flex-col items-center justify-center text-white p-4">
                        <FileText className="w-12 h-12 text-pink-200 mb-2" />
                        <span className="text-xs font-semibold text-pink-100">
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-navy-950/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold">
                        {isVideo ? (
                          <Film className="w-3 h-3 text-pink-300" />
                        ) : isPdf ? (
                          <FileText className="w-3 h-3 text-fuchsia-300" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-pink-300" />
                        )}
                        <span>
                          {isVideo
                            ? "วิดีโอสั้น"
                            : isPdf
                            ? "เอกสาร PDF"
                            : "ภาพสื่อ/กิจกรรม"}
                        </span>
                      </span>
                    </div>

                    {asset.grade_level && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-md text-purple-900 text-[11px] font-bold shadow-sm">
                        {asset.grade_level}
                      </span>
                    )}
                  </button>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-pink-200/70 text-[11px] font-semibold">
                        {asset.skill_category}
                      </div>
                      <h3 className="font-bold text-navy-950 text-sm sm:text-base line-clamp-2">
                        {asset.title}
                      </h3>
                      {asset.description && (
                        <p className="text-xs text-purple-950/70 line-clamp-2">
                          {asset.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-purple-200/50 flex items-center justify-between text-[11px] text-purple-900/60">
                      <span>{formatDateThai(asset.created_at)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          isPdf
                            ? setActivePdfAsset(asset)
                            : setActiveMediaAsset(asset)
                        }
                        className="font-semibold text-pink-600 hover:text-purple-700 cursor-pointer"
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

      {/* Bottom Admin Callout (ไม่เปิดเผยชื่อเจ้าหน้าที่บนหน้าสาธารณะ) */}
      <div className="liquid-glass-hero running-line-bottom rounded-3xl text-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-pink-200 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm">
              สำหรับเจ้าหน้าที่ผู้รับผิดชอบ ({SCHOOL_INFO.projectName})
            </div>
            <div className="text-xs text-purple-100/85">
              เข้าสู่ระบบหลังบ้านเพื่อจัดการทะเบียนนักเรียน บันทึก Case Timeline สร้างเอกสาร A4 และจัดการสื่อการสอน
            </div>
          </div>
        </div>
        <Link
          href={isAdmin ? "/admin" : "/login"}
          className="px-5 py-2.5 rounded-full bg-white text-purple-900 hover:bg-pink-50 text-xs font-bold shrink-0 shadow-glass-pink transition-colors"
        >
          {isAdmin ? "เข้าสู่แดชบอร์ดหลังบ้าน" : "เข้าสู่ระบบเจ้าหน้าที่"}
        </Link>
      </div>

      {/* Inline PDF Reader Modal */}
      {activePdfAsset && (
        <div className="fixed inset-0 z-50 bg-purple-950/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="liquid-glass rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 liquid-glass-nav text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {activePdfAsset.title}
                </h3>
                <p className="text-[11px] text-pink-200 truncate">
                  {activePdfAsset.skill_category} • {formatDateThai(activePdfAsset.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={resolvePdfPreviewSrc(activePdfAsset).replace("#toolbar=1", "")}
                  download
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full liquid-btn-primary text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ดาวน์โหลด PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActivePdfAsset(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
                  aria-label="ปิดหน้าต่าง PDF"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white/75">
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
        <div className="fixed inset-0 z-50 bg-purple-950/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-5 py-3.5 liquid-glass-nav text-white flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <h3 className="font-bold text-sm sm:text-base truncate">
                  {activeMediaAsset.title}
                </h3>
                <p className="text-[11px] text-pink-200">
                  {activeMediaAsset.skill_category} • {activeMediaAsset.grade_level || "ทุกระดับชั้น"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaAsset(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-black flex items-center justify-center max-h-[65vh]">
              {activeMediaAsset.media_type === "video" ? (
                isDemoDriveId(activeMediaAsset.drive_file_id) ? (
                  <div className="p-10 text-center text-white space-y-3 bg-gradient-to-br from-purple-900 via-fuchsia-900 to-pink-800 w-full">
                    <Film className="w-12 h-12 mx-auto text-pink-200" />
                    <div className="font-bold text-base">
                      ตัวอย่างคลิปวิดีโอ 720p (Demo Mode)
                    </div>
                    <p className="text-xs text-pink-100 max-w-md mx-auto">
                      เมื่อเชื่อมต่อ Google Service Account และอัปโหลดหรือตัดต่อคลิปในระบบหลังบ้าน วิดีโอ MP4 720p จะสตรีมผ่าน Google Drive API มาเล่นในเครื่องเล่นนี้โดยตรง
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
                <p className="text-sm text-navy-950">
                  {activeMediaAsset.description}
                </p>
              )}
              <div className="text-xs text-purple-900/60">
                เผยแพร่เมื่อ {formatDateThai(activeMediaAsset.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
