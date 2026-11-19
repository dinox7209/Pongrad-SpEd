import { NextRequest, NextResponse } from "next/server";
import { sendLineReminder } from "@/lib/lineNotifier";
import { formatDateThai } from "@/lib/utils";
import { DEMO_STUDENTS, DEMO_WEEKLY_TASKS } from "@/lib/demo-data";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
  getAuthenticatedAdmin,
  isServerSupabaseConfigured,
} from "@/lib/supabase/server";
import { Student, WeeklyTask } from "@/types/database";

export const runtime = "nodejs";

async function runWeeklyReminderCheck() {
  const todayIso = new Date().toISOString().slice(0, 10);

  let tasks: WeeklyTask[] = DEMO_WEEKLY_TASKS;
  let atRiskStudents: Pick<Student, "nickname" | "grade_level">[] = DEMO_STUDENTS.filter(
    (s) => s.current_status === "At-Risk"
  );
  let source: "supabase" | "demo" = "demo";

  if (isServerSupabaseConfigured()) {
    const adminDb = createServiceRoleClient();
    const db = adminDb || (await createServerSupabaseClient());

    const { data: taskRows, error: taskError } = await db
      .from("weekly_tasks")
      .select("*")
      .order("week_number", { ascending: true });

    if (taskError) {
      throw new Error(`ไม่สามารถอ่านข้อมูล weekly_tasks ได้: ${taskError.message}`);
    }

    if (taskRows && taskRows.length > 0) {
      tasks = taskRows as WeeklyTask[];
      source = "supabase";
    }

    const { data: atRiskRows } = await db
      .from("students")
      .select("nickname, grade_level")
      .eq("current_status", "At-Risk");

    if (atRiskRows) {
      atRiskStudents = atRiskRows;
    }
  }

  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const pendingTasks = tasks.filter((t) => t.status === "Pending");
  const dueOrOverduePending = pendingTasks.filter((t) => t.due_date <= todayIso);
  const nextTask = pendingTasks[0] || null;

  const lines: string[] = [
    "📌 แจ้งเตือนสรุปงานประจำวันศุกร์",
    "ระบบการศึกษาพิเศษ โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
    `📅 วันที่ ${formatDateThai(new Date())}`,
    "",
    `✅ งานที่เสร็จสิ้นแล้ว: ${completedTasks.length} / ${tasks.length} สัปดาห์`,
    `⏳ งานคงค้าง (Pending): ${pendingTasks.length} สัปดาห์`,
  ];

  if (dueOrOverduePending.length > 0) {
    lines.push("");
    lines.push(`⚠️ งานที่ถึงกำหนด/เลยกำหนดส่ง (${dueOrOverduePending.length} รายการ):`);
    for (const item of dueOrOverduePending.slice(0, 5)) {
      lines.push(`• ${item.week_title} (กำหนด ${formatDateThai(item.due_date)})`);
    }
    if (dueOrOverduePending.length > 5) {
      lines.push(`...และอีก ${dueOrOverduePending.length - 5} สัปดาห์`);
    }
  } else if (nextTask) {
    lines.push("");
    lines.push(`🗓️ งานสัปดาห์ถัดไป: ${nextTask.week_title}`);
    lines.push(`กำหนดส่ง: ${formatDateThai(nextTask.due_date)}`);
  } else {
    lines.push("");
    lines.push("🎉 เยี่ยมมาก! ดำเนินการครบทั้ง 20 สัปดาห์เรียบร้อยแล้ว");
  }

  if (atRiskStudents.length > 0) {
    lines.push("");
    lines.push(
      `🩺 นักเรียนกลุ่มเฝ้าระวัง (At-Risk) ${atRiskStudents.length} คน: ${atRiskStudents
        .map((s) => `${s.nickname || "นักเรียน"} (${s.grade_level})`)
        .join(", ")}`
    );
  }

  const message = lines.join("\n");
  const lineResult = await sendLineReminder(message);

  if (source === "supabase" && dueOrOverduePending.length > 0 && lineResult.sent) {
    const adminDb = createServiceRoleClient();
    const db = adminDb || (await createServerSupabaseClient());
    await db
      .from("weekly_tasks")
      .update({ reminded_at: new Date().toISOString() })
      .in(
        "id",
        dueOrOverduePending.map((t) => t.id)
      );
  }

  return {
    ok: true,
    source,
    summary: {
      totalWeeks: tasks.length,
      completedCount: completedTasks.length,
      pendingCount: pendingTasks.length,
      dueOrOverdueCount: dueOrOverduePending.length,
      atRiskCount: atRiskStudents.length,
    },
    lineResult,
    messagePreview: message,
  };
}

/**
 * GET /api/cron/reminder — เรียกใช้งานอัตโนมัติทุกวันศุกร์โดย Vercel Cron
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized Cron Request" }, { status: 401 });
      }
    }

    const result = await runWeeklyReminderCheck();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API/cron/reminder GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cron reminder failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/reminder — ให้ผู้ดูแลทดสอบส่งสรุปเข้า LINE ได้ทันทีจากหน้า /admin/tracker
 */
export async function POST() {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.isDemoMode && !auth.user) {
      return NextResponse.json({ error: "ไม่ได้รับอนุญาต" }, { status: 401 });
    }

    const result = await runWeeklyReminderCheck();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API/cron/reminder POST] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ส่งแจ้งเตือนไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
