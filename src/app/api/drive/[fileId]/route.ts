import { NextRequest, NextResponse } from "next/server";
import {
  deleteDriveFile,
  isGoogleDriveConfigured,
  setDriveFilePublic,
} from "@/lib/googleDrive";
import {
  createServerSupabaseClient,
  getAuthenticatedAdmin,
  isServerSupabaseConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.isDemoMode && !auth.user) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    const { fileId } = await context.params;
    const body = (await request.json()) as { is_public?: boolean; assetId?: string };

    if (typeof body.is_public !== "boolean") {
      return NextResponse.json({ error: "กรุณาระบุ is_public (boolean)" }, { status: 400 });
    }

    if (isGoogleDriveConfigured() && !fileId.startsWith("demo-")) {
      await setDriveFilePublic(fileId, body.is_public);
    }

    if (isServerSupabaseConfigured() && body.assetId) {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from("media_assets")
        .update({ is_public: body.is_public })
        .eq("id", body.assetId)
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ asset: data });
    }

    return NextResponse.json({ ok: true, is_public: body.is_public });
  } catch (err) {
    console.error("[API/drive PATCH] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "อัปเดตสถานะไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.isDemoMode && !auth.user) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    const { fileId } = await context.params;
    const assetId = request.nextUrl.searchParams.get("assetId");

    if (isGoogleDriveConfigured() && !fileId.startsWith("demo-")) {
      try {
        await deleteDriveFile(fileId);
      } catch (driveErr) {
        console.warn("[API/drive DELETE] Drive delete skipped/failed:", driveErr);
      }
    }

    if (isServerSupabaseConfigured() && assetId) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.from("media_assets").delete().eq("id", assetId);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[API/drive DELETE] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ลบไฟล์ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
