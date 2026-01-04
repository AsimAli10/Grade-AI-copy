import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import type { BillingClientProps } from "@/components/Billing/BillingClient";

const BillingClient = dynamic<BillingClientProps>(
  () => import("@/components/Billing/BillingClient").then((mod) => mod.BillingClient),
  { ssr: false }
);

type BillingProps = BillingClientProps;

const Billing = ({ initialUser, initialSubscription }: BillingProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <BillingClient initialUser={initialUser} initialSubscription={initialSubscription} />
      <Footer />
    </div>
  );
};

export default Billing;

