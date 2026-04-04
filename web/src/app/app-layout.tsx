"use client"

import { SettingsDialog } from "@/components/SettingsDialog"
import { AuthDialog } from "@/components/auth"
import { AppSidebar } from "@/components/dashboard/AppSidebar"
import { DashboardErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/simple-auth"
import { useDatabaseConfig } from "@/lib/use-database-config"
import { Database } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

interface AppLayoutProps {
  children: React.ReactNode
  rightSidebar?: React.ReactNode
  headerActions?: ReactNode
}

// Page title mapping based on routes
const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of your analytics",
  },
  "/dashboard/revenue": {
    title: "Revenue & Monetization",
    subtitle: "Revenue metrics and monetization analytics",
  },
  "/dashboard/growth": {
    title: "Growth Analytics",
    subtitle: "Track your growth metrics",
  },
  "/dashboard/usage": {
    title: "Usage Analytics",
    subtitle: "Monitor product usage patterns",
  },
  "/dashboard/reliability": {
    title: "System Reliability",
    subtitle: "Uptime and performance metrics",
  },
}

// Neon logo SVG
const NEON_LOGO = (
  <svg viewBox="0 0 24 24" className="w-2 h-2 text-black fill-current">
    <path d="M12 0L24 12L12 24L0 12L12 0Z" />
  </svg>
)

// Supabase logo SVG
const SUPABASE_LOGO = (
  <svg viewBox="0 0 24 24" className="w-2 h-2 text-white fill-current">
    <path d="M21.362 9.354H12V.396L2.638 14.646H12v8.958l9.362-14.25z" />
  </svg>
)

function DatabaseBadge({
  provider,
  hasUrl,
}: { provider: string | null; hasUrl: boolean }) {
  // Only show badge if database URL is configured
  if (!hasUrl) return null

  switch (provider) {
    case "neon":
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-[#00e599]/30 text-[#00e599] bg-[#00e599]/5 hover:bg-[#00e599]/10 transition-colors"
        >
          <div className="w-3 h-3 bg-[#00e599] rounded-sm flex items-center justify-center shrink-0">
            {NEON_LOGO}
          </div>
          Neon
        </Badge>
      )
    case "supabase":
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-[#3ecf8e]/30 text-[#3ecf8e] bg-[#3ecf8e]/5 hover:bg-[#3ecf8e]/10 transition-colors"
        >
          <div className="w-3 h-3 bg-[#3ecf8e] rounded-sm flex items-center justify-center shrink-0">
            {SUPABASE_LOGO}
          </div>
          Supabase
        </Badge>
      )
    default:
      return (
        <Badge
          variant="outline"
          className="gap-1.5 text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          <Database className="w-3 h-3" />
          Postgres
        </Badge>
      )
  }
}

export function AppLayout({
  children,
  rightSidebar,
  headerActions,
}: AppLayoutProps) {
  const { data: session, isPending, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { databaseUrl, databaseProvider } = useDatabaseConfig()

  // Get current page title based on pathname
  const pageTitle = useMemo(() => {
    // Try exact match first
    if (PAGE_TITLES[pathname]) {
      return PAGE_TITLES[pathname]
    }
    // For nested routes, get parent title
    const parentPath = pathname.split("/").slice(0, 3).join("/")
    if (PAGE_TITLES[parentPath]) {
      return PAGE_TITLES[parentPath]
    }
    // Default fallback
    return { title: "AI Analyst Dashboard" }
  }, [pathname])

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/")
    }
  }, [session, isPending, router])

  // Handle sign out
  const handleSignOut = useCallback(() => {
    signOut()
  }, [signOut])

  // Listen for custom settings event from sidebar
  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true)
    window.addEventListener("open-settings", handleOpenSettings)
    return () => window.removeEventListener("open-settings", handleOpenSettings)
  }, [])

  // Loading state
  if (isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5">
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0ms]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:150ms]" />
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:300ms]" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show auth dialog if not authenticated
  if (!session?.user) {
    return <AuthDialog />
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <AppSidebar />
      <SidebarInset>
        {/* Header with toggle button */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 flex-col justify-center gap-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                {pageTitle.title}
              </h1>
              <DatabaseBadge
                provider={databaseProvider}
                hasUrl={!!databaseUrl}
              />
            </div>
            {pageTitle.subtitle && (
              <p className="text-xs text-muted-foreground leading-tight">
                {pageTitle.subtitle}
              </p>
            )}
          </div>
          {/* Header actions (refresh buttons, etc) */}
          {headerActions && (
            <div className="flex items-center shrink-0">{headerActions}</div>
          )}
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
        </div>

        {/* Right sidebar (optional) */}
        {rightSidebar && (
          <aside className="hidden w-72 shrink-0 border-l lg:flex lg:flex-col">
            {rightSidebar}
          </aside>
        )}
      </SidebarInset>

      {/* Settings Dialog */}
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {/* Sign out handler - listen for custom event */}
      <SignOutHandler onSignOut={handleSignOut} />
    </SidebarProvider>
  )
}

// Separate component to handle sign out from sidebar dropdown
function SignOutHandler({ onSignOut }: { onSignOut: () => void }) {
  useEffect(() => {
    const handleSignOutEvent = () => onSignOut()
    window.addEventListener("sign-out", handleSignOutEvent)
    return () => window.removeEventListener("sign-out", handleSignOutEvent)
  }, [onSignOut])

  return null
}
