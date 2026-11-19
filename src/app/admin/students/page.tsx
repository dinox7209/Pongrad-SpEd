"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { getDemoStudents, saveDemoStudents } from "@/lib/demo-store";
import {
  DISABILITY_TYPES,
  GRADE_LEVELS,
  Student,
  STUDENT_STATUS_META,
  StudentStatus,
} from "@/types/database";
import {
  Clock,
  Edit3,
  FileText,
  GraduationCap,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

const STATUS_LIST: StudentStatus[] = [
  "Active",
  "At-Risk",
  "Medical",
  "Transferred",
  "Graduated",
];

interface StudentFormState {
  id?: string;
  student_code: string;
  full_name: string;
  nickname: string;
  grade_level: string;
  disability_type: string;
  current_status: StudentStatus;
  guardian_contact: string;
  iep_goal: string;
  notes: string;
}

const EMPTY_FORM: StudentFormState = {
  student_code: "",
  full_name: "",
  nickname: "",
  grade_level: GRADE_LEVELS[3],
  disability_type: DISABILITY_TYPES[0],
  current_status: "Active",
  guardian_contact: "",
  iep_goal: "",
  notes: "",
};

export default function StudentsPage() {
  const { isConfigured, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [filterDisability, setFilterDisability] = useState<string>("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<StudentFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (isConfigured) {
        const { data } = await supabase
          .from("students")
          .select("*")
          .order("student_code", { ascending: true });
        setStudents((data as Student[]) || []);
      } else {
        setStudents(getDemoStudents());
      }
      setLoading(false);
    }
    load();
  }, [isConfigured]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: students.length };
    for (const s of STATUS_LIST) {
      counts[s] = students.filter((st) => st.current_status === s).length;
    }
    return counts;
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.nickname.toLowerCase().includes(q) ||
        s.student_code.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" || s.current_status === filterStatus;
      const matchGrade =
        filterGrade === "all" || s.grade_level === filterGrade;
      const matchDisability =
        filterDisability === "all" || s.disability_type === filterDisability;
      return matchSearch && matchStatus && matchGrade && matchDisability;
    });
  }, [students, searchQuery, filterStatus, filterGrade, filterDisability]);

  const openCreateModal = () => {
    const nextCode = `SP69-${String(students.length + 1).padStart(3, "0")}`;
    setForm({ ...EMPTY_FORM, student_code: nextCode });
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setForm({
      id: student.id,
      student_code: student.student_code,
      full_name: student.full_name,
      nickname: student.nickname,
      grade_level: student.grade_level,
      disability_type: student.disability_type,
      current_status: student.current_status,
      guardian_contact: student.guardian_contact,
      iep_goal: student.iep_goal || "",
      notes: student.notes || "",
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      if (isConfigured) {
        if (form.id) {
          const { data, error } = await supabase
            .from("students")
            .update({
              student_code: form.student_code.trim(),
              full_name: form.full_name.trim(),
              nickname: form.nickname.trim(),
              grade_level: form.grade_level,
              disability_type: form.disability_type,
              current_status: form.current_status,
              guardian_contact: form.guardian_contact.trim(),
              iep_goal: form.iep_goal.trim(),
              notes: form.notes.trim(),
            })
            .eq("id", form.id)
            .select("*")
            .single();

          if (error) throw new Error(error.message);
          setStudents((prev) =>
            prev.map((s) => (s.id === form.id ? (data as Student) : s))
          );
        } else {
          const { data, error } = await supabase
            .from("students")
            .insert({
              student_code: form.student_code.trim(),
              full_name: form.full_name.trim(),
              nickname: form.nickname.trim(),
              grade_level: form.grade_level,
              disability_type: form.disability_type,
              current_status: form.current_status,
              guardian_contact: form.guardian_contact.trim(),
              iep_goal: form.iep_goal.trim(),
              notes: form.notes.trim(),
              created_by: user?.id || null,
            })
            .select("*")
            .single();

          if (error) throw new Error(error.message);
          setStudents((prev) => [...prev, data as Student]);
        }
      } else {
        const now = new Date().toISOString();
        let nextList: Student[];
        if (form.id) {
          nextList = students.map((s) =>
            s.id === form.id
              ? {
                  ...s,
                  ...form,
                  updated_at: now,
                }
              : s
          );
        } else {
          const newStudent: Student = {
            id: `st-${Date.now()}`,
            student_code: form.student_code.trim(),
            full_name: form.full_name.trim(),
            nickname: form.nickname.trim(),
            grade_level: form.grade_level,
            disability_type: form.disability_type,
            current_status: form.current_status,
            guardian_contact: form.guardian_contact.trim(),
            iep_goal: form.iep_goal.trim(),
            notes: form.notes.trim(),
            created_at: now,
            updated_at: now,
          };
          nextList = [...students, newStudent];
        }
        setStudents(nextList);
        saveDemoStudents(nextList);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "ไม่สามารถบันทึกข้อมูลนักเรียนได้"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (
    studentId: string,
    nextStatus: StudentStatus
  ) => {
    if (isConfigured) {
      const { error } = await supabase
        .from("students")
        .update({ current_status: nextStatus })
        .eq("id", studentId);
      if (error) {
        alert(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`);
        return;
      }
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, current_status: nextStatus } : s
        )
      );
    } else {
      const nextList = students.map((s) =>
        s.id === studentId ? { ...s, current_status: nextStatus } : s
      );
      setStudents(nextList);
      saveDemoStudents(nextList);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`ยืนยันการลบข้อมูล "${student.full_name}" และ Case Timeline ทั้งหมด?`)) {
      return;
    }

    if (isConfigured) {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", student.id);
      if (error) {
        alert(`ลบข้อมูลไม่สำเร็จ: ${error.message}`);
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } else {
      const nextList = students.filter((s) => s.id !== student.id);
      setStudents(nextList);
      saveDemoStudents(nextList);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            <span>ทะเบียนนักเรียนพิเศษ & Case Timeline</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            บันทึกรายชื่อนักเรียน ระดับชั้น อ.1 - ป.6 ประเภทความบกพร่อง สถานะการติดตาม และประวัติพัฒนาการรายบุคคล
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>เพิ่มนักเรียนพิเศษ</span>
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            filterStatus === "all"
              ? "bg-navy-900 text-white border-navy-900"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
          }`}
        >
          ทั้งหมด ({statusCounts.all || 0})
        </button>
        {STATUS_LIST.map((st) => {
          const meta = STUDENT_STATUS_META[st];
          const active = filterStatus === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                active
                  ? "bg-navy-900 text-white border-navy-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
              <span>
                {meta.thLabel} ({statusCounts[st] || 0})
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Select Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัส ชื่อ-สกุล หรือชื่อเล่น..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">ทุกระดับชั้น (อ.1 - ป.6)</option>
          {GRADE_LEVELS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={filterDisability}
          onChange={(e) => setFilterDisability(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">ทุกประเภทความบกพร่อง</option>
          {DISABILITY_TYPES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Students List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          ไม่พบรายชื่อนักเรียนที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStudents.map((student) => {
            const meta = STUDENT_STATUS_META[student.current_status];
            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md p-5 flex flex-col justify-between gap-4 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                        {student.student_code} • {student.grade_level}
                      </div>
                      <Link
                        href={`/admin/students/${student.id}`}
                        className="text-base font-bold text-navy-950 hover:text-blue-600 transition-colors"
                      >
                        {student.full_name}{" "}
                        {student.nickname ? `(${student.nickname})` : ""}
                      </Link>
                    </div>

                    <select
                      value={student.current_status}
                      onChange={(e) =>
                        handleQuickStatusChange(
                          student.id,
                          e.target.value as StudentStatus
                        )
                      }
                      aria-label="เปลี่ยนสถานะนักเรียน"
                      className={`text-xs font-semibold rounded-full px-2.5 py-1 border cursor-pointer focus:outline-none ${meta.badgeClass}`}
                    >
                      {STATUS_LIST.map((st) => (
                        <option key={st} value={st} className="bg-white text-slate-900">
                          {STUDENT_STATUS_META[st].thLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                      <GraduationCap className="w-3.5 h-3.5 text-navy-700" />
                      <span>{student.disability_type}</span>
                    </span>
                    {student.guardian_contact && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        <span>{student.guardian_contact}</span>
                      </span>
                    )}
                  </div>

                  {student.iep_goal && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100 line-clamp-2">
                      <strong>เป้าหมาย IEP:</strong> {student.iep_goal}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-300" />
                      <span>Case Timeline</span>
                    </Link>
                    <Link
                      href={`/admin/generator?studentId=${student.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>สร้าง PDF</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(student)}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                      title="แก้ไขข้อมูล"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(student)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="ลบข้อมูล"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between sticky top-0">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-300" />
                <span>
                  {form.id ? "แก้ไขข้อมูลนักเรียนพิเศษ" : "เพิ่มรายชื่อนักเรียนพิเศษ"}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-navy-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสนักเรียน *
                  </label>
                  <input
                    required
                    value={form.student_code}
                    onChange={(e) =>
                      setForm({ ...form, student_code: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    placeholder="SP69-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อเล่น *
                  </label>
                  <input
                    required
                    value={form.nickname}
                    onChange={(e) =>
                      setForm({ ...form, nickname: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    placeholder="น้องต้นกล้า"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({ ...form, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="เด็กชายต้นกล้า รักเรียนดี"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระดับชั้น (อ.1 - ป.6)
                  </label>
                  <select
                    value={form.grade_level}
                    onChange={(e) =>
                      setForm({ ...form, grade_level: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทความบกพร่อง
                  </label>
                  <select
                    value={form.disability_type}
                    onChange={(e) =>
                      setForm({ ...form, disability_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {DISABILITY_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะปัจจุบัน
                  </label>
                  <select
                    value={form.current_status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        current_status: e.target.value as StudentStatus,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {STATUS_LIST.map((st) => (
                      <option key={st} value={st}>
                        {STUDENT_STATUS_META[st].thLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ข้อมูลติดต่อผู้ปกครอง
                </label>
                <input
                  value={form.guardian_contact}
                  onChange={(e) =>
                    setForm({ ...form, guardian_contact: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="ชื่อผู้ปกครอง และเบอร์โทรศัพท์"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เป้าหมายการเรียนรู้เฉพาะบุคคล (IEP Goal)
                </label>
                <textarea
                  rows={2}
                  value={form.iep_goal}
                  onChange={(e) =>
                    setForm({ ...form, iep_goal: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="เป้าหมายพัฒนาทักษะหลักในภาคเรียนนี้..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  placeholder="ความสนใจพิเศษ สิ่งกระตุ้น หรือข้อควรระวัง..."
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm cursor-pointer"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
