import SubmissionReviewClient from "@/components/Submissions/SubmissionReviewClient";

type SubmissionReviewPageProps = {
  submissionId: string;
};

export default function SubmissionReviewPage({ submissionId }: SubmissionReviewPageProps) {
  return <SubmissionReviewClient submissionId={submissionId} />;
}


