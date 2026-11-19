import { google, drive_v3 } from "googleapis";
import { Readable } from "node:stream";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

export interface DriveUploadOptions {
  stream: Readable;
  fileName: string;
  mimeType: string;
  folderName?: string;
  parentFolderId?: string;
  makePublic?: boolean;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  mimeType: string;
  size: number | null;
  webViewLink: string;
  streamUrl: string;
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

let cachedDriveClient: drive_v3.Drive | null = null;
let cachedAuthClient: InstanceType<typeof google.auth.JWT> | null = null;

/**
 * อ่านข้อมูล Google Service Account จาก Environment Variables
 * รองรับทั้งรูปแบบ JSON string/Base64 (GOOGLE_SERVICE_ACCOUNT_KEY)
 * และรูปแบบแยกคีย์ (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY)
 */
function parseServiceAccountCredentials(): ServiceAccountCredentials | null {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (rawJson) {
    try {
      const decoded = rawJson.startsWith("{")
        ? rawJson
        : Buffer.from(rawJson, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as Partial<ServiceAccountCredentials>;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch (err) {
      console.error("[GoogleDrive] Invalid GOOGLE_SERVICE_ACCOUNT_KEY format:", err);
    }
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (email && privateKey) {
    return {
      client_email: email,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(parseServiceAccountCredentials() && process.env.GOOGLE_DRIVE_FOLDER_ID?.trim());
}

export function getRootDriveFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!folderId) {
    throw new Error("ไม่ได้กำหนดค่า GOOGLE_DRIVE_FOLDER_ID ใน Environment Variables");
  }
  return folderId;
}

export function getDriveAuthClient() {
  if (cachedAuthClient) return cachedAuthClient;

  const creds = parseServiceAccountCredentials();
  if (!creds) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Google Service Account (GOOGLE_SERVICE_ACCOUNT_KEY หรือ GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY)"
    );
  }

  cachedAuthClient = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: DRIVE_SCOPES,
  });

  return cachedAuthClient;
}

export function getDriveClient(): drive_v3.Drive {
  if (cachedDriveClient) return cachedDriveClient;

  const auth = getDriveAuthClient();
  cachedDriveClient = google.drive({ version: "v3", auth });
  return cachedDriveClient;
}

/**
 * ค้นหาหรือสร้างโฟลเดอร์ย่อยภายใน Root Folder ของโรงเรียนใน Google Drive
 */
export async function ensureDriveSubfolder(
  folderName: string,
  parentId?: string
): Promise<string> {
  const drive = getDriveClient();
  const targetParent = parentId || getRootDriveFolderId();
  const escapedName = folderName.replace(/'/g, "\\'");

  const searchRes = await drive.files.list({
    q: [
      `name = '${escapedName}'`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `'${targetParent}' in parents`,
      `trashed = false`,
    ].join(" and "),
    fields: "files(id, name)",
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = searchRes.data.files?.[0];
  if (existing?.id) {
    return existing.id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [targetParent],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!created.data.id) {
    throw new Error(`ไม่สามารถสร้างโฟลเดอร์ "${folderName}" บน Google Drive ได้`);
  }

  return created.data.id;
}

/**
 * สตรีมไฟล์ขึ้น Google Drive โดยตรง (ไม่บันทึกไฟล์ชั่วคราวลง Serverless Storage)
 */
export async function uploadStreamToDrive(
  options: DriveUploadOptions
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  const targetParentId = options.folderName
    ? await ensureDriveSubfolder(options.folderName, options.parentFolderId)
    : options.parentFolderId || getRootDriveFolderId();

  const response = await drive.files.create({
    requestBody: {
      name: options.fileName,
      parents: [targetParentId],
    },
    media: {
      mimeType: options.mimeType,
      body: options.stream,
    },
    fields: "id, name, mimeType, size, webViewLink",
    supportsAllDrives: true,
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error("Google Drive ไม่ได้ส่ง File ID กลับมาหลังการอัปโหลด");
  }

  if (options.makePublic) {
    await setDriveFilePublic(fileId, true);
  }

  return {
    fileId,
    name: response.data.name || options.fileName,
    mimeType: response.data.mimeType || options.mimeType,
    size: response.data.size ? Number(response.data.size) : null,
    webViewLink:
      response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
    streamUrl: `/api/drive/stream/${fileId}`,
  };
}

/**
 * สร้าง Google Drive Resumable Upload Session URI
 * สำหรับอัปโหลดไฟล์วิดีโอขนาดใหญ่จากเบราว์เซอร์ตรงสู่ Drive โดยไม่ติดขีดจำกัด 4.5MB ของ Serverless
 */
export async function createDriveResumableUploadSession(params: {
  fileName: string;
  mimeType: string;
  origin?: string;
  folderName?: string;
  parentFolderId?: string;
}): Promise<{ uploadUrl: string; targetFolderId: string }> {
  const auth = getDriveAuthClient();
  const tokenResponse = await auth.getAccessToken();
  const accessToken = tokenResponse?.token;
  if (!accessToken) {
    throw new Error("ไม่สามารถขอ Access Token จาก Google Service Account ได้");
  }

  const targetFolderId = params.folderName
    ? await ensureDriveSubfolder(params.folderName, params.parentFolderId)
    : params.parentFolderId || getRootDriveFolderId();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": params.mimeType,
  };
  if (params.origin) {
    headers.Origin = params.origin;
  }

  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,webViewLink",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: params.fileName,
        parents: [targetFolderId],
      }),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`เริ่มต้น Resumable Upload ไม่สำเร็จ: ${errText}`);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Google Drive ไม่ได้ส่ง Resumable Session URI กลับมา");
  }

  return { uploadUrl, targetFolderId };
}

