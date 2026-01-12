import QuizDetailClient from "@/components/Quizzes/QuizDetailClient";

type QuizDetailPageProps = {
  quizId: string;
};

export default function QuizDetailPage({ quizId }: QuizDetailPageProps) {
  return <QuizDetailClient quizId={quizId} />;
}

