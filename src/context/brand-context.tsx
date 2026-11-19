"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { getDemoBrandAssets } from "@/lib/demo-store";
import {
  BrandAsset,
  CORE_BRAND_SLOT_KEYS,
  DEFAULT_BRAND_ASSETS,
} from "@/types/database";

interface BrandContextValue {
  assets: BrandAsset[];
  loading: boolean;
  appIconUrl: string | null;
  schoolLogoUrl: string | null;
  partnerLogoUrl: string | null;
  mouSealUrl: string | null;
  showcaseBadgeUrl: string | null;
  getExtraAssets: (
    placement: "mou" | "showcase" | "footer" | "header"
  ) => BrandAsset[];
  refreshBrands: () => Promise<void>;
  setBrandAssetsState: (next: BrandAsset[]) => void;
}

const BrandContext = createContext<BrandContextValue>({
  assets: DEFAULT_BRAND_ASSETS,
  loading: false,
  appIconUrl: null,
  schoolLogoUrl: "/images/logo-wat-pongrad.png",
  partnerLogoUrl: "/images/logo-sped-chanthaburi.png",
  mouSealUrl: null,
  showcaseBadgeUrl: null,
  getExtraAssets: () => [],
  refreshBrands: async () => {},
  setBrandAssetsState: () => {},
});

const CORE_SET = new Set<string>(CORE_BRAND_SLOT_KEYS);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { isConfigured } = useAuth();
  const [assets, setAssets] = useState<BrandAsset[]>(DEFAULT_BRAND_ASSETS);
  const [loading, setLoading] = useState(true);

  const refreshBrands = useCallback(async () => {
    setLoading(true);
    try {
      if (isConfigured) {
        const { data, error } = await supabase
          .from("brand_assets")
          .select("*")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          setAssets(data as BrandAsset[]);
        } else {
          setAssets(DEFAULT_BRAND_ASSETS);
        }
      } else {
        setAssets(getDemoBrandAssets());
      }
    } catch {
      setAssets(DEFAULT_BRAND_ASSETS);
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    refreshBrands();
  }, [refreshBrands]);

  const setBrandAssetsState = useCallback((next: BrandAsset[]) => {
    setAssets(next);
  }, []);

  const byKey = useMemo(() => {
    const map = new Map<string, BrandAsset>();
    for (const item of assets) {
      map.set(item.slot_key, item);
    }
    return map;
  }, [assets]);

  const resolveSlotUrl = useCallback(
    (slotKey: string, fallback: string | null): string | null => {
      const slot = byKey.get(slotKey);
      if (!slot) return fallback;
      if (!slot.is_active) return null;
      return slot.image_url?.trim() || slot.default_url?.trim() || fallback;
    },
    [byKey]
  );

  const appIconUrl = useMemo(
    () => resolveSlotUrl("app_icon", null),
    [resolveSlotUrl]
  );
  const schoolLogoUrl = useMemo(
    () => resolveSlotUrl("school_logo", "/images/logo-wat-pongrad.png"),
    [resolveSlotUrl]
  );
  const partnerLogoUrl = useMemo(
    () => resolveSlotUrl("partner_logo", "/images/logo-sped-chanthaburi.png"),
    [resolveSlotUrl]
  );
  const mouSealUrl = useMemo(
    () => resolveSlotUrl("mou_seal", null),
    [resolveSlotUrl]
  );
  const showcaseBadgeUrl = useMemo(
    () => resolveSlotUrl("showcase_badge", null),
    [resolveSlotUrl]
  );

  // ซิงค์ Favicon บนแท็บเบราว์เซอร์เมื่อเปิดใช้งาน app_icon
  useEffect(() => {
    if (typeof document === "undefined" || !appIconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = appIconUrl;
  }, [appIconUrl]);

  const getExtraAssets = useCallback(
    (placement: "mou" | "showcase" | "footer" | "header"): BrandAsset[] => {
      return assets
        .filter(
          (item) =>
            !CORE_SET.has(item.slot_key) &&
            item.is_active &&
            Boolean(item.image_url?.trim()) &&
            (item.placement === placement || item.placement === "all")
        )
        .sort((a, b) => (a.display_order || 99) - (b.display_order || 99));
    },
    [assets]
  );

  const value = useMemo<BrandContextValue>(
    () => ({
      assets,
      loading,
      appIconUrl,
      schoolLogoUrl,
      partnerLogoUrl,
      mouSealUrl,
      showcaseBadgeUrl,
      getExtraAssets,
      refreshBrands,
      setBrandAssetsState,
    }),
    [
      assets,
      loading,
      appIconUrl,
      schoolLogoUrl,
      partnerLogoUrl,
      mouSealUrl,
      showcaseBadgeUrl,
      getExtraAssets,
      refreshBrands,
      setBrandAssetsState,
    ]
  );

  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

export function useBrandAssets() {
  return useContext(BrandContext);
}
