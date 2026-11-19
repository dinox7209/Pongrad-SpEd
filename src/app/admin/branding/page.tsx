"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";
import { useBrandAssets } from "@/context/brand-context";
import { supabase } from "@/lib/supabase/client";
import { saveDemoBrandAssets } from "@/lib/demo-store";
import {
  estimateDataUriKb,
  processBrandImageFile,
} from "@/lib/brand-utils";
import {
  BRAND_CATEGORY_META,
  BRAND_PLACEMENT_OPTIONS,
  BrandAsset,
  BrandCategory,
  BrandPlacement,
  CORE_BRAND_SLOT_KEYS,
  SCHOOL_INFO,
} from "@/types/database";
import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  GraduationCap,
  Handshake,
  ImagePlus,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

const CORE_SET = new Set<string>(CORE_BRAND_SLOT_KEYS);

interface BrandFormState {
  id?: string;
  slot_key: string;
  title: string;
  description: string;
  category: BrandCategory;
  placement: BrandPlacement;
  image_url: string;
  default_url: string;
  display_order: number;
  is_core: boolean;
  is_active: boolean;
}

function createEmptyCustomForm(nextOrder: number): BrandFormState {
  return {
    slot_key: `custom_${Date.now()}`,
    title: "",
    description: "",
    category: "mou",
    placement: "mou",
    image_url: "",
    default_url: "",
    display_order: nextOrder,
    is_core: false,
    is_active: true,
  };
}

