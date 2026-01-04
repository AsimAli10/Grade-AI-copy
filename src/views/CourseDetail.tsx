import CourseDetailClient from "@/components/Courses/CourseDetailClient";

type CourseDetailPageProps = {
  courseId: string;
};

export default function CourseDetailPage({ courseId }: CourseDetailPageProps) {
  return <CourseDetailClient courseId={courseId} />;
}


