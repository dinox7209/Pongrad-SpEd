"use client";

import React from "react";
import type { DevelopmentPlanPdfPayload } from "@/components/pdf/DevelopmentPlanPdfTemplates";
import { fetchImageAsDataUri } from "@/lib/utils";
import { StudentDevelopmentPlan } from "@/types/database";

export interface BuildDevelopmentPlanPdfOptions {
  reportTitle: string;
  academicYear: string;
  semesterLabel: string;
  filterLabel: string;
  teacherName: string;
  supervisorName: string;
  directorName: string;
  includeSummaryCover: boolean;
  schoolLogoUrl?: string | null;
  partnerLogoUrl?: string | null;
  plans: StudentDevelopmentPlan[];
}

async function toPdfSafeLogoUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const raw = await fetchImageAsDataUri(url);
  if (!raw) return null;
  if (raw.startsWith("data:image/png") || raw.startsWith("data:image/jpeg")) {
    return raw;
  }
  return await new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 200;
      canvas.height = img.naturalHeight || 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = raw;
  });
}

export async function generateDevelopmentPlanPdfBlob(
  options: BuildDevelopmentPlanPdfOptions
): Promise<Blob> {
  const schoolSrc =
    options.schoolLogoUrl !== undefined
      ? options.schoolLogoUrl
      : "/images/logo-wat-pongrad.png";
  const partnerSrc =
    options.partnerLogoUrl !== undefined
      ? options.partnerLogoUrl
      : "/images/logo-sped-chanthaburi.png";

  const [{ pdf }, devTemplates, coreTemplates, schoolLogoDataUri, partnerLogoDataUri] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/pdf/DevelopmentPlanPdfTemplates"),
      import("@/components/pdf/SpEdPdfTemplates"),
      toPdfSafeLogoUri(schoolSrc),
      toPdfSafeLogoUri(partnerSrc),
    ]);

  coreTemplates.ensureThaiPdfFonts("/fonts");

  const payload: DevelopmentPlanPdfPayload = {
    ...options,
    schoolLogoDataUri,
    partnerLogoDataUri,
  };

  const docElement = React.createElement(
    devTemplates.DevelopmentPlanPdfDocument,
    { payload }
  );

  return await pdf(
    docElement as unknown as Parameters<typeof pdf>[0]
  ).toBlob();
}
