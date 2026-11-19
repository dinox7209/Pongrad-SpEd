"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoDevelopmentPlans,
  getDemoStudents,
  saveDemoDevelopmentPlans,
} from "@/lib/demo-store";
import { generateDevelopmentPlanPdfBlob } from "@/lib/pdf/generateDevelopmentPlanPdf";
import { promoteGradeLevel } from "@/lib/utils";
import {
  DEV_PLAN_BASE_YEAR,
  DEVELOPMENT_PROGRESS_META,
  DEVELOPMENT_SUBJECTS,
  DevelopmentProgressStatus,
  DevelopmentSkillKey,
  DISABILITY_TYPES,
  GenderType,
  INFORMATION_GRADE_LEVELS,
  SCHOOL_INFO,
  Student,
  StudentDevelopmentPlan,
} from "@/types/database";
import {
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  CopyPlus,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

interface PlanFormState {
  id?: string;
  academic_year: string;
  semester_label: string;
  row_order: number;
  student_id: string;
  full_name: string;
  nickname: string;
  gender: GenderType;
  age_years: string;
  grade_level: string;
  disability_type: string;
  homeroom_teacher: string;
  progress_status: DevelopmentProgressStatus;
  overall_summary: string;
  notes: string;
  skills: Record<DevelopmentSkillKey, string>;
}

const DEFAULT_SKILLS_RECORD: Record<DevelopmentSkillKey, string> = {
  thai: "",
  math: "",
  sci: "",
  social: "",
  english: "",
  history: "",
  health: "",
  art: "",
  career: "",
  antiCorruption: "",
};

function createEmptyPlanForm(year: string, nextOrder: number): PlanFormState {
  return {
    academic_year: year,
    semester_label: "ตลอดปีการศึกษา",
    row_order: nextOrder,
    student_id: "",
    full_name: "",
    nickname: "",
    gender: "ชาย",
    age_years: "",
    grade_level: "ป.1",
    disability_type: "บกพร่องทางสติปัญญา",
    homeroom_teacher: "นางสาวดวงพร หวังอ้อมกลาง",
    progress_status: "กำลังดำเนินการ",
    overall_summary: "",
    notes: "",
    skills: { ...DEFAULT_SKILLS_RECORD },
  };
}

function normalizeSkills(
  raw?: Partial<Record<string, string>> | null
): Record<DevelopmentSkillKey, string> {
  const result = { ...DEFAULT_SKILLS_RECORD };
  if (!raw) return result;
  for (const subj of DEVELOPMENT_SUBJECTS) {
    result[subj.key] = String(raw[subj.key] ?? "");
  }
  return result;
}

const PROGRESS_STATUS_OPTIONS: DevelopmentProgressStatus[] = [
  "กำลังดำเนินการ",
  "พัฒนาขึ้นตามเป้าหมาย",
  "ผ่านเกณฑ์แผน",
  "ต้องติดตามใกล้ชิด",
];

const SEMESTER_PRESETS = [
  "ตลอดปีการศึกษา",
  "ภาคเรียนที่ 1",
  "ภาคเรียนที่ 2",
];

export default function DevelopmentPlansPage() {
  const { isConfigured, user } = useAuth();
  const [plans, setPlans] = useState<StudentDevelopmentPlan[]>([]);
  const [registryStudents, setRegistryStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string>(
    String(DEV_PLAN_BASE_YEAR)
  );
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal (View all 10 subjects)
  const [detailPlan, setDetailPlan] = useState<StudentDevelopmentPlan | null>(
    null
  );

  // Add / Edit Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [form, setForm] = useState<PlanFormState>(
    createEmptyPlanForm(String(DEV_PLAN_BASE_YEAR), 1)
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Future Academic Year Modal (>= 2569 only)
  const [futureYearModalOpen, setFutureYearModalOpen] = useState(false);
  const [nextYearInput, setNextYearInput] = useState(
    String(DEV_PLAN_BASE_YEAR + 1)
  );
  const [copySourceYear, setCopySourceYear] = useState(
    String(DEV_PLAN_BASE_YEAR)
  );
  const [copyMode, setCopyMode] = useState<
    "promote_with_goals" | "promote_blank_goals" | "blank_year"
  >("promote_with_goals");

  // PDF Report Modal
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfTargetPlans, setPdfTargetPlans] = useState<StudentDevelopmentPlan[]>(
    []
  );
  const [pdfScopeTitle, setPdfScopeTitle] = useState("ทุกชั้นเรียน");
  const [pdfReportTitle, setPdfReportTitle] = useState(
    "รายงานแผนผังในการพัฒนาผู้เรียนรายบุคคล (10 กลุ่มสาระ)"
  );
  const [pdfSemesterLabel, setPdfSemesterLabel] = useState("ตลอดปีการศึกษา");
  const [pdfTeacherName, setPdfTeacherName] = useState(
    "นางสาวดวงพร หวังอ้อมกลาง"
  );
  const [pdfSupervisorName, setPdfSupervisorName] =
    useState("นายเอกชัย ปลื้มใจ");
  const [pdfDirectorName, setPdfDirectorName] = useState("นางสาวอำพร คงเจริญ");
  const [pdfIncludeCover, setPdfIncludeCover] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState(
    "development-plan-report-2569.pdf"
  );
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setTableMissing(false);
      try {
        if (isConfigured) {
          const [planRes, stRes] = await Promise.all([
            supabase
              .from("student_development_plans")
              .select("*")
              .gte("academic_year", String(DEV_PLAN_BASE_YEAR))
              .order("academic_year", { ascending: false })
              .order("row_order", { ascending: true }),
            supabase
              .from("students")
              .select("*")
              .order("full_name", { ascending: true }),
          ]);

          if (planRes.error) {
            if (
              planRes.error.code === "42P01" ||
              planRes.error.code === "PGRST205" ||
              planRes.error.message?.includes("does not exist")
            ) {
              setTableMissing(true);
            }
            setPlans([]);
          } else {
            const loaded = ((planRes.data as StudentDevelopmentPlan[]) || []).filter(
              (p) => Number(p.academic_year) >= DEV_PLAN_BASE_YEAR
            );
            setPlans(loaded);
            if (loaded.length > 0) {
              const years = Array.from(
                new Set(loaded.map((p) => p.academic_year))
              ).sort((a, b) => a.localeCompare(b, "th"));
              setSelectedYear(years[0]);
              setCopySourceYear(years[0]);
              const highest = Math.max(
                DEV_PLAN_BASE_YEAR,
                ...years.map((y) => Number(y) || DEV_PLAN_BASE_YEAR)
              );
              setNextYearInput(String(highest + 1));
            }
          }

          if (!stRes.error && stRes.data) {
            setRegistryStudents(stRes.data as Student[]);
          }
        } else {
          const demoPlans = getDemoDevelopmentPlans().filter(
            (p) => Number(p.academic_year) >= DEV_PLAN_BASE_YEAR
          );
          setPlans(demoPlans);
          setRegistryStudents(getDemoStudents());
        }
      } catch (err) {
        console.error("Failed to load development plans:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [isConfigured]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  // Available academic years >= 2569 (never backwards!)
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>([String(DEV_PLAN_BASE_YEAR), selectedYear]);
    for (const p of plans) {
      if (Number(p.academic_year) >= DEV_PLAN_BASE_YEAR) {
        yearSet.add(p.academic_year);
      }
    }
    return Array.from(yearSet).sort((a, b) => a.localeCompare(b, "th"));
  }, [plans, selectedYear]);

  const yearPlans = useMemo(
    () =>
      plans
        .filter((p) => p.academic_year === selectedYear)
        .sort((a, b) => (a.row_order || 999) - (b.row_order || 999)),
    [plans, selectedYear]
  );

  const gradeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of yearPlans) {
      counts.set(p.grade_level, (counts.get(p.grade_level) || 0) + 1);
    }
    const order = INFORMATION_GRADE_LEVELS as readonly string[];
    return Array.from(counts.entries()).sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "th");
    });
  }, [yearPlans]);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return yearPlans.filter((p) => {
      const matchGrade =
        selectedGrade === "all" || p.grade_level === selectedGrade;
      const matchStatus =
        selectedStatus === "all" || p.progress_status === selectedStatus;
      if (!matchGrade || !matchStatus) return false;
      if (!q) return true;
      const skillsText = Object.values(p.skills || {})
        .join(" ")
        .toLowerCase();
      return (
        p.full_name.toLowerCase().includes(q) ||
        p.nickname.toLowerCase().includes(q) ||
        p.grade_level.toLowerCase().includes(q) ||
        skillsText.includes(q)
      );
    });
  }, [yearPlans, selectedGrade, selectedStatus, searchQuery]);

  const countFilledSubjects = (plan: StudentDevelopmentPlan): number => {
    return DEVELOPMENT_SUBJECTS.filter(
      (s) => String(plan.skills?.[s.key] || "").trim().length > 0
    ).length;
  };

  // Modal Triggers
  const openAddModal = () => {
    const nextOrder =
      yearPlans.reduce((max, p) => Math.max(max, p.row_order || 0), 0) + 1;
    setForm(createEmptyPlanForm(selectedYear, nextOrder));
    setErrorMsg("");
    setFormModalOpen(true);
  };

  const openEditModal = (plan: StudentDevelopmentPlan) => {
    setForm({
      id: plan.id,
      academic_year: plan.academic_year,
      semester_label: plan.semester_label || "ตลอดปีการศึกษา",
      row_order: plan.row_order || 1,
      student_id: plan.student_id || "",
      full_name: plan.full_name,
      nickname: plan.nickname || "",
      gender: plan.gender || "ชาย",
      age_years: plan.age_years != null ? String(plan.age_years) : "",
      grade_level: plan.grade_level || "ป.1",
      disability_type: plan.disability_type || "บกพร่องทางสติปัญญา",
      homeroom_teacher:
        plan.homeroom_teacher || "นางสาวดวงพร หวังอ้อมกลาง",
      progress_status: plan.progress_status || "กำลังดำเนินการ",
      overall_summary: plan.overall_summary || "",
      notes: plan.notes || "",
      skills: normalizeSkills(plan.skills),
    });
    setErrorMsg("");
    setDetailPlan(null);
    setFormModalOpen(true);
  };

  const handleLinkRegistryStudent = (studentId: string) => {
    const picked = registryStudents.find((s) => s.id === studentId);
    if (!picked) {
      setForm((prev) => ({ ...prev, student_id: "" }));
      return;
    }
    const inferredGender: GenderType = picked.full_name.startsWith("ด.ญ.")
      ? "หญิง"
      : "ชาย";
    const mappedGrade = picked.grade_level.replace("อนุบาล ", "อ.");
    setForm((prev) => ({
      ...prev,
      student_id: picked.id,
      full_name: prev.id ? prev.full_name : picked.full_name,
      nickname: prev.id ? prev.nickname : picked.nickname,
      gender: prev.id ? prev.gender : inferredGender,
      grade_level: INFORMATION_GRADE_LEVELS.includes(
        mappedGrade as (typeof INFORMATION_GRADE_LEVELS)[number]
      )
        ? mappedGrade
        : prev.grade_level,
      disability_type: picked.disability_type || prev.disability_type,
    }));
  };

  const handleApplyTemplatePlaceholders = () => {
    setForm((prev) => {
      const filled = { ...prev.skills };
      for (const subj of DEVELOPMENT_SUBJECTS) {
        if (!filled[subj.key]?.trim()) {
          filled[subj.key] = subj.placeholder.replace(/^เช่น\s*/, "");
        }
      }
      return { ...prev, skills: filled };
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const yearNum = Number(form.academic_year.trim());
    if (!Number.isFinite(yearNum) || yearNum < DEV_PLAN_BASE_YEAR) {
      setErrorMsg(
        `ระบบแผนพัฒนารายบุคคลเริ่มตั้งแต่ปีการศึกษา ${DEV_PLAN_BASE_YEAR} เป็นต้นไป (ไม่ต้องกรอกย้อนหลัง)`
      );
      return;
    }
    if (!form.full_name.trim()) {
      setErrorMsg("กรุณาระบุชื่อ-สกุลนักเรียน");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        academic_year: String(yearNum),
        semester_label: form.semester_label.trim() || "ตลอดปีการศึกษา",
        row_order: Number(form.row_order) || 1,
        student_id: form.student_id || null,
        full_name: form.full_name.trim(),
        nickname: form.nickname.trim(),
        gender: form.gender,
        age_years: form.age_years.trim() ? Number(form.age_years) : null,
        grade_level: form.grade_level,
        disability_type: form.disability_type.trim(),
        homeroom_teacher:
          form.homeroom_teacher.trim() || "นางสาวดวงพร หวังอ้อมกลาง",
        skills: form.skills,
        progress_status: form.progress_status,
        overall_summary: form.overall_summary.trim(),
        notes: form.notes.trim(),
        updated_by: user?.id || null,
      };

      if (isConfigured) {
        if (form.id) {
          const { data, error } = await supabase
            .from("student_development_plans")
            .update(payload)
            .eq("id", form.id)
            .select()
            .single();
          if (error) throw new Error(error.message);
          const updated = data as StudentDevelopmentPlan;
          setPlans((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        } else {
          const { data, error } = await supabase
            .from("student_development_plans")
            .insert(payload)
            .select()
            .single();
          if (error) throw new Error(error.message);
          const created = data as StudentDevelopmentPlan;
          setPlans((prev) => [...prev, created]);
        }
      } else {
        const now = new Date().toISOString();
        let nextList: StudentDevelopmentPlan[];
        if (form.id) {
          nextList = plans.map((p) =>
            p.id === form.id ? { ...p, ...payload, updated_at: now } : p
          );
        } else {
          const created: StudentDevelopmentPlan = {
            id: `dev-${Date.now()}`,
            ...payload,
            created_at: now,
            updated_at: now,
          };
          nextList = [...plans, created];
        }
        setPlans(nextList);
        saveDemoDevelopmentPlans(nextList);
      }

      setSelectedYear(String(yearNum));
      setSelectedGrade("all");
      setFormModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกแผนพัฒนาผู้เรียนไม่สำเร็จ"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: StudentDevelopmentPlan) => {
    if (
      !confirm(
        `ต้องการลบแผนพัฒนาของ ${plan.full_name} (ปีการศึกษา ${plan.academic_year}) ใช่หรือไม่?`
      )
    ) {
      return;
    }

    if (isConfigured) {
      const { error } = await supabase
        .from("student_development_plans")
        .delete()
        .eq("id", plan.id);
      if (error) {
        alert(`ลบข้อมูลไม่สำเร็จ: ${error.message}`);
        return;
      }
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } else {
      const nextList = plans.filter((p) => p.id !== plan.id);
      setPlans(nextList);
      saveDemoDevelopmentPlans(nextList);
    }
    if (detailPlan?.id === plan.id) setDetailPlan(null);
  };

  const handleCreateFutureYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetYearNum = Number(nextYearInput.trim());
    if (!Number.isFinite(targetYearNum) || targetYearNum < DEV_PLAN_BASE_YEAR) {
      alert(
        `กรุณาระบุปีการศึกษาตั้งแต่ ${DEV_PLAN_BASE_YEAR} ขึ้นไป (ไม่รองรับปีก่อนหน้า)`
      );
      return;
    }
    const targetYear = String(targetYearNum);

    if (copyMode === "blank_year") {
      setSelectedYear(targetYear);
      setSelectedGrade("all");
      setFutureYearModalOpen(false);
      return;
    }

    const sourceRows = plans
      .filter((p) => p.academic_year === copySourceYear)
      .sort((a, b) => (a.row_order || 999) - (b.row_order || 999));

    if (sourceRows.length === 0) {
      alert(`ไม่พบข้อมูลต้นทางในปีการศึกษา ${copySourceYear}`);
      return;
    }

    const existingTarget = plans.some((p) => p.academic_year === targetYear);
    if (
      existingTarget &&
      !confirm(
        `ปีการศึกษา ${targetYear} มีข้อมูลอยู่แล้ว ต้องการเพิ่มรายชื่อจากปี ${copySourceYear} ต่อท้ายอีกหรือไม่?`
      )
    ) {
      return;
    }

    const startOrder =
      plans
        .filter((p) => p.academic_year === targetYear)
        .reduce((max, p) => Math.max(max, p.row_order || 0), 0) + 1;

    const newPayloads = sourceRows.map((row, idx) => ({
      academic_year: targetYear,
      semester_label: "ตลอดปีการศึกษา",
      row_order: startOrder + idx,
      student_id: row.student_id || null,
      full_name: row.full_name,
      nickname: row.nickname,
      gender: row.gender,
      age_years: row.age_years != null ? row.age_years + 1 : null,
      grade_level: promoteGradeLevel(row.grade_level),
      disability_type: row.disability_type || "บกพร่องทางสติปัญญา",
      homeroom_teacher:
        row.homeroom_teacher || "นางสาวดวงพร หวังอ้อมกลาง",
      skills:
        copyMode === "promote_with_goals"
          ? normalizeSkills(row.skills)
          : { ...DEFAULT_SKILLS_RECORD },
      progress_status: "กำลังดำเนินการ" as DevelopmentProgressStatus,
      overall_summary: "",
      notes: `คัดลอกและเลื่อนชั้นจากปีการศึกษา ${copySourceYear}`,
      updated_by: user?.id || null,
    }));

    try {
      if (isConfigured) {
        const { data, error } = await supabase
          .from("student_development_plans")
          .insert(newPayloads)
          .select();
        if (error) throw new Error(error.message);
        setPlans((prev) => [
          ...prev,
          ...((data as StudentDevelopmentPlan[]) || []),
        ]);
      } else {
        const now = new Date().toISOString();
        const created: StudentDevelopmentPlan[] = newPayloads.map((p, idx) => ({
          id: `dev-${targetYear}-${Date.now()}-${idx}`,
          ...p,
          created_at: now,
          updated_at: now,
        }));
        const nextList = [...plans, ...created];
        setPlans(nextList);
        saveDemoDevelopmentPlans(nextList);
      }
      setSelectedYear(targetYear);
      setSelectedGrade("all");
      setFutureYearModalOpen(false);
    } catch (err) {
      alert(
        err instanceof Error
          ? `สร้างปีการศึกษาใหม่ไม่สำเร็จ: ${err.message}`
          : "เกิดข้อผิดพลาด"
      );
    }
  };

  // PDF Report Modal Openers & Runner
  const runPdfGeneration = async (options: {
    targetPlans: StudentDevelopmentPlan[];
    reportTitle: string;
    scopeTitle: string;
    semesterLabel: string;
    teacherName: string;
    supervisorName: string;
    directorName: string;
    includeCover: boolean;
    filename: string;
  }) => {
    setPdfGenerating(true);
    setPdfError("");
    try {
      const blob = await generateDevelopmentPlanPdfBlob({
        reportTitle: options.reportTitle,
        academicYear: selectedYear,
        semesterLabel: options.semesterLabel,
        filterLabel: options.scopeTitle,
        teacherName: options.teacherName,
        supervisorName: options.supervisorName,
        directorName: options.directorName,
        includeSummaryCover: options.includeCover,
        plans: options.targetPlans,
      });
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const nextUrl = URL.createObjectURL(blob);
      setPdfPreviewUrl(nextUrl);
      setPdfFilename(options.filename);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "สร้างรายงาน PDF ไม่สำเร็จ"
      );
    } finally {
      setPdfGenerating(false);
    }
  };

  const openIndividualPdfModal = async (plan: StudentDevelopmentPlan) => {
    const scope = `${plan.full_name} (ชั้น ${plan.grade_level})`;
    const title = `รายงานแผนผังในการพัฒนาผู้เรียนรายบุคคล (${plan.nickname ? `น้อง${plan.nickname}` : plan.full_name})`;
    const sem = plan.semester_label || "ตลอดปีการศึกษา";
    const teacher = plan.homeroom_teacher || "นางสาวดวงพร หวังอ้อมกลาง";
    const fname = `development-plan-${plan.academic_year}-no${plan.row_order || 1}.pdf`;

    setPdfTargetPlans([plan]);
    setPdfScopeTitle(scope);
    setPdfReportTitle(title);
    setPdfSemesterLabel(sem);
    setPdfTeacherName(teacher);
    setPdfIncludeCover(false);
    setPdfModalOpen(true);

    await runPdfGeneration({
      targetPlans: [plan],
      reportTitle: title,
      scopeTitle: scope,
      semesterLabel: sem,
      teacherName: teacher,
      supervisorName: pdfSupervisorName,
      directorName: pdfDirectorName,
      includeCover: false,
      filename: fname,
    });
  };

  const openCohortPdfModal = async () => {
    const target = filteredPlans.length > 0 ? filteredPlans : yearPlans;
    if (target.length === 0) {
      alert(`ยังไม่มีข้อมูลนักเรียนในปีการศึกษา ${selectedYear}`);
      return;
    }
    const gradeLabel =
      selectedGrade === "all"
        ? `ทุกชั้นเรียน (${target.length} คน)`
        : `ชั้น ${selectedGrade} (${target.length} คน)`;
    const title = `รายงานสรุปแผนผังในการพัฒนาผู้เรียนรายบุคคล (10 กลุ่มสาระ) ปีการศึกษา ${selectedYear}`;
    const fname = `development-plan-cohort-${selectedYear}-${selectedGrade === "all" ? "all" : selectedGrade}.pdf`;

    setPdfTargetPlans(target);
    setPdfScopeTitle(gradeLabel);
    setPdfReportTitle(title);
    setPdfSemesterLabel("ตลอดปีการศึกษา");
    setPdfIncludeCover(true);
    setPdfModalOpen(true);

    await runPdfGeneration({
      targetPlans: target,
      reportTitle: title,
      scopeTitle: gradeLabel,
      semesterLabel: "ตลอดปีการศึกษา",
      teacherName: pdfTeacherName,
      supervisorName: pdfSupervisorName,
      directorName: pdfDirectorName,
      includeCover: true,
      filename: fname,
    });
  };

  const handleExportCsv = () => {
    const headers = [
      "ปีการศึกษา",
      "ภาคเรียน",
      "ลำดับ",
      "ชื่อ-สกุล",
      "ชื่อเล่น",
      "เพศ",
      "อายุ(ปี)",
      "ชั้น",
      "ประเภทความต้องการพิเศษ",
      "ครูผู้รับผิดชอบ",
      "สถานะพัฒนาการ",
      ...DEVELOPMENT_SUBJECTS.map((s) => s.name),
      "สรุปพัฒนาการ/ข้อเสนอแนะ",
      "หมายเหตุ",
    ];
    const rows = filteredPlans.map((p) => [
      p.academic_year,
      p.semester_label,
      String(p.row_order),
      p.full_name,
      p.nickname,
      p.gender,
      p.age_years ?? "",
      p.grade_level,
      p.disability_type || "",
      p.homeroom_teacher,
      p.progress_status,
      ...DEVELOPMENT_SUBJECTS.map((s) => p.skills?.[s.key] || ""),
      p.overall_summary || "",
      p.notes || "",
    ]);

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `development-plans-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-7 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-7">
      {/* Liquid Glass Header */}
      <div className="liquid-glass-hero running-line-bottom rounded-[2rem] text-white p-6 sm:p-8 no-print">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-pink-100 text-xs font-semibold border border-white/25 backdrop-blur-md">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {SCHOOL_INFO.name} • {SCHOOL_INFO.projectName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              แผนผังในการพัฒนาผู้เรียนรายบุคคล (10 กลุ่มสาระ)
            </h1>
            <p className="text-purple-100/95 text-sm max-w-3xl leading-relaxed">
              บันทึกและวางแผนเป้าหมายพัฒนาการรายบุคคลตั้งแต่{" "}
              <strong className="text-white">ปีการศึกษา 2569 เป็นต้นไป</strong>{" "}
              รองรับการเลื่อนชั้นสร้างแผนปีอนาคตล่วงหน้า และออกรายงาน A4 PDF พร้อมลงนามได้ทันที
            </p>

            {/* Quick Year Overview Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25">
                <Users className="w-3.5 h-3.5 text-pink-200" />
                <span>
                  ปีการศึกษา {selectedYear}: <strong>{yearPlans.length} คน</strong>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25">
                <BookOpen className="w-3.5 h-3.5 text-pink-200" />
                <span>กลุ่มสาระ: <strong>10 สาระ</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25">
                <GraduationCap className="w-3.5 h-3.5 text-pink-200" />
                <span>
                  ระดับชั้น:{" "}
                  <strong>
                    {gradeCounts.length > 0
                      ? gradeCounts.map(([g]) => g).join(", ")
                      : "พร้อมรับข้อมูล"}
                  </strong>
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-purple-950 hover:bg-pink-50 text-xs sm:text-sm font-bold shadow-glass-pink cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-pink-600" />
              <span>เพิ่มแผนรายบุคคล</span>
            </button>

            <button
              type="button"
              onClick={openCohortPdfModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white text-xs sm:text-sm font-bold border border-white/35 shadow-glass-pink cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>สร้าง PDF รายงาน</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/25 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-pink-200" />
              <span>Excel CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Missing Table Warning */}
      {tableMissing && (
        <div className="liquid-glass border-amber-300 bg-amber-50/90 rounded-3xl p-5 text-sm text-amber-950 space-y-2 no-print">
          <div className="font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>ยังไม่ได้สร้างตาราง student_development_plans ใน Supabase</span>
          </div>
          <p className="text-xs leading-relaxed">
            กรุณานำไฟล์ <code className="font-mono font-semibold">supabase/schema.sql</code>{" "}
            และไฟล์ <code className="font-mono font-semibold">supabase/seed_development_plans.local.sql</code>{" "}
            ไป Run ใน Supabase Dashboard → SQL Editor เพื่อสร้างตารางและนำเข้าข้อมูลนักเรียนปีการศึกษา 2569 ทั้ง 9 คนครับ
          </p>
        </div>
      )}

      {/* Academic Year Selector (Future-ready: starts from 2569 -> 2570, 2571...) */}
      <div className="liquid-glass rounded-3xl p-4 sm:p-5 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-purple-900/75 mr-1">
              ปีการศึกษา (ฐานข้อมูล 2569 → อนาคต):
            </span>
            {availableYears.map((yr) => {
              const count = plans.filter((p) => p.academic_year === yr).length;
              const active = yr === selectedYear;
              return (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setSelectedYear(yr);
                    setSelectedGrade("all");
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold cursor-pointer transition-all ${
                    active
                      ? "bg-gradient-to-r from-purple-700 to-pink-600 text-white shadow-glass-pink"
                      : "bg-white/80 hover:bg-white text-purple-900 border border-purple-200"
                  }`}
                >
                  <span>ปีการศึกษา {yr}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      active
                        ? "bg-white/25 text-white"
                        : "bg-purple-100 text-purple-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const maxYr = Math.max(
                  DEV_PLAN_BASE_YEAR,
                  ...availableYears.map((y) => Number(y) || DEV_PLAN_BASE_YEAR)
                );
                setNextYearInput(String(maxYr + 1));
                setCopySourceYear(selectedYear);
                setFutureYearModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold cursor-pointer transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5 text-pink-600" />
              <span>วางแผนปีการศึกษาอนาคต (+ ปีใหม่)</span>
            </button>
            <Link
              href="/admin/generator"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 text-xs font-semibold transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ตัวสร้าง A4 &amp; Drive</span>
            </Link>
          </div>
        </div>

        {/* Grade Tabs + Status + Search */}
        <div className="pt-3 border-t border-purple-100/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedGrade("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                selectedGrade === "all"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "bg-white/80 hover:bg-white text-purple-900 border border-purple-200/80"
              }`}
            >
              ทั้งหมด ({yearPlans.length})
            </button>
            {gradeCounts.map(([grade, count]) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  selectedGrade === grade
                    ? "bg-pink-600 text-white shadow-sm"
                    : "bg-white/80 hover:bg-white text-purple-900 border border-purple-200/80"
                }`}
              >
                ชั้น {grade} ({count})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="กรองตามสถานะพัฒนาการ"
              className="bg-white/90 border border-purple-200 rounded-xl px-3 py-1.5 text-xs font-medium text-purple-950 focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              <option value="all">ทุกสถานะการพัฒนา</option>
              {PROGRESS_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ ชื่อเล่น หรือทักษะ..."
                className="w-full bg-white/90 border border-purple-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-navy-950 focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Student Development Plan Cards Grid */}
      {loading ? (
        <div className="liquid-glass rounded-3xl p-12 text-center text-sm text-purple-900/70 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
          <span>กำลังโหลดแผนผังพัฒนาผู้เรียนรายบุคคล...</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-pink-300 mx-auto" />
          <div className="text-base font-bold text-navy-950">
            ไม่พบแผนพัฒนาผู้เรียนในปีการศึกษา {selectedYear} ตามเงื่อนไขที่เลือก
          </div>
          <p className="text-xs text-purple-900/70 max-w-md mx-auto">
            คุณครูสามารถกดปุ่ม &ldquo;เพิ่มแผนรายบุคคล&rdquo; เพื่อเริ่มบันทึกเป้าหมาย 10 กลุ่มสาระของนักเรียนได้เลยครับ
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {(selectedGrade !== "all" ||
              selectedStatus !== "all" ||
              searchQuery.trim() !== "") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGrade("all");
                  setSelectedStatus("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-full bg-white border border-purple-200 text-xs font-semibold text-purple-900 cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มผู้เรียนคนแรก</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredPlans.map((plan) => {
            const statusMeta =
              DEVELOPMENT_PROGRESS_META[plan.progress_status] ||
              DEVELOPMENT_PROGRESS_META["กำลังดำเนินการ"];
            const filledCount = countFilledSubjects(plan);
            const avatarEmoji = plan.gender === "หญิง" ? "👧" : "👦";

            return (
              <div
                key={plan.id}
                className="liquid-glass running-line-bottom rounded-3xl p-5 flex flex-col justify-between gap-4 hover:-translate-y-1 hover:shadow-glass-lg transition-all"
              >
                <div className="space-y-3.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                        ชั้น {plan.grade_level}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`}
                        />
                        {statusMeta.label}
                      </span>
                    </div>
                    <span className="text-purple-900/55 font-mono text-[11px] shrink-0">
                      ลำดับที่ {String(plan.row_order || 1).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Student Profile */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200/80 text-2xl flex items-center justify-center shrink-0">
                      {avatarEmoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-navy-950 text-sm sm:text-base truncate">
                        {plan.full_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-purple-900/75 mt-0.5">
                        {plan.nickname && (
                          <span className="px-2 py-0.5 rounded-md bg-pink-100/80 text-pink-800 font-semibold text-[11px]">
                            น้อง{plan.nickname}
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          อายุ {plan.age_years != null ? `${plan.age_years} ปี` : "-"}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] text-purple-700 font-medium">
                          ครบ {filledCount}/10 สาระ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thai & Math Preview Snippets */}
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-2xl bg-white/75 border border-purple-100">
                      <span className="font-bold text-purple-800 block mb-0.5 text-[11px]">
                        ๑. ภาษาไทย
                      </span>
                      <p className="text-navy-950/80 line-clamp-2 leading-relaxed">
                        {plan.skills?.thai || "-"}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-white/75 border border-pink-100">
                      <span className="font-bold text-pink-700 block mb-0.5 text-[11px]">
                        ๒. คณิตศาสตร์
                      </span>
                      <p className="text-navy-950/80 line-clamp-2 leading-relaxed">
                        {plan.skills?.math || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-2 border-t border-purple-100/80 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailPlan(plan)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-pink-600" />
                    <span>ดูครบ 10 สาระ</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    title="แก้ไขข้อมูล"
                    className="p-2 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openIndividualPdfModal(plan)}
                    title="สร้าง PDF รายงานรายบุคคล"
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold cursor-pointer hover:opacity-95 transition-opacity"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Full 10 Subjects Detail Viewer */}
      {detailPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col liquid-glass bg-white/95 rounded-3xl shadow-glass-lg overflow-hidden border border-purple-200">
            <div className="px-5 py-4 liquid-glass-nav running-line-bottom text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-white/20 text-2xl flex items-center justify-center border border-white/30 shrink-0">
                  {detailPlan.gender === "หญิง" ? "👧" : "👦"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-base sm:text-lg truncate">
                      {detailPlan.full_name}
                    </h2>
                    {detailPlan.nickname && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-pink-100">
                        น้อง{detailPlan.nickname}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-purple-100/90 mt-0.5">
                    ชั้น {detailPlan.grade_level} • อายุ{" "}
                    {detailPlan.age_years ?? "-"} ปี • ปีการศึกษา{" "}
                    {detailPlan.academic_year} ({detailPlan.semester_label}) •
                    ลำดับที่ {detailPlan.row_order}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailPlan(null)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-purple-50/80 border border-purple-100 rounded-2xl px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-3 text-purple-950">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-pink-600" />
                    ครูผู้รับผิดชอบ: {detailPlan.homeroom_teacher}
                  </span>
                  {detailPlan.disability_type && (
                    <span>• ประเภท: {detailPlan.disability_type}</span>
                  )}
                </div>
                <span className="font-bold text-pink-700">
                  สถานะ: {detailPlan.progress_status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {DEVELOPMENT_SUBJECTS.map((subj) => {
                  const text =
                    (detailPlan.skills?.[subj.key] || "").trim() || "-";
                  return (
                    <div
                      key={subj.key}
                      className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-sm space-y-1.5"
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${subj.accentClass}`}
                      >
                        <span>{subj.indexThai}.</span>
                        <span>{subj.name}</span>
                      </div>
                      <p className="text-navy-950/85 text-xs sm:text-[13px] leading-relaxed">
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>

              {detailPlan.overall_summary && (
                <div className="p-4 rounded-2xl bg-pink-50/70 border border-pink-200 text-xs space-y-1">
                  <div className="font-bold text-pink-800">
                    สรุปผลพัฒนาการ / ข้อเสนอแนะประกอบรายงาน:
                  </div>
                  <p className="text-navy-950/90 leading-relaxed">
                    {detailPlan.overall_summary}
                  </p>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 border-t border-purple-100 bg-purple-50/40 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleDeletePlan(detailPlan)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบรายการ</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(detailPlan)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-pink-600" />
                  <span>แก้ไขเป้าหมาย</span>
                </button>
                <button
                  type="button"
                  onClick={() => openIndividualPdfModal(detailPlan)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>สร้าง PDF รายงานรายคน</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Future-Ready Add / Edit 10-Subject Plan Modal */}
      {formModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto liquid-glass bg-white/95 rounded-3xl p-6 space-y-5 shadow-glass-lg border border-purple-200">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy-950">
                  {form.id
                    ? "แก้ไขแผนผังพัฒนาผู้เรียนรายบุคคล (10 กลุ่มสาระ)"
                    : "เพิ่มแผนผังพัฒนาผู้เรียนรายบุคคล (ปี 2569 / ปีอนาคต)"}
                </h2>
                <p className="text-xs text-purple-900/70">
                  กรอกข้อมูลพื้นฐานและเป้าหมายครบทั้ง 10 กลุ่มสาระเพื่อแสดงผลและสร้างรายงาน PDF
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="p-2 rounded-xl text-purple-700 hover:bg-purple-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-5">
              {/* Optional Link from Student Registry */}
              {registryStudents.length > 0 && !form.id && (
                <div className="p-3.5 rounded-2xl bg-purple-50/75 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-purple-900">
                    ดึงข้อมูลพื้นฐานจากทะเบียนนักเรียน (ไม่บังคับ):
                  </span>
                  <select
                    value={form.student_id}
                    onChange={(e) => handleLinkRegistryStudent(e.target.value)}
                    className="sm:w-72 bg-white border border-purple-200 rounded-xl px-3 py-1.5 text-xs text-navy-950"
                  >
                    <option value="">-- กรอกรายชื่อใหม่ด้วยตนเอง --</option>
                    {registryStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.full_name} ({st.nickname || st.grade_level})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Core Student Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ปีการศึกษา (ตั้งแต่ 2569+) *
                  </label>
                  <input
                    type="number"
                    min={DEV_PLAN_BASE_YEAR}
                    max={2650}
                    required
                    value={form.academic_year}
                    onChange={(e) =>
                      setForm({ ...form, academic_year: e.target.value })
                    }
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ภาคเรียน / ช่วงแผน
                  </label>
                  <input
                    type="text"
                    list="semester-presets"
                    value={form.semester_label}
                    onChange={(e) =>
                      setForm({ ...form, semester_label: e.target.value })
                    }
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                  <datalist id="semester-presets">
                    {SEMESTER_PRESETS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ลำดับที่ / หน้าเอกสาร
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.row_order}
                    onChange={(e) =>
                      setForm({ ...form, row_order: Number(e.target.value) })
                    }
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    สถานะพัฒนาการ
                  </label>
                  <select
                    value={form.progress_status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        progress_status: e.target
                          .value as DevelopmentProgressStatus,
                      })
                    }
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {PROGRESS_STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ชื่อ - สกุลนักเรียน *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      setForm({ ...form, full_name: e.target.value })
                    }
                    placeholder="เช่น ด.ช. ... หรือ ด.ญ. ..."
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    value={form.nickname}
                    onChange={(e) =>
                      setForm({ ...form, nickname: e.target.value })
                    }
                    placeholder="ไม่ต้องใส่คำว่า น้อง"
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-purple-950 block mb-1">
                      เพศ
                    </label>
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gender: e.target.value as GenderType,
                        })
                      }
                      className="w-full border border-purple-200 rounded-xl px-2.5 py-2 text-sm bg-white"
                    >
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-purple-950 block mb-1">
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
                      className="w-full border border-purple-200 rounded-xl px-2.5 py-2 text-sm bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ระดับชั้น
                  </label>
                  <select
                    value={form.grade_level}
                    onChange={(e) =>
                      setForm({ ...form, grade_level: e.target.value })
                    }
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {INFORMATION_GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ประเภทความต้องการพิเศษ
                  </label>
                  <select
                    value={form.disability_type}
                    onChange={(e) =>
                      setForm({ ...form, disability_type: e.target.value })
                    }
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {DISABILITY_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ครูประจำชั้น / ผู้รับผิดชอบจัดทำแผน
                  </label>
                  <input
                    type="text"
                    value={form.homeroom_teacher}
                    onChange={(e) =>
                      setForm({ ...form, homeroom_teacher: e.target.value })
                    }
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>

              {/* 10 Subjects Targets Section */}
              <div className="space-y-3 pt-2 border-t border-purple-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-purple-950">
                    เป้าหมายการพัฒนาผู้เรียนครบทั้ง 10 กลุ่มสาระการเรียนรู้
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyTemplatePlaceholders}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-semibold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>เติมข้อความตั้งต้นในช่องที่ยังว่าง</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DEVELOPMENT_SUBJECTS.map((subj) => (
                    <div
                      key={subj.key}
                      className="p-3 rounded-2xl bg-purple-50/45 border border-purple-100 space-y-1.5"
                    >
                      <label className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                        <span className="text-pink-600">{subj.indexThai}.</span>
                        <span>{subj.name}</span>
                      </label>
                      <textarea
                        rows={2}
                        value={form.skills[subj.key]}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            skills: {
                              ...form.skills,
                              [subj.key]: e.target.value,
                            },
                          })
                        }
                        placeholder={subj.placeholder}
                        className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Summary & Notes for Report */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm pt-1">
                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    สรุปผลพัฒนาการ / ข้อเสนอแนะ (แสดงในรายงาน PDF)
                  </label>
                  <textarea
                    rows={2}
                    value={form.overall_summary}
                    onChange={(e) =>
                      setForm({ ...form, overall_summary: e.target.value })
                    }
                    placeholder="เช่น ผู้เรียนจดจำพยัญชนะและมีสมาธิในการฝึกกิจกรรมได้ดีขึ้นอย่างต่อเนื่อง..."
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    หมายเหตุเพิ่มเติม (เฉพาะหลังบ้าน)
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="เช่น เอกสารหน้าที่ 1"
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-purple-100">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-purple-200 text-xs font-semibold text-purple-900 bg-white cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {saving
                      ? "กำลังบันทึก..."
                      : form.id
                      ? "บันทึกการแก้ไข"
                      : "บันทึกแผนพัฒนาผู้เรียน"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Plan Future Academic Year (>= 2570) */}
      {futureYearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/50 backdrop-blur-sm">
          <form
            onSubmit={handleCreateFutureYear}
            className="w-full max-w-lg liquid-glass bg-white/95 rounded-3xl p-6 space-y-4 shadow-glass-lg border border-purple-200"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2 font-bold text-navy-950">
                <CopyPlus className="w-5 h-5 text-pink-600" />
                <span>วางแผนปีการศึกษาในอนาคต (ไม่ย้อนหลัง)</span>
              </div>
              <button
                type="button"
                onClick={() => setFutureYearModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-purple-950 block mb-1">
                  ปีการศึกษาอนาคตที่ต้องการสร้าง (ตั้งแต่ {DEV_PLAN_BASE_YEAR} ขึ้นไป)
                </label>
                <input
                  type="number"
                  min={DEV_PLAN_BASE_YEAR}
                  max={2650}
                  required
                  value={nextYearInput}
                  onChange={(e) => setNextYearInput(e.target.value)}
                  className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="text-xs font-semibold text-purple-950">
                  เลือกรูปแบบการเตรียมข้อมูลในปีใหม่:
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-purple-50/70 border border-purple-200 cursor-pointer">
                  <input
                    type="radio"
                    name="copyMode"
                    checked={copyMode === "promote_with_goals"}
                    onChange={() => setCopyMode("promote_with_goals")}
                    className="mt-1 accent-pink-600"
                  />
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-navy-950">
                      คัดลอกรายชื่อ + เลื่อนชั้น/เพิ่มอายุ + ยกเป้าหมายเดิมไปปรับแก้ต่อ (แนะนำ)
                    </div>
                    <div className="text-purple-900/70">
                      ช่วยประหยัดเวลา คุณครูแก้เฉพาะกลุ่มสาระที่ปรับระดับขึ้นสำหรับปีใหม่
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-purple-200 cursor-pointer">
                  <input
                    type="radio"
                    name="copyMode"
                    checked={copyMode === "promote_blank_goals"}
                    onChange={() => setCopyMode("promote_blank_goals")}
                    className="mt-1 accent-pink-600"
                  />
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-navy-950">
                      คัดลอกเฉพาะรายชื่อ + เลื่อนชั้น/เพิ่มอายุ (ล้างช่อง 10 สาระให้กรอกใหม่)
                    </div>
                    <div className="text-purple-900/70">
                      เหมาะเมื่อต้องการเขียนเป้าหมายใหม่ทั้งหมดสำหรับปีการศึกษาใหม่
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-purple-200 cursor-pointer">
                  <input
                    type="radio"
                    name="copyMode"
                    checked={copyMode === "blank_year"}
                    onChange={() => setCopyMode("blank_year")}
                    className="mt-1 accent-pink-600"
                  />
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-navy-950">
                      เปิดปีการศึกษาใหม่แบบหน้าว่าง
                    </div>
                    <div className="text-purple-900/70">
                      เพิ่มรายชื่อนักเรียนใหม่ด้วยตนเองทีละคน
                    </div>
                  </div>
                </label>
              </div>

              {copyMode !== "blank_year" && (
                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    คัดลอกรายชื่อจากปีการศึกษา:
                  </label>
                  <select
                    value={copySourceYear}
                    onChange={(e) => setCopySourceYear(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        ปีการศึกษา {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFutureYearModalOpen(false)}
                className="px-4 py-2 rounded-full border border-purple-200 text-xs font-semibold text-purple-900 bg-white cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
              >
                สร้างแผนปี {nextYearInput}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 4: Executive A4 PDF Report Generator & Live Preview */}
      {pdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-purple-950/60 backdrop-blur-sm">
          <div className="w-full max-w-6xl h-[92vh] flex flex-col liquid-glass bg-white/95 rounded-3xl shadow-glass-lg border border-purple-200 overflow-hidden">
            <div className="px-5 py-3.5 liquid-glass-nav running-line-bottom text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-pink-200 shrink-0" />
                  <span className="truncate">
                    ศูนย์สร้างรายงาน PDF (A4 ภาษาไทยพร้อมลงนาม) — {pdfScopeTitle}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pdfPreviewUrl && (
                  <a
                    href={pdfPreviewUrl}
                    download={pdfFilename}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-purple-950 hover:bg-pink-50 text-xs font-bold shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-pink-600" />
                    <span>ดาวน์โหลด PDF</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(false)}
                  className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Left Report Settings */}
              <div className="lg:col-span-4 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-purple-100 overflow-y-auto space-y-3.5 text-xs bg-purple-50/35">
                <div className="font-bold text-navy-950 text-sm">
                  ปรับแต่งหัวรายงานและผู้ลงนาม
                </div>

                <div>
                  <label className="font-semibold text-purple-950 block mb-1">
                    ชื่อหัวข้อรายงาน
                  </label>
                  <input
                    type="text"
                    value={pdfReportTitle}
                    onChange={(e) => setPdfReportTitle(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-purple-950 block mb-1">
                    ภาคเรียน / รอบรายงาน
                  </label>
                  <input
                    type="text"
                    value={pdfSemesterLabel}
                    onChange={(e) => setPdfSemesterLabel(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-purple-950 block mb-1">
                    ครูผู้รับผิดชอบ / ผู้จัดทำแผน
                  </label>
                  <input
                    type="text"
                    value={pdfTeacherName}
                    onChange={(e) => setPdfTeacherName(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-purple-950 block mb-1">
                    ครูพี่เลี้ยงเด็กพิเศษ
                  </label>
                  <input
                    type="text"
                    value={pdfSupervisorName}
                    onChange={(e) => setPdfSupervisorName(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 bg-white text-xs"
                  />
                </div>

                <div>
                  <label className="font-semibold text-purple-950 block mb-1">
                    ผู้อำนวยการสถานศึกษา
                  </label>
                  <input
                    type="text"
                    value={pdfDirectorName}
                    onChange={(e) => setPdfDirectorName(e.target.value)}
                    className="w-full border border-purple-200 rounded-xl px-3 py-2 bg-white text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-purple-200 cursor-pointer font-medium text-purple-950">
                  <input
                    type="checkbox"
                    checked={pdfIncludeCover}
                    onChange={(e) => setPdfIncludeCover(e.target.checked)}
                    className="accent-pink-600"
                  />
                  <span>เพิ่มหน้าปกสรุปภาพรวม &amp; ทะเบียนรายชื่อ</span>
                </label>

                {pdfError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {pdfError}
                  </div>
                )}

                <button
                  type="button"
                  disabled={pdfGenerating}
                  onClick={() =>
                    runPdfGeneration({
                      targetPlans: pdfTargetPlans,
                      reportTitle: pdfReportTitle,
                      scopeTitle: pdfScopeTitle,
                      semesterLabel: pdfSemesterLabel,
                      teacherName: pdfTeacherName,
                      supervisorName: pdfSupervisorName,
                      directorName: pdfDirectorName,
                      includeCover: pdfIncludeCover,
                      filename: pdfFilename,
                    })
                  }
                  className="w-full py-2.5 px-4 rounded-full liquid-btn-primary text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {pdfGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {pdfGenerating
                      ? "กำลังสร้างเอกสาร PDF..."
                      : "อัปเดตตัวอย่าง PDF"}
                  </span>
                </button>
              </div>

              {/* Right PDF Live Preview */}
              <div className="lg:col-span-8 bg-purple-100/40 flex items-center justify-center min-h-[400px]">
                {pdfGenerating ? (
                  <div className="text-center space-y-2 text-purple-900/75 text-sm">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-pink-600" />
                    <div>กำลังจัดหน้าเอกสาร A4 ภาษาไทย ({pdfTargetPlans.length} คน)...</div>
                  </div>
                ) : pdfPreviewUrl ? (
                  <iframe
                    src={pdfPreviewUrl}
                    title="Development Plan A4 PDF Preview"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center text-xs text-purple-900/65 p-6">
                    กดปุ่ม &ldquo;อัปเดตตัวอย่าง PDF&rdquo; เพื่อสร้างเอกสารรายงาน
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
