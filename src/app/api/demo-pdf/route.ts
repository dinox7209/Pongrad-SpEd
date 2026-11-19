import path from "node:path";
import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  ensureThaiPdfFonts,
  SpEdPdfDocument,
  SpEdPdfPayload,
} from "@/components/pdf/SpEdPdfTemplates";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get("type") || "newsletter";
    const fontPath = path.join(process.cwd(), "public", "fonts");
    ensureThaiPdfFonts(fontPath);

    const isIssueOne = typeParam === "newsletter-1";
    const payload: SpEdPdfPayload = {
      template: "newsletter",
      documentTitle: isIssueOne
        ? "วารสารข่าวการศึกษาพิเศษ ฉบับปฐมฤกษ์ (สัปดาห์ที่ 1)"
        : "วารสารข่าวการศึกษาพิเศษ ฉบับที่ 2 (สัปดาห์ที่ 2)",
      academicYear: "2569",
      semesterLabel: "ภาคเรียนที่ 2/2569",
      weekNumber: isIssueOne ? 1 : 2,
      teacherName: "คณะทำงานห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room)",
      summaryText: isIssueOne
        ? "โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) ได้จัดทำห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room) ร่วมกับศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี เพื่อดูแล คัดกรอง และส่งเสริมศักยภาพนักเรียนที่มีความต้องการจำเป็นพิเศษในโรงเรียนเรียนรวมอย่างต่อเนื่อง"
        : "สัปดาห์นี้นักเรียนในห้องเรียนเสริมวิชาการ (Resource Room) ได้ฝึกพัฒนาทักษะกล้ามเนื้อมัดเล็กผ่านสื่อกระดานหมุดร้อยเชือก และฝึกทักษะการสื่อสารโต้ตอบด้วยนิทานหุ่นมือ นักเรียนมีความสุข กระตือรือร้น และมีสมาธิจดจ่อกับกิจกรรมได้ดีขึ้นอย่างต่อเนื่อง",
      parentTipText:
        "ผู้ปกครองสามารถชวนบุตรหลานฝึกหยิบจับสิ่งของชิ้นเล็ก ร้อยลูกปัด หรืออ่านนิทานก่อนนอนวันละ 10 นาที พร้อมกล่าวคำชื่นชมทุกครั้งเมื่อทำสำเร็จ",
      photos: [],
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(SpEdPdfDocument, { payload }) as unknown as React.ReactElement<
        Record<string, unknown>
      >
    );
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="pongrad-sped-newsletter.pdf"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[API/demo-pdf] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "ไม่สามารถสร้างตัวอย่าง PDF ได้",
      },
      { status: 500 }
    );
  }
}
