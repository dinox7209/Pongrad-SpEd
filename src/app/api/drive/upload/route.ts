import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import {
  isGoogleDriveConfigured,
  uploadStreamToDrive,
} from "@/lib/googleDrive";
import {
  createServerSupabaseClient,
  getAuthenticatedAdmin,
  isServerSupabaseConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function resolveDriveSubfolder(mediaType: string): string {
  switch (mediaType) {
    case "video":
      return "videos";
    case "newsletter":
      return "newsletters";
    case "portfolio":
      return "portfolios";
    case "report":
    case "pdf":
      return "reports";
    default:
      return "media";
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.isDemoMode && !auth.user) {
      return NextResponse.json(
        { error: "ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบผู้ดูแลก่อนอัปโหลด" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์ที่ต้องการอัปโหลด" },
        { status: 400 }
      );
    }

    const title = (formData.get("title") as string)?.trim() || file.name;
    const description = (formData.get("description") as string)?.trim() || "";
    const mediaType = (formData.get("media_type") as string)?.trim() || "image";
    const skillCategory =
      (formData.get("skill_category") as string)?.trim() || "ทักษะวิชาการและการเรียนรู้";
    const gradeLevel = (formData.get("grade_level") as string)?.trim() || "ทุกระดับชั้น";
    const studentIdRaw = (formData.get("student_id") as string)?.trim() || "";
    const weekNumberRaw = (formData.get("week_number") as string)?.trim() || "";
    const isPublic = formData.get("is_public") === "true";
    const linkToWeek = formData.get("link_to_week") === "true";

    const weekNumber =
      weekNumberRaw && !Number.isNaN(Number(weekNumberRaw))
        ? Number(weekNumberRaw)
        : null;

    if (!isGoogleDriveConfigured()) {
      if (auth.isDemoMode) {
        const mockFileId = `demo-upload-${Date.now()}`;
        return NextResponse.json({
          demo: true,
          asset: {
            id: `media-${Date.now()}`,
            title,
            description,
            media_type: mediaType,
            drive_file_id: mockFileId,
            drive_view_url: `/api/drive/stream/${mockFileId}`,
            is_public: isPublic,
            skill_category: skillCategory,
            grade_level: gradeLevel,
            student_id: studentIdRaw || null,
            week_number: weekNumber,
            mime_type: file.type,
            file_size: file.size,
            created_at: new Date().toISOString(),
          },
          message:
            "โหมดทดลอง: บันทึกข้อมูลจำลองแล้ว (ยังไม่ได้ตั้งค่า Google Service Account)",
        });
      }

      return NextResponse.json(
        {
          error:
            "ยังไม่ได้ตั้งค่า Google Drive Service Account (GOOGLE_SERVICE_ACCOUNT_KEY / GOOGLE_DRIVE_FOLDER_ID)",
        },
        { status: 500 }
      );
    }

    // แปลง Web ReadableStream จาก request ตรงเป็น Node Readable เพื่อสตรีมขึ้น Drive ทันทีไม่ผ่าน Disk
    const nodeStream = Readable.fromWeb(
      file.stream() as unknown as NodeWebReadableStream<Uint8Array>
    );

    const driveResult = await uploadStreamToDrive({
      stream: nodeStream,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      folderName: resolveDriveSubfolder(mediaType),
      makePublic: isPublic,
    });

    if (isServerSupabaseConfigured()) {
      const supabase = await createServerSupabaseClient();
      const { data: inserted, error: insertError } = await supabase
        .from("media_assets")
        .insert({
          title,
          description,
          media_type: mediaType,
          drive_file_id: driveResult.fileId,
          drive_view_url: driveResult.webViewLink,
          is_public: isPublic,
          skill_category: skillCategory,
          grade_level: gradeLevel,
          student_id: studentIdRaw || null,
          week_number: weekNumber,
          mime_type: driveResult.mimeType,
          file_size: driveResult.size ?? file.size,
          uploaded_by: auth.user?.id || null,
        })
        .select("*")
        .single();

      if (insertError) {
        return NextResponse.json(
          { error: `อัปโหลดขึ้น Drive สำเร็จ แต่บันทึกฐานข้อมูลไม่สำเร็จ: ${insertError.message}` },
          { status: 500 }
        );
      }

      if (linkToWeek && weekNumber) {
        const updatePayload: Record<string, string> = {};
        if (mediaType === "video") {
          updatePayload.video_drive_id = driveResult.fileId;
        } else {
          updatePayload.pdf_drive_id = driveResult.fileId;
        }
        await supabase
          .from("weekly_tasks")
          .update(updatePayload)
          .eq("week_number", weekNumber);
      }

      return NextResponse.json({
        asset: inserted,
        drive: driveResult,
      });
    }

    return NextResponse.json({
      drive: driveResult,
      asset: {
        id: `media-${Date.now()}`,
        title,
        description,
        media_type: mediaType,
        drive_file_id: driveResult.fileId,
        drive_view_url: driveResult.webViewLink,
        is_public: isPublic,
        skill_category: skillCategory,
        grade_level: gradeLevel,
        student_id: studentIdRaw || null,
        week_number: weekNumber,
        mime_type: driveResult.mimeType,
        file_size: driveResult.size ?? file.size,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[API/drive/upload] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสตรีมไฟล์ขึ้น Google Drive",
      },
      { status: 500 }
    );
  }
}
