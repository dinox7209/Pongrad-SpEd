import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
  Font,
} from "@react-pdf/renderer";
import { Student, StudentLog, SCHOOL_INFO } from "@/types/database";
import { formatDateThai } from "@/lib/utils";

export type PdfTemplateType =
  | "cover"
  | "progress_report"
  | "portfolio"
  | "newsletter";

export interface PdfPhotoItem {
  id: string;
  title: string;
  dataUri: string;
  skill_category?: string;
}

export interface SpEdPdfPayload {
  template: PdfTemplateType;
  documentTitle: string;
  academicYear: string;
  semesterLabel: string;
  weekNumber?: number;
  teacherName: string;
  summaryText: string;
  parentTipText?: string;
  student?: Student | null;
  logs?: StudentLog[];
  photos?: PdfPhotoItem[];
}

let fontsRegisteredForPrefix: string | null = null;

export function ensureThaiPdfFonts(fontDirPrefix = "/fonts") {
  if (fontsRegisteredForPrefix === fontDirPrefix) return;

  Font.register({
    family: "Sarabun",
    fonts: [
      {
        src: `${fontDirPrefix}/Sarabun-Regular.ttf`,
        fontWeight: "normal",
      },
      {
        src: `${fontDirPrefix}/Sarabun-Bold.ttf`,
        fontWeight: "bold",
      },
    ],
  });

  // ป้องกันการตัดคำภาษาไทยด้วยเครื่องหมายยัติภังค์อัตโนมัติ
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegisteredForPrefix = fontDirPrefix;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Sarabun",
    fontSize: 10.5,
    color: "#0f172a",
    backgroundColor: "#ffffff",
    paddingTop: 30,
    paddingBottom: 34,
    paddingHorizontal: 34,
    lineHeight: 1.45,
  },
  // Cover Page Styles
  coverFrame: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#102a43",
    borderRadius: 10,
    padding: 24,
    justifyContent: "space-between",
  },
  coverBanner: {
    backgroundColor: "#102a43",
    padding: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  coverSchool: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 4,
  },
  coverArea: {
    color: "#bfdbfe",
    fontSize: 10.5,
  },
  coverCenter: {
    alignItems: "center",
    marginVertical: 14,
  },
  coverBadge: {
    backgroundColor: "#e0f2fe",
    color: "#1e40af",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#102a43",
    textAlign: "center",
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 12,
    color: "#334e68",
    textAlign: "center",
  },
  coverPhotoBox: {
    width: 240,
    height: 165,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    overflow: "hidden",
    marginTop: 14,
  },
  coverInfoCard: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 14,
  },
  coverFooter: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  // Standard Header
  docHeader: {
    backgroundColor: "#102a43",
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  docHeaderTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  docHeaderSub: {
    color: "#bfdbfe",
    fontSize: 9.5,
    marginTop: 2,
  },
  docHeaderTag: {
    backgroundColor: "#1e40af",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 9,
    fontWeight: "bold",
  },
  sectionBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 11,
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#102a43",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  colHalf: {
    width: "50%",
    paddingRight: 8,
  },
  label: {
    fontSize: 9.5,
    color: "#486581",
    fontWeight: "bold",
  },
  value: {
    fontSize: 10.5,
    color: "#0f172a",
  },
  // Table for logs
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f4f8",
    borderBottomWidth: 1,
    borderBottomColor: "#bcccdc",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontWeight: "bold",
    fontSize: 9.5,
    color: "#102a43",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9.5,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  photoCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 6,
    backgroundColor: "#f8fafc",
  },
  photoImg: {
    width: "100%",
    height: 120,
    objectFit: "cover",
    borderRadius: 4,
  },
  photoCaption: {
    fontSize: 8.5,
    color: "#334e68",
    marginTop: 4,
  },
  // Newsletter specific
  masthead: {
    borderBottomWidth: 3,
    borderBottomColor: "#102a43",
    paddingBottom: 10,
    marginBottom: 12,
  },
  mastheadTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 9,
    color: "#486581",
  },
  mastheadTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#102a43",
  },
  newsletterCols: {
    flexDirection: "row",
    gap: 12,
  },
  newsletterMain: {
    width: "65%",
  },
  newsletterSide: {
    width: "35%",
    backgroundColor: "#f0f4f8",
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: "#d9e2ec",
  },
  signatureBlock: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  signBox: {
    width: "45%",
    alignItems: "center",
    fontSize: 9.5,
  },
  footerMeta: {
    position: "absolute",
    bottom: 14,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#64748b",
  },
});

