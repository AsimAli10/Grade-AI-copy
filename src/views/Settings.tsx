import dynamic from "next/dynamic";

const SettingsClient = dynamic(
  () => import("@/components/Settings/SettingsClient").then((mod) => mod.SettingsClient),
  { ssr: false }
);

const Settings = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <SettingsClient />
    </div>
  );
};

export default Settings;

