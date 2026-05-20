"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { MessageList } from "@/components/chat/MessageList";
import { InputBar } from "@/components/chat/InputBar";

export default function Home() {
  const { messages, sendMessage, status, stop, error } = useChat();

  const handleSend = (text: string) => {
    sendMessage({ text });
  };

  return (
    <div className="flex h-dvh flex-col bg-white">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center border-b border-gray-200 px-4">
        <h1 className="text-sm font-semibold text-gray-900">
          Dev Research Assistant
        </h1>
        <a
          href="https://www.notion.so/NOTES-REPOSITORY-3666e546f81680369426d12325c02872"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-700 hover:shadow-md active:scale-95"
        >
          {/* Notebook icon */}
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
            <path d="M6 2v12" />
            <path d="M8.5 5.5h2" />
            <path d="M8.5 8h2" />
          </svg>
          Notes
        </a>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages as UIMessage[]}
          isStreaming={status === "streaming" || status === "submitted"}
        />
      </main>

      {/* Error banner */}
      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error.message || "An error occurred. Please try again."}
        </div>
      )}

      {/* Input */}
      <InputBar
        onSend={handleSend}
        isStreaming={status === "streaming" || status === "submitted"}
        onStop={stop}
      />
    </div>
  );
}