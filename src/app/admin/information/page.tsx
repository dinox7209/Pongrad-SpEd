"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoResourceRecords,
  saveDemoResourceRecords,
} from "@/lib/demo-store";
import {
  DISABILITY_TYPES,
  GenderType,
  INFORMATION_GRADE_LEVELS,
  ResourceRoomRecord,
  SCHOOL_INFO,
} from "@/types/database";
import {
  Award,
  CalendarPlus,
  ClipboardList,
  CopyPlus,
  Download,
  Edit3,
  Plus,
  Printer,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

interface RecordFormState {
  id?: string;
  academic_year: string;
  row_order: number;
  full_name: string;
  gender: GenderType;
  student_number: string;
  entry_year: string;
  age_years: string;
  grade_level: string;
  disability_type: string;
  homeroom_teacher: string;
  quality_score: string;
  iep_pass_percent: string;
  transfer_same_school: string;
  transfer_other_inclusive: string;
  transfer_other_school: string;
  notes: string;
}

function createEmptyForm(year: string, nextOrder: number): RecordFormState {
  return {
    academic_year: year,
    row_order: nextOrder,
    full_name: "",
    gender: "หญิง",
    student_number: "",
    entry_year: year,
    age_years: "",
    grade_level: "ป.1",
    disability_type: "บกพร่องทางสติปัญญา",
    homeroom_teacher: "นางสาวดวงพร หวังอ้อมกลาง",
    quality_score: "",
    iep_pass_percent: "",
    transfer_same_school: "",
    transfer_other_inclusive: "-",
    transfer_other_school: "-",
    notes: "",
  };
}

export default function ResourceRoomInformationPage() {
  const { isConfigured, user } = useAuth();
  const [records, setRecords] = useState<ResourceRoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>("2567");
  const [searchQuery, setSearchQuery] = useState("");

  // Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<RecordFormState>(createEmptyForm("2567", 1));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // New Year Modal
  const [newYearModalOpen, setNewYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState("2568");
  const [copyFromYear, setCopyFromYear] = useState("2567");

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      setTableMissing(false);
      try {
        if (isConfigured) {
          const { data, error } = await supabase
            .from("resource_room_records")
            .select("*")
            .order("academic_year", { ascending: false })
            .order("row_order", { ascending: true });

          if (error) {
            if (
              error.code === "42P01" ||
              error.code === "PGRST205" ||
              error.message?.includes("does not exist")
            ) {
              setTableMissing(true);
            }
            setRecords([]);
          } else {
            const list = (data as ResourceRoomRecord[]) || [];
            setRecords(list);
            if (list.length > 0) {
              const years = Array.from(
                new Set(list.map((r) => r.academic_year))
              ).sort((a, b) => b.localeCompare(a));
              if (!years.includes("2567") && years[0]) {
                setSelectedYear(years[0]);
              }
            }
          }
        } else {
          setRecords(getDemoResourceRecords());
        }
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, [isConfigured]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>(["2566", "2567"]);
    for (const r of records) {
      if (r.academic_year) yearSet.add(r.academic_year);
    }
    return Array.from(yearSet).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const yearRecords = useMemo(() => {
    return records
      .filter((r) => r.academic_year === selectedYear)
      .filter((r) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          r.full_name.toLowerCase().includes(q) ||
          r.student_number.toLowerCase().includes(q) ||
          r.disability_type.toLowerCase().includes(q) ||
          r.grade_level.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.row_order - b.row_order);
  }, [records, selectedYear, searchQuery]);

  const yearStats = useMemo(() => {
    const base = records.filter((r) => r.academic_year === selectedYear);
    const total = base.length;
    const male = base.filter((r) => r.gender === "ชาย").length;
    const female = base.filter((r) => r.gender === "หญิง").length;

    const byDisability = new Map<string, number>();
    for (const r of base) {
      const key = r.disability_type || "อื่นๆ";
      byDisability.set(key, (byDisability.get(key) || 0) + 1);
    }

    const scored = base.filter(
      (r) => r.quality_score !== null && r.quality_score !== undefined
    );
    const avgQuality =
      scored.length > 0
        ? (
            scored.reduce((sum, r) => sum + Number(r.quality_score || 0), 0) /
            scored.length
          ).toFixed(2)
        : "-";

    const iepList = base.filter(
      (r) => r.iep_pass_percent !== null && r.iep_pass_percent !== undefined
    );
    const avgIep =
      iepList.length > 0
        ? Math.round(
            iepList.reduce(
              (sum, r) => sum + Number(r.iep_pass_percent || 0),
              0
            ) / iepList.length
          )
        : null;

    const homeroomTeacher =
      base[0]?.homeroom_teacher || "นางสาวดวงพร หวังอ้อมกลาง";

    return {
      total,
      male,
      female,
      byDisability: Array.from(byDisability.entries()),
      avgQuality,
      avgIep,
      homeroomTeacher,
    };
  }, [records, selectedYear]);

  const openCreateModal = () => {
    const currentYearCount = records.filter(
      (r) => r.academic_year === selectedYear
    ).length;
    setForm(createEmptyForm(selectedYear, currentYearCount + 1));
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (rec: ResourceRoomRecord) => {
    setForm({
      id: rec.id,
      academic_year: rec.academic_year,
      row_order: rec.row_order,
      full_name: rec.full_name,
      gender: rec.gender,
      student_number: rec.student_number || "",
      entry_year: rec.entry_year || "",
      age_years:
        rec.age_years !== null && rec.age_years !== undefined
          ? String(rec.age_years)
          : "",
      grade_level: rec.grade_level,
      disability_type: rec.disability_type,
      homeroom_teacher: rec.homeroom_teacher || "นางสาวดวงพร หวังอ้อมกลาง",
      quality_score:
        rec.quality_score !== null && rec.quality_score !== undefined
          ? String(rec.quality_score)
          : "",
      iep_pass_percent:
        rec.iep_pass_percent !== null && rec.iep_pass_percent !== undefined
          ? String(rec.iep_pass_percent)
          : "",
      transfer_same_school: rec.transfer_same_school || "",
      transfer_other_inclusive: rec.transfer_other_inclusive || "-",
      transfer_other_school: rec.transfer_other_school || "-",
      notes: rec.notes || "",
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const payload = {
      academic_year: form.academic_year.trim(),
      row_order: Number(form.row_order) || 1,
      full_name: form.full_name.trim(),
      gender: form.gender,
      student_number: form.student_number.trim(),
      entry_year: form.entry_year.trim(),
      age_years: form.age_years.trim() ? Number(form.age_years) : null,
      grade_level: form.grade_level.trim(),
      disability_type: form.disability_type.trim(),
      homeroom_teacher:
        form.homeroom_teacher.trim() || "นางสาวดวงพร หวังอ้อมกลาง",
      quality_score: form.quality_score.trim()
        ? Number(form.quality_score)
        : null,
      iep_pass_percent: form.iep_pass_percent.trim()
        ? Number(form.iep_pass_percent)
        : null,
      transfer_same_school: form.transfer_same_school.trim(),
      transfer_other_inclusive: form.transfer_other_inclusive.trim(),
      transfer_other_school: form.transfer_other_school.trim(),
      notes: form.notes.trim(),
    };

    try {
      if (isConfigured) {
        if (form.id) {
          const { data, error } = await supabase
            .from("resource_room_records")
            .update({
              ...payload,
              updated_by: user?.id || null,
            })
            .eq("id", form.id)
            .select("*")
            .single();

          if (error) throw new Error(error.message);
          setRecords((prev) =>
            prev.map((r) =>
              r.id === form.id ? (data as ResourceRoomRecord) : r
            )
          );
        } else {
          const { data, error } = await supabase
            .from("resource_room_records")
            .insert({
              ...payload,
              updated_by: user?.id || null,
            })
            .select("*")
            .single();

          if (error) throw new Error(error.message);
          setRecords((prev) => [...prev, data as ResourceRoomRecord]);
        }
      } else {
        const now = new Date().toISOString();
        let nextList: ResourceRoomRecord[];
        if (form.id) {
          nextList = records.map((r) =>
            r.id === form.id ? { ...r, ...payload, updated_at: now } : r
          );
        } else {
          const created: ResourceRoomRecord = {
            id: `rr-${Date.now()}`,
            ...payload,
            created_at: now,
            updated_at: now,
          };
          nextList = [...records, created];
        }
        setRecords(nextList);
        saveDemoResourceRecords(nextList);
      }

      setSelectedYear(payload.academic_year);
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกข้อมูลสารสนเทศไม่สำเร็จ"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (rec: ResourceRoomRecord) => {
    if (!confirm(`ยืนยันการลบรายชื่อ "${rec.full_name}" (ปี ${rec.academic_year})?`)) {
      return;
    }

    if (isConfigured) {
      const { error } = await supabase
        .from("resource_room_records")
        .delete()
        .eq("id", rec.id);
      if (error) {
        alert(`ลบข้อมูลไม่สำเร็จ: ${error.message}`);
        return;
      }
      setRecords((prev) => prev.filter((r) => r.id !== rec.id));
    } else {
      const nextList = records.filter((r) => r.id !== rec.id);
      setRecords(nextList);
      saveDemoResourceRecords(nextList);
    }
  };

  const handleCreateNewYearFromPrevious = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetYear = newYearInput.trim();
    if (!targetYear) return;

    const existingTarget = records.some((r) => r.academic_year === targetYear);
    if (existingTarget) {
      setSelectedYear(targetYear);
      setNewYearModalOpen(false);
      return;
    }

    const sourceList = copyFromYear
      ? records
          .filter((r) => r.academic_year === copyFromYear)
          .sort((a, b) => a.row_order - b.row_order)
      : [];

    if (sourceList.length === 0) {
      setSelectedYear(targetYear);
      setNewYearModalOpen(false);
      openCreateModal();
      setForm(createEmptyForm(targetYear, 1));
      return;
    }

    const gradeMap: Record<string, string> = {
      "อ.1": "อ.2",
      "อ.2": "อ.3",
      "อ.3": "ป.1",
      "ป.1": "ป.2",
      "ป.2": "ป.3",
      "ป.3": "ป.4",
      "ป.4": "ป.5",
      "ป.5": "ป.6",
    };

    const newRowsPayload = sourceList.map((r, idx) => ({
      academic_year: targetYear,
      row_order: idx + 1,
      student_id: r.student_id || null,
      full_name: r.full_name,
      gender: r.gender,
      student_number: r.student_number || "",
      entry_year: r.entry_year || copyFromYear,
      age_years:
        r.age_years !== null && r.age_years !== undefined
          ? r.age_years + 1
          : null,
      grade_level: gradeMap[r.grade_level] || r.grade_level,
      disability_type: r.disability_type,
      homeroom_teacher: r.homeroom_teacher || "นางสาวดวงพร หวังอ้อมกลาง",
      quality_score: null,
      iep_pass_percent: null,
      transfer_same_school: "",
      transfer_other_inclusive: "-",
      transfer_other_school: "-",
      notes: "",
    }));

    if (isConfigured) {
      const { data, error } = await supabase
        .from("resource_room_records")
        .insert(
          newRowsPayload.map((item) => ({
            ...item,
            updated_by: user?.id || null,
          }))
        )
        .select("*");

      if (error) {
        alert(`สร้างปีการศึกษาใหม่ไม่สำเร็จ: ${error.message}`);
        return;
      }
      setRecords((prev) => [...prev, ...((data as ResourceRoomRecord[]) || [])]);
    } else {
      const now = new Date().toISOString();
      const created: ResourceRoomRecord[] = newRowsPayload.map((item, i) => ({
        id: `rr-${targetYear}-${Date.now()}-${i}`,
        ...item,
        created_at: now,
        updated_at: now,
      }));
      const nextList = [...records, ...created];
      setRecords(nextList);
      saveDemoResourceRecords(nextList);
    }

    setSelectedYear(targetYear);
    setNewYearModalOpen(false);
  };

  const handleExportCsv = () => {
    const headers = [
      "ที่",
      "ชื่อ-สกุล",
      "เพศ",
      "เลขประจำตัวนักเรียน",
      "เข้าเรียนเมื่อปีการศึกษา",
      "อายุ(ปี)",
      "ระดับชั้นเรียน",
      "ประเภทความพิการ",
      "ครูประจำชั้น",
      "ผลการพัฒนาระดับคุณภาพ",
      "ผ่านตามแผน IEP (%)",
      "ส่งต่อชั้นเรียนโรงเรียนเดิม",
      "ส่งต่อไปโรงเรียนเรียนรวมอื่น",
      "ส่งต่อไปสถานศึกษาอื่น",
    ];

    const rows = yearRecords.map((r) => [
      r.row_order,
      r.full_name,
      r.gender,
      r.student_number || "-",
      r.entry_year || "-",
      r.age_years ?? "-",
      r.grade_level,
      r.disability_type,
      r.homeroom_teacher,
      r.quality_score !== null && r.quality_score !== undefined
        ? Number(r.quality_score).toFixed(2)
        : "",
      r.iep_pass_percent ?? "",
      r.transfer_same_school,
      r.transfer_other_inclusive,
      r.transfer_other_school,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `สารสนเทศ_ห้องเสริมวิชาการ_ปี_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
              <ClipboardList className="w-5 h-5" />
            </span>
            <span>สารสนเทศห้องเสริมวิชาการสู่การเรียนรวม (รายปีการศึกษา)</span>
          </h1>
          <div className="heading-beam-track" />
          <p className="text-xs sm:text-sm text-purple-900/70">
            {SCHOOL_INFO.name} ร่วมกับ {SCHOOL_INFO.partnerName} • สำหรับครูดวงพรและผู้ดูแลระบบจัดการแก้ไข/เพิ่มข้อมูล
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNewYearModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full liquid-glass text-purple-800 hover:text-pink-600 text-xs font-semibold cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4 text-pink-600" />
            <span>เพิ่มปีการศึกษา</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={yearRecords.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full liquid-glass text-purple-800 hover:text-pink-600 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>ส่งออก Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full liquid-glass text-purple-800 hover:text-pink-600 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-600" />
            <span>พิมพ์รายงาน</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มนักเรียนปี {selectedYear}</span>
          </button>
        </div>
      </div>

      {tableMissing && (
        <div className="liquid-glass rounded-3xl border border-amber-300 p-5 text-xs sm:text-sm text-amber-900 space-y-1.5 no-print">
          <div className="font-bold">
            ยังไม่ได้สร้างตาราง <code>resource_room_records</code> ใน Supabase
          </div>
          <p>
            กรุณานำคำสั่งล่าสุดจาก <code>supabase/schema.sql</code> ไปวางและกด Run ใน Supabase SQL Editor จากนั้นรีเฟรชหน้านี้
            และหากต้องการนำเข้าข้อมูลปี 2566–2567 ให้รันไฟล์ <code>supabase/seed_real_information.sql</code> ในเครื่องเพิ่มเติมครับ
          </p>
        </div>
      )}

      {/* Year Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap gap-2">
          {availableYears.map((yr) => {
            const count = records.filter((r) => r.academic_year === yr).length;
            const active = selectedYear === yr;
            return (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  active
                    ? "liquid-btn-primary text-white shadow-glass-pink"
                    : "liquid-glass-subtle text-purple-900 hover:bg-white"
                }`}
              >
                ปีการศึกษา {yr} ({count} คน)
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ เลขประจำตัว ชั้น หรือความพิการ..."
            className="w-full pl-9 pr-3 py-2 rounded-full bg-white/80 border border-purple-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center space-y-1 pb-2">
        <h2 className="text-lg font-bold">
          สารสนเทศ ห้องเสริมวิชาการ สู่การเรียนรวม {SCHOOL_INFO.name}
        </h2>
        <p className="text-sm">
          โดยความร่วมมือกับ {SCHOOL_INFO.partnerName} • ปีการศึกษา {selectedYear}
        </p>
        <p className="text-xs">
          ครูประจำชั้น: {yearStats.homeroomTeacher} • จำนวนรวม {yearStats.total} คน (ชาย {yearStats.male} คน, หญิง {yearStats.female} คน)
        </p>
      </div>

      {/* Summary Stats Cards for Selected Year */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="liquid-glass running-line-bottom rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-xs font-semibold">จำนวนนักเรียนปี {selectedYear}</span>
            <Users className="w-4 h-4 text-pink-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-navy-950">
            {yearStats.total} คน
          </div>
          <div className="flex gap-3 text-xs font-semibold text-purple-900/75">
            <span>ชาย {yearStats.male} คน</span>
            <span>•</span>
            <span>หญิง {yearStats.female} คน</span>
          </div>
        </div>

        <div className="liquid-glass rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-xs font-semibold">ครูประจำชั้น / ผู้รับผิดชอบ</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm sm:text-base font-bold text-navy-950">
            {yearStats.homeroomTeacher}
          </div>
          <div className="text-[11px] text-purple-900/65">
            {SCHOOL_INFO.partnerName}
          </div>
        </div>

        <div className="liquid-glass rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-xs font-semibold">แยกตามประเภทความพิการ</span>
            <ClipboardList className="w-4 h-4 text-pink-600" />
          </div>
          {yearStats.byDisability.length === 0 ? (
            <div className="text-xs text-purple-900/60">-</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {yearStats.byDisability.map(([label, cnt]) => (
                <span
                  key={label}
                  className="inline-flex px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-900 text-[11px] font-semibold border border-pink-200/70"
                >
                  {label}: {cnt} คน
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="liquid-glass running-line-bottom rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-xs font-semibold">ผลการพัฒนาคุณภาพ &amp; IEP</span>
            <Award className="w-4 h-4 text-pink-600" />
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-xl font-extrabold text-navy-950">
                {yearStats.avgQuality}
              </div>
              <div className="text-[11px] text-purple-900/65">ระดับคุณภาพเฉลี่ย</div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-pink-600">
                {yearStats.avgIep !== null ? `${yearStats.avgIep}%` : "-"}
              </div>
              <div className="text-[11px] text-purple-900/65">ผ่านตามแผน IEP</div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Resource Room Table */}
      <div className="liquid-glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="liquid-glass-nav text-white text-center">
                <th
                  colSpan={8}
                  className="py-2.5 px-3 font-bold border-b border-r border-white/20"
                >
                  นักเรียนพิการที่เรียนประจำห้องเสริมวิชาการ สู่การเรียนรวม (ปีการศึกษา {selectedYear})
                </th>
                <th
                  colSpan={2}
                  className="py-2.5 px-3 font-bold border-b border-r border-white/20"
                >
                  ผลการพัฒนาผู้เรียน
                </th>
                <th
                  colSpan={3}
                  className="py-2.5 px-3 font-bold border-b border-r border-white/20"
                >
                  การส่งต่อในปีการศึกษา {selectedYear}
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 font-bold border-b border-white/20 no-print"
                >
                  จัดการ
                </th>
              </tr>
              <tr className="bg-purple-900/90 text-pink-100 text-[11px] sm:text-xs text-center">
                <th className="py-2 px-2.5 border-r border-white/15">ที่</th>
                <th className="py-2 px-3 border-r border-white/15 text-left min-w-[175px]">
                  ชื่อ-สกุล
                </th>
                <th className="py-2 px-2.5 border-r border-white/15">เพศ</th>
                <th className="py-2 px-2.5 border-r border-white/15">เลขประจำตัว</th>
                <th className="py-2 px-2.5 border-r border-white/15">เข้าเรียนปี</th>
                <th className="py-2 px-2.5 border-r border-white/15">อายุ</th>
                <th className="py-2 px-2.5 border-r border-white/15">ชั้น</th>
                <th className="py-2 px-3 border-r border-white/15 text-left min-w-[140px]">
                  ประเภทความพิการ
                </th>
                <th className="py-2 px-2.5 border-r border-white/15">ระดับคุณภาพ</th>
                <th className="py-2 px-2.5 border-r border-white/15">ผ่าน IEP (%)</th>
                <th className="py-2 px-2.5 border-r border-white/15">โรงเรียนเดิม</th>
                <th className="py-2 px-2.5 border-r border-white/15">เรียนรวมอื่น</th>
                <th className="py-2 px-2.5 border-r border-white/15">สถานศึกษาอื่น</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-200/70">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-xs text-purple-900/60">
                    กำลังโหลดข้อมูลสารสนเทศ...
                  </td>
                </tr>
              ) : yearRecords.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-10 text-center text-xs text-purple-900/60">
                    ยังไม่มีรายชื่อนักเรียนในปีการศึกษา {selectedYear} — กดปุ่ม &quot;เพิ่มนักเรียนปี {selectedYear}&quot; เพื่อบันทึกข้อมูล
                  </td>
                </tr>
              ) : (
                yearRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-white/75 transition-colors">
                    <td className="py-2.5 px-2.5 text-center font-bold text-navy-950">
                      {rec.row_order}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-navy-950">
                      {rec.full_name}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-purple-950/80">
                      {rec.gender}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-purple-950/80">
                      {rec.student_number || (
                        <span className="text-pink-600/80 text-[11px]">รอระบุ</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-purple-950/80">
                      {rec.entry_year || "-"}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-purple-950/80">
                      {rec.age_years !== null && rec.age_years !== undefined
                        ? `${rec.age_years} ปี`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-semibold text-purple-800">
                      {rec.grade_level}
                    </td>
                    <td className="py-2.5 px-3 text-purple-950/85">
                      {rec.disability_type}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-semibold text-navy-950">
                      {rec.quality_score !== null && rec.quality_score !== undefined
                        ? Number(rec.quality_score).toFixed(2)
                        : "-"}
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-bold text-pink-700">
                      {rec.iep_pass_percent !== null &&
                      rec.iep_pass_percent !== undefined
                        ? `${Number(rec.iep_pass_percent)}%`
                        : "-"}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-xs text-purple-950/80">
                      {rec.transfer_same_school || "-"}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-xs text-purple-950/80">
                      {rec.transfer_other_inclusive || "-"}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-xs text-purple-950/80">
                      {rec.transfer_other_school || "-"}
                    </td>
                    <td className="py-2.5 px-2.5 text-center whitespace-nowrap no-print">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 rounded-full text-purple-600 hover:text-pink-600 hover:bg-purple-100/70 cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(rec)}
                          className="p-1.5 rounded-full text-purple-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Record Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-purple-950/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 liquid-glass-nav text-white flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-pink-300" />
                <span>
                  {form.id
                    ? "แก้ไขข้อมูลสารสนเทศนักเรียน"
                    : "เพิ่มรายชื่อในตารางสารสนเทศ"}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ปีการศึกษา *
                  </label>
                  <input
                    required
                    value={form.academic_year}
                    onChange={(e) =>
                      setForm({ ...form, academic_year: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                    placeholder="2567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ลำดับที่
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.row_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        row_order: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    เพศ *
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value as GenderType })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  >
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    อายุ (ปี)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={form.age_years}
                    onChange={(e) =>
                      setForm({ ...form, age_years: e.target.value })
                    }
                    placeholder="เช่น 9"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ชื่อ-สกุลนักเรียน *
                  </label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    placeholder="เช่น ด.ญ. ... ..."
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    เลขประจำตัวนักเรียน
                  </label>
                  <input
                    value={form.student_number}
                    onChange={(e) =>
                      setForm({ ...form, student_number: e.target.value })
                    }
                    placeholder="เช่น 2940 (เว้นว่างได้)"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    เข้าเรียนเมื่อปีการศึกษา
                  </label>
                  <input
                    value={form.entry_year}
                    onChange={(e) =>
                      setForm({ ...form, entry_year: e.target.value })
                    }
                    placeholder="2567"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ระดับชั้นเรียน *
                  </label>
                  <select
                    value={form.grade_level}
                    onChange={(e) =>
                      setForm({ ...form, grade_level: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  >
                    {INFORMATION_GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ประเภทความพิการ *
                  </label>
                  <select
                    value={form.disability_type}
                    onChange={(e) =>
                      setForm({ ...form, disability_type: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  >
                    {DISABILITY_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ครูประจำชั้น / ผู้รับผิดชอบ
                  </label>
                  <input
                    value={form.homeroom_teacher}
                    onChange={(e) =>
                      setForm({ ...form, homeroom_teacher: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ผลการพัฒนา (ระดับคุณภาพ)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={form.quality_score}
                    onChange={(e) =>
                      setForm({ ...form, quality_score: e.target.value })
                    }
                    placeholder="เช่น 2.30"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ผ่านตามแผน IEP (ร้อยละ)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={form.iep_pass_percent}
                    onChange={(e) =>
                      setForm({ ...form, iep_pass_percent: e.target.value })
                    }
                    placeholder="เช่น 100"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ส่งต่อชั้นเรียนโรงเรียนเดิม
                  </label>
                  <input
                    value={form.transfer_same_school}
                    onChange={(e) =>
                      setForm({ ...form, transfer_same_school: e.target.value })
                    }
                    placeholder="เช่น ส่งต่อชั้นเรียนเดิม / -"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ส่งต่อไปโรงเรียนเรียนรวมอื่น
                  </label>
                  <input
                    value={form.transfer_other_inclusive}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        transfer_other_inclusive: e.target.value,
                      })
                    }
                    placeholder="- หรือชื่อโรงเรียน"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-purple-950 mb-1">
                    ส่งต่อไปสถานศึกษาอื่น
                  </label>
                  <input
                    value={form.transfer_other_school}
                    onChange={(e) =>
                      setForm({ ...form, transfer_other_school: e.target.value })
                    }
                    placeholder="- หรือชื่อสถานศึกษา"
                    className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-purple-200 text-sm font-semibold text-purple-800 hover:bg-white cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full liquid-btn-primary text-white text-sm font-semibold cursor-pointer"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Academic Year Modal */}
      {newYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-purple-950/65 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 liquid-glass-nav text-white flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <CopyPlus className="w-4 h-4 text-pink-300" />
                <span>เปิดปีการศึกษาใหม่ (เช่น 2568 / 2569)</span>
              </h2>
              <button
                type="button"
                onClick={() => setNewYearModalOpen(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateNewYearFromPrevious} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  ระบุปีการศึกษาใหม่ (พ.ศ.)
                </label>
                <input
                  required
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="2568"
                  className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  ดึงรายชื่อต่อเนื่องและเลื่อนชั้นอัตโนมัติจากปี
                </label>
                <select
                  value={copyFromYear}
                  onChange={(e) => setCopyFromYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/85 border border-purple-200 text-sm"
                >
                  <option value="">-- เริ่มตารางเปล่า (ไม่คัดลอกรายชื่อเดิม) --</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      ปีการศึกษา {yr} (
                      {records.filter((r) => r.academic_year === yr).length} คน)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewYearModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-purple-200 text-xs font-semibold text-purple-800 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full liquid-btn-primary text-white text-xs font-semibold cursor-pointer"
                >
                  สร้างตารางปีใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
