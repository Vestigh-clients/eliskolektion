import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createAccountAddress,
  deleteAccountAddress,
  fetchAccountAddresses,
  setAccountDefaultAddress,
  updateAccountAddress,
  type AccountAddress,
  type AccountAddressInput,
} from "@/services/accountService";
import { AccountInputField, AccountTextareaField } from "@/components/account/AccountFields";
import { GHANAIAN_PHONE_HELPER_TEXT, getGhanaianPhoneError } from "@/lib/phoneValidation";

type AddressFormField =
  | "label"
  | "recipientName"
  | "recipientPhone"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "country"
  | "postalCode"
  | "deliveryInstructions";

interface AddressFormValues {
  label: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  deliveryInstructions: string;
}

const DEFAULT_FORM_VALUES: AddressFormValues = {
  label: "Home",
  recipientName: "",
  recipientPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "Ghana",
  postalCode: "",
  deliveryInstructions: "",
};

const sanitizeInput = (value: string): string => value.replace(/\s+/g, " ").trim();

const toNullable = (value: string): string | null => {
  const normalized = sanitizeInput(value);
  return normalized ? normalized : null;
};

const validateAddressForm = (values: AddressFormValues): Partial<Record<AddressFormField, string>> => {
  const errors: Partial<Record<AddressFormField, string>> = {};

  if (!sanitizeInput(values.label)) {
    errors.label = "Label is required";
  }

  if (!sanitizeInput(values.recipientName)) {
    errors.recipientName = "Recipient name is required";
  }

  if (!sanitizeInput(values.addressLine1)) {
    errors.addressLine1 = "Address line 1 is required";
  }

  if (!sanitizeInput(values.city)) {
    errors.city = "City is required";
  }

  if (!sanitizeInput(values.state)) {
    errors.state = "State is required";
  }

  if (!sanitizeInput(values.country)) {
    errors.country = "Country is required";
  }

  const phoneError = getGhanaianPhoneError(values.recipientPhone);
  if (phoneError) {
    errors.recipientPhone = phoneError;
  }

  return errors;
};

const toAddressInput = (values: AddressFormValues): AccountAddressInput => ({
  label: toNullable(values.label),
  recipient_name: sanitizeInput(values.recipientName),
  recipient_phone: toNullable(values.recipientPhone),
  address_line1: sanitizeInput(values.addressLine1),
  address_line2: toNullable(values.addressLine2),
  city: sanitizeInput(values.city),
  state: sanitizeInput(values.state),
  country: sanitizeInput(values.country),
  postal_code: toNullable(values.postalCode),
  delivery_instructions: toNullable(values.deliveryInstructions),
});

const toFormValues = (address: AccountAddress): AddressFormValues => ({
  label: address.label || "Other",
  recipientName: address.recipient_name || "",
  recipientPhone: address.recipient_phone || "",
  addressLine1: address.address_line1 || "",
  addressLine2: address.address_line2 || "",
  city: address.city || "",
  state: address.state || "",
  country: address.country || "Ghana",
  postalCode: address.postal_code || "",
  deliveryInstructions: address.delivery_instructions || "",
});

const getAddressLines = (address: AccountAddress): string[] => {
  const lines = [
    address.address_line1,
    address.address_line2 || null,
    [address.city, address.state].filter(Boolean).join(", "),
    [address.country, address.postal_code].filter(Boolean).join(" "),
  ];

  return lines.filter(Boolean) as string[];
};

