import dynamic from "next/dynamic";

const AuthCallbackClient = dynamic(
  () => import("@/components/Auth/AuthCallbackClient").then((mod) => mod.AuthCallbackClient),
  { ssr: false }
);

const AuthCallback = () => {
  return <AuthCallbackClient />;
};

export default AuthCallback;

