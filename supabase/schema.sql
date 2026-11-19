-- ==============================================================================
-- ระบบจัดการสื่อการสอนและติดตามนักเรียนการศึกษาพิเศษ (Pongrad SpEd)
-- โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) สพป.จันทบุรี เขต 1
-- Supabase PostgreSQL Schema + Seed 2 Admin Accounts + 20 Weekly Tasks + RLS
-- ==============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 2. Tables

-- 2.1 profiles (บัญชีผู้ใช้งานหลังบ้าน 2 ท่าน)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'director', 'teacher')),
    position TEXT DEFAULT 'ครูการศึกษาพิเศษ',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.2 students (ทะเบียนนักเรียนการศึกษาพิเศษ)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    nickname TEXT NOT NULL DEFAULT '',
    grade_level TEXT NOT NULL,
    disability_type TEXT NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'Active'
        CHECK (current_status IN ('Active', 'At-Risk', 'Medical', 'Transferred', 'Graduated')),
    guardian_contact TEXT NOT NULL DEFAULT '',
    iep_goal TEXT DEFAULT '',
    profile_image_drive_id TEXT,
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.3 student_logs (Case Timeline: บันทึกพัฒนาการ ปัญหาที่พบ และแนวทางช่วยเหลือรายบุคคล)
CREATE TABLE IF NOT EXISTS public.student_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    log_type TEXT NOT NULL DEFAULT 'พัฒนาการ'
        CHECK (log_type IN ('พัฒนาการ', 'ปัญหาที่พบ', 'แนวทางช่วยเหลือ', 'พบแพทย์/รักษาตัว', 'เยี่ยมบ้าน', 'ทบทวน IEP')),
    description TEXT NOT NULL,
    action_taken TEXT NOT NULL DEFAULT '',
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.4 media_assets (คลังสื่อการสอน คลิป 720p และเอกสาร PDF บน Google Drive)
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'pdf', 'newsletter', 'portfolio', 'report')),
    drive_file_id TEXT NOT NULL,
    drive_view_url TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    skill_category TEXT NOT NULL DEFAULT 'ทักษะวิชาการและการเรียนรู้',
    grade_level TEXT DEFAULT 'ทุกระดับชั้น',
    student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    week_number INTEGER CHECK (week_number IS NULL OR (week_number BETWEEN 1 AND 20)),
    mime_type TEXT,
    file_size BIGINT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2.5 weekly_tasks (ปฏิทินติดตามงานรายสัปดาห์ 1 - 20)
CREATE TABLE IF NOT EXISTS public.weekly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_number INTEGER NOT NULL UNIQUE CHECK (week_number BETWEEN 1 AND 20),
    week_title TEXT NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
    pdf_drive_id TEXT,
    video_drive_id TEXT,
    notes TEXT DEFAULT '',
    reminded_at TIMESTAMPTZ,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(current_status);