const AccountAddresses = () => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AddressFormValues>(DEFAULT_FORM_VALUES);
  const [formTouched, setFormTouched] = useState<Record<AddressFormField, boolean>>({
    label: false,
    recipientName: false,
    recipientPhone: false,
    addressLine1: false,
    addressLine2: false,
    city: false,
    state: false,
    country: false,
    postalCode: false,
    deliveryInstructions: false,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<AddressFormField, string>>>({});
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    if (!user?.id) {
      setAddresses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const nextAddresses = await fetchAccountAddresses(user.id);
      setAddresses(nextAddresses);
    } catch {
      setAddresses([]);
      setLoadError("We couldn't load your saved addresses.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const resetFormState = () => {
    setFormTouched({
      label: false,
      recipientName: false,
      recipientPhone: false,
      addressLine1: false,
      addressLine2: false,
      city: false,
      state: false,
      country: false,
      postalCode: false,
      deliveryInstructions: false,
    });
    setFormErrors({});
    setFormErrorMessage(null);
  };

  const openAddForm = () => {
    setFormMode("add");
    setEditingAddressId(null);
    setFormValues(DEFAULT_FORM_VALUES);
    resetFormState();
    setDeleteConfirmId(null);
  };

  const openEditForm = (address: AccountAddress) => {
    setFormMode("edit");
    setEditingAddressId(address.id);
    setFormValues(toFormValues(address));
    resetFormState();
    setDeleteConfirmId(null);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }

    setFormMode(null);
    setEditingAddressId(null);
    setFormValues(DEFAULT_FORM_VALUES);
    resetFormState();
  };

  const markTouched = (field: AddressFormField) => {
    setFormTouched((previous) => ({
      ...previous,
      [field]: true,
    }));

    const nextErrors = validateAddressForm(formValues);
    setFormErrors(nextErrors);
  };

  const handleSaveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.id) {
      return;
    }

    const nextTouched: Record<AddressFormField, boolean> = {
      label: true,
      recipientName: true,
      recipientPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      deliveryInstructions: true,
    };

    const nextErrors = validateAddressForm(formValues);
    setFormTouched(nextTouched);
    setFormErrors(nextErrors);
    setFormErrorMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = toAddressInput(formValues);

    setIsSaving(true);

    try {
      if (formMode === "edit" && editingAddressId) {
        await updateAccountAddress(user.id, editingAddressId, payload);
      } else {
        await createAccountAddress(user.id, payload, {
          isDefault: addresses.length === 0,
        });
      }

      await loadAddresses();
      closeForm();
    } catch {
      setFormErrorMessage("We couldn't save this address. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) {
      return;
    }

    setBusyAddressId(addressId);

    try {
      await deleteAccountAddress(user.id, addressId);
      setDeleteConfirmId(null);
      await loadAddresses();
    } catch {
      setLoadError("We couldn't delete this address right now.");
    } finally {
      setBusyAddressId(null);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    if (!user?.id) {
      return;
    }

    setBusyAddressId(addressId);

    try {
      await setAccountDefaultAddress(user.id, addressId);
      await loadAddresses();
    } catch {
      setLoadError("We couldn't update your default address.");
    } finally {
      setBusyAddressId(null);
    }
  };

  const hasAddresses = useMemo(() => addresses.length > 0, [addresses.length]);

  return (
    <div>
      <h1 className="font-display text-lg font-bold tracking-tight uppercase text-zinc-900">Saved Addresses</h1>

      {loadError ? <p className="mt-5 font-inter text-[11px] text-red-600">{loadError}</p> : null}

      {isLoading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="lux-order-pulse h-[180px] w-full" />
          <div className="lux-order-pulse h-[180px] w-full" />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <article
              key={address.id}
              className={`flex flex-col justify-between border p-4 transition-colors duration-200 ${
                address.is_default ? "border-zinc-900" : "border-zinc-100 hover:border-zinc-900"
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex border border-zinc-200 px-[10px] py-[3px] font-inter text-[9px] uppercase tracking-[0.1em] text-zinc-500">
                    {(address.label || "Other").toUpperCase()}
                  </span>

                  {address.is_default ? (
                    <span className="inline-flex border border-[#E8A811] px-[10px] py-[3px] font-inter text-[9px] uppercase tracking-[0.1em] text-[#E8A811]">
                      Default
                    </span>
                  ) : null}
                </div>

                <p className="mt-5 font-inter text-[13px] font-medium text-zinc-900">{address.recipient_name}</p>
                {address.recipient_phone ? (
                  <p className="mt-1 font-inter text-[12px] text-zinc-500">{address.recipient_phone}</p>
                ) : null}

                <div className="mt-2 space-y-[2px] font-inter text-[12px] leading-[1.8] text-zinc-500">
                  {getAddressLines(address).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div className="mt-4 min-h-[28px]">
                {deleteConfirmId === address.id ? (
                  <div>
                    <p className="font-inter text-[11px] text-red-600">Are you sure? This cannot be undone.</p>
                    <div className="mt-2 flex items-center gap-3 font-inter text-[10px] uppercase tracking-[0.12em]">
                      <button
                        type="button"
                        onClick={() => void handleDeleteAddress(address.id)}
                        disabled={busyAddressId === address.id}
                        className="text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Yes, delete
                      </button>
                      <span className="text-zinc-200">&middot;</span>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-zinc-400 transition-colors hover:text-zinc-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 font-inter text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                    <button
                      type="button"
                      onClick={() => openEditForm(address)}
                      className="transition-colors hover:text-zinc-900"
                    >
                      Edit
                    </button>

                    <span className="text-zinc-200">&middot;</span>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(address.id)}
                      className="transition-colors hover:text-red-600"
                    >
                      Delete
                    </button>

                    {!address.is_default ? (
                      <>
                        <span className="text-zinc-200">&middot;</span>
                        <button
                          type="button"
                          onClick={() => void handleSetDefault(address.id)}
                          disabled={busyAddressId === address.id}
                          className="transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Set as Default
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </article>
          ))}

          <button
            type="button"
            onClick={openAddForm}
            className="group flex min-h-[120px] flex-col items-center justify-center gap-3 border border-dashed border-zinc-200 p-4 transition-colors duration-200 hover:border-zinc-900"
          >
            <Plus className="h-6 w-6 text-zinc-300 transition-colors group-hover:text-zinc-900" strokeWidth={1.2} />
            <p className="font-inter text-[11px] uppercase tracking-[0.12em] text-zinc-400 transition-colors group-hover:text-zinc-900">
              Add New Address
            </p>
          </button>
        </div>
      )}

      {!hasAddresses && !isLoading ? (
        <p className="mt-5 font-inter text-[12px] text-zinc-400">You don't have any saved addresses yet.</p>
      ) : null}

      <div
        className={`overflow-hidden transition-all duration-300 ${
          formMode ? "mt-8 max-h-[2200px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border border-zinc-100 p-4 sm:p-5">
          <h2 className="font-display text-sm font-bold tracking-tight uppercase text-zinc-900">
            {formMode === "edit" ? "Edit Address" : "Add New Address"}
          </h2>

          <form onSubmit={handleSaveAddress} className="mt-4">
            <div className="grid gap-x-6 md:grid-cols-2">
              <AccountInputField
                id="address-label"
                label="Label"
                required
                value={formValues.label}
                touched={formTouched.label}
                error={formErrors.label}
                onChange={(value) => setFormValues((previous) => ({ ...previous, label: value }))}
                onBlur={() => markTouched("label")}
              />

              <AccountInputField
                id="address-recipient-name"
                label="Recipient Name"
                required
                value={formValues.recipientName}
                touched={formTouched.recipientName}
                error={formErrors.recipientName}
                onChange={(value) => setFormValues((previous) => ({ ...previous, recipientName: value }))}
                onBlur={() => markTouched("recipientName")}
              />

              <AccountInputField
                id="address-recipient-phone"
                label="Recipient Phone"
                type="tel"
                autoComplete="tel"
                helperText={GHANAIAN_PHONE_HELPER_TEXT}
                value={formValues.recipientPhone}
                touched={formTouched.recipientPhone}
                error={formErrors.recipientPhone}
                onChange={(value) => setFormValues((previous) => ({ ...previous, recipientPhone: value }))}
                onBlur={() => markTouched("recipientPhone")}
              />

              <AccountInputField
                id="address-line-1"
                label="Address Line 1"
                required
                value={formValues.addressLine1}
                touched={formTouched.addressLine1}
                error={formErrors.addressLine1}
                onChange={(value) => setFormValues((previous) => ({ ...previous, addressLine1: value }))}
                onBlur={() => markTouched("addressLine1")}
              />

              <AccountInputField
                id="address-line-2"
                label="Address Line 2"
                value={formValues.addressLine2}
                touched={formTouched.addressLine2}
                error={formErrors.addressLine2}
                onChange={(value) => setFormValues((previous) => ({ ...previous, addressLine2: value }))}
                onBlur={() => markTouched("addressLine2")}
              />

              <AccountInputField
                id="address-city"
                label="City"
                required
                value={formValues.city}
                touched={formTouched.city}
                error={formErrors.city}
                onChange={(value) => setFormValues((previous) => ({ ...previous, city: value }))}
                onBlur={() => markTouched("city")}
              />

              <AccountInputField
                id="address-state"
                label="State"
                required
                value={formValues.state}
                touched={formTouched.state}
                error={formErrors.state}
                onChange={(value) => setFormValues((previous) => ({ ...previous, state: value }))}
                onBlur={() => markTouched("state")}
              />

              <AccountInputField
                id="address-country"
                label="Country"
                required
                value={formValues.country}
                touched={formTouched.country}
                error={formErrors.country}
                onChange={(value) => setFormValues((previous) => ({ ...previous, country: value }))}
                onBlur={() => markTouched("country")}
              />

              <AccountInputField
                id="address-postal-code"
                label="Postal Code"
                value={formValues.postalCode}
                touched={formTouched.postalCode}
                error={formErrors.postalCode}
                onChange={(value) => setFormValues((previous) => ({ ...previous, postalCode: value }))}
                onBlur={() => markTouched("postalCode")}
              />
            </div>

            <AccountTextareaField
              id="address-delivery-instructions"
              label="Delivery Instructions"
              value={formValues.deliveryInstructions}
              rows={4}
              maxLength={240}
              touched={formTouched.deliveryInstructions}
              error={formErrors.deliveryInstructions}
              onChange={(value) => setFormValues((previous) => ({ ...previous, deliveryInstructions: value }))}
              onBlur={() => markTouched("deliveryInstructions")}
            />

            {formErrorMessage ? <p className="mt-4 font-inter text-[11px] text-red-600">{formErrorMessage}</p> : null}

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#E8A811] text-black px-8 py-3 font-display font-black text-[11px] uppercase tracking-widest transition-colors hover:bg-zinc-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isSaving ? "Saving..." : "Save Address"}
              </button>

              <button
                type="button"
                onClick={closeForm}
                className="font-inter text-[11px] uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:text-zinc-900"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountAddresses;


