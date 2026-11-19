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
  BRAND_PLACEMENT_OPTIONS,
  BrandAsset,
  BrandPlacement,
  CORE_BRAND_SLOT_KEYS,
} from "@/types/database";
import {
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  Handshake,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
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
    placement: "all",
    image_url: "",
    default_url: "",
    display_order: nextOrder,
    is_core: false,
    is_active: true,
  };
}

export default function AdminBrandingPage() {
  const { isConfigured, user } = useAuth();
  const { assets, loading, setBrandAssetsState } = useBrandAssets();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<BrandFormState>(createEmptyCustomForm(4));
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
        .filter(
          (a) =>
            !CORE_SET.has(a.slot_key) &&
            a.slot_key !== "mou_seal" &&
            a.slot_key !== "showcase_badge"
        )
        .sort((a, b) => (a.display_order || 99) - (b.display_order || 99)),
    [assets]
  );

  const persistAssetsState = (next: BrandAsset[]) => {
    setBrandAssetsState(next);
    if (!isConfigured) {
      saveDemoBrandAssets(next);
    }
  };

  const openAddCustomModal = () => {
    const maxOrder = assets.reduce(
      (max, a) => Math.max(max, a.display_order || 0),
      3
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
      placement:
        asset.placement === "mou" || asset.placement === "showcase"
          ? asset.placement
          : "all",
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

  const updateAssetRecord = async (
    target: BrandAsset,
    patch: Partial<
      Pick<BrandAsset, "title" | "description" | "placement" | "image_url" | "display_order" | "is_active">
    >
  ) => {
    const now = new Date().toISOString();
    if (isConfigured) {
      const payload = {
        slot_key: target.slot_key,
        title: patch.title ?? target.title,
        description: patch.description ?? target.description,
        category: target.category || "custom",
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

  const handleQuickUpload = async (
    asset: BrandAsset,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusyId(asset.id);
    setStatusMessage("");
    try {
      const dataUri = await processBrandImageFile(file, 512);
      await updateAssetRecord(asset, { image_url: dataUri, is_active: true });
      setStatusMessage(`อัปเดต "${asset.title}" เรียบร้อยแล้ว`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (asset: BrandAsset) => {
    setBusyId(asset.id);
    setStatusMessage("");
    try {
      const nextActive = !asset.is_active;
      await updateAssetRecord(asset, { is_active: nextActive });
      setStatusMessage(
        `${nextActive ? "เปิด" : "ปิด"}การแสดงผล "${asset.title}" แล้ว`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "ปรับสถานะไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  };

  const handleResetDefault = async (asset: BrandAsset) => {
    if (!confirm(`ต้องการคืนค่า "${asset.title}" กลับเป็นค่าเริ่มต้นใช่หรือไม่?`)) {
      return;
    }
    setBusyId(asset.id);
    setStatusMessage("");
    try {
      await updateAssetRecord(asset, {
        image_url: asset.default_url || "",
        is_active: asset.slot_key !== "app_icon",
      });
      setStatusMessage(`คืนค่าเริ่มต้น "${asset.title}" แล้ว`);
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
      setErrorMsg("กรุณาระบุชื่อโลโก้หรือหน่วยงาน");
      return;
    }
    if (!form.image_url.trim()) {
      setErrorMsg("กรุณาอัปโหลดรูปภาพหรือระบุลิงก์รูปภาพ");
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
          category: form.is_core
            ? form.slot_key === "app_icon"
              ? "system_icon"
              : form.slot_key === "school_logo"
              ? "school"
              : "partner"
            : "custom",
          placement: form.is_core
            ? form.slot_key === "app_icon"
              ? "header"
              : "all"
            : form.placement,
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
                  placement: form.is_core ? a.placement : form.placement,
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
            category: "custom",
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

      setStatusMessage(`บันทึก "${form.title.trim()}" เรียบร้อยแล้ว`);
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "บันทึกข้อมูลไม่สำเร็จ"
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
    <div className="min-h-screen py-7 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-7">
      {/* Header Banner */}
      <div className="liquid-glass-hero running-line-bottom rounded-[2rem] text-white p-6 sm:p-8">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 text-pink-100 text-xs font-semibold border border-white/25">
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span>จัดการโลโก้และไอคอนระบบ (เฉพาะส่วนที่ใช้งานจริง)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              โลโก้ ไอคอนเว็บ และตราสัญลักษณ์หน้า MOU
            </h1>
            <p className="text-purple-100/95 text-sm max-w-2xl leading-relaxed">
              เปลี่ยนรูปโลโก้หลักทั้ง 3 จุดที่ใช้จริงทั่วทั้งระบบ (ไอคอนเว็บ, โลโก้โรงเรียน, โลโก้ศูนย์การศึกษาพิเศษ) และเพิ่มโลโก้หน่วยงานเพิ่มเติมสำหรับหน้า MOU หรือหน้าสาธารณะได้ตามต้องการ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openAddCustomModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-purple-950 hover:bg-pink-50 text-xs sm:text-sm font-bold shadow-glass-pink cursor-pointer transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 text-pink-600" />
              <span>เพิ่มโลโก้หน่วยงานเพิ่มเติม</span>
            </button>
            <Link
              href="/mou"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/25 transition-colors"
            >
              <Handshake className="w-4 h-4 text-pink-200" />
              <span>หน้า MOU</span>
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

      {/* Section 1: 3 Practical Core Logos */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-navy-950">
            โลโก้หลักที่ใช้งานจริง ({coreAssets.length} รายการ)
          </h2>
          <div className="heading-beam-track" />
        </div>

        {loading ? (
          <div className="liquid-glass rounded-3xl p-10 text-center text-sm text-purple-900/70 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-pink-600" />
            <span>กำลังโหลดข้อมูลโลโก้...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {coreAssets.map((asset) => {
              const isBusy = busyId === asset.id;
              return (
                <div
                  key={asset.slot_key}
                  className="liquid-glass running-line-bottom rounded-3xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-purple-800 bg-purple-100/80 px-2.5 py-0.5 rounded-full">
                        {asset.slot_key === "app_icon"
                          ? "ไอคอนเว็บ"
                          : asset.slot_key === "school_logo"
                          ? "สถานศึกษา"
                          : "หน่วยงานร่วม"}
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
                        <span>{asset.is_active ? "เปิดใช้งาน" : "ปิดไว้"}</span>
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
                          <span className="text-[11px] text-purple-400">
                            ไม่มีรูป
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-bold text-navy-950 text-sm leading-snug">
                          {asset.title}
                        </h3>
                        <p className="text-[11px] text-purple-900/70 leading-relaxed">
                          {asset.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100 flex items-center gap-2">
                    <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold cursor-pointer hover:opacity-95 transition-opacity">
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>เปลี่ยนรูป</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={(e) => handleQuickUpload(asset, e)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => openEditModal(asset)}
                      title="แก้ไข"
                      className="p-2 rounded-xl bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleResetDefault(asset)}
                      title="คืนค่าเดิม"
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

      {/* Section 2: Addable Partner Logos (Only when needed) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-navy-950">
              โลโก้หน่วยงานเพิ่มเติม ({customAssets.length} รายการ)
            </h2>
            <div className="heading-beam-track" />
          </div>
        </div>

        {customAssets.length === 0 ? (
          <div className="liquid-glass rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-purple-900/75">
              ยังไม่มีโลโก้เพิ่มเติม — หากในอนาคตมีหน่วยงานภาคีใหม่ (เช่น สพป. หรือผู้สนับสนุน) สามารถกดเพิ่มเพื่อแสดงในหน้า MOU และหน้าสาธารณะได้ทันที
            </div>
            <button
              type="button"
              onClick={openAddCustomModal}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มโลโก้</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 truncate">
                        {placementMeta?.label || "หน้า MOU และสาธารณะ"}
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
                        <span>{asset.is_active ? "เปิด" : "ซ่อน"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-purple-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={asset.image_url}
                          alt={asset.title}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-navy-950 text-sm truncate">
                          {asset.title}
                        </h3>
                        {asset.description && (
                          <p className="text-xs text-purple-900/70 line-clamp-2 mt-0.5">
                            {asset.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(asset)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold cursor-pointer"
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

      {/* Clean Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-purple-950/50 backdrop-blur-sm">
          <form
            onSubmit={handleSaveForm}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto liquid-glass bg-white/95 rounded-3xl p-6 space-y-4 shadow-glass-lg border border-purple-200"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-navy-950">
                {form.is_core
                  ? `แก้ไข ${form.title}`
                  : form.id
                  ? "แก้ไขโลโก้เพิ่มเติม"
                  : "เพิ่มโลโก้หน่วยงานเพิ่มเติม"}
              </h2>
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

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white border border-purple-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
                {processingImg ? (
                  <Loader2 className="w-5 h-5 animate-spin text-pink-600" />
                ) : form.image_url ? (
                  <img
                    src={form.image_url}
                    alt="ตัวอย่าง"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-purple-400">ไม่มีรูป</span>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>อัปโหลดรูปภาพ</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleFilePickedInModal}
                    className="hidden"
                  />
                </label>
                <div className="text-[11px] text-purple-900/65">
                  PNG / JPG / WEBP / SVG ({estimateDataUriKb(form.image_url)})
                </div>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) =>
                    setForm({ ...form, image_url: e.target.value })
                  }
                  placeholder="หรือวาง URL รูปภาพ..."
                  className="w-full border border-purple-200 rounded-xl px-2.5 py-1 text-xs bg-white font-mono"
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
                  className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-purple-950 block mb-1">
                  คำอธิบายสั้น (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border border-purple-200 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>

              {!form.is_core && (
                <div>
                  <label className="text-xs font-semibold text-purple-950 block mb-1">
                    ตำแหน่งที่แสดงผล
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
                <span>เปิดใช้งาน / แสดงผลทันที</span>
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
                <span>{saving ? "กำลังบันทึก..." : "บันทึก"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
