import TopBar from "@/components/Layout/TopBar";
import { HeaderServer } from "@/components/Layout/HeaderServer";
import Footer from "@/components/Layout/Footer";
import Hero from "@/components/Home/Hero";
import Features from "@/components/Home/Features";
import HowItWorks from "@/components/Home/HowItWorks";

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark:bg-[#000000] transition-colors duration-300 overflow-x-hidden">
      {/* <TopBar /> */}
      <HeaderServer />
      <main className="flex flex-col">
        <Hero />
        <Features />
        <HowItWorks />
        <Footer />
      </main>
    </div>
  );
};

export default Index;
