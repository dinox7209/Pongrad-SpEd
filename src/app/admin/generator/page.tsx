"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoDevelopmentPlans,
  getDemoLogs,
  getDemoMedia,
  getDemoStudents,
  saveDemoMedia,
  getDemoTasks,
  saveDemoTasks,
} from "@/lib/demo-store";
import { generateDevelopmentPlanPdfBlob } from "@/lib/pdf/generateDevelopmentPlanPdf";
import { getMediaStreamUrl, isDemoDriveId } from "@/lib/utils";
import type { PdfPhotoItem, PdfTemplateType } from "@/components/pdf/SpEdPdfTemplates";
import {
  DEV_PLAN_BASE_YEAR,
  MediaAsset,
  SKILL_CATEGORIES,
  Student,
  StudentDevelopmentPlan,
  StudentLog,
} from "@/types/database";
import {
  CheckCircle2,
  CloudUpload,
  Download,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Newspaper,
  Sparkles,
  UserCheck,
} from "lucide-react";

type ExtendedTemplateType = PdfTemplateType | "development_plan";

const TEMPLATE_OPTIONS: {
  id: ExtendedTemplateType;
  label: string;
  desc: string;
  defaultMediaType: MediaAsset["media_type"];
  defaultPublic: boolean;
}[] = [
  {
    id: "cover",
    label: "1. หน้าปกรายงาน A4",
    desc: "ปกแฟ้มข้อมูล/รายงานการศึกษาพิเศษรายบุคคล พร้อมรูปภาพ",
    defaultMediaType: "report",
    defaultPublic: false,
  },
  {
    id: "progress_report",
    label: "2. รายงานสรุปพัฒนาการ",
    desc: "ดึงประวัติ Case Timeline และเป้าหมาย IEP จัดหน้า A4 พร้อมลายเซ็น",
    defaultMediaType: "report",
    defaultPublic: false,
  },
  {
    id: "portfolio",
    label: "3. แผ่นแสดงผลงาน Portfolio",
    desc: "รวมภาพผลงานนักเรียนจาก Google Drive พร้อมคำบรรยายทักษะ",
    defaultMediaType: "portfolio",
    defaultPublic: false,
  },
  {
    id: "newsletter",
    label: "4. วารสารประจำสัปดาห์",
    desc: "วารสารข่าวประชาสัมพันธ์ A4 (เลือกเปิดเผยแพร่บน /showcase ได้)",
    defaultMediaType: "newsletter",
    defaultPublic: false,
  },
  {
    id: "development_plan",
    label: "5. แผนพัฒนา 10 กลุ่มสาระ",
    desc: "รายงานแผนผังพัฒนาผู้เรียนรายบุคคล/รวมห้อง (ปี 2569+ พร้อมลงนาม)",
    defaultMediaType: "report",
    defaultPublic: false,
  },
];

