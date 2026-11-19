"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  FileCheck2,
  Globe,
  Handshake,
  MapPin,
  Phone,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { PrintMouButton } from "@/components/mou/PrintMouButton";
import { useBrandAssets } from "@/context/brand-context";
import { SCHOOL_INFO } from "@/types/database";

const MOU_CLAUSES = [
  {
    numeral: "๑.",
    text: "ร่วมกันส่งเสริม สนับสนุน การจัดการศึกษาสำหรับนักเรียนที่มีความต้องการจำเป็นพิเศษและนักเรียนพิการและการจัดการศึกษาเรียนรวมทุกรูปแบบ",
  },
  {
    numeral: "๒.",
    text: "ส่งเสริม สนับสนุน การจัดตั้งห้องเรียนเสริมวิชาการสู่การเรียนรวมหรือห้องเรียนรูปแบบอื่น เพื่อให้บริการช่วยเหลือทางการศึกษาแก่นักเรียนพิการทุกประเภท โรงเรียนวัดโป่งแรด (คุณวิทยาคาร)",
  },
  {
    numeral: "๓.",
    text: "ส่งเสริม สนับสนุน การพัฒนาทักษะชีวิต การอยู่ร่วมกันในสังคมของนักเรียนที่มีความต้องการจำเป็นพิเศษและนักเรียนพิการ",
  },
  {
    numeral: "๔.",
    text: "ส่งเสริม สนับสนุน สถานที่ อุปกรณ์ บุคลากร ในการดำเนินงานการจัดการศึกษาเรียนรวม",
  },
  {
    numeral: "๕.",
    text: "พัฒนานักเรียนห้องเรียนเสริมวิชาการสู่การเรียนรวมให้เป็นไปตามเป้าหมายที่ตั้งไว้ ตามแผนการจัดการศึกษาเฉพาะบุคคล (IEP)",
  },
  {
    numeral: "๖.",
    text: "ให้บริการช่วยเหลือ สนับสนุน และอำนวยความสะดวกแก่นักเรียนที่มีความต้องการจำเป็นพิเศษและนักเรียนพิการ เพื่อให้สามารถพัฒนาได้เต็มตามศักยภาพของแต่ละบุคคลในการเข้ารับการศึกษาเล่าเรียน ส่งเสริมให้นักเรียนได้เข้าเรียนรวมในโรงเรียนและได้รับการศึกษาในชั้นเรียนรวมกับเด็กอื่นๆ",
  },
  {
    numeral: "๗.",
    text: "เป็นสถานศึกษาที่เตรียมความพร้อมและให้การสนับสนุนแก่นักเรียนที่มีความต้องการจำเป็นพิเศษและนักเรียนพิการให้สามารถเรียนได้ดีขึ้น โดยมีครูการศึกษาพิเศษทำหน้าที่ให้บริการแก่นักเรียนห้องเรียนเสริมวิชาการสู่การเรียนรวม (Resource Room) เพื่อส่งเสริม สนับสนุนการศึกษาแบบเรียนรวมให้มีประสิทธิภาพ",
  },
  {
    numeral: "๘.",
    text: "ร่วมกันประชาสัมพันธ์ ประสานความร่วมมือ สร้างความเข้าใจ และจัดทำบันทึกข้อตกลงในการสนับสนุนการจัดการศึกษาสำหรับเด็กพิการรวมกับหน่วยงานภาครัฐและเอกชนที่มีนักเรียนที่มีความต้องการจำเป็นพิเศษและนักเรียนพิการ",
  },
];

