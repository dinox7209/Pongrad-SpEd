import { NextRequest, NextResponse } from "next/server";
import { isGoogleDriveConfigured, setDriveFilePublic } from "@/lib/googleDrive";
import {
  createServerSupabaseClient,
  getAuthenticatedAdmin,
  isServerSupabaseConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * บันทึกข้อมูลสื่อลงตาราง media_assets หลังจากเบราว์เซอร์อัปโหลดตรงแบบ Resumable ขึ้น Google Drive เสร็จแล้ว
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.isDemoMode && !auth.user) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    const body = (await request.json()) as {
      fileId: string;
      title: string;
      description?: string;
      media_type: string;
      skill_category: string;
      grade_level?: string;
      student_id?: string | null;
      week_number?: number | null;
      is_public?: boolean;
      mime_type?: string;
      file_size?: number;
      webViewLink?: string;
      link_to_week?: boolean;
    };

    if (!body.fileId || !body.title) {
      return NextResponse.json(
        { error: "ข้อมูล fileId และ title ไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    const isPublic = Boolean(body.is_public);
    if (isPublic && isGoogleDriveConfigured()) {
      await setDriveFilePublic(body.fileId, true);
    }

    const webViewLink =
      body.webViewLink || `https://drive.google.com/file/d/${body.fileId}/view`;

    if (isServerSupabaseConfigured()) {
      const supabase = await createServerSupabaseClient();
      const { data: inserted, error } = await supabase
        .from("media_assets")
        .insert({
          title: body.title,
          description: body.description || "",
          media_type: body.media_type || "video",
          drive_file_id: body.fileId,
          drive_view_url: webViewLink,
          is_public: isPublic,
          skill_category: body.skill_category || "ทักษะวิชาการและการเรียนรู้",
          grade_level: body.grade_level || "ทุกระดับชั้น",
          student_id: body.student_id || null,
          week_number: body.week_number ?? null,
          mime_type: body.mime_type || "video/mp4",
          file_size: body.file_size ?? null,
          uploaded_by: auth.user?.id || null,
        })
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (body.link_to_week && body.week_number) {
        const updatePayload =
          body.media_type === "video"
            ? { video_drive_id: body.fileId }
            : { pdf_drive_id: body.fileId };
        await supabase
          .from("weekly_tasks")
          .update(updatePayload)
          .eq("week_number", body.week_number);
      }

      return NextResponse.json({ asset: inserted });
    }

    return NextResponse.json({
      asset: {
        id: `media-${Date.now()}`,
        title: body.title,
        description: body.description || "",
        media_type: body.media_type || "video",
        drive_file_id: body.fileId,
        drive_view_url: webViewLink,
        is_public: isPublic,
        skill_category: body.skill_category || "ทักษะวิชาการและการเรียนรู้",
        grade_level: body.grade_level || "ทุกระดับชั้น",
        student_id: body.student_id || null,
        week_number: body.week_number ?? null,
        mime_type: body.mime_type || "video/mp4",
        file_size: body.file_size ?? null,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[API/drive/register] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ลงทะเบียนไฟล์ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
