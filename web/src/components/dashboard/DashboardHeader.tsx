"use client";

import { ReactNode, useMemo } from "react";
import { useDatabaseConfig } from "@/lib/use-database-config";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Database } from "lucide-react";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

// Neon logo SVG - hoisted outside component
const NEON_LOGO = (
  <svg viewBox="0 0 24 24" className="w-2 h-2 text-black fill-current">
    <path d="M12 0L24 12L12 24L0 12L12 0Z" />
  </svg>
);

// Supabase logo SVG - hoisted outside component
const SUPABASE_LOGO = (
  <svg viewBox="0 0 24 24" className="w-2 h-2 text-white fill-current">
    <path d="M21.362 9.354H12V.396L2.638 14.646H12v8.958l9.362-14.25z" />
  </svg>
);

// Badge styles constants
const NEON_BADGE_CLASS =
  "ml-3 gap-1.5 border-[#00e599]/30 text-[#00e599] dark:text-[#00e599] bg-[#00e599]/5 hover:bg-[#00e599]/10 transition-colors";
const SUPABASE_BADGE_CLASS =
  "ml-3 gap-1.5 border-[#3ecf8e]/30 text-[#3ecf8e] dark:text-[#3ecf8e] bg-[#3ecf8e]/5 hover:bg-[#3ecf8e]/10 transition-colors";
const POSTGRES_BADGE_CLASS =
  "ml-3 gap-1.5 text-muted-foreground hover:bg-accent/50 transition-colors";

function NeonBadge() {
  return (
    <Badge variant="outline" className={NEON_BADGE_CLASS}>
      <div className="w-3 h-3 bg-[#00e599] rounded-sm flex items-center justify-center shrink-0">
        {NEON_LOGO}
      </div>
      Neon
    </Badge>
  );
}

function SupabaseBadge() {
  return (
    <Badge variant="outline" className={SUPABASE_BADGE_CLASS}>
      <div className="w-3 h-3 bg-[#3ecf8e] rounded-sm flex items-center justify-center shrink-0">
        {SUPABASE_LOGO}
      </div>
      Supabase
    </Badge>
  );
}

function PostgresBadge() {
  return (
    <Badge variant="outline" className={POSTGRES_BADGE_CLASS}>
      <Database className="w-3 h-3" />
      Postgres
    </Badge>
  );
}

export function DashboardHeader({
  title,
  subtitle,
  actions,
}: DashboardHeaderProps) {
  const { databaseUrl, databaseProvider } = useDatabaseConfig();

  const providerBadge = useMemo(() => {
    if (!databaseUrl) return null;

    switch (databaseProvider) {
      case "neon":
        return <NeonBadge />;
      case "supabase":
        return <SupabaseBadge />;
      default:
        return <PostgresBadge />;
    }
  }, [databaseUrl, databaseProvider]);

  return (
    <header className="bg-background px-6 py-5 top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
            {providerBadge}
          </div>
          {/*{subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}*/}
        </div>

        {actions && <div className="flex items-center shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
