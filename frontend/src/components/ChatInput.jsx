import { useEffect, useRef, useState } from "react";
import { Send, Paperclip, X, Square, Mic, MicOff, Loader2, Radio, FileText } from "lucide-react";
import api, { uploadFile } from "../services/api";

const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

const ChatInput = ({
  onSend,
  onStop,
  sending,
  disabled,
  onOpenVoiceMode,
}) => {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  // Manage preview URL safely
  useEffect(() => {
    if (attachment && attachment.type?.startsWith("image/")) {
      const url = URL.createObjectURL(attachment);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [attachment]);

  const handleFileSelection = (file) => {
    if (!file) return;
    setVoiceError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setVoiceError("Unsupported file type. Allowed: PNG, JPG, WEBP, GIF, PDF, DOCX, TXT, CSV.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setVoiceError("File is too large (maximum size is 10 MB).");
      return;
    }
    setAttachment(file);
  };

  const startRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;

        setProcessing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const { data } = await api.post("/chat/transcribe", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (data.text) {
            setText((prev) => (prev ? prev + " " + data.text : data.text));
          }
        } catch (err) {
          setVoiceError(
            err.response?.data?.message || "Could not process voice input"
          );
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setVoiceError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const canSend = (text.trim() || attachment) && !sending && !uploading;

  const submit = async () => {
    if (!canSend) return;

    const value = text.trim();
    let uploadedAttachment = null;

    if (attachment) {
      setUploading(true);
      setUploadProgress(0);
      try {
        uploadedAttachment = await uploadFile(attachment, (progress) => {
          setUploadProgress(progress);
        });
      } catch (err) {
        setVoiceError(
          err.response?.data?.message || err.message || "Failed to upload file."
        );
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSend(value, uploadedAttachment);
    setText("");
    setAttachment(null);
    setUploadProgress(0);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
    // Reset file input value so selecting the same file again triggers onChange
    e.target.value = "";
  };

  // Clipboard paste (e.g. screenshots)
  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileSelection(file);
          break;
        }
      }
    }
  };

  // Drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !sending && !uploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || sending || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  return (
    <div
      className={`chat-input-wrap ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {attachment && (
        <div style={{ maxWidth: 780, margin: "0 auto 8px" }}>
          <div className={`file-preview ${uploading ? "file-preview-uploading" : ""}`}>
            {attachment.type.startsWith("image/") ? (
              <img src={previewUrl} alt="Upload preview" />
            ) : (
              <div className="file-info">
                <div className="file-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FileText size={16} />
                  <span>{attachment.name}</span>
                </div>
                <div className="file-size">
                  {(attachment.size / 1024).toFixed(1)} KB
                </div>
              </div>
            )}

            {uploading ? (
              <div className="file-upload-status" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                <Loader2 size={14} className="spin" />
                <span>{uploadProgress > 0 ? `${uploadProgress}%` : "Uploading..."}</span>
              </div>
            ) : (
              <button
                type="button"
                className="file-remove-btn"
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Voice / Upload error display */}
      {voiceError && (
        <div style={{ maxWidth: 780, margin: "0 auto 8px" }}>
          <div className="error-msg" style={{ padding: "8px 12px", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{voiceError}</span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 2 }}
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className={`chat-input-inner ${isDragging ? "drag-over" : ""}`}>
        <button
          type="button"
          className="input-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          title="Attach image or document (max 10MB)"
          disabled={sending || uploading}
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf,.txt,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp,.gif"
          onChange={onPickFile}
        />

        {/* Microphone button (single speech-to-text) */}
        <button
          type="button"
          className="input-btn"
          onClick={recording ? stopRecording : startRecording}
          disabled={sending || disabled || processing || uploading}
          aria-label={recording ? "Stop recording" : "Start voice input"}
          title={recording ? "Stop recording" : "Speak your message"}
        >
          {processing ? (
            <Loader2 size={18} className="spin" />
          ) : recording ? (
            <MicOff size={18} color="#dc2626" />
          ) : (
            <Mic size={18} />
          )}
        </button>

        {/* Real-time Voice Mode Launcher */}
        {onOpenVoiceMode && (
          <button
            type="button"
            className="input-btn voice-launch-btn"
            onClick={onOpenVoiceMode}
            disabled={sending || processing || uploading}
            aria-label="Start Real-time Voice Conversation"
            title="Start Real-time Voice Conversation"
          >
            <Radio size={18} />
          </button>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={isDragging ? "Drop file to attach..." : "Message Sham's AI…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          aria-label="Message input"
        />

        {sending || uploading ? (
          <button
            type="button"
            className="input-btn stop-btn"
            onClick={uploading ? undefined : onStop}
            disabled={uploading}
            aria-label={uploading ? "Uploading file..." : "Stop generation"}
            title={uploading ? `Uploading file (${uploadProgress}%)...` : "Stop generation"}
          >
            {uploading ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Square size={16} fill="currentColor" />
            )}
          </button>
        ) : (
          <button
            type="button"
            className="input-btn send-btn"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send message"
            title={canSend ? "Send message" : "Type a message or attach a file"}
          >
            <Send size={18} />
          </button>
        )}
      </div>
      <div className="input-hint">
        Sham&apos;s AI can make mistakes. Verify important information.
      </div>
    </div>
  );
};

export default ChatInput;
