import type { ReactNode } from "react";
import TopBar from "@/components/Layout/TopBar";
import { HeaderServer } from "@/components/Layout/HeaderServer";
import Footer from "@/components/Layout/Footer";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background dark:bg-[#000000] transition-colors duration-300">
      {/* <TopBar /> */}
      <HeaderServer />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}