export default function AdminBrandingPage() {
  const { isConfigured, user } = useAuth();
  const {
    assets,
    loading,
    appIconUrl,
    schoolLogoUrl,
    partnerLogoUrl,
    mouSealUrl,
    getExtraAssets,
    setBrandAssetsState,
  } = useBrandAssets();

  const [placementFilter, setPlacementFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BrandFormState>(createEmptyCustomForm(6));
  const [processingImg, setProcessingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const coreAssets = useMemo(
    () =>
      assets
        .filter((a) => CORE_SET.has(a.slot_key))
        .sort((a, b) => (a.display_order || 99) - (b.display_order || 99)),
    [assets]
  );

  const customAssets = useMemo(
    () =>
      assets
        .filter((a) => !CORE_SET.has(a.slot_key))
        .filter(
          (a) => placementFilter === "all" || a.placement === placementFilter
        )
        .sort((a, b) => (a.display_order || 99) - (b.display_order || 99)),
    [assets, placementFilter]
  );

  const mouExtraPreview = getExtraAssets("mou");

  const persistAssetsState = (next: BrandAsset[]) => {
    setBrandAssetsState(next);
    if (!isConfigured) {
      saveDemoBrandAssets(next);
    }
  };

  const openAddCustomModal = () => {
    const maxOrder = assets.reduce(
      (max, a) => Math.max(max, a.display_order || 0),
      5
    );
    setForm(createEmptyCustomForm(maxOrder + 1));
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEditModal = (asset: BrandAsset) => {
    setForm({
      id: asset.id,
      slot_key: asset.slot_key,
      title: asset.title,
      description: asset.description || "",
      category: asset.category,
      placement: asset.placement,
      image_url: asset.image_url || "",
      default_url: asset.default_url || "",
      display_order: asset.display_order || 1,
      is_core: Boolean(asset.is_core) || CORE_SET.has(asset.slot_key),
      is_active: Boolean(asset.is_active),
    });
    setErrorMsg("");
    setModalOpen(true);
  };

  const handleFilePickedInModal = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrorMsg("");
    setProcessingImg(true);
    try {
      const dataUri = await processBrandImageFile(file, 512);
      setForm((prev) => ({
        ...prev,
        image_url: dataUri,
        is_active: true,
      }));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "ประมวลผลรูปภาพไม่สำเร็จ"
      );
    } finally {
      setProcessingImg(false);
    }
  };

  const handleQuickUploadForAsset = async (
    asset: BrandAsset,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusyId(asset.id);
    setStatusMessage("");
    setErrorMsg("");
    try {
      const dataUri = await processBrandImageFile(file, 512);
      await updateAssetRecord(asset, {
        image_url: dataUri,
        is_active: true,
      });
      setStatusMessage(`อัปโหลดโลโก้ "${asset.title}" เรียบร้อยแล้ว`);
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "อัปโหลดรูปภาพไม่สำเร็จ"
      );
    } finally {
      setBusyId(null);
    }
  };

  const updateAssetRecord = async (
    target: BrandAsset,
    patch: Partial<
      Pick<
        BrandAsset,
        "title" | "description" | "category" | "placement" | "image_url" | "display_order" | "is_active"
      >
    >
  ) => {
    const now = new Date().toISOString();
    if (isConfigured) {
      const payload = {
        slot_key: target.slot_key,
        title: patch.title ?? target.title,
        description: patch.description ?? target.description,
        category: patch.category ?? target.category,
        placement: patch.placement ?? target.placement,
        image_url: patch.image_url ?? target.image_url,
        default_url: target.default_url || "",
        display_order: patch.display_order ?? target.display_order,
        is_core: CORE_SET.has(target.slot_key) ? true : Boolean(target.is_core),
        is_active: patch.is_active ?? target.is_active,
        updated_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from("brand_assets")
        .upsert(payload, { onConflict: "slot_key" })
        .select()
        .single();

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          throw new Error(
            "ยังไม่ได้สร้างตาราง brand_assets ใน Supabase (กรุณานำ supabase/schema.sql ไป Run ใน SQL Editor ก่อน)"
          );
        }
        throw new Error(error.message);
      }

      const saved = data as BrandAsset;
      const exists = assets.some(
        (a) => a.id === saved.id || a.slot_key === saved.slot_key
      );
      const next = exists
        ? assets.map((a) =>
            a.id === saved.id || a.slot_key === saved.slot_key ? saved : a
          )
        : [...assets, saved];
      persistAssetsState(next);
      return;
    }

    const next = assets.map((a) =>
      a.id === target.id || a.slot_key === target.slot_key
        ? { ...a, ...patch, updated_at: now }
        : a
    );
    persistAssetsState(next);
  };

  const handleToggleActive = async (asset: BrandAsset) => {
    setBusyId(asset.id);
    setStatusMessage("");
    try {
      const nextActive = !asset.is_active;
      if (nextActive && !asset.image_url?.trim()) {
        openEditModal({ ...asset, is_active: true });
        return;
      }
      await updateAssetRecord(asset, { is_active: nextActive });
      setStatusMessage(
        `${nextActive ? "เปิด" : "ปิด"}การแสดงผล "${asset.title}" แล้ว`
      );
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "ปรับสถานะไม่สำเร็จ"
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleResetDefault = async (asset: BrandAsset) => {
    if (
      !confirm(
        `ต้องการคืนค่าโลโก้ "${asset.title}" กลับเป็นค่าเริ่มต้นใช่หรือไม่?`
      )
    ) {
      return;
    }
    setBusyId(asset.id);
    setStatusMessage("");
    try {
      await updateAssetRecord(asset, {
        image_url: asset.default_url || "",
        is_active:
          asset.slot_key === "school_logo" || asset.slot_key === "partner_logo",
      });
      setStatusMessage(`คืนค่าเริ่มต้น "${asset.title}" เรียบร้อยแล้ว`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "คืนค่าเริ่มต้นไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!form.title.trim()) {
      setErrorMsg("กรุณาระบุชื่อโลโก้หรือตราสัญลักษณ์");
      return;
    }
    if (!form.is_core && !form.image_url.trim()) {
      setErrorMsg("กรุณาอัปโหลดรูปภาพหรือระบุลิงก์โลโก้");
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (isConfigured) {
        const payload = {
          slot_key: form.slot_key.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          placement: form.placement,
          image_url: form.image_url.trim(),
          default_url: form.default_url.trim(),
          display_order: Number(form.display_order) || 1,
          is_core: form.is_core,
          is_active: form.is_active,
          updated_by: user?.id || null,
        };

        const { data, error } = await supabase
          .from("brand_assets")
          .upsert(payload, { onConflict: "slot_key" })
          .select()
          .single();

        if (error) {
          if (error.code === "42P01" || error.code === "PGRST205") {
            throw new Error(
              "ยังไม่ได้สร้างตาราง brand_assets ใน Supabase กรุณานำ supabase/schema.sql ไป Run ใน SQL Editor"
            );
          }
          throw new Error(error.message);
        }

        const saved = data as BrandAsset;
        const exists = assets.some(
          (a) => a.id === saved.id || a.slot_key === saved.slot_key
        );
        const next = exists
          ? assets.map((a) =>
              a.id === saved.id || a.slot_key === saved.slot_key ? saved : a
            )
          : [...assets, saved];
        persistAssetsState(next);
      } else {
        let next: BrandAsset[];
        const exists = assets.some(
          (a) => a.id === form.id || a.slot_key === form.slot_key
        );
        if (exists) {
          next = assets.map((a) =>
            a.id === form.id || a.slot_key === form.slot_key
              ? {
                  ...a,
                  title: form.title.trim(),
                  description: form.description.trim(),
                  category: form.category,
                  placement: form.placement,
                  image_url: form.image_url.trim(),
                  display_order: Number(form.display_order) || 1,
                  is_active: form.is_active,
                  updated_at: now,
                }
              : a
          );
        } else {
          const created: BrandAsset = {
            id: `brand-${Date.now()}`,
            slot_key: form.slot_key,
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            placement: form.placement,
            image_url: form.image_url.trim(),
            default_url: "",
            display_order: Number(form.display_order) || 1,
            is_core: false,
            is_active: form.is_active,
            created_at: now,
            updated_at: now,
          };
          next = [...assets, created];
        }
        persistAssetsState(next);
      }

      setStatusMessage(`บันทึกข้อมูล "${form.title.trim()}" เรียบร้อยแล้ว`);
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกข้อมูลโลโก้ไม่สำเร็จ"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustom = async (asset: BrandAsset) => {
    if (CORE_SET.has(asset.slot_key) || asset.is_core) return;
    if (!confirm(`ต้องการลบโลโก้ "${asset.title}" ใช่หรือไม่?`)) return;

    setBusyId(asset.id);
    try {
      if (isConfigured) {
        const { error } = await supabase
          .from("brand_assets")
          .delete()
          .eq("id", asset.id);
        if (error) throw new Error(error.message);
      }
      persistAssetsState(assets.filter((a) => a.id !== asset.id));
      setStatusMessage(`ลบโลโก้ "${asset.title}" แล้ว`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "ลบโลโก้ไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen py-7 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-7">
      {/* Hero Banner */}
      <div className="liquid-glass-hero running-line-bottom rounded-[2rem] text-white p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-pink-100 text-xs font-semibold border border-white/25 backdrop-blur-md">
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>ศูนย์จัดการโลโก้ ไอคอนระบบ และตราสัญลักษณ์</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              จัดการโลโก้ต่างๆ ไอคอน โลโก้ MOU และภาคีเพิ่มเติม
            </h1>
            <p className="text-purple-100/95 text-sm max-w-3xl leading-relaxed">
              อัปโหลดเปลี่ยน{" "}
              <strong className="text-white">
                ไอคอนระบบ, โลโก้โรงเรียน, โลโก้ศูนย์ฯ, ตราหน้า MOU
              </strong>{" "}
              หรือ{" "}
              <strong className="text-pink-100">
                เพิ่มตราสัญลักษณ์หน่วยงานใหม่
              </strong>{" "}
              พร้อมเลือกเปิด-ปิดและกำหนดตำแหน่งแสดงผลบนหน้าสาธารณะ MOU Footer และรายงาน PDF ได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openAddCustomModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-purple-950 hover:bg-pink-50 text-xs sm:text-sm font-bold shadow-glass-pink cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-pink-600" />
              <span>เพิ่มโลโก้ / ไอคอนใหม่</span>
            </button>
            <Link
              href="/mou"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/25 transition-colors"
            >
              <Handshake className="w-4 h-4 text-pink-200" />
              <span>ดูผลบนหน้า MOU</span>
            </Link>
            <Link
              href="/showcase"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/25 transition-colors"
            >
              <Globe className="w-4 h-4 text-pink-200" />
              <span>หน้าสาธารณะ</span>
            </Link>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Live Preview Strip */}
      <div className="liquid-glass rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="font-bold text-navy-950 text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <span>ตัวอย่างการแสดงผลโลโก้ปัจจุบันในระบบ</span>
          </h2>
          <div className="heading-beam-track" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mini Navbar Preview */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-900 via-purple-800 to-pink-800 p-4 text-white flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-white/95 p-1 flex items-center justify-center border border-white/40 shrink-0 overflow-hidden">
              {appIconUrl ? (
                <img
                  src={appIconUrl}
                  alt="App Icon"
                  className="max-h-full w-auto object-contain"
                />
              ) : (
                <GraduationCap className="w-5 h-5 text-purple-700" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">
                แถบเมนูด้านบน &amp; หน้าเข้าสู่ระบบ
              </div>
              <div className="text-[11px] text-pink-200 truncate">
                {appIconUrl
                  ? "กำลังใช้ไอคอนรูปภาพที่ตั้งค่า (พร้อมอัปเดต Favicon)"
                  : "กำลังใช้ไอคอนมาตรฐานเริ่มต้น (GraduationCap)"}
              </div>
            </div>
          </div>

          {/* Mini MOU Header Preview */}
          <div className="rounded-2xl bg-white/85 border border-purple-200/80 p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-navy-950">
                หัวเอกสารหน้า MOU &amp; รายงาน PDF
              </div>
              <div className="text-[11px] text-purple-900/70">
                โลโก้หลัก 2 หน่วยงาน{" "}
                {mouSealUrl ? "+ ตราเสริม MOU" : ""}{" "}
                {mouExtraPreview.length > 0
                  ? `+ ภาคีเพิ่มเติม ${mouExtraPreview.length} รายการ`
                  : ""}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {partnerLogoUrl && (
                <div className="w-10 h-12 rounded-xl bg-white border border-purple-100 p-1 flex items-center justify-center shadow-2xs">
                  <img
                    src={partnerLogoUrl}
                    alt={SCHOOL_INFO.partnerName}
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              )}
              {mouSealUrl && (
                <div className="w-10 h-12 rounded-xl bg-amber-50 border border-amber-200 p-1 flex items-center justify-center shadow-2xs">
                  <img
                    src={mouSealUrl}
                    alt="ตราเสริม MOU"
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              )}
              {schoolLogoUrl && (
                <div className="w-10 h-12 rounded-xl bg-white border border-pink-100 p-1 flex items-center justify-center shadow-2xs">
                  <img
                    src={schoolLogoUrl}
                    alt={SCHOOL_INFO.name}
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Core System Logo Slots */}
      <section className="space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold text-navy-950 flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-pink-600" />
            <span>โลโก้และไอคอนประจำตำแหน่งหลักของระบบ ({coreAssets.length} ตำแหน่ง)</span>
          </h2>
          <div className="heading-beam-track" />
        </div>

        {loading ? (
          <div className="liquid-glass rounded-3xl p-10 text-center text-sm text-purple-900/70 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
            <span>กำลังโหลดข้อมูลโลโก้และไอคอน...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {coreAssets.map((asset) => {
              const catMeta =
                BRAND_CATEGORY_META[asset.category] ||
                BRAND_CATEGORY_META.custom;
              const isBusy = busyId === asset.id;
              return (
                <div
                  key={asset.slot_key}
                  className="liquid-glass running-line-bottom rounded-3xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catMeta.badgeClass}`}
                      >
                        {catMeta.label}
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleActive(asset)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer transition-colors ${
                          asset.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-white"
                        }`}
                      >
                        {asset.is_active ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        <span>{asset.is_active ? "เปิดแสดงผล" : "ปิดไว้"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-20 h-20 rounded-2xl bg-white border border-purple-200/80 p-2 flex items-center justify-center shadow-inner shrink-0 overflow-hidden">
                        {asset.image_url?.trim() ? (
                          <img
                            src={asset.image_url}
                            alt={asset.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[11px] text-purple-400 text-center font-medium">
                            ยังไม่มีรูป
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-bold text-navy-950 text-sm leading-snug">
                          {asset.title}
                        </h3>
                        <p className="text-[11px] text-purple-900/70 leading-relaxed line-clamp-3">
                          {asset.description}
                        </p>
                        <div className="text-[10px] text-purple-600 font-mono">
                          {asset.slot_key} • {estimateDataUriKb(asset.image_url)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100 flex flex-wrap items-center gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold cursor-pointer hover:opacity-95 transition-opacity">
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>อัปโหลดรูปใหม่</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => handleQuickUploadForAsset(asset, e)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => openEditModal(asset)}
                      title="แก้ไขรายละเอียด / ใส่ URL"
                      className="p-2 rounded-xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleResetDefault(asset)}
                      title="คืนค่าเริ่มต้น"
                      className="p-2 rounded-xl bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Custom Added Logos & Partner Badges */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold text-navy-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-600" />
              <span>
                โลโก้ / ไอคอนส่วนที่เพิ่มเอง ({assets.filter((a) => !CORE_SET.has(a.slot_key)).length} รายการ)
              </span>
            </h2>
            <div className="heading-beam-track" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
              aria-label="กรองตามตำแหน่งแสดงผล"
              className="bg-white/90 border border-purple-200 rounded-full px-3.5 py-1.5 text-xs font-semibold text-purple-950"
            >
              <option value="all">ทุกตำแหน่งแสดงผล</option>
              {BRAND_PLACEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={openAddCustomModal}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มโลโก้เพิ่มเติม</span>
            </button>
          </div>
        </div>

        {customAssets.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-8 text-center space-y-2.5">
            <ImagePlus className="w-10 h-10 text-pink-300 mx-auto" />
            <div className="text-sm font-bold text-navy-950">
              ยังไม่มีโลโก้เพิ่มเติมในหมวดนี้
            </div>
            <p className="text-xs text-purple-900/70 max-w-lg mx-auto">
              คุณสามารถเพิ่มตราสัญลักษณ์ของหน่วยงานภาคี เช่น ตรา สพฐ., ตรา สพป.จันทบุรี เขต 1, ตราองค์กรผู้สนับสนุน แล้วเลือกให้แสดงบนหน้า MOU หน้าสาธารณะ หรือ Footer ได้ตามต้องการ
            </p>
            <button
              type="button"
              onClick={openAddCustomModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มโลโก้รายการแรก</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {customAssets.map((asset) => {
              const placementMeta = BRAND_PLACEMENT_OPTIONS.find(
                (p) => p.value === asset.placement
              );
              const isBusy = busyId === asset.id;
              return (
                <div
                  key={asset.id}
                  className="liquid-glass rounded-3xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 truncate">
                        {placementMeta?.label || asset.placement}
                      </span>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleActive(asset)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border cursor-pointer shrink-0 ${
                          asset.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {asset.is_active ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        <span>{asset.is_active ? "เปิดแสดงผล" : "ซ่อนอยู่"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-purple-200/80 p-1.5 flex items-center justify-center shadow-inner shrink-0 overflow-hidden">
                        {asset.image_url ? (
                          <img
                            src={asset.image_url}
                            alt={asset.title}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-purple-400">
                            ไม่มีรูป
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-bold text-navy-950 text-sm truncate">
                          {asset.title}
                        </h3>
                        <p className="text-xs text-purple-900/70 line-clamp-2">
                          {asset.description || "-"}
                        </p>
                        <div className="text-[10px] text-purple-600 font-mono">
                          ลำดับ #{asset.display_order} •{" "}
                          {estimateDataUriKb(asset.image_url)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(asset)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-pink-600" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleDeleteCustom(asset)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบ</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/50 backdrop-blur-sm">
          <form
            onSubmit={handleSaveForm}
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto liquid-glass bg-white/95 rounded-3xl p-6 space-y-4 shadow-glass-lg border border-purple-200"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy-950">
                  {form.is_core
                    ? `ตั้งค่า ${form.title}`
                    : form.id
                    ? "แก้ไขโลโก้เพิ่มเติม"
                    : "เพิ่มโลโก้ / ไอคอนใหม่"}
                </h2>
                <p className="text-xs text-purple-900/70">
                  อัปโหลดไฟล์ PNG / JPG / WEBP / SVG (ระบบปรับขนาดให้อัตโนมัติคมชัด) หรือวาง URL รูปภาพ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-purple-100 text-purple-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Image Upload & Preview Box */}
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white border border-purple-200 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {processingImg ? (
                  <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
                ) : form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="ตัวอย่างโลโก้"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-purple-400 text-center">
                    ยังไม่มีรูป
                  </span>
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold cursor-pointer hover:opacity-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์รูปจากเครื่อง</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleFilePickedInModal}
                      className="hidden"
                    />
                  </label>

                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, image_url: "" })}
                      className="px-3 py-2 rounded-full bg-white border border-rose-200 text-rose-700 text-xs font-semibold cursor-pointer"
                    >
                      ล้างรูป
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                  placeholder="หรือวาง URL รูปภาพ เช่น /images/... หรือ https://..."
                  className="w-full border border-purple-200 rounded-xl px-3 py-1.5 text-xs bg-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-purple-950 block mb-1">
                  ชื่อโลโก้ / ชื่อหน่วยงาน *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="เช่น สำนักงานเขตพื้นที่การศึกษาประถมศึกษาจันทบุรี เขต 1"
                  className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-purple-950 block mb-1">
                  คำอธิบาย / ข้อความกำกับใต้โลโก้
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="เช่น หน่วยงานต้นสังกัด / ภาคีร่วมสนับสนุน"
                  className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>

              {!form.is_core && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-purple-950 block mb-1">
                      หมวดหมู่
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          category: e.target.value as BrandCategory,
                        })
                      }
                      className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white"
                    >
                      {Object.entries(BRAND_CATEGORY_META).map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-purple-950 block mb-1">
                      ตำแหน่งแสดงผลบนเว็บ
                    </label>
                    <select
                      value={form.placement}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          placement: e.target.value as BrandPlacement,
                        })
                      }
                      className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white"
                    >
                      {BRAND_PLACEMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-purple-950 block mb-1">
                      ลำดับการเรียง
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.display_order}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          display_order: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full border border-purple-200 rounded-xl px-3 py-2 text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs font-semibold text-purple-950 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                  className="accent-pink-600 rounded"
                />
                <span>เปิดใช้งาน / แสดงผลโลโก้นี้ทันที</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-purple-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-full border border-purple-200 text-xs font-semibold text-purple-900 bg-white cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving || processingImg}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>{saving ? "กำลังบันทึก..." : "บันทึกโลโก้"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
