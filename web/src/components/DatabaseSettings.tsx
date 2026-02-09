"use client"

import { useState, useEffect } from "react"
import { Database, Check, X, Database as DatabaseIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useDatabaseConfig } from "@/lib/use-database-config"
import { cn } from "@/lib/utils"

interface DatabaseSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ConnectionStatus = "disconnected" | "connected" | "error"

export function DatabaseSettings({ open, onOpenChange }: DatabaseSettingsProps) {
  const { databaseUrl, setDatabaseUrl, clearDatabaseUrl } = useDatabaseConfig()
  const [inputUrl, setInputUrl] = useState("")
  const [showSaved, setShowSaved] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")

  // Initialize input with saved URL when dialog opens
  useEffect(() => {
    if (open) {
      setInputUrl(databaseUrl)
      setConnectionStatus(databaseUrl ? "connected" : "disconnected")
      setShowSaved(false)
    }
  }, [open, databaseUrl])

  const handleSave = () => {
    setDatabaseUrl(inputUrl)
    setConnectionStatus(inputUrl ? "connected" : "disconnected")

    // Show saved indicator
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const handleClear = () => {
    setInputUrl("")
    setDatabaseUrl("")
    clearDatabaseUrl()
    setConnectionStatus("disconnected")
    setShowSaved(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      // Reset to saved value when closing without saving
      setInputUrl(databaseUrl)
      setShowSaved(false)
    }
  }

  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Connected
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Error
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            Not configured
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <DatabaseIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle>Database Connection</DialogTitle>
              <div className="mt-1">{getConnectionBadge()}</div>
            </div>
          </div>
          <DialogDescription className="pt-2">
            Configure your PostgreSQL database connection to enable AI-powered data analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="database-url" className="text-sm font-medium">
              Connection URL
            </label>
            <Input
              id="database-url"
              type="text"
              placeholder="postgresql://user:password@host:port/database"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className={cn(
                "font-mono text-sm",
                showSaved && "border-emerald-500 focus-visible:border-emerald-500"
              )}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Format: postgresql://[user[:password]@][host][:port][/database]
            </p>
          </div>

          {showSaved && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-1 duration-200">
              <Check className="w-4 h-4" />
              <span>Connection URL saved successfully</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={!databaseUrl && !inputUrl}
            className="gap-1.5"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!inputUrl.trim() || inputUrl === databaseUrl}
            className="gap-1.5 bg-orange-600 hover:bg-orange-700"
          >
            {showSaved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : (
              "Save Connection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
