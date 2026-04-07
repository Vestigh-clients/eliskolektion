import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import AdminAddWithAIPage from "@/pages/admin/AdminAddWithAIPage";

const {
  navigateMock,
  fetchAdminCategoriesMock,
  createAdminProductMock,
  updateAdminProductMock,
  uploadProductImageMock,
  invokeMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  fetchAdminCategoriesMock: vi.fn(),
  createAdminProductMock: vi.fn(),
  updateAdminProductMock: vi.fn(),
  uploadProductImageMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/services/adminService", () => ({
  fetchAdminCategories: fetchAdminCategoriesMock,
  createAdminProduct: createAdminProductMock,
  updateAdminProduct: updateAdminProductMock,
  uploadProductImage: uploadProductImageMock,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

describe("AdminAddWithAIPage", () => {
  beforeAll(() => {
    if (!HTMLElement.prototype.hasPointerCapture) {
      HTMLElement.prototype.hasPointerCapture = () => false;
    }
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {};
    }
    if (!HTMLElement.prototype.releasePointerCapture) {
      HTMLElement.prototype.releasePointerCapture = () => {};
    }
  });

  beforeEach(() => {
    navigateMock.mockReset();
    fetchAdminCategoriesMock.mockReset();
    createAdminProductMock.mockReset();
    updateAdminProductMock.mockReset();
    uploadProductImageMock.mockReset();
    invokeMock.mockReset();

    fetchAdminCategoriesMock.mockResolvedValue([
      { id: "cat-1", name: "Women", slug: "women" },
    ]);
  });

  it("validates category and prompt before submit", async () => {
    render(
      <MemoryRouter>
        <AdminAddWithAIPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchAdminCategoriesMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Draft with AI" }));
    expect(screen.getByText("Select a category before creating with AI.")).toBeInTheDocument();

    const categoryTrigger = screen.getByRole("combobox", { name: "Category" });
    fireEvent.keyDown(categoryTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Women" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Draft with AI" }));
    expect(screen.getByText("Enter product notes in the prompt field.")).toBeInTheDocument();
  });

  it("keeps user prompt when AI extraction fails", async () => {
    invokeMock.mockResolvedValue({
      data: { success: false, message: "AI extraction failed. Please try again." },
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminAddWithAIPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchAdminCategoriesMock).toHaveBeenCalledTimes(1);
    });

    const categoryTrigger = screen.getByRole("combobox", { name: "Category" });
    fireEvent.keyDown(categoryTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Women" }));

    const promptField = screen.getByRole("textbox");
    fireEvent.change(promptField, { target: { value: "name=Three set\nprice=180gh" } });

    fireEvent.click(screen.getByRole("button", { name: "Create Draft with AI" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("AI extraction failed. Please try again.")).toBeInTheDocument();
    expect((promptField as HTMLTextAreaElement).value).toBe("name=Three set\nprice=180gh");
  });

  it("applies selected brand as normalized brand tag when creating draft", async () => {
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          core_fields: {
            name: "Retro Jacket",
            price: 180,
            stock_quantity: 12,
            stock_per_variant: null,
            short_description: "Short description",
            full_description: "Full description",
            meta_title: "Retro Jacket",
            meta_description: "Meta description",
            tags: ["brand:adidas", "summer-drop", "Summer-Drop"],
            benefits: [],
            sku_suggestion: "RETRO-01",
          },
          option_types: [],
          variant_preview: [],
          warnings: [],
          confidence_flags: {
            name_explicit: true,
            price_explicit: true,
            colors_explicit: false,
            sizes_explicit: false,
            name_inferred: false,
            price_inferred: false,
          },
        },
      },
      error: null,
    });
    createAdminProductMock.mockResolvedValue({ id: "prod-1" });

    render(
      <MemoryRouter>
        <AdminAddWithAIPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchAdminCategoriesMock).toHaveBeenCalledTimes(1);
    });

    const categoryTrigger = screen.getByRole("combobox", { name: "Category" });
    fireEvent.keyDown(categoryTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Women" }));

    const brandTrigger = screen.getByRole("combobox", { name: "Brand" });
    fireEvent.keyDown(brandTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Nike" }));

    const promptField = screen.getByRole("textbox");
    fireEvent.change(promptField, { target: { value: "Create draft for retro jacket" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Draft with AI" }));

    await waitFor(() => {
      expect(createAdminProductMock).toHaveBeenCalledTimes(1);
    });

    expect(createAdminProductMock.mock.calls[0]?.[0]).toMatchObject({
      name: "Retro Jacket",
      tags: ["brand:nike", "summer-drop"],
    });
    expect(navigateMock).toHaveBeenCalledWith("/admin/products/prod-1/edit", { replace: true });
  });

  it("allows explicit no-brand override to remove AI brand tag", async () => {
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          core_fields: {
            name: "Retro Jacket",
            price: 180,
            stock_quantity: 12,
            stock_per_variant: null,
            short_description: "Short description",
            full_description: "Full description",
            meta_title: "Retro Jacket",
            meta_description: "Meta description",
            tags: ["brand:adidas", "summer-drop"],
            benefits: [],
            sku_suggestion: "RETRO-01",
          },
          option_types: [],
          variant_preview: [],
          warnings: [],
          confidence_flags: {
            name_explicit: true,
            price_explicit: true,
            colors_explicit: false,
            sizes_explicit: false,
            name_inferred: false,
            price_inferred: false,
          },
        },
      },
      error: null,
    });
    createAdminProductMock.mockResolvedValue({ id: "prod-2" });

    render(
      <MemoryRouter>
        <AdminAddWithAIPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(fetchAdminCategoriesMock).toHaveBeenCalledTimes(1);
    });

    const categoryTrigger = screen.getByRole("combobox", { name: "Category" });
    fireEvent.keyDown(categoryTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Women" }));

    const brandTrigger = screen.getByRole("combobox", { name: "Brand" });
    fireEvent.keyDown(brandTrigger, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "No brand" }));

    const promptField = screen.getByRole("textbox");
    fireEvent.change(promptField, { target: { value: "Create draft for retro jacket" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Draft with AI" }));

    await waitFor(() => {
      expect(createAdminProductMock).toHaveBeenCalledTimes(1);
    });

    expect(createAdminProductMock.mock.calls[0]?.[0]).toMatchObject({
      name: "Retro Jacket",
      tags: ["summer-drop"],
    });
    expect(navigateMock).toHaveBeenCalledWith("/admin/products/prod-2/edit", { replace: true });
  });
});
