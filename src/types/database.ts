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

export type GenderType = "ชาย" | "หญิง";

export interface ResourceRoomRecord {
  id: string;
  academic_year: string;
  row_order: number;
  student_id?: string | null;
  full_name: string;
  gender: GenderType;
  student_number: string;
  entry_year: string;
  age_years?: number | null;
  grade_level: string;
  disability_type: string;
  homeroom_teacher: string;
  quality_score?: number | null;
  iep_pass_percent?: number | null;
  transfer_same_school: string;
  transfer_other_inclusive: string;
  transfer_other_school: string;
  notes?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export type DevelopmentSkillKey =
  | "thai"
  | "math"
  | "sci"
  | "social"
  | "english"
  | "history"
  | "health"
  | "art"
  | "career"
  | "antiCorruption";

export type DevelopmentSkills = Record<DevelopmentSkillKey, string>;

export type DevelopmentProgressStatus =
  | "กำลังดำเนินการ"
  | "พัฒนาขึ้นตามเป้าหมาย"
  | "ผ่านเกณฑ์แผน"
  | "ต้องติดตามใกล้ชิด";

export interface StudentDevelopmentPlan {
  id: string;
  academic_year: string;
  semester_label: string;
  row_order: number;
  student_id?: string | null;
  full_name: string;
  nickname: string;
  gender: GenderType;
  age_years?: number | null;
  grade_level: string;
  disability_type?: string | null;
  homeroom_teacher: string;
  skills: Partial<DevelopmentSkills> & Record<string, string>;
  progress_status: DevelopmentProgressStatus;
  overall_summary: string;
  notes?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export const DEV_PLAN_BASE_YEAR = 2569;

export const DEVELOPMENT_SUBJECTS: {
  key: DevelopmentSkillKey;
  indexThai: string;
  name: string;
  shortName: string;
  placeholder: string;
  accentClass: string;
}[] = [
  {
    key: "thai",
    indexThai: "๑",
    name: "กลุ่มสาระฯ ภาษาไทย",
    shortName: "ภาษาไทย",
    placeholder: "เช่น สามารถเขียนพยัญชนะ ก - ฮ และอ่านออกเสียงคำพื้นฐานได้...",
    accentClass: "text-purple-700 bg-purple-50 border-purple-100",
  },
  {
    key: "math",
    indexThai: "๒",
    name: "กลุ่มสาระฯ คณิตศาสตร์",
    shortName: "คณิตศาสตร์",
    placeholder: "เช่น สามารถนับจำนวน อ่านและเขียนตัวเลข 1 - 50 ได้ถูกต้อง...",
    accentClass: "text-pink-700 bg-pink-50 border-pink-100",
  },
  {
    key: "sci",
    indexThai: "๓",
    name: "กลุ่มสาระฯ วิทยาศาสตร์และเทคโนโลยี",
    shortName: "วิทยาศาสตร์ฯ",
    placeholder: "เช่น สามารถบอกชื่อพืชและสัตว์ หรือสิ่งที่จำเป็นต่อการดำรงชีวิต...",
    accentClass: "text-emerald-700 bg-emerald-50 border-emerald-100",
  },
  {
    key: "social",
    indexThai: "๔",
    name: "กลุ่มสาระฯ สังคมศึกษา ศาสนาและวัฒนธรรม",
    shortName: "สังคมศึกษาฯ",
    placeholder: "เช่น สามารถปฏิบัติตามกฎ ระเบียบ ของห้องเรียนและโรงเรียนได้...",
    accentClass: "text-amber-700 bg-amber-50 border-amber-100",
  },
  {
    key: "english",
    indexThai: "๕",
    name: "กลุ่มสาระฯ ภาษาอังกฤษ",
    shortName: "ภาษาอังกฤษ",
    placeholder: "เช่น สามารถออกเสียงพยัญชนะ A - Z หรือปฏิบัติตามคำสั่งง่ายๆ ได้...",
    accentClass: "text-sky-700 bg-sky-50 border-sky-100",
  },
  {
    key: "history",
    indexThai: "๖",
    name: "กลุ่มสาระฯ ประวัติศาสตร์",
    shortName: "ประวัติศาสตร์",
    placeholder: "เช่น สามารถบอกวัน เดือน ปี หรือเรียงลำดับเหตุการณ์ในชีวิตประจำวัน...",
    accentClass: "text-indigo-700 bg-indigo-50 border-indigo-100",
  },
  {
    key: "health",
    indexThai: "๗",
    name: "กลุ่มสาระฯ สุขศึกษาและพลศึกษา",
    shortName: "สุขศึกษาฯ",
    placeholder: "เช่น สามารถรู้จักและบอกหน้าที่ของอวัยวะในร่างกายได้...",
    accentClass: "text-rose-700 bg-rose-50 border-rose-100",
  },
  {
    key: "art",
    indexThai: "๘",
    name: "กลุ่มสาระฯ ศิลปะ",
    shortName: "ศิลปะ",
    placeholder: "เช่น สามารถบอก อธิบาย หรือวาดรูปร่าง รูปทรงต่างๆ ได้...",
    accentClass: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-100",
  },
  {
    key: "career",
    indexThai: "๙",
    name: "กลุ่มสาระฯ การงานอาชีพ",
    shortName: "การงานอาชีพ",
    placeholder: "เช่น สามารถทำความสะอาดโต๊ะเรียนหรือบอกประโยชน์เครื่องใช้ได้...",
    accentClass: "text-violet-700 bg-violet-50 border-violet-100",
  },
  {
    key: "antiCorruption",
    indexThai: "๑๐",
    name: "สาระเพิ่มเติม การป้องกันการทุจริต",
    shortName: "ป้องกันทุจริต",
    placeholder: "เช่น สามารถดูแลทรัพย์สินของตนเองและส่วนรวม เข้าใจกฎกติกา...",
    accentClass: "text-teal-700 bg-teal-50 border-teal-100",
  },
];

export const DEVELOPMENT_PROGRESS_META: Record<
  DevelopmentProgressStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  กำลังดำเนินการ: {
    label: "กำลังดำเนินการ",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    dotClass: "bg-purple-500",
  },
  พัฒนาขึ้นตามเป้าหมาย: {
    label: "พัฒนาขึ้นตามเป้าหมาย",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  ผ่านเกณฑ์แผน: {
    label: "ผ่านเกณฑ์แผน",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  ต้องติดตามใกล้ชิด: {
    label: "ต้องติดตามใกล้ชิด",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
};

export const INFORMATION_GRADE_LEVELS = [
  "อ.1",
  "อ.2",
  "อ.3",
  "ป.1",
  "ป.2",
  "ป.3",
  "ป.4",
  "ป.5",
  "ป.6",
] as const;

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

export type BrandCategory =
  | "system_icon"
  | "school"
  | "partner"
  | "mou"
  | "showcase"
  | "custom";

export type BrandPlacement =
  | "header"
  | "mou"
  | "showcase"
  | "footer"
  | "all"
  | "custom";

export interface BrandAsset {
  id: string;
  slot_key: string;
  title: string;
  description: string;
  category: BrandCategory;
  placement: BrandPlacement;
  image_url: string;
  default_url: string;
  display_order: number;
  is_core: boolean;
  is_active: boolean;
  updated_by?: string | null;
  created_at: string;
  updated_at?: string;
}

export const BRAND_CATEGORY_META: Record<
  BrandCategory,
  { label: string; badgeClass: string }
> = {
  system_icon: {
    label: "ไอคอนระบบ / เมนู",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
  school: {
    label: "โลโก้โรงเรียน",
    badgeClass: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  },
  partner: {
    label: "โลโก้ศูนย์ฯ / ภาคี",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-200",
  },
  mou: {
    label: "โลโก้หน้า MOU",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  showcase: {
    label: "หน้าสาธารณะ",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  custom: {
    label: "โลโก้เพิ่มเอง",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

export const BRAND_PLACEMENT_OPTIONS: {
  value: BrandPlacement;
  label: string;
}[] = [
  {
    value: "all",
    label: "แสดงทั้งหน้า MOU และหน้าสาธารณะ",
  },
  {
    value: "mou",
    label: "แสดงเฉพาะหน้า MOU (/mou)",
  },
  {
    value: "showcase",
    label: "แสดงเฉพาะหน้าสาธารณะ (/showcase)",
  },
];

export const CORE_BRAND_SLOT_KEYS = [
  "app_icon",
  "school_logo",
  "partner_logo",
] as const;

export const DEFAULT_BRAND_ASSETS: BrandAsset[] = [
  {
    id: "brand-core-app-icon",
    slot_key: "app_icon",
    title: "ไอคอนระบบ (แถบเมนู / หน้าเข้าสู่ระบบ / แท็บเว็บ)",
    description:
      "แสดงที่มุมซ้ายแถบเมนูด้านบน หน้าเข้าสู่ระบบ และไอคอนแท็บเบราว์เซอร์",
    category: "system_icon",
    placement: "header",
    image_url: "/images/logo-wat-pongrad.png",
    default_url: "/images/logo-wat-pongrad.png",
    display_order: 1,
    is_core: true,
    is_active: false,
    created_at: "2026-11-01T08:00:00Z",
  },
  {
    id: "brand-core-school-logo",
    slot_key: "school_logo",
    title: "โลโก้โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
    description: "ใช้ในหน้าสาธารณะ หน้า MOU ท้ายหน้าเว็บ และรายงาน PDF",
    category: "school",
    placement: "all",
    image_url: "/images/logo-wat-pongrad.png",
    default_url: "/images/logo-wat-pongrad.png",
    display_order: 2,
    is_core: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00Z",
  },
  {
    id: "brand-core-partner-logo",
    slot_key: "partner_logo",
    title: "โลโก้ศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี",
    description: "ใช้ในหน้าสาธารณะ หน้า MOU ท้ายหน้าเว็บ และรายงาน PDF",
    category: "partner",
    placement: "all",
    image_url: "/images/logo-sped-chanthaburi.png",
    default_url: "/images/logo-sped-chanthaburi.png",
    display_order: 3,
    is_core: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00Z",
  },
];
