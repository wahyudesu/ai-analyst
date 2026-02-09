"use client";

import { Chat } from "@/components/Chat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DatabaseSettings } from "@/components/DatabaseSettings";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { Database, AlertCircle, Settings } from "lucide-react";

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce delay-200" />
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Connecting to Mastra server...
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-2" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            Connection Error
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            {error ||
              "No agents available. Make sure the Mastra server is running."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                AI Data Analyst
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Query your database with natural language and get visualizations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connectionString && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                Connected
              </div>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
              aria-label="Open database settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Chat connectionString={connectionString} />
      </main>
      <DatabaseSettings
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      }
    >
      <ChatPage />
    </Suspense>
  );
}
