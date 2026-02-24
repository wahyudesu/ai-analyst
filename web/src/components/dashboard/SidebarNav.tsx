"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Activity,
  Shield,
  MessageSquare,
} from "lucide-react";

const navItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Growth & Acquisition",
    href: "/dashboard/growth",
    icon: TrendingUp,
  },
  {
    title: "Revenue & Monetization",
    href: "/dashboard/revenue",
    icon: DollarSign,
  },
  {
    title: "Product Usage",
    href: "/dashboard/usage",
    icon: Activity,
  },
  {
    title: "Reliability & Tech",
    href: "/dashboard/reliability",
    icon: Shield,
  },
    {
      title: "AI Analyst",
      href: "/chat",
      icon: MessageSquare,
      highlight: true,
    },
  ];

interface SidebarNavProps {
  className?: string;
}

export function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                "text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : (item as any).highlight
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
          >
            <Icon className="w-5 h-5" />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
