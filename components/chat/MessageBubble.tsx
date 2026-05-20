"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MessageBubbleProps {
  message: UIMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] ${
          isUser
            ? "rounded-2xl bg-gray-100 px-4 py-3 text-gray-900"
            : "text-gray-900"
        }`}
      >
        {message.parts.map((part, i) => (
          <MessagePart
            key={`${message.id}-part-${i}`}
            part={part}
            isUser={isUser}
          />
        ))}
      </div>
    </div>
  );
}

type Part = UIMessage["parts"][number];

function MessagePart({ part, isUser }: { part: Part; isUser: boolean }) {
  switch (part.type) {
    case "text":
      if (isUser) {
        return (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {part.text}
          </div>
        );
      }

      // AI messages: render markdown
      return (
        <div className="md-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {part.text}
          </ReactMarkdown>
          {part.state === "streaming" && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-gray-800 ml-0.5 align-text-bottom" />
          )}
        </div>
      );

    case "step-start":
      return null;

    default:
      if (part.type.startsWith("tool-")) {
        return <ToolPart part={part} />;
      }
      return null;
  }
}

function ToolPart({ part }: { part: Part }) {
  const toolName = part.type.replace(/^tool-/, "");

  const invocation = part as Part & {
    state?: string;
    input?: Record<string, unknown>;
    output?: unknown;
    errorText?: string;
  };

  if (invocation.state === "input-streaming" || invocation.state === "input-available") {
    const query = invocation.input?.query ?? invocation.input?.title ?? "";
    return (
      <div className="my-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
        <svg
          className="h-4 w-4 shrink-0 animate-spin text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span>
          Calling <strong>{toolName}</strong>
          {query ? `: ${String(query).slice(0, 80)}` : ""}
        </span>
      </div>
    );
  }

  if (invocation.state === "output-available") {
    return (
      <div className="my-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-gray-600">
        <svg
          className="h-4 w-4 shrink-0 text-green-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          <strong>{toolName}</strong> — completed
        </span>
      </div>
    );
  }

  if (invocation.state === "output-error") {
    return (
      <div className="my-2 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          <strong>{toolName}</strong> — error: {invocation.errorText ?? "Unknown error"}
        </span>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
      <strong>{toolName}</strong>
    </div>
  );
}