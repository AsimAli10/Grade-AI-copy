import dynamic from "next/dynamic";

const AuthClient = dynamic(
  () => import("@/components/Auth/AuthClient").then((mod) => mod.AuthClient),
  { ssr: false }
);

const Auth = () => {
  return <AuthClient />;
};

export default Auth;