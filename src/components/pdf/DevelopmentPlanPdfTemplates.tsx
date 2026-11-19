import React from "react";
import {
  Document,
  Page,
  View,
  StyleSheet,
  Image as PdfImage,
} from "@react-pdf/renderer";
import {
  ThaiText as Text,
  normalizeThaiPdfText,
} from "@/components/pdf/ThaiPdfPrimitives";
import {
  DEVELOPMENT_SUBJECTS,
  SCHOOL_INFO,
  StudentDevelopmentPlan,
} from "@/types/database";
import { formatDateThai } from "@/lib/utils";
import { ensureThaiPdfFonts } from "@/components/pdf/SpEdPdfTemplates";

export interface DevelopmentPlanPdfPayload {
  reportTitle: string;
  academicYear: string;
  semesterLabel: string;
  filterLabel: string;
  teacherName: string;
  supervisorName: string;
  directorName: string;
  includeSummaryCover: boolean;
  schoolLogoDataUri?: string | null;
  partnerLogoDataUri?: string | null;
  plans: StudentDevelopmentPlan[];
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Sarabun",
    fontSize: 9.5,
    color: "#1e1b4b",
    backgroundColor: "#ffffff",
    paddingTop: 26,
    paddingBottom: 28,
    paddingHorizontal: 30,
    lineHeight: 1.4,
  },
  // Header Banner
  headerCard: {
    borderWidth: 1.5,
    borderColor: "#6b21a8",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#faf5ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoBox: {
    width: 40,
    height: 48,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 0.75,
    borderColor: "#e9d5ff",
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: {
    maxWidth: 34,
    maxHeight: 42,
    objectFit: "contain",
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  headerSchool: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#4c1d95",
    textAlign: "center",
  },
  headerSub: {
    fontSize: 8.5,
    color: "#831843",
    textAlign: "center",
    marginTop: 1,
  },
  headerBadge: {
    marginTop: 4,
    backgroundColor: "#7e22ce",
    color: "#ffffff",
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 10,
    fontSize: 8.5,
    fontWeight: "bold",
  },
  // Bio Box
  bioBox: {
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 6,
    padding: 8,
    marginBottom: 9,
    backgroundColor: "#ffffff",
  },
  bioHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f3e8ff",
    paddingBottom: 4,
    marginBottom: 5,
  },
  bioName: {
    fontSize: 11.5,
    fontWeight: "bold",
    color: "#1e1b4b",
  },
  bioNicknameTag: {
    backgroundColor: "#fce7f3",
    color: "#9d174d",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 8.5,
    fontWeight: "bold",
  },
  bioMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  bioMetaItem: {
    width: "49%",
    fontSize: 8.8,
    color: "#334155",
  },
  boldLabel: {
    fontWeight: "bold",
    color: "#4c1d95",
  },
  // Table 10 Subjects
  tableWrapper: {
    borderWidth: 1,
    borderColor: "#c084fc",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 9,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#581c87",
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 7,
    fontSize: 8.8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.75,
    borderTopColor: "#e9d5ff",
    paddingVertical: 4.5,
    paddingHorizontal: 7,
    alignItems: "flex-start",
  },
  tableRowAlt: {
    backgroundColor: "#fdfaff",
  },
  colIndex: {
    width: "6%",
    fontSize: 8.8,
    fontWeight: "bold",
    color: "#7e22ce",
    textAlign: "center",
  },
  colSubject: {
    width: "29%",
    fontSize: 8.8,
    fontWeight: "bold",
    color: "#3b0764",
    paddingRight: 6,
  },
  colGoal: {
    width: "65%",
    fontSize: 8.8,
    color: "#0f172a",
    lineHeight: 1.38,
  },
  // Summary Box
  summaryBox: {
    borderWidth: 1,
    borderColor: "#f9a8d4",
    backgroundColor: "#fff8fc",
    borderRadius: 6,
    padding: 7,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 8.8,
    fontWeight: "bold",
    color: "#9d174d",
    marginBottom: 2,
  },
  summaryBody: {
    fontSize: 8.5,
    color: "#334155",
    lineHeight: 1.35,
  },
  // Signature Block (3 columns)
  signGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
  },
  signCol: {
    width: "33%",
    alignItems: "center",
    textAlign: "center",
    paddingHorizontal: 2,
  },
  signLine: {
    fontSize: 8.2,
    color: "#334155",
    marginBottom: 3,
  },
  signName: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#1e1b4b",
  },
  signRole: {
    fontSize: 7.8,
    color: "#475569",
    marginTop: 1,
  },
  pageFooter: {
    position: "absolute",
    bottom: 14,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#64748b",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
  },
  // Cohort Summary Page Styles
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  kpiBox: {
    width: "32%",
    borderWidth: 1,
    borderColor: "#d8b4fe",
    backgroundColor: "#faf5ff",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#6b21a8",
  },
  kpiLabel: {
    fontSize: 8.5,
    color: "#475569",
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#4c1d95",
    marginBottom: 5,
    marginTop: 4,
  },
  gradeChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  gradeChip: {
    backgroundColor: "#fdf2f8",
    borderWidth: 0.75,
    borderColor: "#fbcfe8",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 9,
    fontSize: 8.5,
    color: "#9d174d",
    fontWeight: "bold",
    marginRight: 6,
    marginBottom: 4,
  },
});