async function urlToJpegDataUri(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 1000;
      let w = img.width || 800;
      let h = img.height || 500;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Cannot create canvas context"));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

function GeneratorContent() {
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("studentId") || "";

  const { isConfigured, profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [allLogs, setAllLogs] = useState<StudentLog[]>([]);
  const [imageAssets, setImageAssets] = useState<MediaAsset[]>([]);
  const [devPlans, setDevPlans] = useState<StudentDevelopmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [template, setTemplate] =
    useState<ExtendedTemplateType>("progress_report");
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [selectedPlanScope, setSelectedPlanScope] = useState<string>("cohort");
  const [directorName, setDirectorName] = useState("นางสาวอำพร คงเจริญ");
  const [supervisorName, setSupervisorName] = useState("นายเอกชัย ปลื้มใจ");
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [documentTitle, setDocumentTitle] = useState(
    "รายงานสรุปพัฒนาการนักเรียนการศึกษาพิเศษรายบุคคล"
  );
  const [academicYear, setAcademicYear] = useState("2569");
  const [semesterLabel, setSemesterLabel] = useState("ภาคเรียนที่ 2/2569");
  const [weekNumber, setWeekNumber] = useState<number>(2);
  const [teacherName, setTeacherName] = useState("");
  const [summaryText, setSummaryText] = useState(
    "นักเรียนมีพัฒนาการด้านการสื่อสาร การจดจ่อ และทักษะกล้ามเนื้อมัดเล็กดีขึ้นอย่างต่อเนื่อง จากการใช้สื่อรูปธรรมและการเสริมแรงเชิงบวกในชั้นเรียน"
  );
  const [parentTipText, setParentTipText] = useState(
    "ผู้ปกครองสามารถฝึกทักษะต่อเนื่องที่บ้านวันละ 10-15 นาที ผ่านกิจกรรมเล่นเกมจับคู่และเล่านิทานภาพ"
  );
  const [isPublic, setIsPublic] = useState(false);
  const [linkToWeek, setLinkToWeek] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setTeacherName(
      profile?.display_name || "คณะทำงานห้องเรียนเสริมวิชาการสู่การเรียนรวม"
    );
  }, [profile]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (isConfigured) {
        const [stRes, logRes, mediaRes, planRes] = await Promise.all([
          supabase.from("students").select("*").order("student_code", { ascending: true }),
          supabase
            .from("student_logs")
            .select("*")
            .order("logged_date", { ascending: false }),
          supabase
            .from("media_assets")
            .select("*")
            .eq("media_type", "image")
            .order("created_at", { ascending: false }),
          supabase
            .from("student_development_plans")
            .select("*")
            .gte("academic_year", String(DEV_PLAN_BASE_YEAR))
            .order("academic_year", { ascending: false })
            .order("row_order", { ascending: true }),
        ]);

        const stList = (stRes.data as Student[]) || [];
        setStudents(stList);
        setAllLogs((logRes.data as StudentLog[]) || []);
        setImageAssets((mediaRes.data as MediaAsset[]) || []);
        setDevPlans(
          !planRes.error && planRes.data
            ? (planRes.data as StudentDevelopmentPlan[])
            : []
        );
        if (!initialStudentId && stList[0]) {
          setSelectedStudentId(stList[0].id);
        }
      } else {
        const stList = getDemoStudents();
        setStudents(stList);
        setAllLogs(getDemoLogs());
        setImageAssets(getDemoMedia().filter((m) => m.media_type === "image"));
        setDevPlans(getDemoDevelopmentPlans());
        if (!initialStudentId && stList[0]) {
          setSelectedStudentId(stList[0].id);
        }
      }
      setLoading(false);
    }
    load();
  }, [isConfigured, initialStudentId]);

  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const studentLogs = useMemo(
    () => allLogs.filter((l) => l.student_id === selectedStudentId),
    [allLogs, selectedStudentId]
  );

  const handleTemplateSelect = (nextTpl: ExtendedTemplateType) => {
    setTemplate(nextTpl);
    const meta = TEMPLATE_OPTIONS.find((t) => t.id === nextTpl);
    if (meta) {
      setIsPublic(meta.defaultPublic);
      setLinkToWeek(nextTpl === "newsletter");
    }

    if (nextTpl === "cover") {
      setDocumentTitle("แฟ้มพัฒนาการและสื่อการสอนเฉพาะบุคคล (IEP)");
    } else if (nextTpl === "progress_report") {
      setDocumentTitle("รายงานสรุปพัฒนาการนักเรียนการศึกษาพิเศษรายบุคคล");
    } else if (nextTpl === "portfolio") {
      setDocumentTitle(
        `Portfolio ผลงานนักเรียน ${selectedStudent ? `(${selectedStudent.nickname})` : ""}`
      );
    } else if (nextTpl === "newsletter") {
      setDocumentTitle(`วารสารข่าวการศึกษาพิเศษ ประจำสัปดาห์ที่ ${weekNumber}`);
    } else if (nextTpl === "development_plan") {
      setDocumentTitle("รายงานแผนผังในการพัฒนาผู้เรียนรายบุคคล (10 กลุ่มสาระ)");
    }
  };

  const togglePhoto = (id: string) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : prev.length >= 4
        ? [...prev.slice(1), id]
        : [...prev, id]
    );
  };

  const buildPdfBlob = async (): Promise<Blob> => {
    if (template === "development_plan") {
      const yearPlans = devPlans.filter((p) => p.academic_year === academicYear);
      const targetPlans =
        selectedPlanScope === "cohort"
          ? yearPlans
          : devPlans.filter((p) => p.id === selectedPlanScope);

      if (targetPlans.length === 0) {
        throw new Error(
          `ไม่พบข้อมูลแผนผังพัฒนาผู้เรียน 10 กลุ่มสาระ ในปีการศึกษา ${academicYear}`
        );
      }

      const isSingle = targetPlans.length === 1 && selectedPlanScope !== "cohort";
      return await generateDevelopmentPlanPdfBlob({
        reportTitle: documentTitle,
        academicYear,
        semesterLabel,
        filterLabel: isSingle
          ? `${targetPlans[0].full_name} (ชั้น ${targetPlans[0].grade_level})`
          : `ทุกชั้นเรียน (${targetPlans.length} คน)`,
        teacherName: teacherName || "นางสาวดวงพร หวังอ้อมกลาง",
        supervisorName: supervisorName || "นายเอกชัย ปลื้มใจ",
        directorName: directorName || "นางสาวอำพร คงเจริญ",
        includeSummaryCover: !isSingle,
        plans: targetPlans,
      });
    }

    const selectedAssets = imageAssets.filter((a) =>
      selectedPhotoIds.includes(a.id)
    );

    const photos: PdfPhotoItem[] = [];
    for (const asset of selectedAssets) {
      try {
        if (!isDemoDriveId(asset.drive_file_id) && isConfigured) {
          const res = await fetch(`/api/drive/data-uri/${asset.drive_file_id}`);
          if (res.ok) {
            const json = (await res.json()) as { dataUri?: string };
            if (json.dataUri) {
              const normalized = json.dataUri.startsWith("data:image/svg")
                ? await urlToJpegDataUri(json.dataUri)
                : json.dataUri;
              photos.push({
                id: asset.id,
                title: asset.title,
                dataUri: normalized,
                skill_category: asset.skill_category,
              });
              continue;
            }
          }
        }
        // Fallback / Demo SVG conversion via canvas to JPEG data URI
        const jpegUri = await urlToJpegDataUri(
          getMediaStreamUrl(asset.drive_file_id)
        );
        photos.push({
          id: asset.id,
          title: asset.title,
          dataUri: jpegUri,
          skill_category: asset.skill_category,
        });
      } catch (err) {
        console.warn("Skip image in PDF:", asset.title, err);
      }
    }

    const [{ pdf }, templates] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/pdf/SpEdPdfTemplates"),
    ]);

    templates.ensureThaiPdfFonts("/fonts");

    const docElement = React.createElement(templates.SpEdPdfDocument, {
      payload: {
        template,
        documentTitle,
        academicYear,
        semesterLabel,
        weekNumber,
        teacherName: teacherName || "ครูการศึกษาพิเศษ",
        summaryText,
        parentTipText,
        student: template === "newsletter" ? null : selectedStudent,
        logs: studentLogs,
        photos,
      },
    });

    const blob = await pdf(
      docElement as unknown as React.ReactElement<Record<string, unknown>>
    ).toBlob();
    return blob;
  };

  const handlePreviewPdf = async () => {
    setGenerating(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const blob = await buildPdfBlob();
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      const nextUrl = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfPreviewUrl(nextUrl);
      setStatusMessage("สร้างตัวอย่างเอกสาร A4 PDF สำเร็จ! ตรวจสอบด้านขวาได้เลย");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้าง PDF"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToDrive = async () => {
    setUploading(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const blob = pdfBlob || (await buildPdfBlob());
      if (!pdfPreviewUrl) {
        setPdfBlob(blob);
        setPdfPreviewUrl(URL.createObjectURL(blob));
      }

      const tplMeta = TEMPLATE_OPTIONS.find((t) => t.id === template)!;
      const selectedPlan =
        template === "development_plan" && selectedPlanScope !== "cohort"
          ? devPlans.find((p) => p.id === selectedPlanScope) || null
          : null;
      const safeSlug = `${template}_${selectedPlan ? `no${selectedPlan.row_order}_${academicYear}` : selectedStudent?.student_code || `year${academicYear}_wk${weekNumber}`}_${Date.now()}.pdf`;
      const pdfFile = new File([blob], safeSlug, { type: "application/pdf" });

      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("title", documentTitle);
      formData.append(
        "description",
        `${tplMeta.label} • ${semesterLabel}`
      );
      formData.append("media_type", tplMeta.defaultMediaType);
      formData.append(
        "skill_category",
        template === "newsletter"
          ? "วารสารประจำสัปดาห์"
          : SKILL_CATEGORIES[4]
      );
      formData.append(
        "grade_level",
        template === "newsletter"
          ? "ทุกระดับชั้น"
          : template === "development_plan"
          ? selectedPlan?.grade_level || "ทุกระดับชั้น"
          : selectedStudent?.grade_level || "ทุกระดับชั้น"
      );
      if (template === "development_plan" && selectedPlan?.student_id) {
        formData.append("student_id", selectedPlan.student_id);
      } else if (template !== "newsletter" && template !== "development_plan" && selectedStudentId) {
        formData.append("student_id", selectedStudentId);
      }
      formData.append("week_number", String(weekNumber));
      formData.append("is_public", String(isPublic));
      formData.append("link_to_week", String(linkToWeek));

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "อัปโหลดเอกสาร PDF ขึ้น Drive ไม่สำเร็จ");
      }

      if (!isConfigured && json.asset) {
        const nextMedia = [json.asset as MediaAsset, ...getDemoMedia()];
        saveDemoMedia(nextMedia);
        if (linkToWeek) {
          const nextTasks = getDemoTasks().map((t) =>
            t.week_number === weekNumber
              ? { ...t, pdf_drive_id: json.asset.drive_file_id }
              : t
          );
          saveDemoTasks(nextTasks);
        }
      }

      setStatusMessage(
        isPublic
          ? "บันทึก PDF ลง Google Drive และเผยแพร่ขึ้นหน้า /showcase เรียบร้อยแล้ว!"
          : "บันทึก PDF ลง Google Drive และฐานข้อมูลเรียบร้อยแล้ว!"
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "บันทึก PDF ลง Drive ไม่สำเร็จ"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
            <FileText className="w-5 h-5" />
          </span>
          <span>1-Click Document Generator (สร้างเอกสาร A4 PDF)</span>
        </h1>
        <div className="heading-beam-track" />
        <p className="text-xs sm:text-sm text-purple-900/70">
          เลือกรูปแบบเอกสาร ดึงข้อมูลนักเรียน Case Timeline และรูปภาพจาก Google Drive เพื่อ Export เป็น A4 PDF บันทึกลง Drive ทันที
        </p>
      </div>

      {/* Template Picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {TEMPLATE_OPTIONS.map((item) => {
          const active = template === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTemplateSelect(item.id)}
              className={`text-left p-4 rounded-3xl transition-all cursor-pointer ${
                active
                  ? "liquid-glass-hero running-line-bottom text-white shadow-glass-lg"
                  : "liquid-glass text-navy-950 hover:-translate-y-0.5"
              }`}
            >
              <div className="font-bold text-sm">{item.label}</div>
              <p
                className={`text-xs mt-1 ${
                  active ? "text-pink-100" : "text-purple-900/70"
                }`}
              >
                {item.desc}
              </p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Config Form */}
        <div className="lg:col-span-6 liquid-glass rounded-3xl p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {template === "development_plan" && (
            <div className="space-y-3 p-4 rounded-2xl bg-purple-50/75 border border-purple-200/80">
              <label className="block text-xs font-bold text-purple-950">
                <Layers className="w-3.5 h-3.5 inline mr-1.5 text-pink-600" />
                เลือกขอบเขตนักเรียนจากแผนผัง 10 กลุ่มสาระ (ปี {academicYear})
              </label>
              <select
                value={selectedPlanScope}
                onChange={(e) => setSelectedPlanScope(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl border border-purple-200 text-sm bg-white"
              >
                <option value="cohort">
                  รวมทุกคนในปีการศึกษา {academicYear} (
                  {devPlans.filter((p) => p.academic_year === academicYear).length}{" "}
                  คน + หน้าปกสรุป)
                </option>
                {devPlans
                  .filter((p) => p.academic_year === academicYear)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      รายบุคคล: ลำดับ {p.row_order} • {p.full_name} (น้อง
                      {p.nickname || "-"} • {p.grade_level})
                    </option>
                  ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    ครูพี่เลี้ยงเด็กพิเศษ
                  </label>
                  <input
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-purple-200 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                    ผู้อำนวยการสถานศึกษา
                  </label>
                  <input
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-purple-200 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {template !== "newsletter" && template !== "development_plan" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <UserCheck className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                เลือกนักเรียน (ดึงข้อมูล + Case Timeline อัตโนมัติ)
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
              >
                <option value="">-- เลือกนักเรียน --</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.student_code} • {st.full_name} ({st.nickname}) -{" "}
                    {st.grade_level}
                  </option>
                ))}
              </select>
              {selectedStudent && (
                <div className="mt-1.5 text-[11px] text-slate-500">
                  พบประวัติ Case Timeline จำนวน{" "}
                  <strong>{studentLogs.length}</strong> รายการ
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              หัวเรื่องเอกสาร
            </label>
            <input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ปีการศึกษา
              </label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ภาคเรียน
              </label>
              <input
                value={semesterLabel}
                onChange={(e) => setSemesterLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สัปดาห์ที่ (1-20)
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อครูผู้จัดทำ / ผู้รายงาน
            </label>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          {template !== "development_plan" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {template === "newsletter"
                  ? "เนื้อหาข่าว / ไฮไลต์กิจกรรมประจำสัปดาห์"
                  : "บทสรุปพัฒนาการ / คำบรรยายผลงาน"}
              </label>
              <textarea
                rows={3}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          )}

          {template === "newsletter" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                <Newspaper className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                สาระน่ารู้สำหรับผู้ปกครอง
              </label>
              <textarea
                rows={2}
                value={parentTipText}
                onChange={(e) => setParentTipText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          )}

          {/* Photo picker from Google Drive (for non-plan templates) */}
          {template === "development_plan" ? (
            <div className="p-4 rounded-2xl bg-pink-50/75 border border-pink-200/80 text-xs text-purple-950 space-y-1">
              <div className="font-bold text-pink-800">
                ดึงข้อมูลแผนผัง 10 กลุ่มสาระและตราสัญลักษณ์ 2 หน่วยงานอัตโนมัติ
              </div>
              <p className="text-purple-900/75 leading-relaxed">
                ระบบจะจัดหน้าตารางพัฒนาการครบทั้ง 10 กลุ่มสาระ พร้อมช่องลงนาม 3 ฝ่าย
                (ครูผู้จัดทำ, ครูพี่เลี้ยงเด็กพิเศษ, ผู้อำนวยการสถานศึกษา) สำหรับรายงานและเก็บลง Google Drive ได้ทันที
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                <ImageIcon className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
                เลือกรูปภาพจาก Google Drive มาจัดลงเอกสาร (สูงสุด 4 รูป)
              </label>
              {imageAssets.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  ยังไม่มีรูปภาพในคลังสื่อ (สามารถอัปโหลดภาพได้ที่เมนู &quot;คลังสื่อ &amp; ตัดต่อ&quot;)
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {imageAssets.map((img) => {
                    const checked = selectedPhotoIds.includes(img.id);
                    return (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => togglePhoto(img.id)}
                        className={`relative rounded-2xl border p-1.5 text-left transition-all cursor-pointer ${
                          checked
                            ? "border-pink-500 ring-2 ring-pink-400/40 bg-pink-50/90"
                            : "border-purple-200/80 hover:border-pink-300 bg-white/80"
                        }`}
                      >
                        <img
                          src={getMediaStreamUrl(img.drive_file_id)}
                          alt={img.title}
                          className="w-full h-20 object-cover rounded-xl"
                        />
                        <div className="text-[11px] font-medium text-navy-950 truncate mt-1">
                          {img.title}
                        </div>
                        {checked && (
                          <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 space-y-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>เผยแพร่เอกสารนี้ขึ้นหน้าสาธารณะ (/showcase) ทันที</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={linkToWeek}
                onChange={(e) => setLinkToWeek(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span>
                แนบไฟล์ PDF นี้เข้ากับงานสัปดาห์ที่ {weekNumber} ในปฏิทินติดตามงาน
              </span>
            </label>
          </div>

          <div className="pt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePreviewPdf}
              disabled={generating}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/85 hover:bg-white text-purple-900 border border-purple-300 text-sm font-semibold shadow-sm cursor-pointer transition-all"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
              ) : (
                <Sparkles className="w-4 h-4 text-pink-500" />
              )}
              <span>{generating ? "กำลังจัดหน้า A4..." : "สร้างตัวอย่าง A4 PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToDrive}
              disabled={uploading || generating}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full liquid-btn-primary text-white text-sm font-semibold cursor-pointer"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4" />
              )}
              <span>
                {uploading ? "กำลังส่งขึ้น Drive..." : "1-Click บันทึกขึ้น Google Drive"}
              </span>
            </button>
          </div>
        </div>

        {/* Right Live A4 Preview */}
        <div className="lg:col-span-6 liquid-glass rounded-3xl overflow-hidden flex flex-col min-h-[620px]">
          <div className="px-5 py-3.5 liquid-glass-nav running-line-bottom text-white flex items-center justify-between">
            <div className="text-sm font-bold">ตัวอย่างเอกสาร A4 PDF</div>
            {pdfPreviewUrl && (
              <a
                href={pdfPreviewUrl}
                download={`${template}.pdf`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-btn-primary text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด PDF</span>
              </a>
            )}
          </div>

          <div className="flex-1 bg-purple-50/40 flex items-center justify-center">
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                title="A4 PDF Preview"
                className="w-full h-full min-h-[580px] border-0"
              />
            ) : (
              <div className="p-8 text-center space-y-2 text-purple-900/65 max-w-sm">
                <FileText className="w-12 h-12 mx-auto text-pink-300" />
                <div className="text-sm font-semibold text-navy-950">
                  ยังไม่ได้สร้างตัวอย่างเอกสาร
                </div>
                <p className="text-xs">
                  ปรับแต่งข้อมูลด้านซ้าย แล้วกด &quot;สร้างตัวอย่าง A4 PDF&quot; หรือกด &quot;1-Click บันทึกขึ้น Google Drive&quot; ได้ทันที
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-slate-500">
          กำลังโหลดเครื่องมือสร้างเอกสาร A4...
        </div>
      }
    >
      <GeneratorContent />
    </Suspense>
  );
}