export function SpEdPdfDocument({ payload }: { payload: SpEdPdfPayload }) {
  const {
    template,
    documentTitle,
    academicYear,
    semesterLabel,
    weekNumber,
    teacherName,
    summaryText,
    parentTipText,
    student,
    logs = [],
    photos = [],
  } = payload;

  const validPhotos = photos.filter((p) => Boolean(p.dataUri));

  if (template === "cover") {
    return (
      <Document title={documentTitle}>
        <Page size="A4" style={styles.page}>
          <View style={styles.coverFrame}>
            <View style={styles.coverBanner}>
              <Text style={styles.coverSchool}>{SCHOOL_INFO.name}</Text>
              <Text style={styles.coverArea}>
                {SCHOOL_INFO.unitName} • {SCHOOL_INFO.area}
              </Text>
            </View>

            <View style={styles.coverCenter}>
              <Text style={styles.coverBadge}>
                เอกสารการจัดการศึกษาพิเศษ • ปีการศึกษา {academicYear}
              </Text>
              <Text style={styles.coverTitle}>{documentTitle}</Text>
              <Text style={styles.coverSubtitle}>{semesterLabel}</Text>

              {validPhotos[0] && (
                <View style={styles.coverPhotoBox}>
                  <PdfImage
                    src={validPhotos[0].dataUri}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </View>
              )}
            </View>

            {student && (
              <View style={styles.coverInfoCard}>
                <Text style={styles.sectionHeading}>ข้อมูลผู้เรียนเฉพาะบุคคล</Text>
                <View style={styles.row}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>รหัสนักเรียน</Text>
                    <Text style={styles.value}>{student.student_code}</Text>
                  </View>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>ชื่อ-สกุล (ชื่อเล่น)</Text>
                    <Text style={styles.value}>
                      {student.full_name} ({student.nickname || "-"})
                    </Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>ระดับชั้น</Text>
                    <Text style={styles.value}>{student.grade_level}</Text>
                  </View>
                  <View style={styles.colHalf}>
                    <Text style={styles.label}>ประเภทความต้องการพิเศษ</Text>
                    <Text style={styles.value}>{student.disability_type}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.coverFooter}>
              <View>
                <Text style={styles.label}>ผู้จัดทำและรับผิดชอบ</Text>
                <Text style={styles.value}>{teacherName}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.label}>เสนอ</Text>
                <Text style={styles.value}>{SCHOOL_INFO.directorName}</Text>
                <Text style={{ fontSize: 8.5, color: "#486581" }}>
                  {SCHOOL_INFO.directorPosition}
                </Text>
              </View>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  if (template === "newsletter") {
    return (
      <Document title={documentTitle}>
        <Page size="A4" style={styles.page}>
          <View style={styles.masthead}>
            <View style={styles.mastheadTop}>
              <Text>
                {SCHOOL_INFO.name} • {SCHOOL_INFO.area}
              </Text>
              <Text>
                ฉบับที่ {weekNumber || 1} • วันที่ {formatDateThai(new Date())}
              </Text>
            </View>
            <Text style={styles.mastheadTitle}>{documentTitle}</Text>
            <Text style={{ fontSize: 10, color: "#1e40af", marginTop: 2 }}>
              {SCHOOL_INFO.unitName} ({semesterLabel})
            </Text>
          </View>

          <View style={styles.newsletterCols}>
            <View style={styles.newsletterMain}>
              <View style={styles.sectionBox}>
                <Text style={styles.sectionHeading}>
                  ไฮไลต์กิจกรรมและพัฒนาการประจำสัปดาห์
                </Text>
                <Text style={styles.value}>{summaryText}</Text>
              </View>

              {validPhotos.length > 0 && (
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionHeading}>ภาพกิจกรรมและสื่อการเรียนรู้</Text>
                  <View style={styles.photoGrid}>
                    {validPhotos.slice(0, 4).map((p) => (
                      <View key={p.id} style={styles.photoCard}>
                        <PdfImage src={p.dataUri} style={styles.photoImg} />
                        <Text style={styles.photoCaption}>{p.title}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.newsletterSide}>
              <Text style={styles.sectionHeading}>สาระน่ารู้สำหรับผู้ปกครอง</Text>
              <Text style={{ fontSize: 9.5, color: "#1e293b", marginBottom: 12 }}>
                {parentTipText ||
                  "การฝึกทักษะอย่างสม่ำเสมอที่บ้านวันละ 10-15 นาที ด้วยคำชมเชยและการเสริมแรงทางบวก ช่วยต่อยอดพัฒนาการจากห้องเรียนได้อย่างมีประสิทธิภาพ"}
              </Text>

              <Text style={styles.sectionHeading}>ผู้จัดทำวารสาร</Text>
              <Text style={{ fontSize: 9.5, color: "#102a43", fontWeight: "bold" }}>
                {teacherName}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#486581", marginTop: 2 }}>
                {SCHOOL_INFO.unitName}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#486581" }}>
                ปีการศึกษา {academicYear}
              </Text>
            </View>
          </View>

          <View style={styles.footerMeta}>
            <Text>{SCHOOL_INFO.name}</Text>
            <Text>เอกสารเผยแพร่สาธารณะ (Public Showcase Newsletter)</Text>
          </View>
        </Page>
      </Document>
    );
  }

  if (template === "portfolio") {
    return (
      <Document title={documentTitle}>
        <Page size="A4" style={styles.page}>
          <View style={styles.docHeader}>
            <View>
              <Text style={styles.docHeaderTitle}>{documentTitle}</Text>
              <Text style={styles.docHeaderSub}>
                {SCHOOL_INFO.name} • {semesterLabel}
              </Text>
            </View>
            <Text style={styles.docHeaderTag}>PORTFOLIO</Text>
          </View>

          {student && (
            <View style={[styles.sectionBox, { backgroundColor: "#f8fafc" }]}>
              <Text style={styles.sectionHeading}>ประวัติและเป้าหมายผู้เรียน</Text>
              <View style={styles.row}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ชื่อนักเรียน</Text>
                  <Text style={styles.value}>
                    {student.full_name} ({student.nickname})
                  </Text>
                </View>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>ระดับชั้น / รหัส</Text>
                  <Text style={styles.value}>
                    {student.grade_level} • {student.student_code}
                  </Text>
                </View>
              </View>
              {student.iep_goal && (
                <View style={{ marginTop: 4 }}>
                  <Text style={styles.label}>เป้าหมายการเรียนรู้ (IEP Goal)</Text>
                  <Text style={styles.value}>{student.iep_goal}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.sectionBox}>
            <Text style={styles.sectionHeading}>สรุปความภาคภูมิใจและทักษะที่พัฒนาได้</Text>
            <Text style={styles.value}>{summaryText}</Text>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionHeading}>
              คลังภาพผลงานนักเรียนจาก Google Drive ({validPhotos.length} ภาพ)
            </Text>
            {validPhotos.length > 0 ? (
              <View style={styles.photoGrid}>
                {validPhotos.slice(0, 4).map((p) => (
                  <View key={p.id} style={styles.photoCard}>
                    <PdfImage src={p.dataUri} style={styles.photoImg} />
                    <Text style={styles.photoCaption}>
                      {p.title}
                      {p.skill_category ? ` • ${p.skill_category}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 9.5, color: "#64748b" }}>
                ยังไม่ได้แนบรูปภาพผลงานประกอบสำหรับแฟ้มสะสมผลงานนี้
              </Text>
            )}
          </View>

          <View style={styles.signatureBlock}>
            <View style={styles.signBox}>
              <Text>ลงชื่อ .............................................</Text>
              <Text style={{ marginTop: 4, fontWeight: "bold" }}>({teacherName})</Text>
              <Text style={{ fontSize: 8.5, color: "#486581" }}>ครูผู้สอนการศึกษาพิเศษ</Text>
            </View>
            <View style={styles.signBox}>
              <Text>ลงชื่อ .............................................</Text>
              <Text style={{ marginTop: 4, fontWeight: "bold" }}>
                ({SCHOOL_INFO.directorName})
              </Text>
              <Text style={{ fontSize: 8.5, color: "#486581" }}>
                {SCHOOL_INFO.directorPosition}
              </Text>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  // Default: "progress_report"
  return (
    <Document title={documentTitle}>
      <Page size="A4" style={styles.page}>
        <View style={styles.docHeader}>
          <View>
            <Text style={styles.docHeaderTitle}>{documentTitle}</Text>
            <Text style={styles.docHeaderSub}>
              {SCHOOL_INFO.name} • {SCHOOL_INFO.area} • {semesterLabel}
            </Text>
          </View>
          <Text style={styles.docHeaderTag}>IEP PROGRESS</Text>
        </View>

        {student && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionHeading}>ข้อมูลพื้นฐานนักเรียน</Text>
            <View style={styles.row}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>รหัส / ชื่อ-สกุล</Text>
                <Text style={styles.value}>
                  {student.student_code} • {student.full_name} ({student.nickname})
                </Text>
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.label}>ระดับชั้น / สถานะปัจจุบัน</Text>
                <Text style={styles.value}>
                  {student.grade_level} • {student.current_status}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>ประเภทความบกพร่อง</Text>
                <Text style={styles.value}>{student.disability_type}</Text>
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.label}>ผู้ปกครอง / ติดต่อ</Text>
                <Text style={styles.value}>{student.guardian_contact || "-"}</Text>
              </View>
            </View>
            {student.iep_goal && (
              <View style={{ marginTop: 4 }}>
                <Text style={styles.label}>เป้าหมายแผน IEP</Text>
                <Text style={styles.value}>{student.iep_goal}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeading}>สรุปภาพรวมพัฒนาการและแนวทางช่วยเหลือ</Text>
          <Text style={styles.value}>{summaryText}</Text>
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeading}>
            บันทึก Case Timeline รายบุคคล ({logs.length} รายการ)
          </Text>
          <View style={styles.tableHeader}>
            <Text style={{ width: "16%" }}>วันที่</Text>
            <Text style={{ width: "18%" }}>ประเภท</Text>
            <Text style={{ width: "33%" }}>พัฒนาการ / สิ่งที่พบ</Text>
            <Text style={{ width: "33%" }}>แนวทางช่วยเหลือ</Text>
          </View>
          {logs.length > 0 ? (
            logs.slice(0, 8).map((log) => (
              <View key={log.id} style={styles.tableRow}>
                <Text style={{ width: "16%" }}>{formatDateThai(log.logged_date)}</Text>
                <Text style={{ width: "18%", fontWeight: "bold" }}>{log.log_type}</Text>
                <Text style={{ width: "33%", paddingRight: 4 }}>{log.description}</Text>
                <Text style={{ width: "33%" }}>{log.action_taken || "-"}</Text>
              </View>
            ))
          ) : (
            <Text style={{ padding: 8, fontSize: 9.5, color: "#64748b" }}>
              ยังไม่มีบันทึก Case Timeline สำหรับนักเรียนรายนี้
            </Text>
          )}
        </View>

        {validPhotos.length > 0 && (
          <View style={styles.sectionBox}>
            <Text style={styles.sectionHeading}>ภาพประกอบการฝึกทักษะ</Text>
            <View style={styles.photoGrid}>
              {validPhotos.slice(0, 2).map((p) => (
                <View key={p.id} style={styles.photoCard}>
                  <PdfImage src={p.dataUri} style={styles.photoImg} />
                  <Text style={styles.photoCaption}>{p.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.signatureBlock}>
          <View style={styles.signBox}>
            <Text>ลงชื่อ .............................................</Text>
            <Text style={{ marginTop: 4, fontWeight: "bold" }}>({teacherName})</Text>
            <Text style={{ fontSize: 8.5, color: "#486581" }}>ครูผู้รายงาน</Text>
          </View>
          <View style={styles.signBox}>
            <Text>ลงชื่อ .............................................</Text>
            <Text style={{ marginTop: 4, fontWeight: "bold" }}>
              ({SCHOOL_INFO.directorName})
            </Text>
            <Text style={{ fontSize: 8.5, color: "#486581" }}>
              {SCHOOL_INFO.directorPosition}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
