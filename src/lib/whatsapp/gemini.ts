export type ParsedFinanceMessage = {
  intent: "transaction" | "confirmation" | "cancellation" | "unknown";
  type: "income" | "expense" | null;
  amount: number | null;
  category: string | null;
  note: string | null;
  occurred_on: string | null;
  confidence: number;
  needs_confirmation: boolean;
  reason: string | null;
};

type MediaInput = {
  mimeType: string;
  base64: string;
};

const defaultParsed: ParsedFinanceMessage = {
  intent: "unknown",
  type: null,
  amount: null,
  category: null,
  note: null,
  occurred_on: null,
  confidence: 0,
  needs_confirmation: true,
  reason: "No se pudo interpretar el mensaje.",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? "";
}

export async function parseFinanceMessageWithGemini({
  text,
  media,
}: {
  text: string;
  media?: MediaInput;
}): Promise<ParsedFinanceMessage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ...defaultParsed,
      reason: "Falta GEMINI_API_KEY.",
    };
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt = [
    "Eres un parser financiero para Colombia. Extrae una transaccion desde un mensaje de WhatsApp.",
    "Puede venir texto, audio transcrito por el modelo o una imagen de recibo/factura.",
    "Devuelve SOLO JSON valido con esta forma exacta:",
    '{"intent":"transaction|confirmation|cancellation|unknown","type":"income|expense|null","amount":number|null,"category":string|null,"note":string|null,"occurred_on":"YYYY-MM-DD|null","confidence":number,"needs_confirmation":boolean,"reason":string|null}',
    "Reglas:",
    "- Usa COP por defecto.",
    "- Si dice gasto, pague, compre, me cobraron, salida: type expense.",
    "- Si dice ingreso, me pagaron, salario, transferencia recibida: type income.",
    "- amount debe ser numero sin separadores.",
    `- Si no hay fecha, usa ${todayIso()}.`,
    "- confirmation aplica para respuestas como si, listo, confirma, guardalo.",
    "- cancellation aplica para no, cancelar, descarta.",
    "- confidence va de 0 a 1. Marca needs_confirmation true si falta monto, tipo, fecha dudosa o cuenta/categoria dudosa.",
    `Mensaje: ${text || "(sin texto adicional)"}`,
  ].join("\n");

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (media) {
    parts.push({
      inlineData: {
        mimeType: media.mimeType,
        data: media.base64,
      },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!res.ok) {
    return {
      ...defaultParsed,
      reason: `Gemini respondio ${res.status}.`,
    };
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    const parsed = JSON.parse(extractJson(answer)) as ParsedFinanceMessage;
    return {
      ...defaultParsed,
      ...parsed,
      amount:
        typeof parsed.amount === "number" && Number.isFinite(parsed.amount)
          ? parsed.amount
          : null,
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
      needs_confirmation: Boolean(parsed.needs_confirmation),
    };
  } catch {
    return defaultParsed;
  }
}