CREATE INDEX IF NOT EXISTS idx_students_grade ON public.students(grade_level);
CREATE INDEX IF NOT EXISTS idx_student_logs_student_date ON public.student_logs(student_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_public ON public.media_assets(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_skill ON public.media_assets(skill_category, grade_level);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_week_no ON public.weekly_tasks(week_number);

-- 4. Helper Functions & Triggers

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER trg_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_weekly_tasks_updated_at ON public.weekly_tasks;
CREATE TRIGGER trg_weekly_tasks_updated_at
  BEFORE UPDATE ON public.weekly_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ตรวจสอบสิทธิ์ Admin (ใช้ใน RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role IN ('admin', 'director')
  );
END;
$$;

-- Trigger สร้าง Profile อัตโนมัติเมื่อมีผู้ใช้ใหม่ใน auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_role TEXT;
BEGIN
  v_display_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NEW.email,
    'ผู้ดูแลระบบ'
  );
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'admin');
  IF v_role NOT IN ('admin', 'director', 'teacher') THEN
    v_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (NEW.id, NEW.email, v_display_name, v_role)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      updated_at = timezone('utc'::text, now());

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Seed บัญชีผู้ดูแลระบบ 2 คน (ใช้งานจริง 2 คน)
-- ⚠️ เปลี่ยนอีเมลและรหัสผ่านเริ่มต้น 'Pongrad@2569' ก่อนรันหรือเปลี่ยนทันทีหลังเข้าสู่ระบบครั้งแรก
DO $$
DECLARE
  v_users CONSTANT JSONB := '[
    {
      "id": "00000000-0000-0000-0001-000000000001",
      "email": "wadpongradschool@gmail.com",
      "display_name": "ครูเอก (ผู้ดูแลระบบ / ครูการศึกษาพิเศษ)",
      "role": "admin",
      "position": "ครูผู้รับผิดชอบงานการศึกษาพิเศษ"
    },
    {
      "id": "00000000-0000-0000-0001-000000000002",
      "email": "sped2@pongrad.ac.th",
      "display_name": "ครูผู้ช่วยการศึกษาพิเศษ (ผู้ดูแลคนที่ 2)",
      "role": "admin",
      "position": "ครูผู้สอนการศึกษาพิเศษ"
    }
  ]'::jsonb;
  v_item JSONB;
  v_existing_id UUID;
  v_target_id UUID;
  v_email TEXT;
  v_display_name TEXT;
  v_role TEXT;
  v_position TEXT;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_users)
  LOOP
    v_email := lower(trim(v_item->>'email'));
    v_display_name := v_item->>'display_name';
    v_role := v_item->>'role';
    v_position := v_item->>'position';

    SELECT id INTO v_existing_id FROM auth.users WHERE lower(email) = v_email LIMIT 1;

    IF v_existing_id IS NULL THEN
      v_target_id := (v_item->>'id')::uuid;

      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_target_id,
        'authenticated',
        'authenticated',
        v_email,
        extensions.crypt('Pongrad@2569', extensions.gen_salt('bf')),
        timezone('utc'::text, now()),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('display_name', v_display_name, 'role', v_role),
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        '', '', '', ''
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_target_id,
        v_target_id::text,
        jsonb_build_object('sub', v_target_id::text, 'email', v_email, 'email_verified', true),
        'email',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
      )
      ON CONFLICT DO NOTHING;
    ELSE
      v_target_id := v_existing_id;
    END IF;

    INSERT INTO public.profiles (id, email, display_name, role, position)
    VALUES (v_target_id, v_email, v_display_name, v_role, v_position)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        role = EXCLUDED.role,
        position = EXCLUDED.position,
        updated_at = timezone('utc'::text, now());
  END LOOP;
END $$;

