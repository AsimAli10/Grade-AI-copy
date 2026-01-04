import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "./providers";

export const metadata: Metadata = {
  title: "GradeAI | AI-Powered Grading for Google Classroom",
  description: "Automate grading with AI, provide detailed feedback, and save time on assignments and quizzes.",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

