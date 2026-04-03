import type { ThemePresetKey } from "./registry.ts";

const loadedThemePresetFonts = new Set<ThemePresetKey>();

const fontLoaders: Record<ThemePresetKey, () => Promise<unknown>> = {
  atelier: () => import("./atelier/fonts.css"),
  sandstone: () => import("./sandstone/fonts.css"),
};

export const ensureThemePresetFonts = async (presetKey: ThemePresetKey): Promise<void> => {
  if (loadedThemePresetFonts.has(presetKey)) {
    return;
  }

  await fontLoaders[presetKey]();
  loadedThemePresetFonts.add(presetKey);
};
