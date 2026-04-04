import { describe, expect, it } from "vitest";
import {
  buildVariantPreview,
  extractDeterministicDraftInput,
  mergeDeterministicWithEnrichment,
  parseSizeValues,
  type AiDraftOptionType,
} from "@/lib/adminProductDraftAI";

describe("extractDeterministicDraftInput", () => {
  it("extracts explicit fields, colors, and strict size ranges", () => {
    const input = `
      incomplete name =[Three set ]
      price =180gh
      Cream
      Yellow
      Violet
      S-L
    `;

    const parsed = extractDeterministicDraftInput(input);
    const colorType = parsed.option_types.find((entry) => entry.name === "Color");
    const sizeType = parsed.option_types.find((entry) => entry.name === "Size");

    expect(parsed.core_fields.name).toBe("Three set");
    expect(parsed.core_fields.price).toBe(180);
    expect(colorType?.values.map((entry) => entry.value)).toEqual(["Cream", "Yellow", "Violet"]);
    expect(sizeType?.values.map((entry) => entry.value)).toEqual(["S", "M", "L"]);
    expect(parsed.confidence_flags.name_explicit).toBe(true);
    expect(parsed.confidence_flags.price_explicit).toBe(true);
    expect(parsed.confidence_flags.colors_explicit).toBe(true);
    expect(parsed.confidence_flags.sizes_explicit).toBe(true);
  });

  it("parses Ghana price formats with whitespace", () => {
    const input = `
      name: Casual Shirt
      price: 180 gh
    `;

    const parsed = extractDeterministicDraftInput(input);
    expect(parsed.core_fields.price).toBe(180);
  });
});

describe("parseSizeValues", () => {
  it("expands strict standard ranges", () => {
    const parsed = parseSizeValues("XS-XL", true);
    expect(parsed.values).toEqual(["XS", "S", "M", "L", "XL"]);
    expect(parsed.warnings).toEqual([]);
  });

  it("keeps non-standard ranges and returns warnings", () => {
    const parsed = parseSizeValues("AA-CC", true);
    expect(parsed.values).toEqual(["AA-CC"]);
    expect(parsed.warnings[0]).toContain("Could not expand");
  });
});

describe("buildVariantPreview", () => {
  it("generates full matrix combinations", () => {
    const optionTypes: AiDraftOptionType[] = [
      {
        name: "Color",
        values: [
          { value: "Cream", color_hex: "#FFF3E0" },
          { value: "Yellow", color_hex: "#FBC02D" },
        ],
      },
      {
        name: "Size",
        values: [
          { value: "S", color_hex: null },
          { value: "M", color_hex: null },
          { value: "L", color_hex: null },
        ],
      },
    ];

    const preview = buildVariantPreview(optionTypes);
    expect(preview).toHaveLength(6);
    expect(preview[0]?.label).toBe("Cream / S");
    expect(preview[5]?.label).toBe("Yellow / L");
  });
});

describe("mergeDeterministicWithEnrichment", () => {
  it("prefers AI-improved name while keeping explicit price", () => {
    const deterministic = extractDeterministicDraftInput(`
      name=Three Set
      price=180gh
      color=cream
      size=S-L
    `);

    const merged = mergeDeterministicWithEnrichment(deterministic, {
      name: "AI Different Name",
      price: 999,
      short_description: "AI short description",
      full_description: "AI full description",
      tags: ["set", "women"],
    });

    expect(merged.core_fields.name).toBe("AI Different Name");
    expect(merged.core_fields.price).toBe(180);
    expect(merged.core_fields.short_description).toBe("AI short description");
    expect(merged.core_fields.full_description).toBe("AI full description");
    expect(merged.warnings.some((entry) => entry.includes("improved by AI"))).toBe(true);
    expect(merged.confidence_flags.name_inferred).toBe(false);
    expect(merged.confidence_flags.price_inferred).toBe(false);
  });

  it("uses inferred values when explicit fields are missing", () => {
    const deterministic = extractDeterministicDraftInput(`
      Cream
      S-L
    `);

    const merged = mergeDeterministicWithEnrichment(deterministic, {
      name: "Inferred Product",
      price: 220,
    });

    expect(merged.core_fields.name).toBe("Inferred Product");
    expect(merged.core_fields.price).toBe(220);
    expect(merged.confidence_flags.name_inferred).toBe(true);
    expect(merged.confidence_flags.price_inferred).toBe(true);
    expect(merged.warnings.some((entry) => entry.includes("inferred by AI"))).toBe(true);
  });
});
