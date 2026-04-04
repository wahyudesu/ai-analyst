"use client"

import { useState } from "react"

export default function SimpleChatPage() {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Add user message
    const userMsg = { role: "user", content: input }
    setMessages(prev => [...prev, userMsg])

    // Call API
    try {
      const response = await fetch("/api/chat?agentId=data-analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
        }),
      })

      if (response.ok) {
        const text = await response.text()
        // Parse streaming response
        const lines = text.split("\n")
        let assistantText = ""
        for (const line of lines) {
          if (line.startsWith('0:"')) {
            // Extract text between quotes
            const match = line.match(/0:"(.*)"/)
            if (match) {
              assistantText += match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
            }
          } else if (line === "d") {
            // Done
            break
          }
        }

        setMessages(prev => [...prev, { role: "assistant", content: assistantText }])
      }
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, { role: "assistant", content: "Error: " + (error instanceof Error ? error.message : "Unknown error") }])
    }

    setInput("")
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-6 py-4 bg-card">
        <h1 className="text-xl font-bold">Simple AI Chat</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Ask about your data...</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-card">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            className="flex-1 px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
