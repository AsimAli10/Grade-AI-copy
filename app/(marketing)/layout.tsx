import type { ReactNode } from "react";
import TopBar from "@/components/Layout/TopBar";
import { HeaderServer } from "@/components/Layout/HeaderServer";
import Footer from "@/components/Layout/Footer";

type MarketingLayoutProps = {
  children: ReactNode;
};

export default async function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* <TopBar /> */}
      <HeaderServer />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}


