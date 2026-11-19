export type UserRole = "super_admin" | "admin" | "director" | "teacher";

export type StudentStatus =
  | "Active"
  | "At-Risk"
  | "Medical"
  | "Transferred"
  | "Graduated";

export type LogType =
  | "พัฒนาการ"
  | "ปัญหาที่พบ"
  | "แนวทางช่วยเหลือ"
  | "พบแพทย์/รักษาตัว"
  | "เยี่ยมบ้าน"
  | "ทบทวน IEP";

export type MediaType =
  | "image"
  | "video"
  | "pdf"
  | "newsletter"
  | "portfolio"
  | "report";

export type TaskStatus = "Pending" | "Completed";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string;
  role: UserRole;
  position?: string | null;
  affiliation?: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface PublicTeamMember {
  id: string;
  display_name: string;
  position?: string | null;
  affiliation?: string | null;
}

export interface Student {
  id: string;
  student_code: string;
  full_name: string;
  nickname: string;
  grade_level: string;
  disability_type: string;
  current_status: StudentStatus;
  guardian_contact: string;
  iep_goal?: string | null;
  profile_image_drive_id?: string | null;
  notes?: string | null;
  is_public?: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentLog {
  id: string;
  student_id: string;
  log_type: LogType;
  description: string;
  action_taken: string;
  logged_date: string;
  logged_by?: string | null;
  created_at: string;
  student?: Student;
}

export interface MediaAsset {
  id: string;
  title: string;
  description?: string | null;
  media_type: MediaType;
  drive_file_id: string;
  drive_view_url: string;
  is_public: boolean;
  skill_category: string;
  grade_level?: string | null;
  student_id?: string | null;
  week_number?: number | null;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at?: string;
  student?: Pick<Student, "id" | "nickname" | "full_name" | "grade_level" | "student_code"> | null;
}

export interface WeeklyTask {
  id: string;
  week_number: number;
  week_title: string;
  due_date: string;
  status: TaskStatus;
  pdf_drive_id?: string | null;
  video_drive_id?: string | null;
  notes?: string | null;
  reminded_at?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export const GRADE_LEVELS = [
  "อนุบาล 1",
  "อนุบาล 2",
  "อนุบาล 3",
  "ป.1",
  "ป.2",
  "ป.3",
  "ป.4",
  "ป.5",
  "ป.6",
] as const;

export const DISABILITY_TYPES = [
  "บกพร่องทางการเรียนรู้ (LD)",
  "ออทิสติก (Autism)",
  "สมาธิสั้น (ADHD)",
  "บกพร่องทางสติปัญญา",
  "บกพร่องทางการพูดและภาษา",
  "บกพร่องทางการได้ยิน",
  "บกพร่องทางการเห็น",
  "บกพร่องทางร่างกายหรือสุขภาพ",
  "พิการซ้อน / อื่นๆ",
] as const;

export const SKILL_CATEGORIES = [
  "ทักษะกล้ามเนื้อมัดเล็ก",
  "ทักษะการสื่อสาร",
  "ทักษะการช่วยเหลือตนเอง",
  "ทักษะสังคมและอารมณ์",
  "ทักษะวิชาการและการเรียนรู้",
  "ศิลปะและดนตรีบำบัด",
  "วารสารประจำสัปดาห์",
] as const;

export const STUDENT_STATUS_META: Record<
  StudentStatus,
  { label: string; thLabel: string; badgeClass: string; dotClass: string }
> = {
  Active: {
    label: "Active",
    thLabel: "ปกติ (Active)",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  "At-Risk": {
    label: "At-Risk",
    thLabel: "เฝ้าระวัง / มีปัญหา",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
  Medical: {
    label: "Medical",
    thLabel: "รักษาตัว (Medical)",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  Transferred: {
    label: "Transferred",
    thLabel: "ย้าย / ลาออก",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
  },
  Graduated: {
    label: "Graduated",
    thLabel: "จบการศึกษา",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dotClass: "bg-indigo-500",
  },
};

export const LOG_TYPES: LogType[] = [
  "พัฒนาการ",
  "ปัญหาที่พบ",
  "แนวทางช่วยเหลือ",
  "พบแพทย์/รักษาตัว",
  "เยี่ยมบ้าน",
  "ทบทวน IEP",
];

export const SCHOOL_INFO = {
  projectName: "ห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room)",
  name: "โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  area: "สพป.จันทบุรี เขต 1",
  fullArea: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาจันทบุรี เขต 1",
  address: "ตำบลพลับพลา อำเภอเมืองจันทบุรี จังหวัดจันทบุรี 22000",
  phone: "087-914-4076",
  partnerName: "ศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี",
  partnerAddress: "58/22 หมู่ที่ 7 ตำบลท่าช้าง อำเภอเมืองจันทบุรี จังหวัดจันทบุรี 22000",
  partnerPhone: "039-480-270",
  unitName: "ห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room)",
  cooperationDescription:
    "โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) ได้จัดทำ ห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room) ร่วมกับศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี เพื่อดูแลและส่งเสริมศักยภาพนักเรียนที่มีความต้องการจำเป็นพิเศษในโรงเรียนเรียนรวมอย่างต่อเนื่อง",
};
