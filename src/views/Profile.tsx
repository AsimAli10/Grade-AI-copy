import dynamic from "next/dynamic";
import type { ProfileClientProps } from "@/components/Profile/ProfileClient";

const ProfileClient = dynamic<ProfileClientProps>(
  () => import("@/components/Profile/ProfileClient").then((mod) => mod.ProfileClient),
  { ssr: false }
);

type ProfileProps = ProfileClientProps;

const Profile = ({
  initialUser,
  initialProfile,
  initialSubscription,
  initialPlanName,
}: ProfileProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <ProfileClient
        initialUser={initialUser}
        initialProfile={initialProfile}
        initialSubscription={initialSubscription}
        initialPlanName={initialPlanName}
      />
    </div>
  );
};

export default Profile;