-- 6. Seed งานรายสัปดาห์ 1 - 20 (กำหนดส่งทุกวันศุกร์ของภาคเรียน)
INSERT INTO public.weekly_tasks (week_number, week_title, due_date, status, notes)
SELECT
  gs.week_no,
  CASE gs.week_no
    WHEN 1  THEN 'สัปดาห์ที่ 1: คัดกรองและประเมินความสามารถพื้นฐาน (Pre-IEP)'
    WHEN 2  THEN 'สัปดาห์ที่ 2: จัดทำแผนการจัดการศึกษาเฉพาะบุคคล (IEP)'
    WHEN 3  THEN 'สัปดาห์ที่ 3: สื่อฝึกกล้ามเนื้อมัดเล็กและประสานสัมพันธ์ตา-มือ'
    WHEN 4  THEN 'สัปดาห์ที่ 4: สื่อพัฒนาทักษะการสื่อสารและบัตรคำภาพ'
    WHEN 5  THEN 'สัปดาห์ที่ 5: กิจกรรมฝึกสมาธิและการรับรู้ทางประสาทสัมผัส'
    WHEN 6  THEN 'สัปดาห์ที่ 6: สื่อการเรียนรู้ทักษะชีวิตและการช่วยเหลือตนเอง'
    WHEN 7  THEN 'สัปดาห์ที่ 7: กิจกรรมศิลปะและดนตรีบำบัดพัฒนาอารมณ์'
    WHEN 8  THEN 'สัปดาห์ที่ 8: ทักษะทางสังคมและการเล่นร่วมกับเพื่อน'
    WHEN 9  THEN 'สัปดาห์ที่ 9: สื่อการอ่านเขียนเบื้องต้น (ภาษาไทยเฉพาะบุคคล)'
    WHEN 10 THEN 'สัปดาห์ที่ 10: ประเมินพัฒนาการกลางภาคเรียน และสรุปวารสารฉบับกลางภาค'
    WHEN 11 THEN 'สัปดาห์ที่ 11: สื่อคณิตศาสตร์เชิงรูปธรรม (การนับและค่าจำนวน)'
    WHEN 12 THEN 'สัปดาห์ที่ 12: กิจกรรมส่งเสริมการเคลื่อนไหวและกล้ามเนื้อมัดใหญ่'
    WHEN 13 THEN 'สัปดาห์ที่ 13: สื่อเทคโนโลยีดิจิทัลเพื่อการเรียนรู้เฉพาะบุคคล'
    WHEN 14 THEN 'สัปดาห์ที่ 14: เยี่ยมบ้านและสื่อสารแนวทางดูแลต่อเนื่องกับผู้ปกครอง'
    WHEN 15 THEN 'สัปดาห์ที่ 15: โครงงานฝึกทักษะอาชีพเบื้องต้นตามความถนัด'
    WHEN 16 THEN 'สัปดาห์ที่ 16: เกมการศึกษาเสริมทักษะการคิดวิเคราะห์'
    WHEN 17 THEN 'สัปดาห์ที่ 17: ทบทวนเป้าหมาย IEP และปรับสื่อสำหรับนักเรียนกลุ่มเฝ้าระวัง'
    WHEN 18 THEN 'สัปดาห์ที่ 18: บันทึกคลิปวิดีโอสรุปพัฒนาการรายบุคคล'
    WHEN 19 THEN 'สัปดาห์ที่ 19: รวบรวมชิ้นงานและจัดทำ Portfolio นักเรียนรายบุคคล'
    WHEN 20 THEN 'สัปดาห์ที่ 20: ประเมินผลสัมฤทธิ์ปลายภาคเรียนและเผยแพร่วารสารสรุปผล'
  END,
  (DATE '2026-11-06' + ((gs.week_no - 1) * 7)),
  'Pending',
  ''
FROM generate_series(1, 20) AS gs(week_no)
ON CONFLICT (week_number) DO NOTHING;

-- 7. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_tasks ENABLE ROW LEVEL SECURITY;

-- 7.1 profiles: ดูและแก้ไขข้อมูลตัวเอง หรือ Admin ดูได้ทั้งหมด
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
CREATE POLICY "Admins can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

-- 7.2 students: เฉพาะ Admin 2 ท่านเท่านั้น (คุ้มครองข้อมูลส่วนบุคคล PDPA ของนักเรียนพิเศษ)
DROP POLICY IF EXISTS "Admins manage students" ON public.students;
CREATE POLICY "Admins manage students"
  ON public.students FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 7.3 student_logs: เฉพาะ Admin 2 ท่านเท่านั้น
DROP POLICY IF EXISTS "Admins manage student_logs" ON public.student_logs;
CREATE POLICY "Admins manage student_logs"
  ON public.student_logs FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 7.4 media_assets:
-- สาธารณะ (ไม่ต้องล็อกอิน) ดูได้เฉพาะรายการที่ is_public = true
DROP POLICY IF EXISTS "Public can view public media_assets" ON public.media_assets;
CREATE POLICY "Public can view public media_assets"
  ON public.media_assets FOR SELECT
  USING (is_public = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage media_assets" ON public.media_assets;
CREATE POLICY "Admins manage media_assets"
  ON public.media_assets FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 7.5 weekly_tasks: เฉพาะ Admin 2 ท่านเท่านั้น
DROP POLICY IF EXISTS "Admins manage weekly_tasks" ON public.weekly_tasks;
CREATE POLICY "Admins manage weekly_tasks"
  ON public.weekly_tasks FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
