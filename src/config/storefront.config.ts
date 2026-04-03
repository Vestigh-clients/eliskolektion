import { storeConfig, type StoreConfig } from "./store.config.ts";
import type { PublicSiteSettings } from "@/services/publicSiteSettingsService";
import { resolveActiveThemePreset, type ThemePresetKey } from "@/themes/registry";

export interface ResolvedStorefrontConfig extends StoreConfig {
  themePresetKey: ThemePresetKey;
}

export const resolveStorefrontConfig = (publicSettings?: PublicSiteSettings | null): ResolvedStorefrontConfig => {
  const activeTheme = resolveActiveThemePreset(publicSettings?.siteThemePreset, storeConfig.defaultThemePreset);

  return {
    ...storeConfig,
    storeName: publicSettings?.siteName?.trim() || storeConfig.storeName,
    storeTagline: publicSettings?.siteTagline?.trim() || storeConfig.storeTagline,
    contact: {
      ...storeConfig.contact,
      email: publicSettings?.supportEmail?.trim() || storeConfig.contact.email,
      phone: publicSettings?.supportPhone?.trim() || storeConfig.contact.phone,
      whatsapp: publicSettings?.whatsappNumber?.trim() || storeConfig.contact.whatsapp,
    },
    themePresetKey: activeTheme.key,
  };
};
