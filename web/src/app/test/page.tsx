"use client"

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>

      <div className="space-y-4">
        <div className="p-4 border rounded">
          <p className="text-sm text-gray-500">Test 1: Basic input</p>
          <input
            type="text"
            placeholder="Type here..."
            className="border p-2 rounded w-full"
          />
        </div>

        <div className="p-4 border rounded">
          <p className="text-sm text-gray-500">Test 2: Textarea</p>
          <textarea
            placeholder="Type here..."
            className="border p-2 rounded w-full h-24"
          />
        </div>

        <div className="p-4 border rounded">
          <p className="text-sm text-gray-500">Test 3: Button</p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => alert("Button works!")}
          >
            Click Me
          </button>
        </div>

        <div className="p-4 border rounded">
          <p className="text-sm text-gray-500">Test 4: Chat components</p>
          <div className="flex gap-2">
            <a href="/chat" className="text-blue-500 underline">Go to Chat</a>
            <a href="/dashboard" className="text-blue-500 underline">Go to Dashboard</a>
          </div>
        </div>
      </div>
    </div>
  )
}
