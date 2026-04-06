import { describe, expect, it } from "vitest";
import { getEmailBrandSnapshot } from "@/themes/emailBrand";

describe("getEmailBrandSnapshot", () => {
  it("derives email branding from the requested preset and identity", () => {
    const snapshot = getEmailBrandSnapshot({
      requestedPresetKey: "sandstone",
      fallbackPresetKey: "atelier",
      identity: {
        storeName: "Eli's Kolektion",
        supportEmail: "hello@store.com",
        siteUrl: "https://eliskolektion.vestigh.com",
        instagramUrl: "https://instagram.com/example",
        tiktokUrl: "https://tiktok.com/@example",
        facebookUrl: "https://facebook.com/example",
        unsubscribeUrl: "https://eliskolektion.vestigh.com/unsubscribe",
      },
    });

    expect(snapshot.presetKey).toBe("sandstone");
    expect(snapshot.identity.storeName).toBe("Eli's Kolektion");
    expect(snapshot.colors.primary).toBe("#3B2A1F");
    expect(snapshot.typography.heading).toContain("Fraunces");
  });
});
