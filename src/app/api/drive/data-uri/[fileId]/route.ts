import { NextRequest, NextResponse } from "next/server";
import {
  fetchDriveFileAsDataUri,
  isGoogleDriveConfigured,
} from "@/lib/googleDrive";
import { getAuthenticatedAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.isDemoMode && !auth.user) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    const { fileId } = await context.params;
    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    if (fileId.startsWith("demo-") || !isGoogleDriveConfigured()) {
      return NextResponse.json({
        dataUri: null,
        demo: true,
      });
    }

    const data = await fetchDriveFileAsDataUri(fileId);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API/drive/data-uri] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "โหลดภาพจาก Drive ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
