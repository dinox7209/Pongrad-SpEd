export interface LineSendResult {
  sent: boolean;
  provider: "messaging-api" | "notify-compat" | "dry-run";
  detail: string;
}

/**
 * ส่งข้อความสรุปรายสัปดาห์ผ่าน LINE Messaging API (หรือ LINE Notify Gateway สำรอง)
 */
export async function sendLineReminder(message: string): Promise<LineSendResult> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const targetId = process.env.LINE_TARGET_ID?.trim();
  const notifyToken = process.env.LINE_NOTIFY_TOKEN?.trim();
  const notifyEndpoint =
    process.env.LINE_NOTIFY_ENDPOINT?.trim() || "https://notify-api.line.me/api/notify";

  if (channelAccessToken) {
    const endpoint = targetId
      ? "https://api.line.me/v2/bot/message/push"
      : "https://api.line.me/v2/bot/message/broadcast";

    const payload = targetId
      ? { to: targetId, messages: [{ type: "text", text: message }] }
      : { messages: [{ type: "text", text: message }] };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`LINE Messaging API error (${res.status}): ${errorText}`);
    }

    return {
      sent: true,
      provider: "messaging-api",
      detail: targetId ? `Push message sent to ${targetId}` : "Broadcast message sent",
    };
  }

  if (notifyToken) {
    const body = new URLSearchParams({ message });
    const res = await fetch(notifyEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notifyToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`LINE Notify endpoint error (${res.status}): ${errorText}`);
    }

    return {
      sent: true,
      provider: "notify-compat",
      detail: "Sent via LINE Notify compatible endpoint",
    };
  }

  return {
    sent: false,
    provider: "dry-run",
    detail: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN จึงแสดงผลแบบ Dry-Run เท่านั้น",
  };
}
