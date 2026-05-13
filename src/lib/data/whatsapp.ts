import { createClient } from "@/lib/supabase/server";

export type WhatsappFinanceLink = {
  phone_number: string;
  default_account_id: string | null;
  active: boolean;
};

export async function getWhatsappFinanceLink(): Promise<WhatsappFinanceLink | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("whatsapp_user_links")
    .select("phone_number, default_account_id, active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;

  return {
    phone_number: data.phone_number as string,
    default_account_id: (data.default_account_id as string | null) ?? null,
    active: Boolean(data.active),
  };
}
