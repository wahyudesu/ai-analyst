"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Database as DatabaseIcon,
  Check,
  X,
  Loader2,
  RefreshCw,
    AlertCircle,
    Eye,
  EyeOff,
  Layout,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDatabaseConfig, DatabaseProvider } from "@/lib/use-database-config";
import { cn } from "@/lib/utils";
import { maskDatabaseUrl } from "@/lib/utils/database";

interface DatabaseSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ConnectionStatus = "disconnected" | "connected" | "error";
type TestStatus = "idle" | "loading" | "success" | "error";

export function DatabaseSettings({
  open,
  onOpenChange,
}: DatabaseSettingsProps) {
  const { 
    databaseUrl, 
    setDatabaseUrl, 
    databaseProvider,
    setDatabaseProvider,
    clearDatabaseUrl 
  } = useDatabaseConfig();
  const [inputUrl, setInputUrl] = useState("");
  const [inputProvider, setInputProvider] = useState<DatabaseProvider>("postgres");
  const [showUrl, setShowUrl] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize input with saved values when dialog opens
  useEffect(() => {
    if (open) {
      setInputUrl(databaseUrl);
      setInputProvider(databaseProvider);
      setConnectionStatus(databaseUrl ? "connected" : "disconnected");
      setTestStatus("idle");
      setTestError(null);
      setSaveSuccess(false);
    }
  }, [open, databaseUrl, databaseProvider]);

  // Derive hasChanges during render instead of using state
  const hasChanges = inputUrl !== databaseUrl || inputProvider !== databaseProvider;

  const handleTestConnection = useCallback(async () => {
    if (!inputUrl.trim()) {
      setTestError("Please enter a connection URL first");
      setTestStatus("error");
      return;
    }

    setTestStatus("loading");
    setTestError(null);

    try {
      const response = await fetch("/api/database/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString: inputUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setTestStatus("success");
        setTestError(null);
        setConnectionStatus("connected");
      } else {
        setTestStatus("error");
        setTestError(data.error || "Connection failed");
        setConnectionStatus("error");
      }
    } catch (error) {
      setTestStatus("error");
      setTestError(
        error instanceof Error ? error.message : "Failed to test connection"
      );
      setConnectionStatus("error");
    }
  }, [inputUrl]);

  const handleSave = () => {
    setDatabaseUrl(inputUrl);
    setDatabaseProvider(inputProvider);
    setConnectionStatus(inputUrl ? "connected" : "disconnected");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCancel = () => {
    // Revert to original value
    setInputUrl(databaseUrl);
    setInputProvider(databaseProvider);
    setTestStatus("idle");
    setTestError(null);
  };

  const handleClear = () => {
    setInputUrl("");
    setInputProvider("postgres");
    setTestStatus("idle");
    setTestError(null);
  };


  const handleOpenChange = (newOpen: boolean) => {
    if (hasChanges && !newOpen) {
      // If there are unsaved changes, ask user to confirm or cancel
      // For now, we'll just revert changes
      handleCancel();
    }
    onOpenChange(newOpen);
  };

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Connection Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            Not configured
          </Badge>
        );
    }
  };

  const getTestButtonState = () => {
    if (testStatus === "loading") {
      return {
        disabled: true,
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: "Testing...",
        variant: "outline" as const,
        className: "gap-1.5",
      };
    }
    if (testStatus === "success") {
      return {
        disabled: false,
        icon: <Check className="w-4 h-4 text-emerald-500" />,
        text: "Test Passed",
        variant: "outline" as const,
        className: "gap-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400",
      };
    }
    if (testStatus === "error") {
      return {
        disabled: false,
        icon: <AlertCircle className="w-4 h-4 text-red-500" />,
        text: "Test Failed",
        variant: "outline" as const,
        className: "gap-1.5 border-red-500/50 text-red-600 dark:text-red-400",
      };
    }
    return {
      disabled: !inputUrl.trim(),
      icon: <RefreshCw className="w-4 h-4" />,
      text: "Test Connection",
      variant: "outline" as const,
      className: "gap-1.5",
    };
  };

  const testButtonState = getTestButtonState();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <DatabaseIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <DialogTitle>Database Connection</DialogTitle>
              <div className="mt-1">{getConnectionBadge()}</div>
            </div>
          </div>
            <DialogDescription className="pt-2">
              Configure your PostgreSQL database connection to enable AI-powered
              data analysis.
            </DialogDescription>

            {/* Provider Selection */}
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium">Database Provider</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={inputProvider === "neon" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputProvider("neon")}
                  className={cn(
                    "gap-2",
                    inputProvider === "neon" && "bg-[#00e599] hover:bg-[#00e599]/90 text-black border-none"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-sm flex items-center justify-center",
                    inputProvider === "neon" ? "bg-black" : "bg-[#00e599]"
                  )}>
                    <svg viewBox="0 0 24 24" className={cn("w-2.5 h-2.5 fill-current", inputProvider === "neon" ? "text-[#00e599]" : "text-black")}>
                      <path d="M12 0L24 12L12 24L0 12L12 0Z" />
                    </svg>
                  </div>
                  Neon
                </Button>
                <Button
                  type="button"
                  variant={inputProvider === "supabase" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputProvider("supabase")}
                  className={cn(
                    "gap-2",
                    inputProvider === "supabase" && "bg-[#3ecf8e] hover:bg-[#3ecf8e]/90 text-white border-none"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-sm flex items-center justify-center",
                    inputProvider === "supabase" ? "bg-white" : "bg-[#3ecf8e]"
                  )}>
                    <svg viewBox="0 0 24 24" className={cn("w-2.5 h-2.5 fill-current", inputProvider === "supabase" ? "text-[#3ecf8e]" : "text-white")}>
                      <path d="M21.362 9.354H12V.396L2.638 14.646H12v8.958l9.362-14.25z" />
                    </svg>
                  </div>
                  Supabase
                </Button>
                <Button
                  type="button"
                  variant={inputProvider === "postgres" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setInputProvider("postgres")}
                  className="gap-2"
                >
                  <DatabaseIcon className="w-4 h-4" />
                  Postgres
                </Button>
              </div>
            </div>

            {/* Neon Connection Helper */}
            {inputProvider === "neon" && (
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#00e599] rounded-sm flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 text-black fill-current">
                        <path d="M12 0L24 12L12 24L0 12L12 0Z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold">Connect with Neon</span>
                  </div>
                  <a
                    href="https://neon.tech/docs/guides/nextjs"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
                  >
                    View Guide
                  </a>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Get your connection string from the Neon Console and paste it below. 
                  Make sure to include <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">?sslmode=require</code>.
                </p>
              </div>
            )}

            {/* Supabase Helper */}
            {inputProvider === "supabase" && (
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-[#3ecf8e] rounded-sm flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 text-white fill-current">
                        <path d="M21.362 9.354H12V.396L2.638 14.646H12v8.958l9.362-14.25z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold">Connect with Supabase</span>
                  </div>
                  <a
                    href="https://supabase.com/docs/guides/database/connecting-to-postgres"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline underline-offset-2"
                  >
                    View Guide
                  </a>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Use your project's **Connection string** (URI) from Database Settings.
                  Typically starts with <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">postgresql://postgres...</code>.
                </p>
              </div>
            )}

            {/* Show masked URL when connected and not editing */}
          {databaseUrl && !hasChanges && (
            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-md mt-2 break-all">
              <span className="text-zinc-400 dark:text-zinc-500 mr-2 shrink-0">
                Current:
              </span>
              {maskDatabaseUrl(databaseUrl)}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="database-url" className="text-sm font-medium">
                Connection URL
              </label>
              {hasChanges && (
                <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
            </div>
              <div className="relative group">
                <Input
                  id="database-url"
                  type={showUrl ? "text" : "password"}
                  placeholder="postgresql://user:password@host:port/database"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setTestStatus("idle");
                    setTestError(null);
                  }}
                  className={cn(
                    "font-mono text-sm pr-10",
                    saveSuccess &&
                      "border-emerald-500 focus-visible:border-emerald-500",
                    testError && "border-red-500 focus-visible:border-red-500"
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  onClick={() => setShowUrl(!showUrl)}
                >
                  {showUrl ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showUrl ? "Hide" : "Show"} URL
                  </span>
                </Button>
              </div>

              {/* Test Connection Button */}
            <Button
              type="button"
              variant={testButtonState.variant}
              onClick={handleTestConnection}
              disabled={testButtonState.disabled}
              className={cn(
                "w-full sm:w-auto",
                testButtonState.className
              )}
            >
              {testButtonState.icon}
              {testButtonState.text}
            </Button>

            {/* Test Error Message */}
            {testError && (
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md break-words">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="flex-1 min-w-0">{testError}</span>
              </div>
            )}

            {/* Save Success Message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-md animate-in fade-in slide-in-from-top-1 duration-200">
                <Check className="w-4 h-4" />
                <span>Connection saved successfully</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={!inputUrl}
            className="gap-1.5"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className="gap-1.5 bg-orange-600 hover:bg-orange-700"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
