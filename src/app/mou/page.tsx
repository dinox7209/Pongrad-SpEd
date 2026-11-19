import type { Metadata } from "next";
import { MouDocumentView } from "@/components/mou/MouDocumentView";

export const metadata: Metadata = {
  title:
    "บันทึกข้อตกลงความร่วมมือ (MOU) | ห้องเรียนเสริมวิชาการสู่การเรียนรวม โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  description:
    "บันทึกข้อตกลงโครงการความร่วมมือในการจัดการศึกษาสำหรับบุคคลที่มีความต้องการจำเป็นพิเศษ ในโรงเรียนจัดการศึกษาเรียนรวม (MOU) ระหว่าง ศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี กับ โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
};

export default function PublicMouPage() {
  return <MouDocumentView />;
}
