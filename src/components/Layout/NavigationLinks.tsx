"use client";

import Link from "next/link";
import type { Route } from "next";

const navigationLinks: Array<{ href: Route; label: string }> = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How It Works" },
];

type NavigationLinksProps = {
  className?: string;
};

export function NavigationLinks({ className }: NavigationLinksProps) {
  return (
    <nav className={className}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:space-x-8">
        {navigationLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium hover:text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-muted/50"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
