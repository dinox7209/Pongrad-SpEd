import { NextRequest, NextResponse } from "next/server";
import {
  createDriveResumableUploadSession,
  isGoogleDriveConfigured,
} from "@/lib/googleDrive";
import { getAuthenticatedAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.isDemoMode && !auth.user) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: "ยังไม่ได้ตั้งค่า Google Drive Service Account" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      fileName?: string;
      mimeType?: string;
      folderName?: string;
    };

    if (!body.fileName || !body.mimeType) {
      return NextResponse.json(
        { error: "กรุณาระบุ fileName และ mimeType" },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || undefined;
    const session = await createDriveResumableUploadSession({
      fileName: body.fileName,
      mimeType: body.mimeType,
      folderName: body.folderName || "videos",
      origin,
    });

    return NextResponse.json(session);
  } catch (err) {
    console.error("[API/drive/resumable] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "ไม่สามารถสร้าง Resumable Upload Session ได้",
      },
      { status: 500 }
    );
  }
}
