import PaymentAccountDetails from "@/components/admin/payments/PaymentAccountDetails";
import PaymentConfigReference from "@/components/admin/payments/PaymentConfigReference";
import PaymentMethodsConfig from "@/components/admin/payments/PaymentMethodsConfig";
import PaymentModeBanner from "@/components/admin/payments/PaymentModeBanner";
import PaymentTransactionSummary from "@/components/admin/payments/PaymentTransactionSummary";

const AdminPaymentsPage = () => {
  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title font-manrope text-[36px]  text-[var(--color-primary)]">Payments</h1>
          <p className="mt-1 font-inter text-[11px] text-[var(--color-muted-soft)]">
            Manage your store&apos;s payment configuration
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <PaymentTransactionSummary />
        <PaymentModeBanner />
        <PaymentAccountDetails />
        <PaymentMethodsConfig />
        {/* <PaymentConfigReference /> */}
      </div>
    </div>
  );
};

export default AdminPaymentsPage;
