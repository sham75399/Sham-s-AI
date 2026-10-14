import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Copy,
  Check,
  Pencil,
  Share2,
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
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "auto",
        }}
        PreTag="div"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

const ChatMessage = ({
  message,
  onUpdateMessage,
  onEditAndResubmitMessage,
  onRegenerate,
  isLastAssistant,
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [feedback, setFeedback] = useState(message.feedback || null);
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [selectionToolbar, setSelectionToolbar] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const audioRef = useRef(null);
  const messageRef = useRef(null);

  const updateSelectionToolbar = useCallback(() => {
    if (!isUser) {
      setSelectionToolbar(null);
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText || !selection?.rangeCount) {
      setSelectionToolbar(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const element =
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (element?.closest("input, textarea, [contenteditable='true']")) {
      setSelectionToolbar(null);
      return;
    }
    const messageContent = element?.closest(
      ".message.user .message-content"
    );
    if (!messageContent || !messageRef.current?.contains(messageContent)) {
      setSelectionToolbar(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      setSelectionToolbar(null);
      return;
    }

    const toolbarWidth = 210;
    const toolbarHeight = 44;
    setSelectionToolbar({
      text: selectedText,
      top: Math.max(8, rect.top - toolbarHeight - 8),
      left: Math.min(
        Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2),
        window.innerWidth - toolbarWidth - 8
      ),
    });
  }, [isUser]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (event.target.closest?.(".selection-toolbar, .selection-edit")) {
        return;
      }
      setSelectionToolbar(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectionToolbar(null);
      }
    };

    if (!isUser) return undefined;
    document.addEventListener("selectionchange", updateSelectionToolbar);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateSelectionToolbar);
    window.addEventListener("scroll", updateSelectionToolbar, true);
    return () => {
      document.removeEventListener("selectionchange", updateSelectionToolbar);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateSelectionToolbar);
      window.removeEventListener("scroll", updateSelectionToolbar, true);
    };
  }, [isUser, updateSelectionToolbar]);

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
      setActionNotice("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
      setTimeout(() => setActionNotice(""), 2500);
    } catch (error) {
      console.error("Could not copy message text:", error);
      setActionNotice("Could not copy message text.");
    }
  };

  const shareMessage = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: message.content });
        setActionNotice("");
      } else {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setActionNotice("Sharing unavailable; message copied.");
        setTimeout(() => setCopied(false), 1500);
        setTimeout(() => setActionNotice(""), 2500);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Could not share message text:", error);
        setActionNotice("Could not share message text.");
      }
    }
  };

  const copySelectedText = async () => {
    try {
      await navigator.clipboard.writeText(selectionToolbar.text);
      setSelectionToolbar(null);
    } catch (error) {
      console.error("Could not copy selected response text:", error);
      setSelectionToolbar((current) =>
        current ? { ...current, error: "Could not copy selected text." } : current
      );
    }
  };

  const openEdit = () => {
    setEditedContent(message.content);
    setEditError("");
    setEditing(true);
    setSelectionToolbar(null);
  };

  const saveEdit = async () => {
    const saveMessage = isUser
      ? onEditAndResubmitMessage
      : onUpdateMessage;
    if (!saveMessage || !message._id) {
      setEditError("This response cannot be edited.");
      return;
    }

    setSavingEdit(true);
    setEditError("");
    try {
      await saveMessage(message._id, editedContent);
      setEditing(false);
    } catch (error) {
      setEditError(
        error.response?.data?.message || "Could not save the edited response."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const shareSelectedText = async () => {
    try {
      const text = selectionToolbar?.text;
      if (!text) return;
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setSelectionToolbar((current) =>
          current
            ? { ...current, error: "Sharing unavailable; text copied." }
            : current
        );
      }
      if (navigator.share) setSelectionToolbar(null);
    } catch (error) {
      if (error.name !== "AbortError") {
        setSelectionToolbar((current) =>
          current
            ? { ...current, error: "Could not share the selected text." }
            : current
        );
      }
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
    <div className={`message ${message.role}`} ref={messageRef}>
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
            {editing ? (
              <div className="selection-edit">
                <label htmlFor={`edit-response-${message._id}`}>
                  {isUser ? "Edit message" : "Edit response"}
                </label>
                <textarea
                  id={`edit-response-${message._id}`}
                  value={editedContent}
                  onChange={(event) => setEditedContent(event.target.value)}
                  rows={Math.min(
                    12,
                    Math.max(4, editedContent.split("\n").length)
                  )}
                  disabled={savingEdit}
                />
                {editError && <p className="selection-error">{editError}</p>}
                <div className="selection-edit-actions">
                  <button
                    type="button"
                    className="selection-menu-button"
                    onClick={() => setEditing(false)}
                    disabled={savingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="selection-menu-button selection-menu-primary"
                    onClick={saveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    {isUser ? "Save & resubmit" : "Save"}
                  </button>
                </div>
              </div>
            ) : isUser ? (
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
                      <code
                        className={`inline-code ${className || ""}`.trim()}
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                        {...props}
                      >
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

        {isUser && !editing && message.content && (
          <div className="message-actions user-message-actions">
            <button
              type="button"
              className="action-btn"
              onClick={copy}
              title={copied ? "Copied" : "Copy message"}
              aria-label="Copy message"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={shareMessage}
              title="Share message"
              aria-label="Share message"
            >
              <Share2 size={14} />
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={openEdit}
              title="Edit and resubmit"
              aria-label="Edit and resubmit message"
            >
              <Pencil size={14} />
            </button>
            {actionNotice && (
              <span className="user-message-action-notice" role="status">
                {actionNotice}
              </span>
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

        {isUser && selectionToolbar && (
          <div
            className="selection-toolbar"
            role="toolbar"
            aria-label={
              isUser ? "Selected message actions" : "Selected response actions"
            }
            style={{
              top: selectionToolbar.top,
              left: selectionToolbar.left,
            }}
            onPointerDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              className="selection-menu-button"
              onClick={copySelectedText}
              aria-label="Copy selected text"
            >
              <Copy size={15} />
              Copy
            </button>
            <button
              type="button"
              className="selection-menu-button"
              onClick={openEdit}
              aria-label={isUser ? "Edit and resubmit message" : "Edit response"}
            >
              <Pencil size={15} />
              Edit
            </button>
            <button
              type="button"
              className="selection-menu-button"
              onClick={() => {
                shareSelectedText();
              }}
              aria-label="Share selected message text"
            >
              <Share2 size={15} />
              Share
            </button>
            {selectionToolbar.error && (
              <span className="selection-toolbar-error">
                {selectionToolbar.error}
              </span>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default ChatMessage;
