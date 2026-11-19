# ระบบจัดการสื่อการสอนและติดตามนักเรียนการศึกษาพิเศษ (Pongrad SpEd)

**โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)** สำนักงานเขตพื้นที่การศึกษาประถมศึกษาจันทบุรี เขต 1  
พัฒนาต่อยอดจากต้นแบบระบบ `PONGRAD69` สำหรับผู้ดูแลระบบ 2 ท่าน พร้อมหน้าแสดงผลงานสาธารณะ (`/showcase`)

---

## Tech Stack

- **Frontend / Backend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide React
- **Database & Auth:** Supabase PostgreSQL + `@supabase/ssr` (Seed บัญชีผู้ดูแล 2 ท่านล่วงหน้า)
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
3. สคริปต์จะสร้าง 5 ตารางหลัก (`profiles`, `students`, `student_logs`, `media_assets`, `weekly_tasks`), RLS, งาน 20 สัปดาห์ และบัญชีผู้ดูแล 2 ท่าน:
   - `wadpongradschool@gmail.com` (รหัสผ่านเริ่มต้น: `Pongrad@2569` — กรุณาเปลี่ยนหลังเข้าสู่ระบบ)
   - `sped2@pongrad.ac.th` (รหัสผ่านเริ่มต้น: `Pongrad@2569` — กรุณาเปลี่ยนหลังเข้าสู่ระบบ)

### 3. ตั้งค่า Google Service Account & Google Drive
1. เปิดใช้งาน **Google Drive API** ใน Google Cloud Console
2. สร้าง **Service Account** และดาวน์โหลดไฟล์ JSON Key
3. สร้างโฟลเดอร์หลักใน Google Drive ของโรงเรียน แล้วกด **Share** ให้ `client_email` ของ Service Account มีสิทธิ์ **Editor**
4. นำ Folder ID (ส่วนท้ายของ URL โฟลเดอร์ใน Drive) มาใส่ใน `GOOGLE_DRIVE_FOLDER_ID`

### 4. ตั้งค่า Environment Variables (`.env.local` / Vercel)
คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า Supabase, Google Service Account, `CRON_SECRET` และ `LINE_CHANNEL_ACCESS_TOKEN`

> **การป้องกันไฟล์ `.env` และคีย์ลับหลุดขึ้น GitHub:**
> - ไฟล์ `.gitignore` ปิดกั้น `.env`, `.env.*` (ยกเว้น `.env.example`), `*.pem`, `*.key` และไฟล์ JSON ของ Service Account (`*service-account*.json`, `*credentials*.json`) ไว้แล้ว
> - หากเริ่มต้น Git Repository ใหม่ ให้เปิดใช้ Pre-commit Hook ที่เตรียมไว้ใน `.githooks/pre-commit`:
>   ```bash
>   git init
>   git config core.hooksPath .githooks
>   ```
> - ตรวจสอบรายชื่อไฟล์ก่อน push ทุกครั้งด้วย `git status` ว่าไม่มี `.env` หรือ `.env.local` แสดงขึ้นมา

### 5. รันโปรเจกต์
```bash
npm run dev
```
- หน้าแสดงผลงานสาธารณะ (ไม่ต้องล็อกอิน): `http://localhost:3000/showcase`
- หน้าเข้าสู่ระบบหลังบ้าน (ผู้ดูแล 2 ท่าน): `http://localhost:3000/login`
- แดชบอร์ดผู้ดูแล: `http://localhost:3000/admin`
