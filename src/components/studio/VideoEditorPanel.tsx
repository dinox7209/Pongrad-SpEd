"use client";

import React, { useEffect, useRef, useState } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

declare global {
  interface Window {
    FFmpegWASM?: {
      FFmpeg: new () => FFmpeg;
    };
  }
}

async function loadFFmpegClass(): Promise<new () => FFmpeg> {
  if (typeof window === "undefined") {
    throw new Error("FFmpeg runs in browser only");
  }
  if (window.FFmpegWASM?.FFmpeg) {
    return window.FFmpegWASM.FFmpeg;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-ffmpeg-umd="true"]'
    );
    if (existing) {
      if (window.FFmpegWASM?.FFmpeg) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("โหลดสคริปต์ /ffmpeg/ffmpeg.js ไม่สำเร็จ")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "/ffmpeg/ffmpeg.js";
    script.async = true;
    script.dataset.ffmpegUmd = "true";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("โหลดสคริปต์ /ffmpeg/ffmpeg.js ไม่สำเร็จ"));
    document.head.appendChild(script);
  });

  if (!window.FFmpegWASM?.FFmpeg) {
    throw new Error("ไม่พบ FFmpegWASM.FFmpeg หลังโหลดสคริปต์");
  }
  return window.FFmpegWASM.FFmpeg;
}
import {
  GRADE_LEVELS,
  MediaAsset,
  SKILL_CATEGORIES,
  Student,
} from "@/types/database";
import { formatFileSize } from "@/lib/utils";
import {
  CheckCircle2,
  CloudUpload,
  Download,
  Film,
  Loader2,
  Scissors,
  Sparkles,
  Type,
  Video,
} from "lucide-react";

interface Props {
  students: Student[];
  onExportedToDrive: (asset: MediaAsset) => void;
  uploadFileToDrive: (params: {
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
  }) => Promise<MediaAsset>;
}

