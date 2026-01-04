import dynamic from "next/dynamic";
import TopBar from "@/components/Layout/TopBar";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";

const CheckoutSuccessClient = dynamic(
  () => import("@/components/Checkout/CheckoutSuccessClient").then((mod) => mod.CheckoutSuccessClient),
  { ssr: false }
);

const CheckoutSuccess = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <CheckoutSuccessClient />
      <Footer />
    </div>
  );
};

export default CheckoutSuccess;
