import { supabase } from "@/integrations/supabase/client";

export interface PaymentSettings {
  id: string;
  cash_on_delivery_enabled: boolean;
  online_payment_enabled: boolean;
  updated_at: string;
}

interface GetPaymentSettingsOptions {
  seedIfMissing?: boolean;
}

const PAYMENT_SETTINGS_DEFAULTS = {
  cash_on_delivery_enabled: false,
  online_payment_enabled: true,
} as const;

const buildFallbackPaymentSettings = (): PaymentSettings => ({
  id: "local-default",
  cash_on_delivery_enabled: PAYMENT_SETTINGS_DEFAULTS.cash_on_delivery_enabled,
  online_payment_enabled: PAYMENT_SETTINGS_DEFAULTS.online_payment_enabled,
  updated_at: new Date(0).toISOString(),
});

export async function getPaymentSettings(options: GetPaymentSettingsOptions = {}): Promise<PaymentSettings> {
  const shouldSeedIfMissing = options.seedIfMissing === true;

  const { data, error } = await supabase
    .from("payment_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // For storefront usage (including guest checkout), avoid insert attempts
  // and return sane defaults when no row exists yet.
  if (!data) {
    if (!shouldSeedIfMissing) {
      return buildFallbackPaymentSettings();
    }

    const { data: newData, error: insertError } = await supabase
      .from("payment_settings")
      .insert({
        cash_on_delivery_enabled: PAYMENT_SETTINGS_DEFAULTS.cash_on_delivery_enabled,
        online_payment_enabled: PAYMENT_SETTINGS_DEFAULTS.online_payment_enabled,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }
    return newData as PaymentSettings;
  }

  return data as PaymentSettings;
}

export async function updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<void> {
  // Fetch the singleton ID first to ensure we update the correct row.
  const { data: existing, error: selectError } = await supabase
    .from("payment_settings")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  const hasOnlineToggle = typeof settings.online_payment_enabled === "boolean";
  const hasCashToggle = typeof settings.cash_on_delivery_enabled === "boolean";

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (hasOnlineToggle) {
    payload.online_payment_enabled = settings.online_payment_enabled;
  }

  if (hasCashToggle) {
    payload.cash_on_delivery_enabled = settings.cash_on_delivery_enabled;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("payment_settings").insert({
      cash_on_delivery_enabled: hasCashToggle
        ? Boolean(settings.cash_on_delivery_enabled)
        : PAYMENT_SETTINGS_DEFAULTS.cash_on_delivery_enabled,
      online_payment_enabled: hasOnlineToggle
        ? Boolean(settings.online_payment_enabled)
        : PAYMENT_SETTINGS_DEFAULTS.online_payment_enabled,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      throw insertError;
    }

    return;
  }

  const { error } = await supabase
    .from("payment_settings")
    .update(payload)
    .eq("id", existing.id);

  if (error) {
    throw error;
  }
}