export function DevelopmentPlanPdfDocument({
  payload,
}: {
  payload: DevelopmentPlanPdfPayload;
}) {
  ensureThaiPdfFonts("/fonts");

  const {
    reportTitle,
    academicYear,
    semesterLabel,
    filterLabel,
    teacherName,
    supervisorName,
    directorName,
    includeSummaryCover,
    schoolLogoDataUri,
    partnerLogoDataUri,
    plans,
  } = payload;

  const todayThai = formatDateThai(new Date());

  // Compute grade distribution for summary cover
  const gradeCounts = Array.from(
    plans.reduce((map, p) => {
      map.set(p.grade_level, (map.get(p.grade_level) || 0) + 1);
      return map;
    }, new Map<string, number>())
  );

  const statusCounts = Array.from(
    plans.reduce((map, p) => {
      map.set(p.progress_status, (map.get(p.progress_status) || 0) + 1);
      return map;
    }, new Map<string, number>())
  );

  const renderLogosHeader = (subtitle: string, badge: string) => (
    <View style={styles.headerCard}>
      <View style={styles.logoBox}>
        {schoolLogoDataUri ? (
          <PdfImage src={schoolLogoDataUri} style={styles.logoImg} />
        ) : (
          <Text style={{ fontSize: 7, color: "#7e22ce" }}>รร.วัดโป่งแรด</Text>
        )}
      </View>

      <View style={styles.headerCenter}>
        <Text style={styles.headerSchool}>{SCHOOL_INFO.name}</Text>
        <Text style={styles.headerSub}>
          {SCHOOL_INFO.projectName} • ร่วมกับ {SCHOOL_INFO.partnerName}
        </Text>
        <Text style={styles.headerBadge}>{badge}</Text>
        <Text style={{ fontSize: 8.5, color: "#3b0764", marginTop: 3 }}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.logoBox}>
        {partnerLogoDataUri ? (
          <PdfImage src={partnerLogoDataUri} style={styles.logoImg} />
        ) : (
          <Text style={{ fontSize: 7, color: "#be185d" }}>ศกศ.จันทบุรี</Text>
        )}
      </View>
    </View>
  );

  return (
    <Document title={normalizeThaiPdfText(`${reportTitle} ปีการศึกษา ${academicYear}`)}>
      {/* Executive Cohort Summary Cover (when multi-student report) */}
      {includeSummaryCover && plans.length > 0 && (
        <Page size="A4" style={styles.page}>
          {renderLogosHeader(
            reportTitle,
            `ปีการศึกษา ${academicYear} • ${semesterLabel}`
          )}

          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>{plans.length} คน</Text>
              <Text style={styles.kpiLabel}>นักเรียนในรายงาน ({filterLabel})</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>10 สาระ</Text>
              <Text style={styles.kpiLabel}>กลุ่มสาระการพัฒนาทักษะ</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiValue}>{gradeCounts.length} ระดับชั้น</Text>
              <Text style={styles.kpiLabel}>ครอบคลุมผู้เรียนเรียนรวม</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>
            สรุปจำนวนผู้เรียนแยกตามระดับชั้นและสถานะการพัฒนา
          </Text>
          <View style={styles.gradeChipRow}>
            {gradeCounts.map(([grade, count]) => (
              <Text key={grade} style={styles.gradeChip}>
                ชั้น {grade}: {count} คน
              </Text>
            ))}
            {statusCounts.map(([status, count]) => (
              <Text
                key={status}
                style={[
                  styles.gradeChip,
                  {
                    backgroundColor: "#f3e8ff",
                    borderColor: "#d8b4fe",
                    color: "#581c87",
                  },
                ]}
              >
                {status}: {count} คน
              </Text>
            ))}
          </View>

          <Text style={styles.sectionHeading}>
            ทะเบียนผู้เรียนที่มีแผนพัฒนาผู้เรียนรายบุคคล (10 กลุ่มสาระ)
          </Text>
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeader}>
              <Text style={{ width: "8%", textAlign: "center" }}>ที่</Text>
              <Text style={{ width: "30%" }}>ชื่อ - สกุล (ชื่อเล่น)</Text>
              <Text style={{ width: "10%", textAlign: "center" }}>ชั้น</Text>
              <Text style={{ width: "10%", textAlign: "center" }}>อายุ</Text>
              <Text style={{ width: "24%" }}>สถานะแผน</Text>
              <Text style={{ width: "18%" }}>หน้าเอกสาร</Text>
            </View>
            {plans.map((p, idx) => (
              <View
                key={p.id}
                wrap={false}
                style={[
                  styles.tableRow,
                  idx % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={{ width: "8%", textAlign: "center", fontWeight: "bold" }}>
                  {idx + 1}
                </Text>
                <Text style={{ width: "30%", fontWeight: "bold" }}>
                  {p.full_name} {p.nickname ? `(น้อง${p.nickname})` : ""}
                </Text>
                <Text style={{ width: "10%", textAlign: "center" }}>
                  {p.grade_level}
                </Text>
                <Text style={{ width: "10%", textAlign: "center" }}>
                  {p.age_years ? `${p.age_years} ปี` : "-"}
                </Text>
                <Text style={{ width: "24%" }}>{p.progress_status}</Text>
                <Text style={{ width: "18%" }}>
                  รายบุคคลหน้าที่ {p.row_order || idx + 1}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>
              สาระสำคัญของการดำเนินงานห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room)
            </Text>
            <Text style={styles.summaryBody}>
              รายงานฉบับนี้รวบรวมเป้าหมายการพัฒนาผู้เรียนรายบุคคลครบทั้ง 10 กลุ่มสาระการเรียนรู้
              เพื่อใช้ประกอบการนิเทศ ติดตามผลสัมฤทธิ์ทางการเรียน และวางแผนการช่วยเหลือตามแผน IEP
              ให้สอดคล้องกับศักยภาพของผู้เรียนแต่ละบุคคลอย่างต่อเนื่อง ประจำปีการศึกษา {academicYear}
            </Text>
          </View>

          <View style={styles.signGrid}>
            <View style={styles.signCol}>
              <Text style={styles.signLine}>ลงชื่อ ...........................................</Text>
              <Text style={styles.signName}>({teacherName || "นางสาวดวงพร หวังอ้อมกลาง"})</Text>
              <Text style={styles.signRole}>ครูผู้รับผิดชอบห้องเรียนเสริมวิชาการ</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLine}>ลงชื่อ ...........................................</Text>
              <Text style={styles.signName}>({supervisorName || "นายเอกชัย ปลื้มใจ"})</Text>
              <Text style={styles.signRole}>ครูพี่เลี้ยงเด็กพิเศษ</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLine}>ลงชื่อ ...........................................</Text>
              <Text style={styles.signName}>({directorName || "นางสาวอำพร คงเจริญ"})</Text>
              <Text style={styles.signRole}>ผู้อำนวยการ{SCHOOL_INFO.name}</Text>
            </View>
          </View>

          <View style={styles.pageFooter} fixed>
            <Text>
              {SCHOOL_INFO.name} • {SCHOOL_INFO.area}
            </Text>
            <Text>วันที่ออกรายงาน: {todayThai} • หน้าสรุปภาพรวม</Text>
          </View>
        </Page>
      )}

      {/* Per-Student Individual A4 Report Pages */}
      {plans.map((plan, idx) => (
        <Page key={plan.id} size="A4" style={styles.page}>
          {renderLogosHeader(
            `แผนผังในการพัฒนาผู้เรียนรายบุคคล • ปีการศึกษา ${plan.academic_year}`,
            `เอกสารหน้าที่ ${String(plan.row_order || idx + 1).padStart(2, "0")} • ${plan.semester_label || semesterLabel}`
          )}

          {/* Student Profile Card */}
          <View style={styles.bioBox}>
            <View style={styles.bioHeaderRow}>
              <Text style={styles.bioName}>
                ชื่อ - สกุล: {plan.full_name}
              </Text>
              <Text style={styles.bioNicknameTag}>
                ชื่อเล่น: น้อง{plan.nickname || "-"} • ชั้น {plan.grade_level}
              </Text>
            </View>

            <View style={styles.bioMetaRow}>
              <Text style={styles.bioMetaItem}>
                <Text style={styles.boldLabel}>เพศ / อายุ: </Text>
                {plan.gender} • {plan.age_years ? `${plan.age_years} ปี` : "-"}
              </Text>
              <Text style={styles.bioMetaItem}>
                <Text style={styles.boldLabel}>ความต้องการจำเป็นพิเศษ: </Text>
                {plan.disability_type || "รอระบุเพิ่มเติม"}
              </Text>
            </View>
            <View style={styles.bioMetaRow}>
              <Text style={styles.bioMetaItem}>
                <Text style={styles.boldLabel}>ครูประจำชั้น / ผู้รับผิดชอบ: </Text>
                {plan.homeroom_teacher || teacherName}
              </Text>
              <Text style={styles.bioMetaItem}>
                <Text style={styles.boldLabel}>สถานะปัจจุบัน: </Text>
                {plan.progress_status}
              </Text>
            </View>
          </View>

          {/* 10 Learning Areas Table */}
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeader}>
              <Text style={{ width: "6%", textAlign: "center" }}>ที่</Text>
              <Text style={{ width: "29%" }}>กลุ่มสาระการเรียนรู้ / ทักษะ</Text>
              <Text style={{ width: "65%" }}>เป้าหมายการพัฒนาผู้เรียนรายบุคคล</Text>
            </View>

            {DEVELOPMENT_SUBJECTS.map((subj, sIdx) => {
              const value = (plan.skills?.[subj.key] || "").trim() || "-";
              return (
                <View
                  key={subj.key}
                  wrap={false}
                  style={[
                    styles.tableRow,
                    sIdx % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  <Text style={styles.colIndex}>{subj.indexThai}.</Text>
                  <Text style={styles.colSubject}>{subj.name}</Text>
                  <Text style={styles.colGoal}>{value}</Text>
                </View>
              );
            })}
          </View>

          {/* Summary / Evaluation Note */}
          <View style={styles.summaryBox} wrap={false}>
            <Text style={styles.summaryTitle}>
              สรุปผลการพัฒนา / ข้อเสนอแนะเพิ่มเติมสำหรับรายงาน
            </Text>
            <Text style={styles.summaryBody}>
              {plan.overall_summary?.trim()
                ? plan.overall_summary
                : "อยู่ระหว่างดำเนินการพัฒนาและเก็บข้อมูลพัฒนาการตามเป้าหมายแผนผังรายบุคคลครบทั้ง 10 กลุ่มสาระอย่างต่อเนื่อง"}
            </Text>
          </View>

          {/* 3-Role Signatures */}
          <View style={styles.signGrid} wrap={false}>
            <View style={styles.signCol}>
              <Text style={styles.signLine}>ลงชื่อ ...........................................</Text>
              <Text style={styles.signName}>
                ({plan.homeroom_teacher || teacherName || "นางสาวดวงพร หวังอ้อมกลาง"})
              </Text>
              <Text style={styles.signRole}>ครูผู้รับผิดชอบ / ผู้จัดทำแผน</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLine}>ลงชื่อ ...........................................</Text>
              <Text style={styles.signName}>({supervisorName || "นายเอกชัย ปลื้มใจ"})</Text>
              <Text style={styles.signRole}>ครูพี่เลี้ยงเด็กพิเศษ</Text>
            </View>
            <View style={styles.signCol}>
              <Text style={styles.signLine}>ลงชื่อ ...........................................</Text>
              <Text style={styles.signName}>({directorName || "นางสาวอำพร คงเจริญ"})</Text>
              <Text style={styles.signRole}>ผู้อำนวยการ{SCHOOL_INFO.name}</Text>
            </View>
          </View>

          <View style={styles.pageFooter} fixed>
            <Text>
              แผนผังพัฒนาผู้เรียนรายบุคคล • {SCHOOL_INFO.name}
            </Text>
            <Text>
              ปีการศึกษา {plan.academic_year} • ลำดับที่ {plan.row_order || idx + 1} • วันที่ {todayThai}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