/**
 * เปิดหรือปิดสิทธิ์สาธารณะ (Anyone with link can view) บน Google Drive
 */
export async function setDriveFilePublic(
  fileId: string,
  isPublic: boolean
): Promise<void> {
  const drive = getDriveClient();

  if (isPublic) {
    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
    return;
  }

  const perms = await drive.permissions.list({
    fileId,
    supportsAllDrives: true,
    fields: "permissions(id, type)",
  });

  const anyonePerm = perms.data.permissions?.find((p) => p.type === "anyone");
  if (anyonePerm?.id) {
    await drive.permissions.delete({
      fileId,
      permissionId: anyonePerm.id,
      supportsAllDrives: true,
    });
  }
}

export async function getDriveFileMetadata(fileId: string) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, webViewLink, thumbnailLink",
    supportsAllDrives: true,
  });
  return res.data;
}

/**
 * สตรีมไฟล์ (วิดีโอ/รูปภาพ/PDF) จาก Google Drive โดยตรง รองรับ HTTP Range Request สำหรับเล่นวิดีโอ
 */
export async function streamDriveFile(fileId: string, rangeHeader?: string | null) {
  const metadata = await getDriveFileMetadata(fileId);
  const auth = getDriveAuthClient();
  const tokenResponse = await auth.getAccessToken();
  const accessToken = tokenResponse?.token;
  if (!accessToken) {
    throw new Error("ไม่สามารถขอ Access Token สำหรับสตรีมไฟล์จาก Google Drive ได้");
  }

  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (rangeHeader) {
    requestHeaders.Range = rangeHeader;
  }

  const driveResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: requestHeaders,
      cache: "no-store",
    }
  );

  return {
    metadata,
    response: driveResponse,
  };
}

/**
 * ดึงไฟล์ภาพจาก Google Drive แปลงเป็น Base64 Data URI สำหรับนำไปฝังในเอกสาร A4 PDF
 */
export async function fetchDriveFileAsDataUri(fileId: string): Promise<{
  dataUri: string;
  mimeType: string;
  name: string;
}> {
  const drive = getDriveClient();
  const metadata = await getDriveFileMetadata(fileId);
  const mediaRes = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  const mimeType = metadata.mimeType || "image/jpeg";
  const buffer = Buffer.from(mediaRes.data as ArrayBuffer);
  return {
    dataUri: `data:${mimeType};base64,${buffer.toString("base64")}`,
    mimeType,
    name: metadata.name || fileId,
  };
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient();
  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  });
}
