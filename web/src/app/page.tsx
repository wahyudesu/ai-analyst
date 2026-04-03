"use client"

import { AuthDialog } from "@/components/auth"
import { useAuth } from "@/lib/simple-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const { data: session, isPending } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        router.push("/dashboard")
      } else {
        // Show auth dialog - user will be redirected after login
      }
    }
  }, [session, isPending, router])

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce delay-200" />
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return <AuthDialog />
  }

  return null
}
