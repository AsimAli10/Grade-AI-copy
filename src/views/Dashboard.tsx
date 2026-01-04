import dynamic from "next/dynamic";
import type { DashboardClientProps } from "@/components/Dashboard/DashboardClient";

const DashboardClient = dynamic<DashboardClientProps>(
  () => import("@/components/Dashboard/DashboardClient").then((mod) => mod.DashboardClient),
  { ssr: false }
);

type DashboardProps = DashboardClientProps;

const Dashboard = ({ initialUser, initialSubscription, initialFullName }: DashboardProps) => {
  return (
    <DashboardClient
      initialUser={initialUser}
      initialSubscription={initialSubscription}
      initialFullName={initialFullName}
    />
  );
};

export default Dashboard;
