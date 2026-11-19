import { NextRequest, NextResponse } from "next/server";
import { isGoogleDriveConfigured, streamDriveFile } from "@/lib/googleDrive";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
  getAuthenticatedAdmin,
  isServerSupabaseConfigured,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function buildDemoSvg(label: string, subtitle: string, bg: string, accent: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" rx="24" fill="url(#g)"/>
  <circle cx="690" cy="110" r="85" fill="rgba(255,255,255,0.12)"/>
  <circle cx="110" cy="400" r="110" fill="rgba(255,255,255,0.10)"/>
  <rect x="64" y="64" width="672" height="372" rx="20" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.28)" stroke-width="2"/>
  <text x="104" y="155" fill="#bfdbfe" font-family="sans-serif" font-size="22" font-weight="600">โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) • การศึกษาพิเศษ</text>
  <text x="104" y="235" fill="#ffffff" font-family="sans-serif" font-size="38" font-weight="700">${label}</text>
  <text x="104" y="295" fill="#e0f2fe" font-family="sans-serif" font-size="22">${subtitle}</text>
  <rect x="104" y="340" width="260" height="44" rx="22" fill="rgba(255,255,255,0.22)"/>
  <text x="234" y="369" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="18" font-weight="600">ตัวอย่างสื่อ (Demo Mode)</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await context.params;
    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    // ตัวอย่างสื่อสำหรับโหมด Demo ก่อนเชื่อมต่อ Google Drive
    if (fileId.startsWith("demo-")) {
      if (fileId.includes("image-2")) {
        return buildDemoSvg(
          "ผลงานศิลปะปะติดกระดาษฉีก",
          "ฝึกสมาธิ กล้ามเนื้อมัดเล็ก และความคิดสร้างสรรค์ (ป.1)",
          "#1e3a8a",
          "#0284c7"
        );
      }
      return buildDemoSvg(
        "สื่อกระดานหมุดร้อยเชือกฝึกทักษะ",
        "พัฒนาประสานสัมพันธ์ระหว่างตากับมือ (ป.2)",
        "#102a43",
        "#1e40af"
      );
    }

    // ตรวจสิทธิ์การเข้าถึงไฟล์: สื่อสาธารณะดูได้เลย ส่วนไฟล์ส่วนตัวต้องเป็น Admin
    if (isServerSupabaseConfigured()) {
      const adminDb = createServiceRoleClient();
      const queryClient = adminDb || (await createServerSupabaseClient());

      const { data: asset } = await queryClient
        .from("media_assets")
        .select("id, is_public, mime_type, title")
        .eq("drive_file_id", fileId)
        .limit(1)
        .maybeSingle();

      if (!asset?.is_public) {
        const auth = await getAuthenticatedAdmin();
        if (!auth.isDemoMode && !auth.user) {
          return NextResponse.json(
            { error: "ไฟล์นี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ" },
            { status: 401 }
          );
        }
      }
    }

    if (!isGoogleDriveConfigured()) {
      return NextResponse.json(
        { error: "ยังไม่ได้ตั้งค่า Google Drive Service Account" },
        { status: 503 }
      );
    }

    const rangeHeader = request.headers.get("range");
    const isDownload = request.nextUrl.searchParams.get("download") === "1";

    const { metadata, response } = await streamDriveFile(fileId, rangeHeader);

    if (!response.ok && response.status !== 206) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Google Drive stream error: ${errText}` },
        { status: response.status }
      );
    }

    const headers = new Headers();
    const contentType =
      response.headers.get("content-type") ||
      metadata.mimeType ||
      "application/octet-stream";

    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");

    const contentLength = response.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    const contentRange = response.headers.get("content-range");
    if (contentRange) headers.set("Content-Range", contentRange);

    const safeFileName = encodeURIComponent(metadata.name || `${fileId}`);
    headers.set(
      "Content-Disposition",
      `${isDownload ? "attachment" : "inline"}; filename*=UTF-8''${safeFileName}`
    );
    headers.set("Cache-Control", "private, max-age=300");

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (err) {
    console.error("[API/drive/stream] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "ไม่สามารถสตรีมไฟล์จาก Google Drive ได้",
      },
      { status: 500 }
    );
  }
}
