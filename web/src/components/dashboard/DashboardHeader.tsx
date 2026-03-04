"use client";

import { ReactNode } from "react";
import { useDatabaseConfig } from "@/lib/use-database-config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Database } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function DashboardHeader({ title, subtitle, actions }: DashboardHeaderProps) {
  const { databaseUrl, databaseProvider } = useDatabaseConfig();

  const getProviderBadge = () => {
    if (!databaseUrl) return null;

    if (databaseProvider === "neon") {
      return (
        <Badge variant="outline" className="ml-3 gap-1.5 border-[#00e599]/30 text-[#00e599] dark:text-[#00e599] bg-[#00e599]/5">
          <div className="w-3 h-3 bg-[#00e599] rounded-[2px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-2 h-2 text-black fill-current">
              <path d="M12 0L24 12L12 24L0 12L12 0Z" />
            </svg>
          </div>
          Neon
        </Badge>
      );
    }

    if (databaseProvider === "supabase") {
      return (
        <Badge variant="outline" className="ml-3 gap-1.5 border-[#3ecf8e]/30 text-[#3ecf8e] dark:text-[#3ecf8e] bg-[#3ecf8e]/5">
          <div className="w-3 h-3 bg-[#3ecf8e] rounded-[2px] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-2 h-2 text-white fill-current">
              <path d="M21.362 9.354H12V.396L2.638 14.646H12v8.958l9.362-14.25z" />
            </svg>
          </div>
          Supabase
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="ml-3 gap-1.5 text-muted-foreground">
        <Database className="w-3 h-3" />
        Postgres
      </Badge>
    );
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-foreground">
              {title}
            </h1>
            {getProviderBadge()}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center">{actions}</div>}
      </div>
    </header>
  );
}
