"use client";

/**
 * แปลงไฟล์โลโก้ / ไอคอนที่อัปโหลดจากเครื่องให้เป็น Data URI ที่คมชัดและโหลดเร็ว (PNG โปร่งใส <= 512px)
 * รองรับ PNG, JPG, WEBP และ SVG
 */
export async function processBrandImageFile(
  file: File,
  maxDimension = 512
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("กรุณาเลือกไฟล์รูปภาพ (.png, .jpg, .webp, .svg)");
  }

  // ถ้าเป็น SVG ให้ตรวจความปลอดภัยพื้นฐานและอ่านเป็น Data URI ตรง
  if (file.type === "image/svg+xml") {
    const text = await file.text();
    if (text.length > 250_000) {
      throw new Error("ไฟล์ SVG มีขนาดใหญ่เกิน 250 KB");
    }
    if (/<script/i.test(text)) {
      throw new Error("ไม่อนุญาตให้มี script ภายในไฟล์ SVG");
    }
    const encoded = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < encoded.length; i += 1) {
      binary += String.fromCharCode(encoded[i]);
    }
    const base64 = btoa(binary);
    return `data:image/svg+xml;base64,${base64}`;
  }

  // อ่านและปรับขนาดรูปภาพบน Canvas โดยรักษาพื้นหลังโปร่งใสของ PNG ไว้ครบถ้วน
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
      image.src = objectUrl;
    });

    const naturalW = img.naturalWidth || 256;
    const naturalH = img.naturalHeight || 256;
    const ratio = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
    const width = Math.max(1, Math.round(naturalW * ratio));
    const height = Math.max(1, Math.round(naturalH * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("เบราว์เซอร์ไม่รองรับการประมวลผลรูปภาพ");
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // ใช้ image/png เพื่อรักษาพื้นหลังโปร่งใสของโลโก้/ตราหน่วยงาน
    let output = canvas.toDataURL("image/png");
    if (output.length > 350_000) {
      output = canvas.toDataURL("image/webp", 0.9);
    }
    return output;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function estimateDataUriKb(url: string): string {
  if (!url) return "ยังไม่มีรูป";
  if (url.startsWith("/")) return "ไฟล์ระบบในเว็บ";
  if (url.startsWith("http")) return "ลิงก์ภายนอก";
  if (url.startsWith("data:")) {
    const approxBytes = Math.round((url.length * 3) / 4);
    return `${Math.max(1, Math.round(approxBytes / 1024))} KB`;
  }
  return "-";
}
