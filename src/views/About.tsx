export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About GradeAI</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-muted-foreground mb-6">
            GradeAI was created to revolutionize how teachers grade assignments and provide feedback to students. 
            We believe that teachers should spend more time teaching and less time on repetitive grading tasks.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-6">
            To empower teachers worldwide to provide better, faster feedback to students through AI-powered grading. 
            We&apos;re committed to making grading more efficient, consistent, and insightful while maintaining the 
            human touch that makes great teaching possible.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">How It Works</h2>
          <p className="text-muted-foreground mb-6">
            GradeAI integrates seamlessly with Google Classroom to automatically sync assignments and submissions. 
            Our advanced AI technology uses configurable rubrics and multiple LLM models to grade student work, 
            providing detailed feedback, evidence highlights, and confidence scores. Teachers can review, edit, 
            and override AI grades, ensuring quality and personalization.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Key Features</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-6">
            <li><strong>Google Classroom Integration:</strong> Seamless sync with your existing Classroom setup</li>
            <li><strong>AI-Powered Grading:</strong> Multiple LLM models (OpenAI, Gemini) for accurate scoring</li>
            <li><strong>Flexible Rubrics:</strong> Create rubrics via form, JSON, or document upload</li>
            <li><strong>Code Execution Sandbox:</strong> Secure environment for programming assignments</li>
            <li><strong>Analytics & Insights:</strong> Track student performance and identify improvement areas</li>
            <li><strong>Teacher Forums:</strong> Collaborate and share best practices with other educators</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">Our Values</h2>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Efficiency:</strong> Save teachers hours every week on grading tasks</li>
            <li><strong>Accuracy:</strong> Consistent, rubric-based grading with confidence scores</li>
            <li><strong>Transparency:</strong> Teachers always have full control and can override AI grades</li>
            <li><strong>Privacy:</strong> Student data is secure and never shared without permission</li>
            <li><strong>Innovation:</strong> Continuously improving our AI models and features</li>
            <li><strong>Support:</strong> Dedicated to helping teachers succeed in their mission to educate</li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">For Teachers, By Teachers</h2>
          <p className="text-muted-foreground mb-6">
            GradeAI is built with input from educators who understand the challenges of modern teaching. 
            We&apos;re not replacing teachers—we&apos;re empowering them to focus on what they do best: 
            teaching, mentoring, and inspiring students.
          </p>
        </div>
      </div>
    </div>
  );
}
