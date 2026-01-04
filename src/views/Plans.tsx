import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import type { PlansClientProps } from "@/components/Plans/PlansClient";

const PlansClient = dynamic<PlansClientProps>(
  () => import("@/components/Plans/PlansClient").then((mod) => mod.PlansClient),
  { ssr: false }
);

type PlansProps = PlansClientProps;

const Plans = ({ initialUser, initialPlans, initialSubscription }: PlansProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <PlansClient
        initialUser={initialUser}
        initialPlans={initialPlans}
        initialSubscription={initialSubscription}
      />
      <Footer />
    </div>
  );
};

export default Plans;
