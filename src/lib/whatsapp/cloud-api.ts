import { createHmac, timingSafeEqual } from "crypto";

type MediaDownload = {
  mimeType: string;
  base64: string;
};

function graphBase() {
  return `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_VERSION || "v21.0"}`;
}

export function normalizeWhatsappPhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function verifyWhatsappSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signature.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export async function sendWhatsappText(to: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return;

  await fetch(`${graphBase()}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    }),
  });
}

export async function downloadWhatsappMedia(mediaId: string): Promise<MediaDownload | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) return null;

  const metaRes = await fetch(`${graphBase()}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) return null;

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) return null;

  const mediaRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!mediaRes.ok) return null;

  const buffer = Buffer.from(await mediaRes.arrayBuffer());
  return {
    mimeType: meta.mime_type || mediaRes.headers.get("content-type") || "application/octet-stream",
    base64: buffer.toString("base64"),
  };
}
