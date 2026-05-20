"use client";

import { useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming updates arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Dev Research Assistant
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Ask me to research a topic, search the web, or save notes to
            Notion. I can combine web search with your knowledge base to provide
            thorough, cited answers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Streaming cursor indicator */}
      {isStreaming && (
        <div className="mb-4 flex justify-start">
          <div className="flex items-center gap-1 pl-4 pt-1">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-400" />
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-400 delay-150" />
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-400 delay-300" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}