"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  getDemoMedia,
  getDemoStudents,
  saveDemoMedia,
  getDemoTasks,
  saveDemoTasks,
} from "@/lib/demo-store";
import {
  formatDateThai,
  formatFileSize,
  getMediaStreamUrl,
} from "@/lib/utils";
import { VideoEditorPanel } from "@/components/studio/VideoEditorPanel";
import {
  GRADE_LEVELS,
  MediaAsset,
  SKILL_CATEGORIES,
  Student,
} from "@/types/database";
import {
  CheckCircle2,
  CloudUpload,
  Eye,
  EyeOff,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Scissors,
  Trash2,
  UploadCloud,
} from "lucide-react";

const SERVERLESS_DIRECT_LIMIT_BYTES = 4 * 1024 * 1024; // 4 MB

export default function MediaStudioPage() {
  const { isConfigured } = useAuth();
  const [activeTab, setActiveTab] = useState<"pool" | "editor">("pool");

  const [students, setStudents] = useState<Student[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // Direct Upload Form
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<MediaAsset["media_type"]>("image");
  const [skillCategory, setSkillCategory] = useState<string>(SKILL_CATEGORIES[0]);
  const [gradeLevel, setGradeLevel] = useState<string>("ทุกระดับชั้น");
  const [studentId, setStudentId] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [linkToWeek, setLinkToWeek] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");

  // Filter media pool
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSkill, setFilterSkill] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (isConfigured) {
        const [stRes, mediaRes] = await Promise.all([
          supabase.from("students").select("*").order("student_code", { ascending: true }),
          supabase
            .from("media_assets")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);
        setStudents((stRes.data as Student[]) || []);
        setAssets((mediaRes.data as MediaAsset[]) || []);
      } else {
        setStudents(getDemoStudents());
        setAssets(getDemoMedia());
      }
      setLoading(false);
    }
    load();
  }, [isConfigured]);

  const uploadFileToDrive = useCallback(
    async (params: {
      file: File;
      title: string;
      description: string;
      mediaType: MediaAsset["media_type"];
      skillCategory: string;
      gradeLevel: string;
      studentId: string;
      weekNumber: string;
      isPublic: boolean;
      linkToWeek: boolean;
    }): Promise<MediaAsset> => {
      // ถ้าเป็นไฟล์ใหญ่ (> 4MB) และเชื่อมต่อระบบจริง ลองใช้ Resumable Direct Upload ก่อนเพื่อเลี่ยง limit Vercel
      if (isConfigured && params.file.size > SERVERLESS_DIRECT_LIMIT_BYTES) {
        const sessionRes = await fetch("/api/drive/resumable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: params.file.name,
            mimeType: params.file.type || "application/octet-stream",
            folderName: params.mediaType === "video" ? "videos" : "media",
          }),
        });

        if (sessionRes.ok) {
          const { uploadUrl } = (await sessionRes.json()) as { uploadUrl: string };
          const drivePutRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": params.file.type || "application/octet-stream",
            },
            body: params.file,
          });

          if (drivePutRes.ok) {
            const driveJson = (await drivePutRes.json()) as {
              id: string;
              webViewLink?: string;
            };
            const registerRes = await fetch("/api/drive/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileId: driveJson.id,
                webViewLink: driveJson.webViewLink,
                title: params.title,
                description: params.description,
                media_type: params.mediaType,
                skill_category: params.skillCategory,
                grade_level: params.gradeLevel,
                student_id: params.studentId || null,
                week_number: params.weekNumber ? Number(params.weekNumber) : null,
                is_public: params.isPublic,
                mime_type: params.file.type,
                file_size: params.file.size,
                link_to_week: params.linkToWeek,
              }),
            });

            const regJson = await registerRes.json();
            if (!registerRes.ok) {
              throw new Error(regJson.error || "ลงทะเบียนไฟล์ไม่สำเร็จ");
            }
            return regJson.asset as MediaAsset;
          }
        }
      }

      // สตรีมผ่าน Route Handler /api/drive/upload โดยตรง (ไม่ลง Disk)
      const formData = new FormData();
      formData.append("file", params.file);
      formData.append("title", params.title);
      formData.append("description", params.description);
      formData.append("media_type", params.mediaType);
      formData.append("skill_category", params.skillCategory);
      formData.append("grade_level", params.gradeLevel);
      if (params.studentId) formData.append("student_id", params.studentId);
      if (params.weekNumber) formData.append("week_number", params.weekNumber);
      formData.append("is_public", String(params.isPublic));
      formData.append("link_to_week", String(params.linkToWeek));

      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "สตรีมอัปโหลดขึ้น Drive ไม่สำเร็จ");
      }

      const asset = json.asset as MediaAsset;
      if (!isConfigured) {
        const nextMedia = [asset, ...getDemoMedia()];
        saveDemoMedia(nextMedia);
        if (params.linkToWeek && params.weekNumber) {
          const wkNo = Number(params.weekNumber);
          const nextTasks = getDemoTasks().map((t) =>
            t.week_number === wkNo
              ? {
                  ...t,
                  ...(params.mediaType === "video"
                    ? { video_drive_id: asset.drive_file_id }
                    : { pdf_drive_id: asset.drive_file_id }),
                }
              : t
          );
          saveDemoTasks(nextTasks);
        }
      }

      return asset;
    },
    [isConfigured]
  );

  const handleFilePick = (file: File | null) => {
    if (!file) return;
    setUploadFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
    if (file.type.startsWith("video/")) {
      setMediaType("video");
    } else if (file.type === "application/pdf") {
      setMediaType("pdf");
    } else {
      setMediaType("image");
    }
  };

  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadMsg("");
    setUploadErr("");

    try {
      const asset = await uploadFileToDrive({
        file: uploadFile,
        title: title.trim() || uploadFile.name,
        description: description.trim(),
        mediaType,
        skillCategory,
        gradeLevel,
        studentId,
        weekNumber,
        isPublic,
        linkToWeek,
      });

      setAssets((prev) => [asset, ...prev]);
      setUploadFile(null);
      setTitle("");
      setDescription("");
      setUploadMsg("อัปโหลดสตรีมขึ้น Google Drive และบันทึกลงคลังสื่อสำเร็จ!");
    } catch (err) {
      setUploadErr(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublic = async (asset: MediaAsset) => {
    const nextPublic = !asset.is_public;
    if (isConfigured) {
      const res = await fetch(`/api/drive/${encodeURIComponent(asset.drive_file_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: nextPublic, assetId: asset.id }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, is_public: nextPublic } : a))
      );
    } else {
      const nextList = assets.map((a) =>
        a.id === asset.id ? { ...a, is_public: nextPublic } : a
      );
      setAssets(nextList);
      saveDemoMedia(nextList);
    }
  };

  const handleDeleteAsset = async (asset: MediaAsset) => {
    if (!confirm(`ต้องการลบ "${asset.title}" ออกจากคลังสื่อและ Google Drive?`)) {
      return;
    }

    if (isConfigured) {
      const res = await fetch(
        `/api/drive/${encodeURIComponent(asset.drive_file_id)}?assetId=${encodeURIComponent(asset.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || "ลบไฟล์ไม่สำเร็จ");
        return;
      }
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } else {
      const nextList = assets.filter((a) => a.id !== asset.id);
      setAssets(nextList);
      saveDemoMedia(nextList);
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchType = filterType === "all" || a.media_type === filterType;
      const matchSkill =
        filterSkill === "all" || a.skill_category === filterSkill;
      return matchType && matchSkill;
    });
  }, [assets, filterType, filterSkill]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
              <Film className="w-5 h-5" />
            </span>
            <span>Media Pool &amp; Video Studio (Google Drive)</span>
          </h1>
          <div className="heading-beam-track" />
          <p className="text-xs sm:text-sm text-purple-900/70">
            อัปโหลดภาพและวิดีโอสตรีมตรงขึ้น Google Drive พร้อมห้องตัดต่อคลิป 720p และใส่ข้อความทับบนเบราว์เซอร์
          </p>
        </div>

        <div className="inline-flex liquid-glass p-1 rounded-full">
          <button
            type="button"
            onClick={() => setActiveTab("pool")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "pool"
                ? "liquid-btn-primary text-white"
                : "text-purple-800 hover:text-pink-600"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>อัปโหลด &amp; คลังสื่อ ({assets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeTab === "editor"
                ? "liquid-btn-primary text-white"
                : "text-purple-800 hover:text-pink-600"
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>ตัดต่อวิดีโอ 720p (FFmpeg)</span>
          </button>
        </div>
      </div>

      {activeTab === "editor" && (
        <VideoEditorPanel
          students={students}
          uploadFileToDrive={uploadFileToDrive}
          onExportedToDrive={(asset) => {
            setAssets((prev) => [asset, ...prev]);
          }}
        />
      )}

      {activeTab === "pool" && (
        <form
          onSubmit={handleDirectUpload}
          className="liquid-glass running-line-bottom rounded-3xl p-6 space-y-5"
        >
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-navy-950 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-pink-600" />
              <span>กล่องอัปโหลดภาพ คลิป และเอกสารขึ้น Google Drive</span>
            </h2>
            <div className="heading-beam-track" />
          </div>

          {uploadErr && (
            <div className="p-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs">
              {uploadErr}
            </div>
          )}
          {uploadMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <label className="lg:col-span-5 border-2 border-dashed border-purple-300 hover:border-pink-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-white/60 transition-colors">
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
              />
              <CloudUpload className="w-10 h-10 text-pink-600 mb-2" />
              <div className="text-sm font-bold text-navy-950">
                {uploadFile ? uploadFile.name : "เลือกไฟล์ภาพ, คลิปวิดีโอ หรือ PDF"}
              </div>
              <div className="text-xs text-purple-900/65 mt-1">
                {uploadFile
                  ? `${formatFileSize(uploadFile.size)} • ${uploadFile.type || "ไฟล์"}`
                  : "สตรีมตรงขึ้น Google Drive ไม่ผ่าน Serverless Disk"}
              </div>
            </label>

            <div className="lg:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อสื่อ / ผลงาน *
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ชุดสื่อบัตรคำภาพสัตว์โลกน่ารัก"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทสื่อ
                  </label>
                  <select
                    value={mediaType}
                    onChange={(e) =>
                      setMediaType(e.target.value as MediaAsset["media_type"])
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="image">ภาพถ่ายผลงาน (Image)</option>
                    <option value="video">คลิปวิดีโอ (Video)</option>
                    <option value="newsletter">วารสารประจำสัปดาห์ (PDF)</option>
                    <option value="portfolio">Portfolio (PDF)</option>
                    <option value="pdf">เอกสาร PDF ทั่วไป</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หมวดหมู่ทักษะ
                  </label>
                  <select
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
                  >
                    {SKILL_CATEGORIES.map((sk) => (
                      <option key={sk} value={sk}>
                        {sk}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระดับชั้น
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
                  >
                    <option value="ทุกระดับชั้น">ทุกระดับชั้น</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผูกกับนักเรียน (ถ้ามี)
                  </label>
                  <select
                    value={studentId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStudentId(val);
                      const st = students.find((s) => s.id === val);
                      if (st) setGradeLevel(st.grade_level);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
                  >
                    <option value="">ไม่ระบุ</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nickname} ({st.grade_level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับสื่อหรือกิจกรรม..."
                  className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                  placeholder="สัปดาห์ที่ (1-20)"
                  className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                    />
                    <span>เปิดแสดงใน /showcase (is_public: true)</span>
                  </label>
                  {weekNumber && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkToWeek}
                        onChange={(e) => setLinkToWeek(e.target.checked)}
                      />
                      <span>แนบเข้างานสัปดาห์ที่ {weekNumber}</span>
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full liquid-btn-primary disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>{uploading ? "กำลังสตรีมขึ้น Drive..." : "อัปโหลดขึ้น Google Drive"}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Media Pool Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-navy-950">
              คลังสื่อและเอกสารทั้งหมด ({filteredAssets.length})
            </h2>
            <div className="heading-beam-track" />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-full liquid-glass-subtle text-xs text-purple-900"
            >
              <option value="all">ทุกประเภท</option>
              <option value="image">ภาพถ่าย</option>
              <option value="video">วิดีโอ</option>
              <option value="newsletter">วารสาร PDF</option>
              <option value="portfolio">Portfolio</option>
              <option value="report">รายงานพัฒนาการ</option>
            </select>
            <select
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="px-3 py-1.5 rounded-full liquid-glass-subtle text-xs text-purple-900"
            >
              <option value="all">ทุกทักษะ</option>
              {SKILL_CATEGORIES.map((sk) => (
                <option key={sk} value={sk}>
                  {sk}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 rounded-3xl liquid-glass animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => {
              const isImg = asset.media_type === "image";
              const isVid = asset.media_type === "video";
              return (
                <div
                  key={asset.id}
                  className="liquid-glass running-line-bottom rounded-3xl overflow-hidden flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-glass-lg"
                >
                  <div>
                    <div className="h-40 bg-gradient-to-br from-purple-950 via-fuchsia-900 to-pink-800 relative overflow-hidden flex items-center justify-center">
                      {isImg ? (
                        <img
                          src={getMediaStreamUrl(asset.drive_file_id)}
                          alt={asset.title}
                          className="w-full h-full object-cover"
                        />
                      ) : isVid ? (
                        <div className="text-center text-pink-100 space-y-1">
                          <Film className="w-10 h-10 mx-auto" />
                          <div className="text-xs font-semibold">วิดีโอ Google Drive</div>
                        </div>
                      ) : (
                        <div className="text-center text-pink-100 space-y-1">
                          <FileText className="w-10 h-10 mx-auto" />
                          <div className="text-xs font-semibold">เอกสาร PDF</div>
                        </div>
                      )}
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-navy-950/75 backdrop-blur-md text-white text-[10px] font-semibold border border-white/20">
                        {asset.media_type}
                      </span>
                      {asset.grade_level && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-white/90 text-purple-900 text-[10px] font-bold">
                          {asset.grade_level}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-1.5">
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-gradient-to-r from-purple-100 to-pink-100 px-2.5 py-0.5 rounded-full">
                        {isImg ? (
                          <ImageIcon className="w-3 h-3 text-pink-600" />
                        ) : isVid ? (
                          <Film className="w-3 h-3 text-purple-700" />
                        ) : (
                          <FileText className="w-3 h-3 text-pink-600" />
                        )}
                        <span>{asset.skill_category}</span>
                      </div>
                      <h3 className="font-bold text-sm text-navy-950 line-clamp-1">
                        {asset.title}
                      </h3>
                      <p className="text-xs text-purple-900/65 line-clamp-2">
                        {asset.description || formatDateThai(asset.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-purple-200/50 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePublic(asset)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                        asset.is_public
                          ? "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-pink-300"
                          : "bg-white/70 text-purple-900/70 border-purple-200"
                      }`}
                    >
                      {asset.is_public ? (
                        <Eye className="w-3.5 h-3.5 text-pink-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      <span>{asset.is_public ? "Public: เปิด" : "Private"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAsset(asset)}
                      className="p-1.5 rounded-full text-purple-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="ลบสื่อ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
