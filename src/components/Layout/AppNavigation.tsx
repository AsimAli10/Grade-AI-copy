'use client';

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FileText,
  Inbox,
  BarChart3,
  FileQuestion,
  MessageSquare,
  Settings,
  GraduationCap,
} from "lucide-react";
import { usePendingSubmissionsCount } from "@/hooks/usePendingSubmissionsCount";

const menuItems = [
  {
    title: "Courses",
    icon: BookOpen,
    url: "/courses",
  },
  {
    title: "Assignments",
    icon: FileText,
    url: "/assignments",
  },
  {
    title: "Submissions",
    icon: Inbox,
    url: "/submissions",
    showBadge: true, // Flag to indicate this item should show dynamic badge
  },
  {
    title: "Analytics",
    icon: BarChart3,
    url: "/analytics",
  },
  {
    title: "Quizzes",
    icon: FileQuestion,
    url: "/quizzes",
  },
  {
    title: "Forums",
    icon: MessageSquare,
    url: "/forums",
  },
  {
    title: "Settings",
    icon: Settings,
    url: "/settings",
  },
];

export function AppNavigation() {
  const pathname = usePathname();
  const { count: pendingSubmissionsCount } = usePendingSubmissionsCount();

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <span className="font-bold text-xl tracking-tight">GradeAI</span>
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url || pathname?.startsWith(item.url + "/");
                // Show badge for submissions if there are pending submissions
                const showBadge = item.showBadge && pendingSubmissionsCount !== null && pendingSubmissionsCount > 0;
                const badgeValue = item.showBadge ? pendingSubmissionsCount : item.badge;
                return (
                  <Link
                    key={item.url}
                    href={item.url as any}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    {showBadge && badgeValue && (
                      <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4 leading-4 whitespace-nowrap">
                        {badgeValue}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="hover:bg-muted/50">
              <Link href="/profile">Profile</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

