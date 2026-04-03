import type { ThemePresetKey } from "./registry.ts";
import { resolveActiveThemePreset } from "./registry.ts";
import { buildFontStack } from "./utils.ts";

interface EmailBrandIdentity {
  storeName: string;
  supportEmail: string;
  siteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  unsubscribeUrl: string;
}

export interface EmailBrandSnapshot {
  presetKey: ThemePresetKey;
  identity: EmailBrandIdentity;
  colors: {
    canvas: string;
    surface: string;
    border: string;
    textPrimary: string;
    textMuted: string;
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
  };
  typography: {
    heading: string;
    body: string;
  };
}

export const getEmailBrandSnapshot = ({
  requestedPresetKey,
  fallbackPresetKey,
  identity,
}: {
  requestedPresetKey: string | null | undefined;
  fallbackPresetKey: ThemePresetKey;
  identity: EmailBrandIdentity;
}): EmailBrandSnapshot => {
  const { key, preset } = resolveActiveThemePreset(requestedPresetKey, fallbackPresetKey);

  return {
    presetKey: key,
    identity,
    colors: {
      canvas: preset.tokens.canvas,
      surface: preset.tokens.surface,
      border: preset.tokens.border,
      textPrimary: preset.tokens.textPrimary,
      textMuted: preset.tokens.textMuted,
      primary: preset.tokens.primary,
      primaryForeground: preset.tokens.primaryForeground,
      accent: preset.tokens.accent,
      accentForeground: preset.tokens.accentForeground,
    },
    typography: {
      heading: buildFontStack(preset.typography.headingFamily, preset.typography.headingFallback),
      body: buildFontStack(preset.typography.bodyFamily, preset.typography.bodyFallback),
    },
  };
};
