"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoMedia,
  getDemoTasks,
  saveDemoTasks,
} from "@/lib/demo-store";
import { formatDateThai, getMediaStreamUrl, isDemoDriveId } from "@/lib/utils";
import { MediaAsset, TaskStatus, WeeklyTask } from "@/types/database";
import {
  BellRing,
  Calendar,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  FileText,
  Film,
  LayoutGrid,
  ListChecks,
  Loader2,
  Send,
} from "lucide-react";

export default function WeeklyTrackerPage() {
  const { isConfigured, user } = useAuth();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  const [testingLine, setTestingLine] = useState(false);
  const [linePreview, setLinePreview] = useState<{
    message: string;
    detail: string;
    sent: boolean;
  } | null>(null);
  const [lineError, setLineError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (isConfigured) {
        const [taskRes, mediaRes] = await Promise.all([
          supabase
            .from("weekly_tasks")
            .select("*")
            .order("week_number", { ascending: true }),
          supabase
            .from("media_assets")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);
        setTasks((taskRes.data as WeeklyTask[]) || []);
        setMedia((mediaRes.data as MediaAsset[]) || []);
      } else {
        setTasks(getDemoTasks());
        setMedia(getDemoMedia());
      }
      setLoading(false);
    }
    load();
  }, [isConfigured]);

  const pdfAssets = useMemo(
    () =>
      media.filter(
        (m) =>
          m.media_type === "newsletter" ||
          m.media_type === "pdf" ||
          m.media_type === "portfolio" ||
          m.media_type === "report"
      ),
    [media]
  );

  const videoAssets = useMemo(
    () => media.filter((m) => m.media_type === "video"),
    [media]
  );

  const todayIso = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "Completed").length;
    const pending = tasks.filter((t) => t.status === "Pending").length;
    const overdue = tasks.filter(
      (t) => t.status === "Pending" && t.due_date < todayIso
    ).length;
    const total = tasks.length || 20;
    const pct = Math.round((completed / total) * 100);
    return { completed, pending, overdue, total, pct };
  }, [tasks, todayIso]);

  const updateTask = async (
    taskId: string,
    patch: Partial<Pick<WeeklyTask, "status" | "pdf_drive_id" | "video_drive_id" | "notes" | "due_date">>
  ) => {
    if (isConfigured) {
      const { data, error } = await supabase
        .from("weekly_tasks")
        .update({
          ...patch,
          updated_by: user?.id || null,
        })
        .eq("id", taskId)
        .select("*")
        .single();

      if (error) {
        alert(`อัปเดตงานไม่สำเร็จ: ${error.message}`);
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? (data as WeeklyTask) : t))
      );
    } else {
      const nextList = tasks.map((t) =>
        t.id === taskId ? { ...t, ...patch, updated_at: new Date().toISOString() } : t
      );
      setTasks(nextList);
      saveDemoTasks(nextList);
    }
  };

  const handleToggleStatus = (task: WeeklyTask) => {
    const nextStatus: TaskStatus =
      task.status === "Completed" ? "Pending" : "Completed";
    updateTask(task.id, { status: nextStatus });
  };

  const handleTriggerLineTest = async () => {
    setTestingLine(true);
    setLineError("");
    try {
      const res = await fetch("/api/cron/reminder", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "ไม่สามารถเรียกใช้งาน LINE Reminder ได้");
      }
      setLinePreview({
        message: json.messagePreview,
        detail: json.lineResult?.detail || "",
        sent: Boolean(json.lineResult?.sent),
      });
    } catch (err) {
      setLineError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setTestingLine(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
              <CalendarCheck2 className="w-5 h-5" />
            </span>
            <span>ปฏิทินติดตามงานรายสัปดาห์ (สัปดาห์ที่ 1 - 20)</span>
          </h1>
          <div className="heading-beam-track" />
          <p className="text-xs sm:text-sm text-purple-900/70">
            สลับสถานะ Pending / Completed ผูกไฟล์ PDF และคลิป 720p พร้อมระบบ Vercel Cron แจ้งเตือนสรุปเข้า LINE ทุกวันศุกร์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex liquid-glass p-1 rounded-full">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                viewMode === "calendar"
                  ? "liquid-btn-primary text-white"
                  : "text-purple-800 hover:text-pink-600"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>ปฏิทิน 20 สัปดาห์</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                viewMode === "table"
                  ? "liquid-btn-primary text-white"
                  : "text-purple-800 hover:text-pink-600"
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>ตาราง Checklist</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleTriggerLineTest}
            disabled={testingLine}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-semibold shadow-sm cursor-pointer"
          >
            {testingLine ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>ทดสอบแจ้งเตือน LINE วันศุกร์</span>
          </button>
        </div>
      </div>

      {/* Progress & Cron Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 liquid-glass running-line-bottom rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-navy-950">
              ความคืบหน้าตลอดภาคเรียน ({stats.completed} / {stats.total} สัปดาห์)
            </div>
            <div className="text-sm font-extrabold text-pink-600">{stats.pct}%</div>
          </div>
          <div className="w-full h-3 rounded-full bg-purple-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 transition-all duration-500"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-purple-950/75">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              <span>Completed: {stats.completed} สัปดาห์</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              <span>Pending: {stats.pending} สัปดาห์</span>
            </span>
            {stats.overdue > 0 && (
              <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>เลยกำหนดส่ง: {stats.overdue} สัปดาห์</span>
              </span>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 liquid-glass-hero running-line-bottom text-white rounded-3xl p-5 space-y-1.5 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs font-bold text-pink-200">
            <BellRing className="w-4 h-4" />
            <span>Vercel Cron Auto-Reminder</span>
          </div>
          <div className="text-sm font-semibold">
            ตั้งเวลา <code>0 8 * * 5</code> (ทุกวันศุกร์ 15:00 น. เวลาไทย)
          </div>
          <div className="text-xs text-purple-200">
            Endpoint: <code>/api/cron/reminder</code> → ยิงสรุปเข้า LINE Messaging API
          </div>
        </div>
      </div>

      {/* LINE Test Preview Output */}
      {lineError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
          {lineError}
        </div>
      )}
      {linePreview && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">
              {linePreview.sent
                ? "✅ ส่งข้อความเข้า LINE สำเร็จ!"
                : "ℹ️ ตัวอย่างข้อความแจ้งเตือน (Dry-Run Mode — ยังไม่ได้ใส่ LINE Token)"}
            </span>
            <span className="text-[11px] text-emerald-700">{linePreview.detail}</span>
          </div>
          <pre className="whitespace-pre-wrap text-xs bg-white border border-emerald-200 rounded-xl p-3.5 text-slate-800 font-sans">
            {linePreview.message}
          </pre>
        </div>
      )}

      {/* Weeks Grid or Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : viewMode === "calendar" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tasks.map((task) => {
            const isCompleted = task.status === "Completed";
            const isOverdue = !isCompleted && task.due_date < todayIso;

            return (
              <div
                key={task.id}
                className={`liquid-glass rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all hover:-translate-y-0.5 ${
                  isCompleted
                    ? "running-line-bottom ring-1 ring-pink-300/70"
                    : isOverdue
                    ? "ring-1 ring-rose-300"
                    : ""
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-700 to-pink-600 text-white text-xs font-bold">
                      สัปดาห์ที่ {task.week_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(task)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
                        isCompleted
                          ? "liquid-btn-primary text-white border-white/30"
                          : "bg-white/75 text-purple-800 border-purple-200 hover:bg-white"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>{task.status}</span>
                    </button>
                  </div>

                  <h3 className="font-bold text-sm text-navy-950 leading-snug">
                    {task.week_title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-purple-900/70">
                    <Calendar className="w-3.5 h-3.5 text-pink-600" />
                    <span>กำหนดส่ง: {formatDateThai(task.due_date)}</span>
                  </div>
                </div>

                {/* Linked PDF & Video Selectors */}
                <div className="pt-3 border-t border-purple-200/60 space-y-2 text-xs">
                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-purple-900/75 mb-0.5">
                      <FileText className="w-3 h-3 text-pink-600" />
                      <span>เอกสาร PDF ประจำสัปดาห์</span>
                    </label>
                    <select
                      value={task.pdf_drive_id || ""}
                      onChange={(e) =>
                        updateTask(task.id, {
                          pdf_drive_id: e.target.value || null,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-200 bg-white/80 text-[11px]"
                    >
                      <option value="">-- ยังไม่แนบไฟล์ PDF --</option>
                      {pdfAssets.map((p) => (
                        <option key={p.id} value={p.drive_file_id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-purple-900/75 mb-0.5">
                      <Film className="w-3 h-3 text-purple-600" />
                      <span>คลิปวิดีโอประจำสัปดาห์</span>
                    </label>
                    <select
                      value={task.video_drive_id || ""}
                      onChange={(e) =>
                        updateTask(task.id, {
                          video_drive_id: e.target.value || null,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl border border-purple-200 bg-white/80 text-[11px]"
                    >
                      <option value="">-- ยังไม่แนบคลิปวิดีโอ --</option>
                      {videoAssets.map((v) => (
                        <option key={v.id} value={v.drive_file_id}>
                          {v.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(task.pdf_drive_id || task.video_drive_id) && (
                    <div className="flex items-center gap-3 pt-1">
                      {task.pdf_drive_id && (
                        <a
                          href={
                            isDemoDriveId(task.pdf_drive_id)
                              ? "/api/demo-pdf?type=newsletter"
                              : getMediaStreamUrl(task.pdf_drive_id)
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-pink-600 hover:underline"
                        >
                          เปิด PDF →
                        </a>
                      )}
                      {task.video_drive_id && !isDemoDriveId(task.video_drive_id) && (
                        <a
                          href={getMediaStreamUrl(task.video_drive_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-purple-700 hover:underline"
                        >
                          เปิดวิดีโอ →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="liquid-glass rounded-3xl overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="liquid-glass-nav text-white">
                <th className="py-3 px-4 font-semibold">สัปดาห์</th>
                <th className="py-3 px-4 font-semibold">ชื่องาน / กิจกรรม</th>
                <th className="py-3 px-4 font-semibold">กำหนดส่ง (ศุกร์)</th>
                <th className="py-3 px-4 font-semibold">ไฟล์แนบ</th>
                <th className="py-3 px-4 font-semibold text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-200/60">
              {tasks.map((task) => {
                const isCompleted = task.status === "Completed";
                return (
                  <tr key={task.id} className="hover:bg-white/60">
                    <td className="py-3 px-4 font-bold text-navy-950 whitespace-nowrap">
                      สัปดาห์ที่ {task.week_number}
                    </td>
                    <td className="py-3 px-4 text-purple-950/85">{task.week_title}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-purple-900/70">
                      {formatDateThai(task.due_date)}
                    </td>
                    <td className="py-3 px-4 text-xs text-purple-900/65">
                      {task.pdf_drive_id ? "📄 PDF " : ""}
                      {task.video_drive_id ? "🎬 คลิป" : ""}
                      {!task.pdf_drive_id && !task.video_drive_id ? "-" : ""}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(task)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                          isCompleted
                            ? "liquid-btn-primary text-white border-white/30"
                            : "bg-white/80 text-purple-800 border-purple-200"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span>{task.status}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
