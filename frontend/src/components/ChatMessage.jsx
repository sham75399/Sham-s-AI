import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Loader2,
  FileText,
  Download,
  ExternalLink,
} from "lucide-react";
import api, { getFileUrl } from "../services/api";
import { speakBrowserText, stopBrowserSpeech } from "../utils/speechUtils";

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language || "text"}</span>
        <button className="code-copy-btn" onClick={copy}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "14px",
          background: "transparent",
          fontSize: "13px",
        }}
        PreTag="div"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

const ChatMessage = ({ message, onRegenerate, isLastAssistant }) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(message.feedback || null);
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef(null);

  // Text-to-Speech
  const speak = () => {
    if (speaking) {
      // Stop playback
      stopBrowserSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      setSpeaking(false);
      setLoadingAudio(false);
      return;
    }

    setSpeaking(true);
    setLoadingAudio(false);

    speakBrowserText(message.content, {
      onStart: () => {
        setSpeaking(true);
        setLoadingAudio(false);
      },
      onEnd: () => {
        setSpeaking(false);
        setLoadingAudio(false);
      },
      onError: (err) => {
        console.warn("Speech playback error:", err);
        setSpeaking(false);
        setLoadingAudio(false);
      },
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBrowserSpeech();
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const sendFeedback = async (type) => {
    const value = feedback === type ? null : type;
    setFeedback(value);
    try {
      await api.put(`/messages/${message._id}`, { feedback: value });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {isUser
          ? message.userName?.charAt(0)?.toUpperCase() || "U"
          : "S"}
      </div>
      <div className="message-body">
        {message.attachment && (
          <div className="message-attachment">
            {message.attachment.mimetype?.startsWith("image/") ? (
              <a
                href={getFileUrl(message.attachment.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="attachment-image-link"
                title="Click to view full image"
              >
                <img
                  src={getFileUrl(message.attachment.url)}
                  alt={message.attachment.originalName || "Uploaded image"}
                  className="attachment-image"
                  loading="lazy"
                />
              </a>
            ) : (
              <a
                href={getFileUrl(message.attachment.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="attachment-file-card"
                download={message.attachment.originalName}
                title={`Download ${message.attachment.originalName || "file"}`}
              >
                <div className="attachment-file-icon">
                  <FileText size={20} />
                </div>
                <div className="attachment-file-info">
                  <span className="attachment-file-name">
                    {message.attachment.originalName || "Attachment"}
                  </span>
                  <span className="attachment-file-size">
                    {message.attachment.size
                      ? `${(message.attachment.size / 1024).toFixed(1)} KB`
                      : "File"}
                  </span>
                </div>
                <Download size={15} className="attachment-file-dl" />
              </a>
            )}
          </div>
        )}

        {message.content && (
          <div className="message-content">
            {isUser ? (
              message.content
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const value = String(children).replace(/\n$/, "");
                    if (!inline && (match || value.includes("\n"))) {
                      return (
                        <CodeBlock
                          language={match ? match[1] : ""}
                          value={value}
                        />
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {!isUser && (
          <div className="message-actions">
            <button
              className="action-btn"
              onClick={copy}
              title="Copy"
              aria-label="Copy response"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            {isLastAssistant && (
              <button
                className="action-btn"
                onClick={onRegenerate}
                title="Regenerate"
                aria-label="Regenerate response"
              >
                <RotateCcw size={14} />
              </button>
            )}
            <button
              className={`action-btn ${feedback === "like" ? "active" : ""}`}
              onClick={() => sendFeedback("like")}
              title="Like"
              aria-label="Like response"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              className={`action-btn ${feedback === "dislike" ? "active" : ""}`}
              onClick={() => sendFeedback("dislike")}
              title="Dislike"
              aria-label="Dislike response"
            >
              <ThumbsDown size={14} />
            </button>
            <button
              className={`action-btn ${speaking ? "active" : ""}`}
              onClick={speak}
              disabled={loadingAudio}
              title={speaking ? "Stop speaking" : "Read aloud"}
              aria-label={speaking ? "Stop reading" : "Read response aloud"}
            >
              {loadingAudio ? (
                <Loader2 size={14} className="spin" />
              ) : speaking ? (
                <VolumeX size={14} />
              ) : (
                <Volume2 size={14} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;