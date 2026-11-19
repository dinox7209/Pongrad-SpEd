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
  plans: StudentDevelopmentPlan[];
}

export async function generateDevelopmentPlanPdfBlob(
  options: BuildDevelopmentPlanPdfOptions
): Promise<Blob> {
  const [{ pdf }, devTemplates, coreTemplates, schoolLogoDataUri, partnerLogoDataUri] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("@/components/pdf/DevelopmentPlanPdfTemplates"),
      import("@/components/pdf/SpEdPdfTemplates"),
      fetchImageAsDataUri("/images/logo-wat-pongrad.png"),
      fetchImageAsDataUri("/images/logo-sped-chanthaburi.png"),
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