async function createThaiCaptionOverlayPng(
  text: string,
  bannerWidth: number
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  const w = Math.max(320, Math.min(960, bannerWidth));
  const h = 92;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.clearRect(0, 0, w, h);

  // Dark Navy translucent pill background
  const padX = 12;
  const padY = 10;
  const r = 18;
  const boxW = w - padX * 2;
  const boxH = h - padY * 2;

  ctx.fillStyle = "rgba(11, 29, 48, 0.82)";
  ctx.beginPath();
  ctx.moveTo(padX + r, padY);
  ctx.lineTo(padX + boxW - r, padY);
  ctx.quadraticCurveTo(padX + boxW, padY, padX + boxW, padY + r);
  ctx.lineTo(padX + boxW, padY + boxH - r);
  ctx.quadraticCurveTo(padX + boxW, padY + boxH, padX + boxW - r, padY + boxH);
  ctx.lineTo(padX + r, padY + boxH);
  ctx.quadraticCurveTo(padX, padY + boxH, padX, padY + boxH - r);
  ctx.lineTo(padX, padY + r);
  ctx.quadraticCurveTo(padX, padY, padX + r, padY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(96, 165, 250, 0.65)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Crisp Thai text rendered by browser shaping engine
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px Sarabun, Prompt, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2, boxW - 28);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export function VideoEditorPanel({
  students,
  onExportedToDrive,
  uploadFileToDrive,
}: Props) {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number }>({
    w: 1280,
    h: 720,
  });

  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [captionText, setCaptionText] = useState<string>("");
  const [captionPosition, setCaptionPosition] = useState<"bottom" | "top">("bottom");

  // Metadata for Drive export
  const [title, setTitle] = useState("");
  const [skillCategory, setSkillCategory] = useState<string>(SKILL_CATEGORIES[0]);
  const [gradeLevel, setGradeLevel] = useState<string>("ทุกระดับชั้น");
  const [studentId, setStudentId] = useState<string>("");
  const [weekNumber, setWeekNumber] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [linkToWeek, setLinkToWeek] = useState<boolean>(false);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLog, setStatusLog] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [outputFile, setOutputFile] = useState<File | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState("");

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [sourceUrl, outputUrl]);

  const handleSelectVideo = (file: File | null) => {
    if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setSourceFile(file);
    setSourceUrl(URL.createObjectURL(file));
    setOutputFile(null);
    setOutputUrl(null);
    setUploadSuccess("");
    setErrorMsg("");
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const ensureFfmpegLoaded = async (): Promise<FFmpeg> => {
    if (ffmpegRef.current?.loaded) {
      return ffmpegRef.current;
    }
    const FFmpegCtor = await loadFFmpegClass();
    const ffmpeg = new FFmpegCtor();
    ffmpeg.on("progress", ({ progress: p }) => {
      setProgress(Math.min(100, Math.max(0, Math.round(p * 100))));
    });

    const coreBases = [
      "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd",
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
    ];

    let loaded = false;
    let lastErr: unknown = null;
    for (const base of coreBases) {
      try {
        setStatusLog("กำลังโหลด FFmpeg WebAssembly Core...");
        await ffmpeg.load({
          coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
        });
        loaded = true;
        break;
      } catch (err) {
        lastErr = err;
      }
    }

    if (!loaded) {
      throw new Error(
        `ไม่สามารถโหลด FFmpeg WASM Core ได้: ${
          lastErr instanceof Error ? lastErr.message : "Network error"
        }`
      );
    }

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const handleRender720p = async () => {
    if (!sourceFile) return;
    const clipLen = Math.max(0.5, trimEnd - trimStart);
    setProcessing(true);
    setProgress(0);
    setErrorMsg("");
    setUploadSuccess("");

    try {
      const ffmpeg = await ensureFfmpegLoaded();
      const ext = sourceFile.name.split(".").pop()?.toLowerCase() || "mp4";
      const inputName = `input.${ext}`;
      const outputName = "output_720p.mp4";

      setStatusLog("กำลังเตรียมไฟล์วิดีโอเข้าสู่หน่วยความจำเบราว์เซอร์...");
      await ffmpeg.writeFile(inputName, await fetchFile(sourceFile));

      const isLandscape = videoDims.w >= videoDims.h;
      const targetWidth = isLandscape
        ? Math.max(2, Math.round((videoDims.w / (videoDims.h || 720)) * 720 / 2) * 2)
        : 720;
      const scaleFilter = isLandscape ? "scale=-2:720" : "scale=720:-2";

      const args: string[] = [
        "-ss",
        trimStart.toFixed(2),
        "-t",
        clipLen.toFixed(2),
        "-i",
        inputName,
      ];

      if (captionText.trim()) {
        setStatusLog("กำลังสร้างแถบข้อความภาษาไทยทับลงในวิดีโอ...");
        const pngBytes = await createThaiCaptionOverlayPng(
          captionText.trim(),
          Math.min(720, targetWidth - 40)
        );
        await ffmpeg.writeFile("caption.png", pngBytes);
        const yExpr = captionPosition === "top" ? "24" : "H-h-24";
        args.push(
          "-i",
          "caption.png",
          "-filter_complex",
          `[0:v]${scaleFilter},setsar=1[v];[v][1:v]overlay=(W-w)/2:${yExpr}[outv]`,
          "-map",
          "[outv]",
          "-map",
          "0:a?"
        );
      } else {
        args.push("-vf", `${scaleFilter},setsar=1`);
      }

      args.push(
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        outputName
      );

      setStatusLog("กำลังประมวลผลตัดต่อและแปลงไฟล์เป็น MP4 720p...");
      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const uint8 =
        data instanceof Uint8Array
          ? new Uint8Array(data)
          : new TextEncoder().encode(String(data));
      const mp4Blob = new Blob([uint8.buffer], { type: "video/mp4" });
      const safeName = `${(title || "sped_clip").replace(/\s+/g, "_")}_720p.mp4`;
      const resultFile = new File([mp4Blob], safeName, { type: "video/mp4" });

      if (outputUrl) URL.revokeObjectURL(outputUrl);
      setOutputFile(resultFile);
      setOutputUrl(URL.createObjectURL(mp4Blob));
      setProgress(100);
      setStatusLog("ประมวลผลคลิป MP4 720p เสร็จสมบูรณ์!");
    } catch (err) {
      console.error("FFmpeg processing error:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่างตัดต่อวิดีโอ"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleExportToDrive = async () => {
    if (!outputFile) return;
    setUploading(true);
    setErrorMsg("");
    setUploadSuccess("");
    try {
      const asset = await uploadFileToDrive({
        file: outputFile,
        title: title.trim() || outputFile.name,
        description: captionText.trim()
          ? `คลิปตัดต่อ 720p • ${captionText.trim()}`
          : "คลิปวิดีโอการเรียนรู้ 720p (ตัดต่อจาก Video Studio)",
        mediaType: "video",
        skillCategory,
        gradeLevel,
        studentId,
        weekNumber,
        isPublic,
        linkToWeek,
      });
      onExportedToDrive(asset);
      setUploadSuccess(
        "ส่งคลิป MP4 720p ขึ้น Google Drive และบันทึกลงคลังสื่อเรียบร้อยแล้ว!"
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "ส่งไฟล์ขึ้น Google Drive ไม่สำเร็จ"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="liquid-glass running-line-bottom rounded-3xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-200/60 pb-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-navy-950 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-pink-600" />
            <span>ห้องตัดต่อวิดีโอเบราว์เซอร์ (FFmpeg WASM • 720p MP4)</span>
          </h2>
          <div className="heading-beam-track" />
          <p className="text-xs text-purple-900/70">
            ตัดหัว-ท้าย (Trim), ใส่ข้อความภาษาไทยทับ (Caption), ปรับความละเอียด 720p และ Export ส่งเข้า Drive ได้ทันทีโดยไม่ใช้ Server CPU
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs">
          {errorMsg}
        </div>
      )}
      {uploadSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Source & Controls */}
        <div className="lg:col-span-7 space-y-4">
          <label className="block border-2 border-dashed border-purple-300 hover:border-pink-500 rounded-3xl p-5 text-center cursor-pointer transition-colors bg-white/60">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleSelectVideo(e.target.files?.[0] || null)}
            />
            <Video className="w-8 h-8 mx-auto text-pink-600 mb-1.5" />
            <div className="text-sm font-semibold text-navy-950">
              {sourceFile
                ? `${sourceFile.name} (${formatFileSize(sourceFile.size)})`
                : "คลิกเลือกไฟล์วิดีโอต้นฉบับจากเครื่อง (.MP4, .MOV, .WEBM)"}
            </div>
            <div className="text-[11px] text-purple-900/65 mt-0.5">
              ไฟล์จะถูกประมวลผลภายในเบราว์เซอร์ของท่านโดยตรง
            </div>
          </label>

          {sourceUrl && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={sourceUrl}
                  controls
                  className="w-full max-h-72 mx-auto"
                  onLoadedMetadata={(e) => {
                    const vid = e.currentTarget;
                    const dur = Number.isFinite(vid.duration) ? vid.duration : 10;
                    setDuration(dur);
                    setTrimStart(0);
                    setTrimEnd(Number(dur.toFixed(1)));
                    setVideoDims({
                      w: vid.videoWidth || 1280,
                      h: vid.videoHeight || 720,
                    });
                  }}
                />
              </div>

              {/* Trim Controls */}
              <div className="bg-white/70 rounded-2xl border border-purple-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-navy-950">
                  <span>ตัดหัว-ท้ายคลิป (Trim)</span>
                  <span className="text-pink-600">
                    ความยาวหลังตัด: {Math.max(0, trimEnd - trimStart).toFixed(1)} วินาที
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-purple-900/75 mb-1">
                      <span>จุดเริ่มต้น (วินาที): {trimStart.toFixed(1)}s</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            const t = Number(videoRef.current.currentTime.toFixed(1));
                            setTrimStart(Math.min(t, Math.max(0, trimEnd - 0.5)));
                          }
                        }}
                        className="text-pink-600 font-semibold hover:underline cursor-pointer"
                      >
                        ใช้เวลาปัจจุบัน
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.5, duration - 0.5)}
                      step={0.1}
                      value={trimStart}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setTrimStart(Math.min(v, Math.max(0, trimEnd - 0.5)));
                      }}
                      className="w-full accent-pink-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-purple-900/75 mb-1">
                      <span>จุดสิ้นสุด (วินาที): {trimEnd.toFixed(1)}s</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            const t = Number(videoRef.current.currentTime.toFixed(1));
                            setTrimEnd(Math.max(t, trimStart + 0.5));
                          }
                        }}
                        className="text-pink-600 font-semibold hover:underline cursor-pointer"
                      >
                        ใช้เวลาปัจจุบัน
                      </button>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={Math.max(1, duration)}
                      step={0.1}
                      value={trimEnd}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setTrimEnd(Math.max(v, trimStart + 0.5));
                      }}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* Caption Overlay */}
              <div className="bg-white/70 rounded-2xl border border-purple-200/80 p-4 space-y-3">
                <div className="text-xs font-bold text-navy-950 flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-pink-600" />
                  <span>ข้อความทับบนวิดีโอ (Caption Overlay) + ปรับขนาด 720p</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    value={captionText}
                    onChange={(e) => setCaptionText(e.target.value)}
                    placeholder="เช่น น้องต้นกล้า ฝึกทักษะกล้ามเนื้อมัดเล็ก ป.2"
                    className="sm:col-span-2 px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  />
                  <select
                    value={captionPosition}
                    onChange={(e) =>
                      setCaptionPosition(e.target.value as "bottom" | "top")
                    }
                    className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="bottom">ตำแหน่งด้านล่าง</option>
                    <option value="top">ตำแหน่งด้านบน</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRender720p}
                  disabled={processing}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500 disabled:opacity-50 text-white text-sm font-semibold shadow-glass cursor-pointer"
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-pink-200" />
                  )}
                  <span>
                    {processing
                      ? `กำลังตัดต่อและแปลงไฟล์ 720p (${progress}%)`
                      : "ประมวลผลตัดต่อ + แปลง 720p MP4"}
                  </span>
                </button>

                {statusLog && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-purple-900/75">{statusLog}</div>
                    {processing && (
                      <div className="w-full h-2 rounded-full bg-purple-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Output Preview & Drive Export */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
            <h3 className="font-bold text-sm text-navy-950 flex items-center gap-2">
              <Film className="w-4 h-4 text-blue-600" />
              <span>ผลลัพธ์คลิป MP4 720p &amp; ส่งขึ้น Google Drive</span>
            </h3>

            {outputUrl && outputFile ? (
              <div className="space-y-3">
                <video
                  src={outputUrl}
                  controls
                  className="w-full rounded-xl bg-black max-h-56"
                />
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>ขนาดไฟล์ใหม่: {formatFileSize(outputFile.size)}</span>
                  <a
                    href={outputUrl}
                    download={outputFile.name}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด MP4</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                ตัวอย่างวิดีโอ 720p หลังตัดต่อจะแสดงที่นี่
              </div>
            )}

            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อคลิปผลงาน
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ชื่อคลิปแสดงในแกลเลอรี"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภททักษะ
                  </label>
                  <select
                    value={skillCategory}
                    onChange={(e) => setSkillCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
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
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="ทุกระดับชั้น">ทุกระดับชั้น</option>
                    {GRADE_LEVELS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
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
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="">ไม่ระบุ</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nickname} ({st.grade_level})
                      </option>
                    ))}
                  </select>
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
                    onChange={(e) => setWeekNumber(e.target.value)}
                    placeholder="เช่น 2"
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>เปิดเผยแพร่ขึ้นหน้าสาธารณะ (/showcase) ทันที</span>
              </label>

              {weekNumber && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={linkToWeek}
                    onChange={(e) => setLinkToWeek(e.target.checked)}
                  />
                  <span>แนบวิดีโอนี้เข้าปฏิทินงานสัปดาห์ที่ {weekNumber}</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleExportToDrive}
                disabled={!outputFile || uploading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-full liquid-btn-primary disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>
                  {uploading
                    ? "กำลังสตรีม MP4 ขึ้น Google Drive..."
                    : "Export MP4 ส่งเข้า Google Drive"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
