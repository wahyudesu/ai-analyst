"use client";

import { ChatContent } from "@/components/chat/ChatContent";
import { Suspense, useState, useMemo } from "react";
import { AlertCircle, Database, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useSearchParams } from "next/navigation";
import { useServerHealth } from "@/lib/api/queries";

type ServerStatus = "loading" | "ready" | "error";

function ChatPage() {
  const searchParams = useSearchParams();
  const connectionString = searchParams.get("connection") ?? undefined;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Server health check using shared query hook with built-in retry
  const { isLoading, isError, error: queryError } = useServerHealth();

  // Derive status and error from query state
  const status = useMemo(() => {
    if (isLoading) return "loading";
    if (isError) return "error";
    return "ready";
  }, [isLoading, isError]);

  const error = useMemo(() => {
    if (queryError instanceof Error) return queryError.message;
    if (queryError) return "Failed to connect to Mastra server";
    return null;
  }, [queryError]);

  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200" />
          </div>
          <p className="text-sm text-muted-foreground">
            Connecting to AI server...
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Connection Error
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error ||
              "No agents available. Make sure the Mastra server is running."}
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                AI Data Analyst
              </h1>
              <p className="text-xs text-muted-foreground">
                Query your database with natural language
              </p>
            </div>
          </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
        </div>
      </header>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
        <ChatContent connectionString={connectionString} />
      </div>

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
    </div>
  );
}

export default function Chat() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ChatPage />
    </Suspense>
  );
}
