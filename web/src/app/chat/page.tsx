"use client";

import { ChatContent } from "@/components/chat/ChatContent";
import { Suspense, useState, useEffect } from "react";
import { AlertCircle, Database, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useSearchParams } from "next/navigation";

const SERVER_CHECK_RETRIES = 3;
const SERVER_RETRY_DELAY = 1500;

type ServerStatus = "loading" | "ready" | "error";

function ChatPage() {
  const searchParams = useSearchParams();
  const connectionString = searchParams.get("connection") ?? undefined;
  const [status, setStatus] = useState<ServerStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    async function checkServer() {
      for (let i = 0; i < SERVER_CHECK_RETRIES; i++) {
        try {
          const response = await fetch("/api/agents");

          if (response.status === 503 && i < SERVER_CHECK_RETRIES - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, SERVER_RETRY_DELAY),
            );
            continue;
          }

          if (response.ok) {
            setStatus("ready");
            setError(null);
            return;
          }
        } catch (err) {
          if (i === SERVER_CHECK_RETRIES - 1) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to connect to Mastra server",
            );
          }
        }
      }
      setStatus("error");
    }

    checkServer();
  }, []);

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
