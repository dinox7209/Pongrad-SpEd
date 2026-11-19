"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoLogs,
  getDemoMedia,
  getDemoStudents,
  getDemoTasks,
} from "@/lib/demo-store";
import { formatDateThai } from "@/lib/utils";
import {
  MediaAsset,
  SCHOOL_INFO,
  Student,
  STUDENT_STATUS_META,
  StudentLog,
  WeeklyTask,
} from "@/types/database";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FileText,
  Film,
  FolderOpen,
  Globe,
  HeartPulse,
  PlusCircle,
  School,
  Sparkles,
  Users,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { isConfigured, profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<StudentLog[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        if (isConfigured) {
          const [stRes, logRes, mediaRes, taskRes] = await Promise.all([
            supabase.from("students").select("*").order("created_at", { ascending: false }),
            supabase
              .from("student_logs")
              .select("*, student:students(id, nickname, full_name, grade_level, student_code)")
              .order("logged_date", { ascending: false })
              .limit(6),
            supabase.from("media_assets").select("*").order("created_at", { ascending: false }),
            supabase.from("weekly_tasks").select("*").order("week_number", { ascending: true }),
          ]);

          setStudents((stRes.data as Student[]) || []);
          setLogs((logRes.data as StudentLog[]) || []);
          setMedia((mediaRes.data as MediaAsset[]) || []);
          setTasks((taskRes.data as WeeklyTask[]) || []);
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
        }
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [isConfigured]);

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

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-blue-900 text-white p-6 sm:p-8 shadow-xl border border-navy-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <School className="w-3.5 h-3.5" />
              <span>ศูนย์การศึกษาพิเศษ • สวัสดี {profile?.display_name || "ผู้ดูแลระบบ"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              แดชบอร์ดจัดการสื่อและติดตามนักเรียนพิเศษ
            </h1>
            <p className="text-navy-200 text-sm max-w-2xl">
              {SCHOOL_INFO.name} • บริหารรายชื่อนักเรียนรายกรณี เอกสาร A4 อัตโนมัติ คลังสื่อ Google Drive และปฏิทิน 20 สัปดาห์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/showcase"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-blue-200 text-xs sm:text-sm font-semibold border border-navy-700 transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>เปิดดูหน้าสาธารณะ</span>
            </Link>
            <Link
              href="/admin/studio"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>อัปโหลดสื่อ / ตัดต่อคลิป</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">นักเรียนทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
              {loading ? "-" : stats.totalStudents}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              สถานะปกติ {stats.activeCount} คน
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold">เฝ้าระวัง (At-Risk)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {loading ? "-" : stats.atRiskStudents.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ต้องติดตามดูแลใกล้ชิด
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-700 mb-2">
            <span className="text-xs font-semibold">รักษาตัว (Medical)</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-sky-700">
              {loading ? "-" : stats.medicalStudents.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ติดตามนัดหมายแพทย์
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">สื่อใน Google Drive</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
              {loading ? "-" : stats.totalMedia}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              เผยแพร่สาธารณะ {stats.publicMediaCount} ชิ้น
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-semibold">งานรายสัปดาห์</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
              {loading ? "-" : `${stats.completedWeeks}/${stats.totalWeeks}`}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              สำเร็จ {stats.weekProgress}% (เตือนทุกวันศุกร์)
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Modules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/students"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">ทะเบียนนักเรียน & Case Timeline</h2>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกข้อมูล ปรับสถานะ 5 ระดับ และบันทึกแนวทางช่วยเหลือรายบุคคล
          </p>
        </Link>

        <Link
          href="/admin/generator"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">สร้างเอกสาร A4 1-Click PDF</h2>
          <p className="text-xs text-slate-500 mt-1">
            หน้าปก สรุปพัฒนาการ Portfolio และวารสารประจำสัปดาห์ บันทึกลง Drive
          </p>
        </Link>

        <Link
          href="/admin/studio"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Film className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">คลังสื่อ & ตัดต่อคลิป 720p</h2>
          <p className="text-xs text-slate-500 mt-1">
            ตัดหัว-ท้าย ใส่ข้อความภาษาไทย ปรับขนาด 720p และสตรีมตรงขึ้น Drive
          </p>
        </Link>

        <Link
          href="/admin/tracker"
          className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
          </div>
          <h2 className="font-bold text-navy-950 text-sm">ติดตามงาน 20 สัปดาห์ & LINE</h2>
          <p className="text-xs text-slate-500 mt-1">
            สลับสถานะ Pending/Completed และแจ้งเตือนสรุปงานทุกวันศุกร์
          </p>
        </Link>
      </div>

      {/* Main Two-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Priority Students & 20-week mini matrix */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy-950 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>นักเรียนที่ต้องติดตามเป็นพิเศษ (At-Risk / Medical)</span>
              </h2>
              <Link
                href="/admin/students"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                ดูทั้งหมด →
              </Link>
            </div>

            {priorityStudents.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
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
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-sm text-navy-950 truncate">
                          {student.full_name} ({student.nickname})
                        </div>
                        <div className="text-xs text-slate-500 truncate">
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

          {/* 20-Week Overview Pills */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>ภาพรวมปฏิทินงาน 20 สัปดาห์</span>
              </h2>
              <Link
                href="/admin/tracker"
                className="text-xs font-semibold text-blue-600 hover:underline"
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
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs font-bold transition-transform hover:scale-105 ${
                      done
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <span>W{task.week_number}</span>
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mt-1 text-emerald-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 mt-1 text-slate-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Recent Case Timeline Logs */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy-950">ความเคลื่อนไหว Case Timeline ล่าสุด</h2>
            <Link
              href="/admin/students"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              บันทึกเคสใหม่ →
            </Link>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
              ยังไม่มีบันทึก Case Timeline
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="relative pl-4 border-l-2 border-blue-200 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                      {log.log_type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateThai(log.logged_date)}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-navy-900">
                    {log.student
                      ? `${log.student.full_name} (${log.student.nickname}) • ${log.student.grade_level}`
                      : "นักเรียนในระบบ"}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {log.description}
                  </p>
                  {log.action_taken && (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50/70 rounded-lg px-2.5 py-1.5">
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
