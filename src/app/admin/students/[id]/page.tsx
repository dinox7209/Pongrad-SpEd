"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoLogs,
  getDemoMedia,
  getDemoStudents,
  saveDemoLogs,
  saveDemoStudents,
} from "@/lib/demo-store";
import { formatDateThai, getMediaStreamUrl } from "@/lib/utils";
import {
  LOG_TYPES,
  LogType,
  MediaAsset,
  Student,
  STUDENT_STATUS_META,
  StudentLog,
  StudentStatus,
} from "@/types/database";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  GraduationCap,
  Phone,
  PlusCircle,
  Trash2,
} from "lucide-react";

const STATUS_LIST: StudentStatus[] = [
  "Active",
  "At-Risk",
  "Medical",
  "Transferred",
  "Graduated",
];

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const studentId = params?.id;
  const { isConfigured, user } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [logs, setLogs] = useState<StudentLog[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Log form
  const [logType, setLogType] = useState<LogType>("พัฒนาการ");
  const [loggedDate, setLoggedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    async function loadCase() {
      setLoading(true);
      if (isConfigured) {
        const [stRes, logRes, mediaRes] = await Promise.all([
          supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
          supabase
            .from("student_logs")
            .select("*")
            .eq("student_id", studentId)
            .order("logged_date", { ascending: false }),
          supabase
            .from("media_assets")
            .select("*")
            .eq("student_id", studentId)
            .order("created_at", { ascending: false }),
        ]);

        setStudent((stRes.data as Student) || null);
        setLogs((logRes.data as StudentLog[]) || []);
        setMedia((mediaRes.data as MediaAsset[]) || []);
      } else {
        const found = getDemoStudents().find((s) => s.id === studentId) || null;
        setStudent(found);
        setLogs(
          getDemoLogs()
            .filter((l) => l.student_id === studentId)
            .sort((a, b) => b.logged_date.localeCompare(a.logged_date))
        );
        setMedia(getDemoMedia().filter((m) => m.student_id === studentId));
      }
      setLoading(false);
    }
    loadCase();
  }, [studentId, isConfigured]);

  const handleStatusChange = async (nextStatus: StudentStatus) => {
    if (!student) return;
    if (isConfigured) {
      const { error } = await supabase
        .from("students")
        .update({ current_status: nextStatus })
        .eq("id", student.id);
      if (error) {
        alert(error.message);
        return;
      }
      setStudent({ ...student, current_status: nextStatus });
    } else {
      const updated = { ...student, current_status: nextStatus };
      setStudent(updated);
      const nextList = getDemoStudents().map((s) =>
        s.id === student.id ? updated : s
      );
      saveDemoStudents(nextList);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !description.trim()) return;
    setSubmitting(true);

    try {
      if (isConfigured) {
        const { data, error } = await supabase
          .from("student_logs")
          .insert({
            student_id: student.id,
            log_type: logType,
            logged_date: loggedDate,
            description: description.trim(),
            action_taken: actionTaken.trim(),
            logged_by: user?.id || null,
          })
          .select("*")
          .single();

        if (error) throw new Error(error.message);
        setLogs((prev) => [data as StudentLog, ...prev]);
      } else {
        const newLog: StudentLog = {
          id: `log-${Date.now()}`,
          student_id: student.id,
          log_type: logType,
          logged_date: loggedDate,
          description: description.trim(),
          action_taken: actionTaken.trim(),
          created_at: new Date().toISOString(),
        };
        const allLogs = [newLog, ...getDemoLogs()];
        saveDemoLogs(allLogs);
        setLogs((prev) => [newLog, ...prev]);
      }

      setDescription("");
      setActionTaken("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "บันทึก Case Timeline ไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("ต้องการลบบันทึก Case Timeline รายการนี้หรือไม่?")) return;
    if (isConfigured) {
      const { error } = await supabase
        .from("student_logs")
        .delete()
        .eq("id", logId);
      if (error) {
        alert(error.message);
        return;
      }
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    } else {
      const nextAll = getDemoLogs().filter((l) => l.id !== logId);
      saveDemoLogs(nextAll);
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
        กำลังโหลดประวัติ Case Timeline...
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center space-y-3">
        <p className="text-base font-bold text-navy-900">ไม่พบข้อมูลนักเรียน</p>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้ารายชื่อนักเรียน</span>
        </Link>
      </div>
    );
  }

  const statusMeta = STUDENT_STATUS_META[student.current_status];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-purple-800 hover:text-pink-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับทะเบียนนักเรียนทั้งหมด</span>
        </Link>

        <Link
          href={`/admin/generator?studentId=${student.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs sm:text-sm font-semibold"
        >
          <FileText className="w-4 h-4" />
          <span>สร้าง PDF รายงาน / Portfolio นักเรียนคนนี้</span>
        </Link>
      </div>

      {/* Student Profile Card */}
      <div className="liquid-glass running-line-bottom rounded-3xl p-6 sm:p-7 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-pink-600 uppercase tracking-wider">
              {student.student_code} • {student.grade_level}
            </div>
            <h1 className="text-2xl font-extrabold text-navy-950 mt-0.5">
              {student.full_name} ({student.nickname})
            </h1>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-purple-900/75">
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>{student.disability_type}</span>
              </span>
              {student.guardian_contact && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-4 h-4 text-pink-600" />
                  <span>{student.guardian_contact}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-900/70">สถานะ:</span>
            <select
              value={student.current_status}
              onChange={(e) => handleStatusChange(e.target.value as StudentStatus)}
              className={`text-xs font-bold rounded-full px-3.5 py-1.5 border cursor-pointer ${statusMeta.badgeClass}`}
            >
              {STATUS_LIST.map((st) => (
                <option key={st} value={st} className="bg-white text-slate-900">
                  {STUDENT_STATUS_META[st].thLabel}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(student.iep_goal || student.notes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-purple-200/60">
            <div className="bg-purple-100/60 border border-purple-200/80 rounded-2xl p-4 text-xs sm:text-sm">
              <div className="font-bold text-navy-900 mb-1">
                เป้าหมายการจัดการศึกษาเฉพาะบุคคล (IEP Goal)
              </div>
              <p className="text-purple-950/80">{student.iep_goal || "-"}</p>
            </div>
            <div className="bg-pink-50/70 border border-pink-200/70 rounded-2xl p-4 text-xs sm:text-sm">
              <div className="font-bold text-navy-900 mb-1">
                ข้อมูลสังเกตเพิ่มเติม / สิ่งที่ควรทราบ
              </div>
              <p className="text-purple-950/80">{student.notes || "-"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Two-Column Case Timeline + Linked Media */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add Case Log + Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <form
            onSubmit={handleAddLog}
            className="liquid-glass rounded-3xl p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <h2 className="font-bold text-navy-950 text-sm sm:text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-pink-600" />
                <span>บันทึก Case Timeline ใหม่</span>
              </h2>
              <div className="heading-beam-track" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  ประเภทบันทึก
                </label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as LogType)}
                  className="w-full px-3 py-2 rounded-2xl bg-white/80 border border-purple-200 text-sm"
                >
                  {LOG_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  วันที่บันทึก
                </label>
                <input
                  type="date"
                  required
                  value={loggedDate}
                  onChange={(e) => setLoggedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl bg-white/80 border border-purple-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-950 mb-1">
                พัฒนาการ / ปัญหาที่พบ *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="บรรยายพฤติกรรม ผลการฝึกทักษะ หรืออุปสรรคที่พบ..."
                className="w-full px-3 py-2 rounded-2xl bg-white/80 border border-purple-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-950 mb-1">
                แนวทางช่วยเหลือรายบุคคล (Action Taken)
              </label>
              <textarea
                rows={2}
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="วิธีการแก้ไข การใช้สื่อเฉพาะทาง หรือการประสานผู้ปกครอง..."
                className="w-full px-3 py-2 rounded-2xl bg-white/80 border border-purple-200 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-full liquid-btn-primary text-white text-sm font-semibold cursor-pointer"
              >
                {submitting ? "กำลังบันทึก..." : "เพิ่มลงใน Case Timeline"}
              </button>
            </div>
          </form>

          {/* Timeline List */}
          <div className="liquid-glass rounded-3xl p-6 space-y-5">
            <div className="space-y-1.5">
              <h2 className="font-bold text-navy-950 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>ประวัติ Case Timeline ({logs.length} รายการ)</span>
              </h2>
              <div className="heading-beam-track" />
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center bg-white/60 rounded-2xl text-xs text-purple-900/60">
                ยังไม่มีบันทึกประวัติสำหรับนักเรียนรายนี้
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="relative pl-5 border-l-2 border-pink-300 pb-4 last:pb-0"
                  >
                    <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 ring-4 ring-white" />
                    <div className="bg-white/75 rounded-2xl border border-purple-200/70 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-xs font-bold">
                            {log.log_type}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-purple-900/65">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDateThai(log.logged_date)}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 rounded-full text-purple-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="ลบบันทึก"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-sm text-navy-950">{log.description}</p>

                      {log.action_taken && (
                        <div className="text-xs text-purple-900 bg-purple-50/90 border border-purple-200/70 rounded-xl px-3 py-2">
                          <strong>แนวทางช่วยเหลือ:</strong> {log.action_taken}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Linked Media from Drive */}
        <div className="lg:col-span-4 space-y-4">
          <div className="liquid-glass rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy-950 text-sm flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-pink-600" />
                <span>สื่อและผลงานใน Drive ({media.length})</span>
              </h2>
              <Link
                href="/admin/studio"
                className="text-xs font-semibold text-pink-600 hover:underline"
              >
                อัปโหลดเพิ่ม →
              </Link>
            </div>

            {media.length === 0 ? (
              <div className="p-6 text-center bg-white/60 rounded-2xl text-xs text-purple-900/60">
                ยังไม่มีภาพ/คลิปที่ผูกกับนักเรียนรายนี้
              </div>
            ) : (
              <div className="space-y-3">
                {media.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl bg-white/75 border border-purple-200/70 p-3 space-y-2"
                  >
                    {m.media_type === "image" && (
                      <img
                        src={getMediaStreamUrl(m.drive_file_id)}
                        alt={m.title}
                        className="w-full h-32 object-cover rounded-xl"
                      />
                    )}
                    <div className="font-semibold text-xs text-navy-950">
                      {m.title}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-purple-900/65">
                      <span>{m.skill_category}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          m.is_public
                            ? "bg-pink-100 text-pink-700"
                            : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {m.is_public ? "สาธารณะ" : "ส่วนตัว"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
