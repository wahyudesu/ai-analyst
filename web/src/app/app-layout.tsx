"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { DashboardErrorBoundary } from "@/components/dashboard/ErrorBoundary";
import { useAuth } from "@/lib/simple-auth";
import { AuthDialog } from "@/components/auth";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface AppLayoutProps {
  children: React.ReactNode;
  rightSidebar?: React.ReactNode;
}

export function AppLayout({ children, rightSidebar }: AppLayoutProps) {
  const { data: session, isPending, signOut } = useAuth();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  // Handle sign out
  const handleSignOut = useCallback(() => {
    signOut();
  }, [signOut]);

  // Listen for custom settings event from sidebar
  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

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
    );
  }

  // Show auth dialog if not authenticated
  if (!session?.user) {
    return <AuthDialog />;
  }

  return (
    <SidebarProvider defaultOpen={true} open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        {/* Header with toggle button */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              AI Analyst Dashboard
            </h1>
          </div>
          {/* Optional header actions can be added here */}
        </header>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardErrorBoundary>
            {children}
          </DashboardErrorBoundary>
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
  );
}

// Separate component to handle sign out from sidebar dropdown
function SignOutHandler({ onSignOut }: { onSignOut: () => void }) {
  useEffect(() => {
    const handleSignOutEvent = () => onSignOut();
    window.addEventListener('sign-out', handleSignOutEvent);
    return () => window.removeEventListener('sign-out', handleSignOutEvent);
  }, [onSignOut]);

  return null;
}
