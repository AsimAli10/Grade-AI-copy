import AssignmentDetailClient from "@/components/Assignments/AssignmentDetailClient";

type AssignmentDetailPageProps = {
  assignmentId: string;
};

export default function AssignmentDetailPage({ assignmentId }: AssignmentDetailPageProps) {
  return <AssignmentDetailClient assignmentId={assignmentId} />;
}


