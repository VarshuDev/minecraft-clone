import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  text: string;
  type: "chat" | "system" | "command" | "error";
  timestamp: number;
}

interface ChatOverlayProps {
  isOpen: boolean;
  initialText?: string;
  messages: ChatMessage[];
  onClose: () => void;
  onSendMessage: (text: string) => void;
}

export function ChatOverlay({
  isOpen,
  initialText = "",
  messages,
  onClose,
  onSendMessage,
}: ChatOverlayProps) {
  const [inputVal, setInputVal] = useState(initialText);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial text when opening (e.g. '/' or '')
  useEffect(() => {
    if (isOpen) {
      setInputVal(initialText);
      setHistoryIndex(-1);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [isOpen, initialText]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputVal.trim();
      if (trimmed) {
        onSendMessage(trimmed);
        setHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
      }
      setInputVal("");
      onClose();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(history.length - 1, historyIndex + 1);
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal("");
      }
    }
  };

  const now = Date.now();
  // If open: show all recent messages (up to 30)
  // If closed: show messages less than 8.5 seconds old
  const visibleMessages = isOpen
    ? messages.slice(-35)
    : messages.filter((m) => now - m.timestamp < 8500).slice(-8);

  if (!isOpen && visibleMessages.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-24 left-4 z-40 w-[480px] max-w-[92vw] pointer-events-none transition-opacity duration-300 ${
        isOpen ? "pointer-events-auto" : "opacity-90"
      }`}
    >
      {/* Messages Log Box */}
      <div
        className={`flex flex-col space-y-1.5 p-2.5 rounded font-pixel text-[12px] leading-relaxed select-text overflow-y-auto max-h-56 ${
          isOpen ? "bg-black/75 border border-white/20 shadow-2xl" : "bg-black/40 shadow-md backdrop-blur-[2px]"
        }`}
      >
        {visibleMessages.map((m) => {
          let colClass = "text-white";
          if (m.type === "system") colClass = "text-[#ffea60]";
          else if (m.type === "command") colClass = "text-[#55ff55]";
          else if (m.type === "error") colClass = "text-[#ff5555]";

          return (
            <div
              key={m.id}
              className={`break-words tracking-wide ${colClass} text-shadow-sm`}
            >
              {m.text}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field when Open */}
      {isOpen && (
        <div className="mt-1 flex items-center bg-black/90 border-2 border-white/40 rounded px-2.5 py-1.5 shadow-2xl">
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or chat message... (/help for commands)"
            className="w-full bg-transparent font-pixel text-[13px] text-white placeholder-white/35 focus:outline-none tracking-wider"
          />
        </div>
      )}
    </div>
  );
}
