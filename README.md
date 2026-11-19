# ห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room) — โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)

ความร่วมมือระหว่าง **โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)** (สังกัด สพป.จันทบุรี เขต 1) และ **ศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี** เพื่อดูแลและส่งเสริมศักยภาพนักเรียนที่มีความต้องการจำเป็นพิเศษในโรงเรียนเรียนรวมอย่างต่อเนื่อง

---

## ข้อมูลติดต่อหน่วยงานความร่วมมือ

- **โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)**  
  ตำบลพลับพลา อำเภอเมืองจันทบุรี จังหวัดจันทบุรี 22000 (สังกัด สพป.จันทบุรี เขต 1) • โทรศัพท์ `087-914-4076`
- **ศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี**  
  58/22 หมู่ที่ 7 ตำบลท่าช้าง อำเภอเมืองจันทบุรี จังหวัดจันทบุรี 22000 • โทรศัพท์ `039-480-270`

---

## นโยบายความเป็นส่วนตัวและการเข้าถึงข้อมูล

- **หน้าสาธารณะ (`/showcase`):** แสดงเฉพาะข้อมูลความร่วมมือของทั้ง 2 หน่วยงาน, วารสารและสื่อการเรียนรู้ที่ผู้ดูแลเปิด `is_public = true` เท่านั้น **ไม่แสดงรายชื่อครูหรือข้อมูลนักเรียนบนหน้าสาธารณะ** หากไม่ได้เปิดอนุญาต
- **ระบบหลังบ้าน (`/admin`):** สงวนสิทธิ์เฉพาะผู้ดูแลระบบ 2 ท่านเท่านั้น:
  1. **แอดมินหลัก (`super_admin`):** นายเอกชัย ปลื้มใจ — ตำแหน่ง ครูพี่เลี้ยงเด็กพิเศษ (สังกัด สพป.จันทบุรี เขต 1)
  2. **ผู้ดูแลระบบ (`admin`):** นางสาวดวงพร หวังอ้อมกลาง — ตำแหน่ง ครูชำนาญการ (ข้าราชการครู) (สังกัด ศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี)

---

## Tech Stack

- **Frontend / Backend:** Next.js 16 (App Router), TypeScript, Tailwind CSS (iOS 2026 Liquid Glass Purple–Pink UI), Lucide React
- **Database & Auth:** Supabase PostgreSQL + `@supabase/ssr` + Strict Privacy RLS
- **Media & Storage:** Google Drive API (`googleapis` ผ่าน Google Service Account สตรีมไฟล์โดยตรงไม่ผ่าน Serverless Disk)
- **Video Engine:** `@ffmpeg/ffmpeg` (WebAssembly บนเบราว์เซอร์ ตัดหัว-ท้าย, ใส่ข้อความภาษาไทยทับ, ปรับขนาด 720p MP4)
- **PDF Engine:** `@react-pdf/renderer` (พร้อมฟอนต์ภาษาไทย Sarabun ในตัว สำหรับหน้าปก, สรุปพัฒนาการ, Portfolio, วารสาร A4)
- **Deployment & Cron:** Vercel + Vercel Cron (`/api/cron/reminder` ทุกวันศุกร์แจ้งเตือนเข้า LINE)

---

## ขั้นตอนการติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าฐานข้อมูล Supabase
1. สร้างโปรเจกต์บน Supabase
2. เปิด **SQL Editor** แล้วนำคำสั่งทั้งหมดจากไฟล์ `supabase/schema.sql` ไปรัน
3. สคริปต์จะสร้าง 5 ตารางหลัก (`profiles`, `students`, `student_logs`, `media_assets`, `weekly_tasks`), วิว `public_team_profiles`, RLS ป้องกันข้อมูลส่วนบุคคล, งาน 20 สัปดาห์ และ Seed บัญชีผู้ดูแลทั้ง 2 ท่าน (รหัสผ่านเริ่มต้น: `Pongrad@2569` — กรุณาเปลี่ยนรหัสผ่านและอีเมลตามใช้งานจริงหลังเข้าสู่ระบบ)

### 3. ตั้งค่า Google Service Account & Google Drive
1. เปิดใช้งาน **Google Drive API** ใน Google Cloud Console
2. สร้าง **Service Account** และดาวน์โหลดไฟล์ JSON Key
3. สร้างโฟลเดอร์หลักใน Google Drive แล้วกด **Share** ให้ `client_email` ของ Service Account มีสิทธิ์ **Editor**
4. นำ Folder ID มาใส่ใน `GOOGLE_DRIVE_FOLDER_ID`

### 4. ตั้งค่า Environment Variables (`.env.local` / Vercel)
คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า Supabase, Google Service Account, `CRON_SECRET` และ `LINE_CHANNEL_ACCESS_TOKEN`

> **การป้องกันไฟล์ `.env` และคีย์ลับหลุดขึ้น GitHub:**
> - ไฟล์ `.gitignore` ปิดกั้น `.env`, `.env.*` (ยกเว้น `.env.example`), `*.pem`, `*.key` และไฟล์ JSON ของ Service Account (`*service-account*.json`, `*credentials*.json`) ไว้แล้ว
> - เปิดใช้งาน Pre-commit Hook ด้วย `git config core.hooksPath .githooks`

### 5. รันโปรเจกต์
```bash
npm run dev
```
- หน้าเผยแพร่สาธารณะ (ไม่ต้องล็อกอิน): `http://localhost:3000/showcase`
- หน้าเข้าสู่ระบบเจ้าหน้าที่: `http://localhost:3000/login`
- แดชบอร์ดหลังบ้าน: `http://localhost:3000/admin`
