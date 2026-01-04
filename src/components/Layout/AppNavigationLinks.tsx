"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Inbox,
  BarChart3,
  FileQuestion,
  MessageSquare,
} from "lucide-react";

const appMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/dashboard",
  },
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
    badge: "3",
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
];

type AppNavigationLinksProps = {
  className?: string;
};

export function AppNavigationLinks({ className }: AppNavigationLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
        {appMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.url || pathname?.startsWith(item.url + "/");
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
              {item.badge && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4 leading-4 whitespace-nowrap">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

