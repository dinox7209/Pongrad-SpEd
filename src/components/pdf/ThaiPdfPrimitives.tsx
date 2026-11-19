import React from "react";
import { Text as RawPdfText } from "@react-pdf/renderer";

/**
 * แปลงสระอำ (U+0E33) ให้เป็น นิคหิต (U+0E4D) + สระอา (U+0E32)
 * และเรียงวรรณยุกต์ก่อนสระอำ (เช่น น้ำ, ค่ำ, ช้ำ) ให้อยู่ในรูป ํ + วรรณยุกต์ + า
 * เพื่อป้องกันบั๊กของ @react-pdf/textkit + fontkit ที่นับจำนวน glyph ของสระอำเกิน 1 ตัวแล้วตัดอักษรท้ายบรรทัดทิ้ง
 */
export function normalizeThaiPdfText(input: string): string {
  if (!input) return "";
  return input
    .replace(/([\u0E48-\u0E4B])\u0E33/g, "\u0E4D$1\u0E32")
    .replace(/\u0E33/g, "\u0E4D\u0E32");
}

function normalizeChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      return normalizeThaiPdfText(child);
    }
    if (Array.isArray(child)) {
      return normalizeChildren(child);
    }
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      child.props?.children != null
    ) {
      return React.cloneElement(
        child,
        undefined,
        normalizeChildren(child.props.children)
      );
    }
    return child;
  });
}

type RawTextProps = Extract<
  React.ComponentProps<typeof RawPdfText>,
  { children?: React.ReactNode }
>;

export function ThaiText({ children, ...props }: RawTextProps) {
  return <RawPdfText {...props}>{normalizeChildren(children)}</RawPdfText>;
}
