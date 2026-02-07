import { ThemeToggle } from '@/components/ThemeToggle';

export default function Loading() {
  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-32 h-6 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
            <div className="w-48 h-4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
          </div>
          <div className="w-20 h-8 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full px-6 py-4">
          {/* Welcome message skeleton */}
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto animate-pulse" />
              <div className="w-48 h-6 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto animate-pulse" />
              <div className="w-64 h-4 bg-zinc-200 dark:bg-zinc-700 rounded mx-auto animate-pulse" />
            </div>
          </div>
        </div>
      </main>

      {/* Input skeleton */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
            <div className="w-20 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
