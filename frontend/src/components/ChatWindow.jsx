import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import WelcomeScreen from "./WelcomeScreen";
import LoadingIndicator from "./LoadingIndicator";

import { Radio } from "lucide-react";

const ChatWindow = ({
  conversation,
  messages,
  sending,
  loadingMessages,
  onSend,
  onRegenerate,
  onStop,
  onMenuToggle,
  onOpenVoiceMode,
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?._id;

  return (
    <main className="chat-main">
      <header className="chat-header">
        <button
          className="menu-btn"
          onClick={onMenuToggle}
          aria-label="Open sidebar"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="chat-header-title">
          {conversation?.title || "New Chat"}
        </div>
        <button
          className="header-voice-btn"
          onClick={onOpenVoiceMode}
          title="Start Real-Time Voice Conversation"
          aria-label="Start Voice Mode"
        >
          <span className="header-voice-pulse" />
          <Radio size={15} />
          <span>Voice Mode</span>
        </button>
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {!conversation || messages.length === 0 ? (
          <WelcomeScreen onPromptClick={onSend} />
        ) : (
          <div className="chat-messages">
            {loadingMessages ? (
              <div className="empty-state">
                <LoadingIndicator />
              </div>
            ) : (
              messages.map((m) => (
                <ChatMessage
                  key={m._id}
                  message={m}
                  onRegenerate={onRegenerate}
                  isLastAssistant={m._id === lastAssistantId}
                />
              ))
            )}

            {sending && (
              <div className="message assistant">
                <div className="message-avatar">S</div>
                <div className="message-body">
                  <div className="thinking-label">
                    Sham&apos;s AI is thinking…
                  </div>
                  <LoadingIndicator />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ChatInput
        onSend={onSend}
        onStop={onStop}
        sending={sending}
        disabled={!conversation}
        onOpenVoiceMode={onOpenVoiceMode}
      />
    </main>
  );
};

export default ChatWindow;