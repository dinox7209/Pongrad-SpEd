"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoLogs,
  getDemoMedia,
  getDemoProfiles,
  getDemoResourceRecords,
  getDemoStudents,
  getDemoTasks,
  saveDemoProfiles,
} from "@/lib/demo-store";
import { formatDateThai } from "@/lib/utils";
import {
  MediaAsset,
  Profile,
  ResourceRoomRecord,
  SCHOOL_INFO,
  Student,
  STUDENT_STATUS_META,
  StudentLog,
  WeeklyTask,
} from "@/types/database";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Film,
  FolderOpen,
  Globe,
  HeartPulse,
  Lock,
  PlusCircle,
  School,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { isConfigured, isPrimaryAdmin, profile, refreshProfile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<StudentLog[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<Profile[]>([]);
  const [records, setRecords] = useState<ResourceRoomRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        if (isConfigured) {
          const [stRes, logRes, mediaRes, taskRes, profRes, recRes] = await Promise.all([
            supabase.from("students").select("*").order("created_at", { ascending: false }),
            supabase
              .from("student_logs")
              .select("*, student:students(id, nickname, full_name, grade_level, student_code)")
              .order("logged_date", { ascending: false })
              .limit(6),
            supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
            supabase.from("weekly_tasks").select("*").order("week_number", { ascending: true }),
            supabase.from("profiles").select("*").order("role", { ascending: false }),
            supabase
              .from("resource_room_records")
              .select("*")
              .order("academic_year", { ascending: true })
              .order("row_order", { ascending: true }),
          ]);

          setStudents((stRes.data as Student[]) || []);
          setLogs((logRes.data as StudentLog[]) || []);
          setMedia((mediaRes.data as MediaAsset[]) || []);
          setTasks((taskRes.data as WeeklyTask[]) || []);
          setTeamProfiles((profRes.data as Profile[]) || []);
          setRecords(!recRes.error && recRes.data ? (recRes.data as ResourceRoomRecord[]) : []);
        } else {
          const demoStudents = getDemoStudents();
          const studentMap = new Map(demoStudents.map((s) => [s.id, s]));
          const demoLogs = getDemoLogs().map((l) => ({
            ...l,
            student: studentMap.get(l.student_id),
          }));
          setStudents(demoStudents);
          setLogs(demoLogs);
          setMedia(getDemoMedia());
          setTasks(getDemoTasks());
          setTeamProfiles(getDemoProfiles());
          setRecords(getDemoResourceRecords());
        }
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [isConfigured]);

  const handleToggleProfilePublic = async (targetProfile: Profile) => {
    if (!isPrimaryAdmin) return;
    const nextPublic = !Boolean(targetProfile.is_public);

    if (isConfigured) {
      const { error } = await supabase
        .from("profiles")
        .update({ is_public: nextPublic })
        .eq("id", targetProfile.id);

      if (error) {
        alert(`ปรับสิทธิ์การเผยแพร่ไม่สำเร็จ: ${error.message}`);
        return;
      }
      setTeamProfiles((prev) =>
        prev.map((p) =>
          p.id === targetProfile.id ? { ...p, is_public: nextPublic } : p
        )
      );
      await refreshProfile();
    } else {
      const nextList = teamProfiles.map((p) =>
        p.id === targetProfile.id ? { ...p, is_public: nextPublic } : p
      );
      setTeamProfiles(nextList);
      saveDemoProfiles(nextList);
    }
  };

  const stats = useMemo(() => {
    const activeCount = students.filter((s) => s.current_status === "Active").length;
    const atRiskStudents = students.filter((s) => s.current_status === "At-Risk");
    const medicalStudents = students.filter((s) => s.current_status === "Medical");
    const publicMediaCount = media.filter((m) => m.is_public).length;
    const completedWeeks = tasks.filter((t) => t.status === "Completed").length;
    const totalWeeks = tasks.length || 20;
    const weekProgress = Math.round((completedWeeks / totalWeeks) * 100);

    return {
      totalStudents: students.length,
      activeCount,
      atRiskStudents,
      medicalStudents,
      totalMedia: media.length,
      publicMediaCount,
      completedWeeks,
      totalWeeks,
      weekProgress,
    };
  }, [students, media, tasks]);

  const priorityStudents = useMemo(
    () =>
      students.filter(
        (s) => s.current_status === "At-Risk" || s.current_status === "Medical"
      ),
    [students]
  );

  const yearlyInfoSummary = useMemo(() => {
    const grouped = new Map<string, ResourceRoomRecord[]>();
    for (const rec of records) {
      const year = rec.academic_year || "ไม่ระบุปี";
      const list = grouped.get(year);
      if (list) {
        list.push(rec);
      } else {
        grouped.set(year, [rec]);
      }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b, "th"))
      .map(([year, rows]) => {
        const male = rows.filter((r) => r.gender === "ชาย").length;
        const female = rows.filter((r) => r.gender === "หญิง").length;

        const gradeCounts = new Map<string, number>();
        const disabilityCounts = new Map<string, number>();
        for (const row of rows) {
          const grade = row.grade_level || "ไม่ระบุชั้น";
          gradeCounts.set(grade, (gradeCounts.get(grade) || 0) + 1);
          const disability = row.disability_type || "ไม่ระบุประเภท";
          disabilityCounts.set(disability, (disabilityCounts.get(disability) || 0) + 1);
        }

        const qualityRows = rows.filter(
          (r): r is ResourceRoomRecord & { quality_score: number } =>
            typeof r.quality_score === "number" && Number.isFinite(r.quality_score)
        );
        const iepRows = rows.filter(
          (r): r is ResourceRoomRecord & { iep_pass_percent: number } =>
            typeof r.iep_pass_percent === "number" && Number.isFinite(r.iep_pass_percent)
        );

        const avgQuality =
          qualityRows.length > 0
            ? (
                qualityRows.reduce((acc, r) => acc + r.quality_score, 0) /
                qualityRows.length
              ).toFixed(2)
            : null;
        const avgIepPass =
          iepRows.length > 0
            ? Math.round(
                iepRows.reduce((acc, r) => acc + r.iep_pass_percent, 0) /
                  iepRows.length
              )
            : null;

        const homeroomTeacher =
          rows.find((r) => r.homeroom_teacher && r.homeroom_teacher.trim().length > 0)
            ?.homeroom_teacher || "นางสาวดวงพร หวังอ้อมกลาง";

        return {
          year,
          total: rows.length,
          male,
          female,
          gradeList: Array.from(gradeCounts.entries()),
          disabilityList: Array.from(disabilityCounts.entries()),
          avgQuality,
          avgIepPass,
          homeroomTeacher,
        };
      });
  }, [records]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Liquid Glass Header Banner */}
      <div className="liquid-glass-hero running-line-bottom rounded-[2rem] text-white p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-pink-100 text-xs font-semibold border border-white/25 backdrop-blur-md">
              <School className="w-3.5 h-3.5" />
              <span>
                {SCHOOL_INFO.projectName} • สวัสดี {profile?.display_name || "ผู้ดูแลระบบ"}
                {isPrimaryAdmin ? " (แอดมินหลัก)" : ""}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              แดชบอร์ดบริหารจัดการห้องเรียนเสริมวิชาการ (Resource Room)
            </h1>
            <p className="text-purple-100/90 text-sm max-w-3xl">
              {SCHOOL_INFO.cooperationDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/25 backdrop-blur-md transition-colors"
            >
              <Globe className="w-4 h-4 text-pink-200" />
              <span>เปิดดูหน้าสาธารณะ</span>
            </Link>
            <Link
              href="/admin/studio"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-purple-900 hover:bg-pink-50 text-xs sm:text-sm font-bold shadow-glass-pink transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4 text-pink-600" />
              <span>อัปโหลดสื่อ / ตัดต่อคลิป</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="liquid-glass running-line-bottom p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-800 mb-2">
            <span className="text-xs font-semibold">นักเรียนทั้งหมด</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
              {loading ? "-" : stats.totalStudents}
            </div>
            <div className="text-[11px] text-purple-900/65 mt-0.5">
              สถานะปกติ {stats.activeCount} คน
            </div>
          </div>
        </div>

        <div className="liquid-glass running-line-bottom p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold">เฝ้าระวัง (At-Risk)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100/80 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {loading ? "-" : stats.atRiskStudents.length}
            </div>
            <div className="text-[11px] text-purple-900/65 mt-0.5">
              ต้องติดตามดูแลใกล้ชิด
            </div>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-fuchsia-700 mb-2">
            <span className="text-xs font-semibold">รักษาตัว (Medical)</span>
            <div className="w-8 h-8 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-fuchsia-700">
              {loading ? "-" : stats.medicalStudents.length}
            </div>
            <div className="text-[11px] text-purple-900/65 mt-0.5">
              ติดตามนัดหมายแพทย์
            </div>
          </div>
        </div>

        <div className="liquid-glass p-5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-pink-700 mb-2">
            <span className="text-xs font-semibold">สื่อใน Google Drive</span>
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
              {loading ? "-" : stats.totalMedia}
            </div>
            <div className="text-[11px] text-purple-900/65 mt-0.5">
              เผยแพร่สาธารณะ {stats.publicMediaCount} ชิ้น
            </div>
          </div>
        </div>

        <div className="liquid-glass running-line-bottom p-5 rounded-3xl flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">งานรายสัปดาห์</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {loading ? "-" : `${stats.completedWeeks}/${stats.totalWeeks}`}
            </div>
            <div className="text-[11px] text-purple-900/65 mt-0.5">
              สำเร็จ {stats.weekProgress}% (เตือนทุกวันศุกร์)
            </div>
          </div>
        </div>
      </div>

      {/* Team & Privacy Control (เฉพาะหลังบ้านเท่านั้น) */}
      <div className="liquid-glass rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1.5">
            <h2 className="font-bold text-navy-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-pink-600" />
              <span>คณะทำงานความร่วมมือ &amp; ควบคุมความเป็นส่วนตัว (2 ท่าน)</span>
            </h2>
            <div className="heading-beam-track" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-semibold border border-purple-200">
            <Lock className="w-3.5 h-3.5 text-pink-600" />
            <span>ซ่อนรายชื่อครูและนักเรียนจากสาธารณะเป็นค่าเริ่มต้น</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamProfiles.map((member) => {
            const isPrimary = member.role === "super_admin";
            const isPublicShown = Boolean(member.is_public);
            return (
              <div
                key={member.id}
                className="bg-white/75 rounded-2xl border border-purple-200/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-navy-950 text-sm sm:text-base">
                      {member.display_name}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isPrimary
                          ? "bg-gradient-to-r from-purple-700 to-pink-600 text-white"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {isPrimary ? "แอดมินหลัก" : "ผู้ดูแลระบบ"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-pink-700">
                    ตำแหน่ง: {member.position || "-"}
                  </div>
                  <div className="text-xs text-purple-900/75 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>สังกัด {member.affiliation || "-"}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isPrimaryAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleToggleProfilePublic(member)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors ${
                        isPublicShown
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-white"
                      }`}
                    >
                      {isPublicShown ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPublicShown ? "แสดงบนหน้าสาธารณะ" : "ซ่อนจากหน้าสาธารณะ"}
                      </span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-xs font-semibold">
                      {isPublicShown ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPublicShown ? "แสดงบนหน้าสาธารณะ" : "ซ่อนจากหน้าสาธารณะ"}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* สารสนเทศห้องเรียนเสริมวิชาการรายปีการศึกษา */}
      <div className="liquid-glass rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <h2 className="font-bold text-navy-950 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-pink-600" />
              <span>สารสนเทศห้องเรียนเสริมวิชาการ (Resource Room) รายปีการศึกษา</span>
            </h2>
            <div className="heading-beam-track" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-semibold border border-purple-200">
              {yearlyInfoSummary.length} ปีการศึกษา • รวม {records.length} รายการ
            </span>
            <Link
              href="/admin/information"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-glass-pink hover:scale-[1.02] transition-transform"
            >
              <span>จัดการ / แก้ไขสารสนเทศ</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {yearlyInfoSummary.length === 0 ? (
          <div className="p-6 text-center bg-white/65 rounded-2xl border border-purple-200/70 space-y-2">
            <p className="text-sm font-semibold text-navy-950">
              ยังไม่มีข้อมูลสารสนเทศรายปีการศึกษาในฐานข้อมูล
            </p>
            <p className="text-xs text-purple-900/70">
              คุณครูสามารถกดปุ่ม “จัดการ / แก้ไขสารสนเทศ” เพื่อเพิ่มข้อมูล หรือรันไฟล์ SQL ตั้งต้นใน Supabase
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {yearlyInfoSummary.map((summary) => (
              <div
                key={summary.year}
                className="bg-white/75 rounded-2xl border border-purple-200/80 p-4 sm:p-5 flex flex-col justify-between gap-4 hover:border-pink-400 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-700 to-pink-600 text-white text-xs font-bold">
                      ปีการศึกษา {summary.year}
                    </span>
                    <span className="text-lg font-extrabold text-navy-950">
                      {summary.total} คน
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-purple-50/90 border border-purple-100 px-3 py-2">
                      <div className="text-purple-900/65 text-[11px]">เพศ (ชาย / หญิง)</div>
                      <div className="font-bold text-navy-950 mt-0.5">
                        ชาย {summary.male} • หญิง {summary.female}
                      </div>
                    </div>
                    <div className="rounded-xl bg-pink-50/90 border border-pink-100 px-3 py-2">
                      <div className="text-pink-900/65 text-[11px]">ผลสัมฤทธิ์เฉลี่ย</div>
                      <div className="font-bold text-navy-950 mt-0.5">
                        {summary.avgQuality !== null || summary.avgIepPass !== null
                          ? `${summary.avgQuality ?? "-"} • IEP ${summary.avgIepPass ?? "-"}%`
                          : "รอสรุปปลายปี"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-purple-900/70 font-semibold">ประเภทความพิการ:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.disabilityList.map(([type, count]) => (
                        <span
                          key={type}
                          className="px-2.5 py-0.5 rounded-full bg-white border border-purple-200 text-purple-950 font-medium text-[11px]"
                        >
                          {type} ({count})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="text-purple-900/70 font-semibold">ระดับชั้นที่รับบริการ:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.gradeList.map(([grade, count]) => (
                        <span
                          key={grade}
                          className="px-2.5 py-0.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-900 font-semibold text-[11px]"
                        >
                          {grade}: {count} คน
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-purple-100 flex items-center justify-between gap-2 text-xs">
                  <span className="text-purple-900/75 truncate">
                    ครูผู้รับผิดชอบ: {summary.homeroomTeacher}
                  </span>
                  <Link
                    href="/admin/information"
                    className="shrink-0 font-bold text-pink-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>แก้ไขข้อมูล</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link
          href="/admin/information"
          className="group liquid-glass p-5 rounded-3xl hover:-translate-y-1 hover:shadow-glass-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
              <ClipboardList className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:text-pink-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">สารสนเทศรายปีการศึกษา</h2>
          <p className="text-xs text-purple-900/65 mt-1">
            เพิ่ม/แก้ไขข้อมูลนักเรียน ผล IEP การส่งต่อ และส่งออก Excel / พิมพ์ตาราง
          </p>
        </Link>

        <Link
          href="/admin/students"
          className="group liquid-glass p-5 rounded-3xl hover:-translate-y-1 hover:shadow-glass-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:text-pink-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">ทะเบียนนักเรียน &amp; Case Timeline</h2>
          <p className="text-xs text-purple-900/65 mt-1">
            บันทึกข้อมูล ปรับสถานะ 5 ระดับ และบันทึกแนวทางช่วยเหลือรายบุคคล
          </p>
        </Link>

        <Link
          href="/admin/generator"
          className="group liquid-glass p-5 rounded-3xl hover:-translate-y-1 hover:shadow-glass-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:text-pink-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">สร้างเอกสาร A4 1-Click PDF</h2>
          <p className="text-xs text-purple-900/65 mt-1">
            หน้าปก สรุปพัฒนาการ Portfolio และวารสารประจำสัปดาห์ บันทึกลง Drive
          </p>
        </Link>

        <Link
          href="/admin/studio"
          className="group liquid-glass p-5 rounded-3xl hover:-translate-y-1 hover:shadow-glass-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 text-white flex items-center justify-center shadow-sm">
              <Film className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:text-pink-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">คลังสื่อ &amp; ตัดต่อคลิป 720p</h2>
          <p className="text-xs text-purple-900/65 mt-1">
            ตัดหัว-ท้าย ใส่ข้อความภาษาไทย ปรับขนาด 720p และสตรีมตรงขึ้น Drive
          </p>
        </Link>

        <Link
          href="/admin/tracker"
          className="group liquid-glass p-5 rounded-3xl hover:-translate-y-1 hover:shadow-glass-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-pink-500 text-white flex items-center justify-center shadow-sm">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-purple-400 group-hover:text-pink-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">ติดตามงาน 20 สัปดาห์ &amp; LINE</h2>
          <p className="text-xs text-purple-900/65 mt-1">
            สลับสถานะ Pending/Completed และแจ้งเตือนสรุปงานทุกวันศุกร์
          </p>
        </Link>
      </div>

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <div className="liquid-glass rounded-3xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h2 className="font-bold text-navy-950 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>นักเรียนที่ต้องติดตามเป็นพิเศษ (At-Risk / Medical)</span>
                </h2>
                <div className="heading-beam-track" />
              </div>
              <Link
                href="/admin/students"
                className="text-xs font-semibold text-pink-600 hover:underline"
              >
                ดูทั้งหมด →
              </Link>
            </div>

            {priorityStudents.length === 0 ? (
              <div className="p-6 text-center bg-white/60 rounded-2xl text-xs text-purple-900/60">
                ไม่มีนักเรียนสถานะเฝ้าระวังหรือรักษาตัวในขณะนี้
              </div>
            ) : (
              <div className="space-y-3">
                {priorityStudents.map((student) => {
                  const statusMeta = STUDENT_STATUS_META[student.current_status];
                  return (
                    <Link
                      key={student.id}
                      href={`/admin/students/${student.id}`}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-white/70 border border-purple-200/70 hover:border-pink-400 hover:bg-white/95 transition-all"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-sm text-navy-950 truncate">
                          {student.full_name} ({student.nickname})
                        </div>
                        <div className="text-xs text-purple-900/65 truncate">
                          {student.grade_level} • {student.disability_type}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${statusMeta.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                        {statusMeta.thLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="liquid-glass running-line-bottom rounded-3xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h2 className="font-bold text-navy-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span>ภาพรวมปฏิทินงาน 20 สัปดาห์</span>
                </h2>
                <div className="heading-beam-track" />
              </div>
              <Link
                href="/admin/tracker"
                className="text-xs font-semibold text-pink-600 hover:underline"
              >
                จัดการปฏิทิน →
              </Link>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {tasks.map((task) => {
                const done = task.status === "Completed";
                return (
                  <Link
                    key={task.id}
                    href="/admin/tracker"
                    title={`${task.week_title} (${task.status})`}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border text-xs font-bold transition-transform hover:scale-105 ${
                      done
                        ? "bg-gradient-to-br from-purple-500/15 to-pink-500/20 border-pink-300 text-purple-900"
                        : "bg-white/60 border-purple-200/60 text-purple-900/60"
                    }`}
                  >
                    <span>W{task.week_number}</span>
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mt-1 text-pink-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 mt-1 text-purple-300" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 liquid-glass rounded-3xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <h2 className="font-bold text-navy-950">ความเคลื่อนไหว Case Timeline ล่าสุด</h2>
              <div className="heading-beam-track" />
            </div>
            <Link
              href="/admin/students"
              className="text-xs font-semibold text-pink-600 hover:underline"
            >
              บันทึกเคสใหม่ →
            </Link>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center bg-white/60 rounded-2xl text-xs text-purple-900/60">
              ยังไม่มีบันทึก Case Timeline
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="relative pl-4 border-l-2 border-pink-300 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-[11px] font-semibold">
                      {log.log_type}
                    </span>
                    <span className="text-[11px] text-purple-900/55">
                      {formatDateThai(log.logged_date)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-navy-950">
                    {log.student
                      ? `${log.student.full_name} (${log.student.nickname}) • ${log.student.grade_level}`
                      : "นักเรียนในระบบ"}
                  </div>
                  <p className="text-xs text-purple-950/75 line-clamp-2">
                    {log.description}
                  </p>
                  {log.action_taken && (
                    <p className="text-[11px] text-purple-900 bg-white/70 border border-purple-200/70 rounded-xl px-2.5 py-1.5">
                      แนวทางช่วยเหลือ: {log.action_taken}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
