import type { IntegrationsConfig } from "./store.types.ts";

export const integrationsConfig: IntegrationsConfig = {
  styleSyncs: {
    apiKey: import.meta.env.VITE_STYLESYNC_API_KEY ?? import.meta.env.VITE_STYLESYNCS_API_KEY,
    apiUrl: import.meta.env.VITE_STYLESYNC_API_URL ?? import.meta.env.VITE_STYLESYNCS_BASE_URL,
  },
};
