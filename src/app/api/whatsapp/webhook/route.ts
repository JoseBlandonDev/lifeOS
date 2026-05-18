import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  downloadWhatsappMedia,
  normalizeWhatsappPhone,
  sendWhatsappText,
  verifyWhatsappSignature,
} from "@/lib/whatsapp/cloud-api";
import { parseFinanceMessageWithGemini, type ParsedFinanceMessage } from "@/lib/whatsapp/gemini";
import {
  canAutoSave,
  canSaveAfterConfirmation,
  saveFinanceTransactionFromWhatsapp,
} from "@/lib/whatsapp/finance";

export const runtime = "nodejs";

type WhatsappMessage = {
  id: string;
  from: string;
  type: "text" | "audio" | "image" | string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
};

type WhatsappPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsappMessage[];
      };
    }>;
  }>;
};

function confirmationText(parsed: ParsedFinanceMessage) {
  const kind = parsed.type === "income" ? "ingreso" : "gasto";
  const amount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(parsed.amount ?? 0);

  return [
    `Creo que es un ${kind} por ${amount}.`,
    parsed.category ? `Categoria: ${parsed.category}.` : null,
    parsed.note ? `Nota: ${parsed.note}.` : null,
    "Responde SI para guardarlo o NO para descartarlo.",
  ]
    .filter(Boolean)
    .join("\n");
}

function maskPhone(phone: string) {
  if (phone.length <= 6) return "***";
  return `${phone.slice(0, 4)}***${phone.slice(-2)}`;
}

async function handleConfirmation({
  supabase,
  from,
  parsed,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  from: string;
  parsed: ParsedFinanceMessage;
}) {
  const { data: link } = await supabase
    .from("whatsapp_user_links")
    .select("user_id, default_account_id")
    .eq("phone_number", from)
    .eq("active", true)
    .single();

  if (!link) return false;

  const { data: pending } = await supabase
    .from("whatsapp_finance_events")
    .select("id, parsed")
    .eq("user_id", link.user_id as string)
    .eq("from_phone", from)
    .eq("status", "pending_confirmation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) {
    await sendWhatsappText(from, "No tengo ningún movimiento pendiente por confirmar.");
    return true;
  }

  if (parsed.intent === "cancellation") {
    await supabase
      .from("whatsapp_finance_events")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", pending.id);
    await sendWhatsappText(from, "Listo, descarté ese movimiento.");
    return true;
  }

  if (parsed.intent !== "confirmation") return false;

  if (!link.default_account_id) {
    await sendWhatsappText(from, "Te falta configurar una cuenta por defecto en la app.");
    return true;
  }

  const saved = await saveFinanceTransactionFromWhatsapp({
    supabase,
    userId: link.user_id as string,
    accountId: link.default_account_id as string,
    parsed: pending.parsed as ParsedFinanceMessage,
  });

  if (!saved.ok) {
    await supabase
      .from("whatsapp_finance_events")
      .update({
        status: "failed",
        error: saved.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pending.id);
    await sendWhatsappText(from, `No pude guardarlo: ${saved.message}`);
    return true;
  }

  await supabase
    .from("whatsapp_finance_events")
    .update({
      status: "saved",
      transaction_id: saved.transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pending.id);
  await sendWhatsappText(from, "Guardado. Ya quedó registrado en tus finanzas.");
  return true;
}

async function handleMessage(message: WhatsappMessage) {
  const supabase = createAdminClient();
  const from = normalizeWhatsappPhone(message.from);
  console.info("[whatsapp] inbound message", {
    id: message.id,
    type: message.type,
    from: maskPhone(from),
  });
  const rawText =
    message.text?.body ||
    message.image?.caption ||
    (message.type === "audio" ? "Audio recibido" : "");

  const initialParsed = await parseFinanceMessageWithGemini({ text: rawText });
  const wasConfirmation = await handleConfirmation({
    supabase,
    from,
    parsed: initialParsed,
  });
  if (wasConfirmation) return;

  const { data: link } = await supabase
    .from("whatsapp_user_links")
    .select("user_id, default_account_id")
    .eq("phone_number", from)
    .eq("active", true)
    .single();

  if (!link) {
    console.info("[whatsapp] no active link for sender", {
      from: maskPhone(from),
    });
    await sendWhatsappText(
      from,
      "Este número no está vinculado. Entra a Finanzas > Movimientos y configura WhatsApp.",
    );
    return;
  }

  let media:
    | {
        mimeType: string;
        base64: string;
      }
    | undefined;
  const mediaId = message.audio?.id || message.image?.id;
  if (mediaId) {
    media = (await downloadWhatsappMedia(mediaId)) ?? undefined;
  }

  const parsed =
    media != null
      ? await parseFinanceMessageWithGemini({ text: rawText, media })
      : initialParsed;

  console.info("[whatsapp] parsed message", {
    from: maskPhone(from),
    intent: parsed.intent,
    type: parsed.type,
    hasAmount: parsed.amount != null,
    confidence: parsed.confidence,
    needsConfirmation: parsed.needs_confirmation,
  });

  const { data: event } = await supabase
    .from("whatsapp_finance_events")
    .insert({
      user_id: link.user_id,
      whatsapp_message_id: message.id,
      from_phone: from,
      message_type: message.type,
      raw_text: rawText,
      parsed,
      status: "received",
    })
    .select("id")
    .single();

  if (!canSaveAfterConfirmation(parsed)) {
    console.info("[whatsapp] ignored message", {
      eventId: event?.id,
      reason: parsed.reason,
    });
    await supabase
      .from("whatsapp_finance_events")
      .update({
        status: "ignored",
        error: parsed.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event?.id);
    await sendWhatsappText(
      from,
      "No logré entender un gasto o ingreso. Ejemplo: 'gasté 25000 en comida por Nequi'.",
    );
    return;
  }

  if (canAutoSave(parsed) && link.default_account_id) {
    const saved = await saveFinanceTransactionFromWhatsapp({
      supabase,
      userId: link.user_id as string,
      accountId: link.default_account_id as string,
      parsed,
      sourceNote: rawText,
    });

    if (saved.ok) {
      console.info("[whatsapp] saved automatically", {
        eventId: event?.id,
        transactionId: saved.transactionId,
      });
      await supabase
        .from("whatsapp_finance_events")
        .update({
          status: "saved",
          transaction_id: saved.transactionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event?.id);
      await sendWhatsappText(from, "Guardado automáticamente. Quedó registrado.");
      return;
    }
  }

  await supabase
    .from("whatsapp_finance_events")
    .update({
      status: "pending_confirmation",
      updated_at: new Date().toISOString(),
    })
    .eq("id", event?.id);
  await sendWhatsappText(from, confirmationText(parsed));
  console.info("[whatsapp] pending confirmation", { eventId: event?.id });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWhatsappSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    console.warn("[whatsapp] invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsappPayload;
  const messages =
    payload.entry?.flatMap((entry) =>
      entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? [],
    ) ?? [];

  console.info("[whatsapp] webhook received", { messages: messages.length });
  await Promise.all(messages.map((message) => handleMessage(message)));

  return Response.json({ ok: true });
}