const SIGNATORIES = [
  {
    role: "ผู้ให้ข้อตกลง",
    name: "(ดร.ฐาปณีย์ โลพันดุง)",
    position: "ผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี",
  },
  {
    role: "ผู้ให้ข้อตกลง",
    name: "(นางสาวอำพร คงเจริญ)",
    position: "ผู้อำนวยการโรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  },
];

const WITNESSES = [
  {
    role: "พยาน",
    name: "(นางโสภิตนภา แก้วนวล)",
    position: "รองผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี",
  },
  {
    role: "พยาน",
    name: "(นางสาวชมพูนุท บุญอากาศ)",
    position: "ครูโรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)",
  },
];

export function MouDocumentView() {
  const { schoolLogoUrl, partnerLogoUrl, getExtraAssets } = useBrandAssets();
  const extraMouAssets = getExtraAssets("mou");

  return (
    <div className="min-h-screen py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 print:py-0 print:px-0 print:max-w-none print:space-y-0">
      {/* Liquid Glass Hero Header (Hidden when printing) */}
      <section className="liquid-glass-hero running-line-bottom rounded-[2rem] text-white p-6 sm:p-9 relative no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3.5 flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-pink-100 text-xs font-semibold border border-white/25">
              <Globe className="w-3.5 h-3.5 text-pink-200 shrink-0" />
              <span>เอกสารบันทึกข้อตกลงความร่วมมือ (MOU) • เผยแพร่สาธารณะ</span>
            </div>

            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-snug drop-shadow-sm">
              บันทึกข้อตกลงโครงการความร่วมมือในการจัดการศึกษาเรียนรวม
            </h1>

            <p className="text-purple-100/95 text-sm sm:text-base leading-relaxed max-w-3xl">
              ระหว่าง{" "}
              <span className="font-bold text-white">
                ศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี
              </span>{" "}
              กับ{" "}
              <span className="font-bold text-pink-100">
                โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
              </span>{" "}
              เพื่อพัฒนาและส่งเสริมศักยภาพนักเรียนที่มีความต้องการจำเป็นพิเศษในห้องเรียนเสริมวิชาการสู่การเรียนรวม
              (Resource Room)
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-white font-medium">
                <Calendar className="w-3.5 h-3.5 text-pink-200" />
                <span>บันทึกไว้ ณ วันที่ ๒๕ กันยายน พ.ศ. ๒๕๖๙</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-white font-medium">
                <FileCheck2 className="w-3.5 h-3.5 text-pink-200" />
                <span>เจตนารมณ์ความร่วมมือ ๘ ประการ</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 shrink-0">
            {/* Agency Emblems (Live managed via /admin/branding) */}
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl px-5 py-3.5 shadow-inner">
              {partnerLogoUrl && (
                <div className="w-16 h-20 sm:w-[74px] sm:h-[88px] rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-sm">
                  <img
                    src={partnerLogoUrl}
                    alt="ตราสัญลักษณ์ ศูนย์การศึกษาพิเศษ ประจำจังหวัดจันทบุรี"
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              )}

              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white flex items-center justify-center shadow-glass-pink border border-white/40 shrink-0">
                <Handshake className="w-4 h-4" />
              </div>

              {schoolLogoUrl && (
                <div className="w-16 h-20 sm:w-[74px] sm:h-[88px] rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-sm">
                  <img
                    src={schoolLogoUrl}
                    alt="ตราสัญลักษณ์ โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)"
                    className="max-h-full w-auto object-contain"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <PrintMouButton />
              <Link
                href="/showcase"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-semibold border border-white/25 backdrop-blur-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-pink-200" />
                <span>กลับหน้าผลงานสาธารณะ</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Official MOU Document Sheet */}
      <article className="max-w-4xl mx-auto liquid-glass running-line-bottom rounded-[2rem] p-6 sm:p-10 md:p-12 bg-white/95 shadow-glass-lg print:max-w-none print:rounded-none print:shadow-none print:border-none print:bg-white print:p-6">
        {/* Letterhead Logos */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 pb-5 flex-wrap">
          {partnerLogoUrl && (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <img
                src={partnerLogoUrl}
                alt="ศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี"
                className="h-20 sm:h-24 w-auto object-contain"
              />
            </div>
          )}

          <div className="hidden sm:flex flex-col items-center gap-1 text-purple-300 no-print">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <div className="w-10 h-px bg-gradient-to-r from-purple-300 via-pink-400 to-purple-300" />
          </div>

          {schoolLogoUrl && (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <img
                src={schoolLogoUrl}
                alt="โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)"
                className="h-20 sm:h-24 w-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* Document Formal Title */}
        <header className="text-center space-y-2 pb-6 border-b border-purple-200/70 print:border-neutral-300">
          <h2 className="text-lg sm:text-xl font-extrabold text-navy-950 leading-relaxed print:text-black">
            บันทึกข้อตกลงโครงการความร่วมมือในการจัดการศึกษาสำหรับบุคคลที่มีความต้องการจำเป็นพิเศษ
            <br />
            ในโรงเรียนจัดการศึกษาเรียนรวม (MOU)
          </h2>
          <p className="text-sm sm:text-base font-bold text-purple-900 print:text-black">
            ระหว่าง ศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี กับ
            โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
          </p>
          <div
            aria-hidden="true"
            className="pt-2 flex items-center justify-center gap-2 text-pink-500/80 tracking-[0.35em] text-xs font-bold print:text-neutral-600"
          >
            <span>********************************</span>
          </div>
        </header>

        {/* Opening Statement */}
        <section className="pt-6 space-y-5 text-sm sm:text-[15.5px] leading-[1.9] text-navy-950/90 print:text-black print:leading-[1.8]">
          <p className="indent-8 sm:indent-12 text-justify">
            บันทึกข้อตกลงความร่วมมือฉบับนี้จัดทำขึ้น ณ
            ศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี ระหว่าง{" "}
            <strong className="font-bold text-navy-950 print:text-black">
              ศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี
            </strong>{" "}
            โดย{" "}
            <strong className="font-bold text-navy-950 print:text-black">
              ดร.ฐาปณีย์ โลพันดุง
            </strong>{" "}
            ผู้อำนวยการศูนย์การศึกษาพิเศษประจำจังหวัดจันทบุรี และ{" "}
            <strong className="font-bold text-navy-950 print:text-black">
              โรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร)
            </strong>{" "}
            โดย{" "}
            <strong className="font-bold text-navy-950 print:text-black">
              นางสาวอำพร คงเจริญ
            </strong>{" "}
            ผู้อำนวยการโรงเรียนวัดโป่งแรด (ปคุณวิทยาคาร) โดยทุกฝ่ายตกลง
            ที่จะแสดงเจตนารมณ์และประสานความร่วมมือ ดังข้อความต่อไปนี้
          </p>

          {/* 8 Agreement Clauses */}
          <ol className="space-y-3 sm:space-y-3.5 pt-1">
            {MOU_CLAUSES.map((clause) => (
              <li
                key={clause.numeral}
                className="flex items-start gap-3 sm:gap-4 rounded-2xl bg-purple-50/55 border border-purple-100/90 px-4 py-3 print:rounded-none print:bg-transparent print:border-none print:px-0 print:py-1 print:pl-4"
              >
                <span className="inline-flex items-center justify-center min-w-[2rem] h-7 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white text-xs sm:text-sm font-bold shrink-0 mt-0.5 print:bg-none print:text-black print:min-w-[1.5rem] print:h-auto print:justify-start print:mt-0">
                  {clause.numeral}
                </span>
                <span className="leading-[1.85] text-navy-950/90 print:text-black text-justify">
                  {clause.text}
                </span>
              </li>
            ))}
          </ol>

          {/* Closing Statement & Date */}
          <div className="pt-4 space-y-4">
            <p className="indent-8 sm:indent-12 text-justify">
              บันทึกข้อตกลงความร่วมมือฉบับนี้ จัดทำขึ้น ๒ ฉบับ
              มีข้อความถูกต้องตรงกันทุกประการ
              ทุกฝ่ายได้ทำความเข้าใจร่วมกันตามข้อตกลงความร่วมมือนี้
              จึงได้ลงลายมือชื่อไว้เป็นหลักฐานสำคัญ
              พร้อมเก็บรักษาไว้ฝ่ายละหนึ่งฉบับและถือเป็นการปฏิบัติตามบันทึกข้อตกลงความร่วมมือฉบับนี้ต่อไป
            </p>

            <div className="text-center pt-2">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 text-purple-950 font-bold text-sm sm:text-base print:bg-transparent print:border-none print:text-black print:px-0 print:py-0">
                <ScrollText className="w-4 h-4 text-pink-600 no-print" />
                <span>บันทึกไว้ ณ วันที่ ๒๕ กันยายน พ.ศ. ๒๕๖๙</span>
              </span>
            </div>
          </div>
        </section>

        {/* Signatories & Witnesses */}
        <section className="pt-10 sm:pt-12 space-y-10 text-xs sm:text-sm text-navy-950 print:text-black print:break-inside-avoid">
          {/* Row 1: Agreement Makers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 sm:gap-10">
            {SIGNATORIES.map((person) => (
              <div
                key={person.name}
                className="text-center space-y-1.5 rounded-2xl bg-purple-50/45 border border-purple-100 px-4 py-5 print:bg-transparent print:border-none print:p-0"
              >
                <div className="pt-4 text-purple-950/85 print:text-black">
                  (ลงนาม){" "}
                  <span className="inline-block w-36 sm:w-44 border-b border-dotted border-purple-400 print:border-black align-baseline mx-1" />{" "}
                  {person.role}
                </div>
                <div className="font-bold text-sm sm:text-base text-navy-950 print:text-black pt-1">
                  {person.name}
                </div>
                <div className="text-xs sm:text-sm text-purple-900/85 print:text-black">
                  {person.position}
                </div>
              </div>
            ))}
          </div>

          {/* Row 2: Witnesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 sm:gap-10">
            {WITNESSES.map((person) => (
              <div
                key={person.name}
                className="text-center space-y-1.5 rounded-2xl bg-pink-50/40 border border-pink-100 px-4 py-5 print:bg-transparent print:border-none print:p-0"
              >
                <div className="pt-4 text-purple-950/85 print:text-black">
                  (ลงนาม){" "}
                  <span className="inline-block w-36 sm:w-44 border-b border-dotted border-purple-400 print:border-black align-baseline mx-1" />{" "}
                  {person.role}
                </div>
                <div className="font-bold text-sm sm:text-base text-navy-950 print:text-black pt-1">
                  {person.name}
                </div>
                <div className="text-xs sm:text-sm text-purple-900/85 print:text-black">
                  {person.position}
                </div>
              </div>
            ))}
          </div>
        </section>
      </article>

      {/* Extra Custom Added MOU Logos & Partner Network (if added in /admin/branding) */}
      {extraMouAssets.length > 0 && (
        <section className="max-w-4xl mx-auto space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-navy-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-600" />
              <span>ตราสัญลักษณ์หน่วยงานและภาคีเพิ่มเติม</span>
            </h2>
            <div className="heading-beam-track" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {extraMouAssets.map((item) => (
              <div
                key={item.id}
                className="liquid-glass rounded-3xl p-4 flex items-center gap-3.5"
              >
                <div className="w-14 h-14 rounded-2xl bg-white border border-purple-100 p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-navy-950 text-xs sm:text-sm truncate">
                    {item.title}
                  </div>
                  {item.description && (
                    <div className="text-[11px] text-purple-900/75 line-clamp-2 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Partner Institutions Summary (Hidden when printing) */}
      <section className="max-w-4xl mx-auto space-y-4 no-print">
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-navy-950 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-glass-pink">
              <Handshake className="w-4 h-4" />
            </span>
            <span>หน่วยงานภาคีความร่วมมือและข้อมูลติดต่อ</span>
          </h2>
          <div className="heading-beam-track" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="liquid-glass rounded-3xl p-5 flex items-start gap-3.5">
            {partnerLogoUrl && (
              <div className="w-14 h-16 rounded-2xl bg-white border border-purple-100 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                <img
                  src={partnerLogoUrl}
                  alt={SCHOOL_INFO.partnerName}
                  className="max-h-full w-auto object-contain"
                />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-navy-950 text-sm sm:text-base">
                {SCHOOL_INFO.partnerName}
              </div>
              <div className="text-xs text-purple-900/80 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
                <span>{SCHOOL_INFO.partnerAddress}</span>
              </div>
              <div className="text-xs text-pink-700 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <a
                  href={`tel:${SCHOOL_INFO.partnerPhone.replace(/-/g, "")}`}
                  className="hover:underline"
                >
                  โทรศัพท์ {SCHOOL_INFO.partnerPhone}
                </a>
              </div>
            </div>
          </div>

          <div className="liquid-glass rounded-3xl p-5 flex items-start gap-3.5">
            {schoolLogoUrl && (
              <div className="w-14 h-16 rounded-2xl bg-white border border-purple-100 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                <img
                  src={schoolLogoUrl}
                  alt={SCHOOL_INFO.name}
                  className="max-h-full w-auto object-contain"
                />
              </div>
            )}
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-navy-950 text-sm sm:text-base">
                {SCHOOL_INFO.name}
              </div>
              <div className="text-xs text-purple-800/85 font-medium">
                สังกัด {SCHOOL_INFO.fullArea}
              </div>
              <div className="text-xs text-purple-900/80 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0 mt-0.5" />
                <span>{SCHOOL_INFO.address}</span>
              </div>
              <div className="text-xs text-pink-700 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <a
                  href={`tel:${SCHOOL_INFO.phone.replace(/-/g, "")}`}
                  className="hover:underline"
                >
                  โทรศัพท์ {SCHOOL_INFO.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
