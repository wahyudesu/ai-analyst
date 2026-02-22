"use client";

import { ChatContent } from "@/components/chat/ChatContent";
import { Suspense, useState, useEffect } from "react";
import { AlertCircle, Database, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatabaseSettings } from "@/components/DatabaseSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/simple-auth";
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

  const { data: session, signOut } = useAuth();

  const getUserInitials = () => {
    const name = session?.user?.name || session?.user?.email || "User";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-auto py-2 px-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-foreground">
                      {session?.user?.name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session?.user?.email || ""}
                    </p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Chat Content */}
      <div className="flex-1 overflow-hidden">
        <ChatContent connectionString={connectionString} />
      </div>

      <DatabaseSettings
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
