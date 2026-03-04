"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useMutation } from "@tanstack/react-query";
import {
  Database as DatabaseIcon,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sun,
  Moon,
  Settings as SettingsIcon,
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
import { useDatabaseConfig } from "@/lib/use-database-config";
import { cn } from "@/lib/utils";
import { maskDatabaseUrl } from "@/lib/utils/database";
import { API_ENDPOINTS, ERROR_MESSAGES } from "@/lib/api/constants";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ConnectionStatus = "disconnected" | "connected" | "error";
type TestStatus = "idle" | "loading" | "success" | "error";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { databaseUrl, setDatabaseUrl, clearDatabaseUrl } = useDatabaseConfig();
  const [inputUrl, setInputUrl] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize input with saved URL when dialog opens
  useEffect(() => {
    if (open) {
      setInputUrl(databaseUrl);
      setConnectionStatus(databaseUrl ? "connected" : "disconnected");
      setTestStatus("idle");
      setTestError(null);
      setSaveSuccess(false);
    }
  }, [open, databaseUrl]);

  // Derive hasChanges during render instead of using state
  const hasChanges = inputUrl !== databaseUrl;

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (connectionString: string) => {
      const response = await fetch(API_ENDPOINTS.DATABASE_TEST_CONNECTION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || ERROR_MESSAGES.DATABASE_CONNECTION_FAILED);
      }
      return data;
    },
    onMutate: () => {
      setTestStatus("loading");
      setTestError(null);
    },
    onSuccess: () => {
      setTestStatus("success");
      setTestError(null);
      setConnectionStatus("connected");
    },
    onError: (error) => {
      setTestStatus("error");
      setTestError(error instanceof Error ? error.message : ERROR_MESSAGES.DATABASE_TEST_FAILED);
      setConnectionStatus("error");
    },
  });

  const handleTestConnection = useCallback(() => {
    if (!inputUrl.trim()) {
      setTestError(ERROR_MESSAGES.DATABASE_URL_REQUIRED);
      setTestStatus("error");
      return;
    }
    testConnectionMutation.mutate(inputUrl);
  }, [inputUrl, testConnectionMutation]);

  const handleSave = () => {
    setDatabaseUrl(inputUrl);
    setConnectionStatus(inputUrl ? "connected" : "disconnected");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleCancel = () => {
    setInputUrl(databaseUrl);
    setTestStatus("idle");
    setTestError(null);
  };

  const handleClear = () => {
    setInputUrl("");
    setTestStatus("idle");
    setTestError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (hasChanges && !newOpen) {
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
    const isLoading = testConnectionMutation.isPending;
    if (isLoading) {
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
        className:
          "gap-1.5 border-emerald-500/50 text-emerald-600 dark:text-emerald-400",
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
  const isDark = theme === "dark";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <DialogTitle>Settings</DialogTitle>
          </div>
          <DialogDescription>
            Configure your AI Analyst preferences and database connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Appearance</h3>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred theme
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={!isDark ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="flex-1 gap-2"
              >
                <Sun className="w-4 h-4" />
                Light
              </Button>
              <Button
                variant={isDark ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="flex-1 gap-2"
              >
                <Moon className="w-4 h-4" />
                Dark
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Database Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <DatabaseIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium">Database Connection</h3>
                <div className="mt-0.5">{getConnectionBadge()}</div>
              </div>
            </div>

            {databaseUrl && !hasChanges && (
              <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-md">
                <span className="text-zinc-400 dark:text-zinc-500 mr-2">
                  Current:
                </span>
                {maskDatabaseUrl(databaseUrl)}
              </div>
            )}

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
              <Input
                id="database-url"
                type="text"
                placeholder="postgresql://user:password@host:port/database"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setTestStatus("idle");
                  setTestError(null);
                }}
                className={cn(
                  "font-mono text-sm",
                  saveSuccess && "border-emerald-500 focus-visible:border-emerald-500",
                  testError && "border-red-500 focus-visible:border-red-500"
                )}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Format: postgresql://[user[:password]@][host][:port][/database]
              </p>

              {/* Test Connection Button */}
              <Button
                type="button"
                variant={testButtonState.variant}
                onClick={handleTestConnection}
                disabled={testButtonState.disabled}
                className={cn("w-full sm:w-auto", testButtonState.className)}
              >
                {testButtonState.icon}
                {testButtonState.text}
              </Button>

              {/* Test Error Message */}
              {testError && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{testError}</span>
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
